// db.js — SQLite schema + seed data
const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../data/dike.db");

// Ensure data directory exists
const fs = require("fs");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS seasons (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,          -- "2026"
    start_date  TEXT    NOT NULL,          -- "2026-02-25"
    end_date    TEXT    NOT NULL,          -- "2026-08-26"
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS players (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    position    TEXT    NOT NULL DEFAULT 'F', -- primary: F | D | G
    positions   TEXT    NOT NULL DEFAULT 'F', -- all positions, comma list e.g. "F,D"
    skill       INTEGER NOT NULL DEFAULT 5,   -- 1..10, team-balancing rating
    guest       INTEGER NOT NULL DEFAULT 0,   -- 1 = "+1 / svešais" ad-hoc player
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS player_stats (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL REFERENCES players(id),
    season_id   INTEGER NOT NULL REFERENCES seasons(id),
    pts         INTEGER NOT NULL DEFAULT 0,
    gp          INTEGER NOT NULL DEFAULT 0,
    wins        INTEGER NOT NULL DEFAULT 0,
    draws       INTEGER NOT NULL DEFAULT 0,
    losses      INTEGER NOT NULL DEFAULT 0,
    UNIQUE(player_id, season_id)
  );

  CREATE TABLE IF NOT EXISTS games (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id     INTEGER NOT NULL REFERENCES seasons(id),
    game_num      INTEGER NOT NULL,
    date          TEXT    NOT NULL,        -- "2026-05-20"
    time          TEXT    NOT NULL DEFAULT '21:15',
    location      TEXT    NOT NULL DEFAULT 'Volvo halle',
    status        TEXT    NOT NULL DEFAULT 'upcoming', -- upcoming | played
    white_score   INTEGER,
    black_score   INTEGER,
    cancelled     INTEGER NOT NULL DEFAULT 0,
    cancel_note   TEXT,
    awarded       INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS game_players (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id   INTEGER NOT NULL REFERENCES games(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    team      TEXT    NOT NULL,            -- 'white' | 'black'
    UNIQUE(game_id, player_id)
  );
`);

// ── Migrations: add new columns to existing databases ────────────────────────

function ensureColumn(table, col, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.some(c => c.name === col)) return false;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  return true;
}

ensureColumn("players", "guest", "guest INTEGER NOT NULL DEFAULT 0");
if (ensureColumn("players", "positions", "positions TEXT")) {
  // backfill: a player's positions start as their existing single position
  db.exec("UPDATE players SET positions = position WHERE positions IS NULL");
}
if (ensureColumn("players", "skill", "skill INTEGER")) {
  // backfill skill from active-season points (≈ pts/3, clamped 1..10), default 5
  db.exec(`
    UPDATE players SET skill = MAX(1, MIN(10, COALESCE((
      SELECT ROUND(ps.pts / 3.0)
      FROM   player_stats ps
      JOIN   seasons s ON s.id = ps.season_id AND s.active = 1
      WHERE  ps.player_id = players.id
    ), 5)))
  `);
}

// ── Seed: season 2026 + all 47 players (only on first run) ───────────────────

const seasonExists = db.prepare("SELECT id FROM seasons WHERE name = '2026'").get();

if (!seasonExists) {
  console.log("🌱  Seeding database with season 2026...");

  // Insert season
  const season = db.prepare(`
    INSERT INTO seasons (name, start_date, end_date, active)
    VALUES ('2026', '2026-02-25', '2026-08-26', 1)
  `).run();
  const seasonId = season.lastInsertRowid;

  // Player seed data: [name, position, pts, gp, wins, draws]
  const PLAYERS = [
    ["Ričards Rozentāls",  "F", 29,12, 8, 1],
    ["Andris Jacišins",    "F", 17,10, 3, 1],
    ["Agris Porietis",     "F", 34,15, 9, 1],
    ["Ivans Mucenieks",    "F", 27,14, 6, 1],
    ["Jānis Burmeisters",  "F", 23,12, 5, 1],
    ["Jānis Muitinieks",   "F", 26,13, 6, 1],
    ["Krišjānis Zumbergs", "F", 32,15, 8, 1],
    ["Kristaps Šulcs",     "F", 33,14, 9, 1],
    ["Mārcis Gaspažiņš",   "F", 26,15, 5, 1],
    ["Matīss Freibergs",   "F", 24,13, 5, 1],
    ["Rolands Āboliņš",    "F", 35,16, 9, 1],
    ["Tomass Plūme",       "F", 11, 6, 2, 1],
    ["Toms Muzikants",     "F", 10, 6, 2, 0],
    ["Uvis Norde",         "F", 15, 8, 3, 1],
    ["Toms Vandzbergs",    "F", 27,12, 7, 1],
    ["Maksims Gerasimovs", "F", 29,14, 7, 1],
    ["Bruno Langemanis",   "F", 36,15,10, 1],
    ["Edvards Brencis",    "F",  8, 6, 1, 0],
    ["Ivo Rancāns",        "F", 37,16,10, 1],
    ["Dāvis Ansons",       "F",  0, 0, 0, 0],
    ["Dāniels Kuliņš",     "F", 23,12, 5, 1],
    ["Mārtiņš Vahšteins",  "F",  1, 1, 0, 0],
    ["Artūrs Vierpe",      "F",  6, 4, 1, 0],
    ["Lotārs Šalgūns",     "F",  6, 4, 1, 0],
    ["Ainārs Zariņš",      "F", 33,16, 8, 1],
    ["Toms Krauze",        "F",  5, 3, 1, 0],
    ["Roberts Jaunozols",  "F",  4, 2, 1, 0],
    ["Niklass Mazais",     "F",  9, 5, 2, 0],
    ["Kirils Varočiks",    "F",  1, 1, 0, 0],
    ["Alvis Rozenbergs",   "F", 21, 9, 6, 0],
    ["Dāvis Ūsainais",     "F",  3, 1, 1, 0],
    ["Jānis JZ",           "F",  3, 1, 1, 0],
    ["Axels",              "F",  3, 1, 1, 0],
    ["Magnuss",            "F",  1, 1, 0, 0],
    ["Ņikita",             "F",  1, 1, 0, 0],
    ["Ēriks Vārtsargs",    "G",  3, 1, 1, 0],
    ["Otrs Vārtsargs",     "G",  1, 1, 0, 0],
    ["Krists",             "F", 12, 6, 3, 0],
    ["Mārtiņš M",          "F",  1, 1, 0, 0],
    ["Valters Vierpe",     "F",  4, 2, 1, 0],
    ["Kārlis Pūce",        "F",  1, 1, 0, 0],
    ["Edgars Brūvers",     "F",  7, 4, 1, 1],
    ["Jānis Iljins",       "F",  2, 2, 0, 0],
    ["Haralds Eglītis",    "F",  5, 2, 1, 1],
    ["Oskars Sidra",       "F",  3, 1, 1, 0],
    ["Jevgenijs Vistiņš",  "F",  3, 3, 0, 0],
    ["Ingars Vārtsargs",   "G",  1, 1, 0, 0],
  ];

  const insertPlayer = db.prepare("INSERT INTO players (name, position, positions, skill) VALUES (?, ?, ?, ?)");
  const insertStats  = db.prepare(`
    INSERT INTO player_stats (player_id, season_id, pts, gp, wins, draws, losses)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAll = db.transaction(() => {
    for (const [name, pos, pts, gp, wins, draws] of PLAYERS) {
      const skill = Math.max(1, Math.min(10, Math.round(pts / 3) || 5));
      const p = insertPlayer.run(name, pos, pos, skill);
      insertStats.run(p.lastInsertRowid, seasonId, pts, gp, wins, draws, gp - wins - draws);
    }
  });
  insertAll();

  // Generate all 27 Wednesday games
  const insertGame = db.prepare(`
    INSERT INTO games (season_id, game_num, date, time, location, status)
    VALUES (?, ?, ?, '21:15', 'Volvo halle', ?)
  `);

  const today = new Date().toISOString().slice(0, 10);
  let d = new Date("2026-02-25T12:00:00"), n = 1;
  const end = new Date("2026-08-27T12:00:00");

  db.transaction(() => {
    while (d < end) {
      const ds = d.toISOString().slice(0, 10);
      const status = ds < today ? "played" : "upcoming";
      insertGame.run(seasonId, n, ds, status);
      d = new Date(d.getTime() + 7 * 86400000);
      n++;
    }
  })();

  console.log(`✅  Seeded: 1 season, ${PLAYERS.length} players, ${n - 1} games`);
}

module.exports = db;
