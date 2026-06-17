// scripts/sync-stats-from-sheet.js
//
// One-time migration: correct player_stats to match the Google sheet
// (16 games, 25.02–10.06.2026) and add the 3 ad-hoc guest entries.
//
// Idempotent — safe to run more than once. Respects DB_PATH (Railway volume).
// Run:  node scripts/sync-stats-from-sheet.js
//
// Stats updated by player_id (seed order is deterministic, ids 1..47), with a
// name sanity-check that aborts on any mismatch.

const db = require("../server/db.js");

// [id, expectedName, pts, gp, wins, draws]  (losses = gp - wins - draws)
const STATS = [
  [1,  "Ričards Rozentāls",  29, 12,  8, 1],
  [2,  "Andris Jacišins",    17, 10,  3, 1],
  [3,  "Agris Porietis",     34, 15,  9, 1],
  [4,  "Ivans Mucenieks",    27, 14,  6, 1],
  [5,  "Jānis Burmeisters",  23, 12,  5, 1],
  [6,  "Jānis Muitinieks",   26, 13,  6, 1],
  [7,  "Krišjānis Zumbergs", 32, 15,  8, 1],
  [8,  "Kristaps Šulcs",     33, 14,  9, 1],
  [9,  "Mārcis Gaspažiņš",   26, 15,  5, 1],
  [10, "Matīss Freibergs",   24, 13,  5, 1],
  [11, "Rolands Āboliņš",    35, 16,  9, 1],
  [12, "Tomass Plūme",       11,  6,  2, 1],
  [13, "Toms Muzikants",     10,  6,  2, 0],
  [14, "Uvis Norde",         15,  8,  3, 1],
  [15, "Toms Vandzbergs",    27, 12,  7, 1],
  [16, "Maksims Gerasimovs", 29, 14,  7, 1],
  [17, "Bruno Langemanis",   36, 15, 10, 1],
  [18, "Edvards Brencis",     8,  6,  1, 0],
  [19, "Ivo Rancāns",        37, 16, 10, 1],
  [20, "Dāvis Ansons",        0,  0,  0, 0],
  [21, "Dāniels Kuliņš",     23, 12,  5, 1],
  [22, "Mārtiņš Vahšteins",   1,  1,  0, 0],
  [23, "Artūrs Vierpe",       6,  4,  1, 0],
  [24, "Lotārs Šalgūns",      6,  4,  1, 0],
  [25, "Ainārs Zariņš",      33, 16,  8, 1],
  [26, "Toms Krauze",         5,  3,  1, 0],
  [27, "Roberts Jaunozols",   4,  2,  1, 0],
  [28, "Niklass Mazais",      9,  5,  2, 0],
  [29, "Kirils Varočiks",     1,  1,  0, 0],
  [30, "Alvis Rozenbergs",   21,  9,  6, 0],
  [31, "Dāvis Ūsainais",      3,  1,  1, 0],
  [32, "Jānis JZ",            3,  1,  1, 0],
  [33, "Axels",               3,  1,  1, 0],
  [34, "Magnuss",             1,  1,  0, 0],
  [35, "Ņikita",              1,  1,  0, 0],
  [36, "Ēriks Vārtsargs",     3,  1,  1, 0],
  [37, "Otrs Vārtsargs",      1,  1,  0, 0],
  [38, "Krists",             12,  6,  3, 0],
  [39, "Mārtiņš M",           1,  1,  0, 0],
  [40, "Valters Vierpe",      4,  2,  1, 0],
  [41, "Kārlis Pūce",         1,  1,  0, 0],
  [42, "Edgars Brūvers",      7,  4,  1, 1],
  [43, "Jānis Iljins",        2,  2,  0, 0],
  [44, "Haralds Eglītis",     5,  2,  1, 1],
  [45, "Oskars Sidra",        3,  1,  1, 0],
  [46, "Jevgenijs Vistiņš",   3,  3,  0, 0],
  [47, "Ingars Vārtsargs",    1,  1,  0, 0],
];

// [name, pts, gp, wins, draws]  — added as guest (guest=1, excluded from standings)
const GUESTS = [
  ["No dīķa čata",   3, 1, 1, 0],
  ["Prizmas krekls", 1, 1, 0, 0],
  ["Dāvis Ansons",   1, 1, 0, 0], // 2nd Dāvis Ansons (sheet row 50)
];

const season = db.prepare("SELECT id FROM seasons WHERE active = 1 ORDER BY id DESC LIMIT 1").get();
if (!season) { console.error("No active season found — aborting."); process.exit(1); }
const seasonId = season.id;

const getPlayer = db.prepare("SELECT id, name FROM players WHERE id = ?");
const upsertStats = db.prepare(`
  INSERT INTO player_stats (player_id, season_id, pts, gp, wins, draws, losses)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(player_id, season_id) DO UPDATE SET
    pts = excluded.pts, gp = excluded.gp, wins = excluded.wins,
    draws = excluded.draws, losses = excluded.losses
`);

const insGuest  = db.prepare("INSERT INTO players (name, position, positions, skill, guest) VALUES (?, 'F', 'F', ?, 1)");
const findGuest = db.prepare("SELECT id FROM players WHERE name = ? AND guest = 1");

// 1) Sanity-check every id maps to the expected name before touching anything.
const mismatches = [];
for (const [id, name] of STATS) {
  const row = getPlayer.get(id);
  if (!row) mismatches.push(`id ${id} missing (expected "${name}")`);
  else if (row.name !== name) mismatches.push(`id ${id}: db "${row.name}" ≠ expected "${name}"`);
}
if (mismatches.length) {
  console.error("Aborting — player id/name mismatch:\n  " + mismatches.join("\n  "));
  process.exit(1);
}

let updated = 0, added = 0;
db.transaction(() => {
  for (const [id, , pts, gp, wins, draws] of STATS) {
    upsertStats.run(id, seasonId, pts, gp, wins, draws, gp - wins - draws);
    updated++;
  }
  for (const [name, pts, gp, wins, draws] of GUESTS) {
    if (findGuest.get(name)) { console.log(`guest exists, skipping: ${name}`); continue; }
    const skill = Math.max(1, Math.min(10, Math.round(pts / 3) || 1));
    const p = insGuest.run(name, skill);
    upsertStats.run(p.lastInsertRowid, seasonId, pts, gp, wins, draws, gp - wins - draws);
    added++;
    console.log(`added guest: ${name} (${pts}p)`);
  }
})();

console.log(`\nDone. Updated ${updated} player stats, added ${added} guests (season ${seasonId}).`);
