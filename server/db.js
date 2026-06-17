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
    position    TEXT    NOT NULL DEFAULT 'F', -- F | D | G
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
    ["Ričards Rozentāls",  "F", 17, 9, 4, 1],
    ["Andris Jacišins",    "F", 15, 7, 3, 1],
    ["Agris Porietis",     "F", 24, 9, 5, 1],
    ["Ivans Mucenieks",    "F", 20, 9, 4, 1],
    ["Jānis Burmeisters",  "F", 16, 8, 3, 1],
    ["Jānis Muitinieks",   "F", 18, 8, 4, 0],
    ["Krišjānis Zumbergs", "F", 24,10, 5, 0],
    ["Kristaps Šulcs",     "F", 25,10, 5, 0],
    ["Mārcis Gaspažiņš",   "F", 21,10, 4, 1],
    ["Matīss Freibergs",   "F", 21,10, 4, 1],
    ["Rolands Āboliņš",    "F", 27,11, 5, 1],
    ["Tomass Plūme",       "F",  6, 4, 1, 1],
    ["Toms Muzikants",     "F",  5, 3, 1, 0],
    ["Uvis Norde",         "F", 11, 5, 2, 0],
    ["Toms Vandzbergs",    "F", 27,11, 5, 2],
    ["Maksims Gerasimovs", "F", 19, 9, 4, 0],
    ["Bruno Langemanis",   "F", 28,11, 5, 1],
    ["Edvards Brencis",    "F",  7, 4, 1, 0],
    ["Ivo Rancāns",        "F", 27,11, 5, 1],
    ["Dāvis Ansons",       "F",  0, 0, 0, 0],
    ["Dāniels Kuliņš",     "F", 17, 8, 3, 1],
    ["Mārtiņš Vahšteins",  "F",  1, 1, 0, 0],
    ["Artūrs Vierpe",      "F",  6, 3, 1, 0],
    ["Lotārs Šalgūns",     "F",  3, 2, 0, 0],
    ["Ainārs Zariņš",      "F", 25,10, 5, 0],
    ["Toms Krauze",        "F",  5, 3, 1, 0],
    ["Roberts Jaunozols",  "F",  4, 2, 1, 0],
    ["Niklass Mazais",     "F",  8, 4, 1, 1],
    ["Kirils Varočiks",    "F",  1, 1, 0, 0],
    ["Alvis Rozenbergs",   "F", 14, 6, 3, 0],
    ["Dāvis Ūsainais",     "F",  3, 2, 1, 0],
    ["Jānis JZ",           "F",  3, 2, 1, 0],
    ["Axels",              "F",  3, 2, 1, 0],
    ["Magnuss",            "F",  1, 1, 0, 0],
    ["Ņikita",             "F",  1, 1, 0, 0],
    ["Ēriks Vārtsargs",    "G",  3, 2, 1, 0],
    ["Otrs Vārtsargs",     "G",  1, 1, 0, 0],
    ["Krists",             "F", 12, 5, 2, 1],
    ["Mārtiņš M",          "F",  1, 1, 0, 0],
    ["Valters Vierpe",     "F",  4, 2, 1, 0],
    ["Kārlis Pūce",        "F",  1, 1, 0, 0],
    ["Edgars Brūvers",     "F",  7, 4, 1, 1],
    ["Jānis Iljins",       "F",  1, 1, 0, 0],
    ["Haralds Eglītis",    "F",  5, 3, 1, 1],
    ["Oskars Sidra",       "F",  3, 2, 1, 0],
    ["Jevgenijs Vistiņš",  "F",  1, 1, 0, 0],
    ["Ingars Vārtsargs",   "G",  1, 1, 0, 0],
  ];

  const insertPlayer = db.prepare("INSERT INTO players (name, position) VALUES (?, ?)");
  const insertStats  = db.prepare(`
    INSERT INTO player_stats (player_id, season_id, pts, gp, wins, draws, losses)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAll = db.transaction(() => {
    for (const [name, pos, pts, gp, wins, draws] of PLAYERS) {
      const p = insertPlayer.run(name, pos);
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
