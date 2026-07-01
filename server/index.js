// server/index.js — AA Dīķa Čempionāts backend
"use strict";

const express  = require("express");
const session  = require("express-session");
const path     = require("path");
const db       = require("./db");

const app  = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "volvo2026";
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || "developer2026";
const SESSION_SECRET = process.env.SESSION_SECRET || "dike-secret-2026";
const IS_PROD = process.env.NODE_ENV === "production";

// ── Middleware ────────────────────────────────────────────────────────────────

// Behind Railway/Render reverse proxy (HTTPS terminated upstream)
if (IS_PROD) app.set("trust proxy", 1);

app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
}));

// Serve built React app in production
if (IS_PROD) {
  app.use(express.static(path.join(__dirname, "../client/dist")));
}

// Auth middleware — attaches role / isAdmin / isSuper to req
function authInfo(req, res, next) {
  req.role    = req.session?.role || null;           // 'admin' | 'super' | null
  req.isSuper = req.role === "super";
  req.isAdmin = req.role === "admin" || req.isSuper; // super is also an admin
  next();
}

function requireAdmin(req, res, next) {
  if (!req.isAdmin) return res.status(401).json({ error: "Nav atļauts" });
  next();
}

function requireSuper(req, res, next) {
  if (!req.isSuper) return res.status(403).json({ error: "Nepieciešama superadmin piekļuve" });
  next();
}

app.use(authInfo);

// ── Auth routes ───────────────────────────────────────────────────────────────

app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;
  if (password === SUPERADMIN_PASSWORD) {
    req.session.role = "super";
    return res.json({ ok: true, role: "super" });
  }
  if (password === ADMIN_PASSWORD) {
    req.session.role = "admin";
    return res.json({ ok: true, role: "admin" });
  }
  res.status(401).json({ error: "Nepareiza parole" });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get("/api/auth/status", (req, res) => {
  res.json({ isAdmin: req.isAdmin, isSuper: req.isSuper, role: req.role });
});

// ── Seasons ───────────────────────────────────────────────────────────────────

app.get("/api/seasons", (req, res) => {
  const seasons = db.prepare("SELECT * FROM seasons ORDER BY id DESC").all();
  res.json(seasons);
});

app.post("/api/seasons", requireAdmin, (req, res) => {
  const { name, start_date, end_date } = req.body;
  if (!name || !start_date || !end_date) return res.status(400).json({ error: "Trūkst lauki" });

  // Deactivate current active season
  db.prepare("UPDATE seasons SET active = 0 WHERE active = 1").run();

  const result = db.prepare(`
    INSERT INTO seasons (name, start_date, end_date, active)
    VALUES (?, ?, ?, 1)
  `).run(name, start_date, end_date);

  // Generate Wednesday games for the new season
  const seasonId = result.lastInsertRowid;
  const today = new Date().toISOString().slice(0, 10);
  let d = new Date(start_date + "T12:00:00"), n = 1;
  const end = new Date(new Date(end_date).getTime() + 86400000);

  const insertGame = db.prepare(`
    INSERT INTO games (season_id, game_num, date, status)
    VALUES (?, ?, ?, ?)
  `);

  db.transaction(() => {
    while (d < end) {
      const ds = d.toISOString().slice(0, 10);
      insertGame.run(seasonId, n, ds, ds < today ? "played" : "upcoming");
      d = new Date(d.getTime() + 7 * 86400000);
      n++;
    }
  })();

  res.json({ id: seasonId, name, start_date, end_date, active: 1 });
});

// Delete a season (superadmin only) — removes its games, lineups and stats
app.delete("/api/seasons/:id", requireSuper, (req, res) => {
  const id = +req.params.id;
  db.transaction(() => {
    db.prepare(`DELETE FROM game_players WHERE game_id IN (SELECT id FROM games WHERE season_id = ?)`).run(id);
    db.prepare("DELETE FROM games        WHERE season_id = ?").run(id);
    db.prepare("DELETE FROM player_stats WHERE season_id = ?").run(id);
    db.prepare("DELETE FROM seasons      WHERE id = ?").run(id);
  })();
  res.json({ ok: true });
});

// ── Players ───────────────────────────────────────────────────────────────────

// Get all players with stats for a given season
app.get("/api/players", (req, res) => {
  const seasonId = req.query.season_id || getActiveSeason()?.id;
  const rows = db.prepare(`
    SELECT p.id, p.name, p.position, p.positions, p.skill, p.active,
           COALESCE(ps.pts,    0) AS pts,
           COALESCE(ps.gp,     0) AS gp,
           COALESCE(ps.wins,   0) AS wins,
           COALESCE(ps.draws,  0) AS draws,
           COALESCE(ps.losses, 0) AS losses
    FROM   players p
    LEFT JOIN player_stats ps ON ps.player_id = p.id AND ps.season_id = ?
    WHERE  p.guest = 0
    ORDER  BY ps.pts DESC, p.name
  `).all(seasonId);
  res.json(rows);
});

// Add player
app.post("/api/players", requireAdmin, (req, res) => {
  const { name, positions, position, skill } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Vārds ir obligāts" });
  const pos = normalizePositions(positions, position);
  const sk  = clampSkill(skill);
  const p = db.prepare("INSERT INTO players (name, position, positions, skill) VALUES (?, ?, ?, ?)")
    .run(name.trim(), pos.primary, pos.list, sk);
  res.json({ id: p.lastInsertRowid, name: name.trim(), position: pos.primary, positions: pos.list,
             skill: sk, active: 1, guest: 0, pts: 0, gp: 0, wins: 0, draws: 0, losses: 0 });
});

// Add a guest / "+1 svešais" ad-hoc player (game-local, excluded from standings)
app.post("/api/players/guest", requireAdmin, (req, res) => {
  const { name, positions, position, skill } = req.body;
  const pos  = normalizePositions(positions, position || "F");
  const sk   = clampSkill(skill);
  const nm   = (name?.trim()) || "Svešais";
  const p = db.prepare("INSERT INTO players (name, position, positions, skill, guest, active) VALUES (?, ?, ?, ?, 1, 1)")
    .run(nm, pos.primary, pos.list, sk);
  res.json({ id: p.lastInsertRowid, name: nm, position: pos.primary, positions: pos.list,
             skill: sk, active: 1, guest: 1, pts: 0 });
});

// Update player
app.patch("/api/players/:id", requireAdmin, (req, res) => {
  const { name, positions, position, active, pts, skill, season_id } = req.body;
  const id = +req.params.id;

  const p = db.prepare("SELECT * FROM players WHERE id = ?").get(id);
  if (!p) return res.status(404).json({ error: "Nav atrasts" });

  if (name !== undefined || positions !== undefined || position !== undefined || active !== undefined) {
    const pos = (positions !== undefined || position !== undefined)
      ? normalizePositions(positions, position ?? p.position)
      : { primary: p.position, list: p.positions };
    db.prepare("UPDATE players SET name = ?, position = ?, positions = ?, active = ? WHERE id = ?")
      .run(name ?? p.name, pos.primary, pos.list, active ?? p.active, id);
  }

  // Skill is a superadmin-only setting
  if (skill !== undefined) {
    if (!req.isSuper) return res.status(403).json({ error: "Skill maina tikai superadmins" });
    db.prepare("UPDATE players SET skill = ? WHERE id = ?").run(clampSkill(skill, p.skill), id);
  }

  // Update season stats (pts override from admin)
  if (pts !== undefined && season_id) {
    db.prepare(`
      INSERT INTO player_stats (player_id, season_id, pts)
      VALUES (?, ?, ?)
      ON CONFLICT(player_id, season_id) DO UPDATE SET pts = excluded.pts
    `).run(id, season_id, pts);
  }

  res.json({ ok: true });
});

// Delete a player (superadmin only) — also clears their lineup/stats
app.delete("/api/players/:id", requireSuper, (req, res) => {
  const id = +req.params.id;
  db.transaction(() => {
    db.prepare("DELETE FROM game_players WHERE player_id = ?").run(id);
    db.prepare("DELETE FROM player_stats  WHERE player_id = ?").run(id);
    db.prepare("DELETE FROM players       WHERE id = ?").run(id);
  })();
  res.json({ ok: true });
});

// Player history across all seasons
app.get("/api/players/:id/history", (req, res) => {
  const rows = db.prepare(`
    SELECT s.name AS season, ps.pts, ps.gp, ps.wins, ps.draws, ps.losses
    FROM   player_stats ps
    JOIN   seasons s ON s.id = ps.season_id
    WHERE  ps.player_id = ?
    ORDER  BY s.id DESC
  `).all(+req.params.id);
  res.json(rows);
});

// ── Games ─────────────────────────────────────────────────────────────────────

app.get("/api/games", (req, res) => {
  const seasonId = req.query.season_id || getActiveSeason()?.id;
  const games = db.prepare(`
    SELECT g.*,
      (SELECT COUNT(*) FROM game_players gp WHERE gp.game_id = g.id AND gp.team = 'white') AS white_count,
      (SELECT COUNT(*) FROM game_players gp WHERE gp.game_id = g.id AND gp.team = 'black') AS black_count
    FROM games g
    WHERE g.season_id = ?
    ORDER BY g.game_num
  `).all(seasonId);
  res.json(games);
});

app.get("/api/games/:id", (req, res) => {
  const game = db.prepare("SELECT * FROM games WHERE id = ?").get(+req.params.id);
  if (!game) return res.status(404).json({ error: "Nav atrasta" });

  const teamPlayers = db.prepare(`
    SELECT p.id, p.name, p.position, p.positions, p.skill, p.guest, gp.team,
           COALESCE(ps.pts, 0) AS pts
    FROM   game_players gp
    JOIN   players p   ON p.id = gp.player_id
    LEFT JOIN player_stats ps ON ps.player_id = p.id AND ps.season_id = ?
    WHERE  gp.game_id = ?
    ORDER  BY gp.team, (p.position = 'G') DESC, p.skill DESC, ps.pts DESC
  `).all(game.season_id, game.id);

  res.json({
    ...game,
    white_team: teamPlayers.filter(p => p.team === "white"),
    black_team: teamPlayers.filter(p => p.team === "black"),
  });
});

// Update game (cancel, reschedule, etc.)
app.patch("/api/games/:id", requireAdmin, (req, res) => {
  const id = +req.params.id;
  const g = db.prepare("SELECT * FROM games WHERE id = ?").get(id);
  if (!g) return res.status(404).json({ error: "Nav atrasta" });

  const { date, time, location, cancelled, cancel_note, status } = req.body;
  db.prepare(`
    UPDATE games SET
      date        = COALESCE(?, date),
      time        = COALESCE(?, time),
      location    = COALESCE(?, location),
      cancelled   = COALESCE(?, cancelled),
      cancel_note = COALESCE(?, cancel_note),
      status      = COALESCE(?, status)
    WHERE id = ?
  `).run(date, time, location, cancelled, cancel_note, status, id);

  res.json({ ok: true });
});

// Save team lineup (check-in + split)
app.post("/api/games/:id/teams", requireAdmin, (req, res) => {
  const id = +req.params.id;
  const { white_ids, black_ids } = req.body; // arrays of player IDs

  if (!Array.isArray(white_ids) || !Array.isArray(black_ids)) {
    return res.status(400).json({ error: "white_ids un black_ids ir obligāti" });
  }

  db.transaction(() => {
    // Clear existing lineup
    db.prepare("DELETE FROM game_players WHERE game_id = ?").run(id);
    // Insert new lineup
    const insert = db.prepare("INSERT OR IGNORE INTO game_players (game_id, player_id, team) VALUES (?, ?, ?)");
    for (const pid of white_ids) insert.run(id, pid, "white");
    for (const pid of black_ids)  insert.run(id, pid, "black");
  })();

  res.json({ ok: true });
});

// Save result + award points
app.post("/api/games/:id/result", requireAdmin, (req, res) => {
  const id = +req.params.id;
  const { white_score, black_score } = req.body;
  if (white_score === undefined || black_score === undefined) {
    return res.status(400).json({ error: "white_score un black_score ir obligāti" });
  }

  const g = db.prepare("SELECT * FROM games WHERE id = ?").get(id);
  if (!g) return res.status(404).json({ error: "Nav atrasta" });

  const lineup = db.prepare(`
    SELECT gp.player_id, gp.team, p.guest
    FROM   game_players gp
    JOIN   players p ON p.id = gp.player_id
    WHERE  gp.game_id = ?
  `).all(id);

  db.transaction(() => {
    // Update game result
    db.prepare(`
      UPDATE games SET white_score = ?, black_score = ?, status = 'played', awarded = 1
      WHERE id = ?
    `).run(white_score, black_score, id);

    // Award points only if not already awarded
    if (!g.awarded) {
      const ww = white_score > black_score;
      const bw = black_score > white_score;
      const dr = white_score === black_score;

      const upsertStats = db.prepare(`
        INSERT INTO player_stats (player_id, season_id, pts, gp, wins, draws, losses)
        VALUES (?, ?, ?, 1, ?, ?, ?)
        ON CONFLICT(player_id, season_id) DO UPDATE SET
          pts    = pts    + excluded.pts,
          gp     = gp     + 1,
          wins   = wins   + excluded.wins,
          draws  = draws  + excluded.draws,
          losses = losses + excluded.losses
      `);

      for (const gp of lineup) {
        if (gp.guest) continue; // guests don't accrue season stats
        const isWhite = gp.team === "white";
        const won  = (isWhite && ww) || (!isWhite && bw);
        const pts  = 1 + (won ? 2 : dr ? 1 : 0);
        upsertStats.run(
          gp.player_id, g.season_id,
          pts, won ? 1 : 0, dr ? 1 : 0, (!won && !dr) ? 1 : 0
        );
      }
    }
  })();

  res.json({ ok: true });
});

// ── Season archive (standings snapshot) ───────────────────────────────────────

app.get("/api/seasons/:id/standings", (req, res) => {
  const rows = db.prepare(`
    SELECT p.id, p.name, p.position, p.positions,
           ps.pts, ps.gp, ps.wins, ps.draws, ps.losses
    FROM   player_stats ps
    JOIN   players p ON p.id = ps.player_id
    WHERE  ps.season_id = ? AND p.guest = 0
    ORDER  BY ps.pts DESC, ps.gp DESC
  `).all(+req.params.id);
  res.json(rows);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getActiveSeason() {
  return db.prepare("SELECT * FROM seasons WHERE active = 1 ORDER BY id DESC LIMIT 1").get();
}

const VALID_POS = ["F", "D", "G"];

// Normalize a positions input (array or "F,D" string) → { primary, list }
function normalizePositions(positions, fallback) {
  let list = Array.isArray(positions)
    ? positions
    : typeof positions === "string" && positions.trim()
      ? positions.split(",")
      : fallback ? [fallback] : ["F"];
  list = [...new Set(list.map(s => String(s).trim().toUpperCase()).filter(p => VALID_POS.includes(p)))];
  if (list.length === 0) list = ["F"];
  return { primary: list[0], list: list.join(",") };
}

function clampSkill(v, def = 5) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : def;
}

// Fallback to React app for client-side routing (production only)
if (IS_PROD) {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const season = getActiveSeason();
  console.log(`\n🏒  AA Dīķa Čempionāts serveris darbojas`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Aktīvā sezona: ${season?.name || "—"}`);
  console.log(`   Admin parole:  ${ADMIN_PASSWORD}\n`);
});
