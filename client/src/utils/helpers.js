// client/src/utils/helpers.js

export const SKILL_DEFAULT = 5;

export function skillOf(p) {
  const n = Number(p?.skill);
  return Number.isFinite(n) ? n : SKILL_DEFAULT;
}

// Positions can arrive as "F,D" string (DB) or an array (form state)
export function posList(p) {
  const raw = p?.positions;
  if (Array.isArray(raw)) return raw.length ? raw : ["F"];
  if (typeof raw === "string" && raw.trim()) return raw.split(",").map(s => s.trim()).filter(Boolean);
  return [p?.position || "F"];
}

export function primaryPos(p) {
  return p?.position || posList(p)[0] || "F";
}

export function isGoalie(p) {
  return primaryPos(p) === "G";
}

// Balance two teams by skill rating (goalies split evenly first, then a
// greedy skill-sum fill that also keeps team sizes within one of each other)
export function autoSplit(playerList) {
  const goalies = playerList.filter(isGoalie);
  const skaters = playerList.filter(p => !isGoalie(p));
  const w = [], b = [];
  let ws = 0, bs = 0;

  goalies.sort((a, c) => skillOf(c) - skillOf(a));
  goalies.forEach((g, i) => (i % 2 === 0 ? (w.push(g), ws += skillOf(g)) : (b.push(g), bs += skillOf(g))));

  skaters.sort((a, c) => skillOf(c) - skillOf(a));
  for (const p of skaters) {
    const s = skillOf(p);
    let toWhite;
    if (w.length - b.length >= 2) toWhite = false;       // keep sizes balanced
    else if (b.length - w.length >= 2) toWhite = true;
    else toWhite = ws < bs || (ws === bs && w.length <= b.length);
    if (toWhite) { w.push(p); ws += s; } else { b.push(p); bs += s; }
  }
  return { white: w, black: b };
}

export function fmt(ds, mode = "full") {
  if (!ds) return "";
  const d = new Date(ds + "T12:00:00");
  const D2 = String(d.getDate()).padStart(2, "0");
  const M2 = String(d.getMonth() + 1).padStart(2, "0");
  const WD = ["Sv", "P", "O", "T", "C", "Pk", "S"][d.getDay()];
  if (mode === "s") return `${D2}.${M2}`;
  return `${WD} ${D2}.${M2}.${d.getFullYear()}`;
}

export const POS_META = {
  G: { bg: "#ea580c", c: "#fff", full: "Vārtsargs" },
  D: { bg: "#1d4ed8", c: "#fff", full: "Aizsargs"  },
  F: { bg: "#16a34a", c: "#fff", full: "Uzbrucējs" },
};
