// client/src/utils/helpers.js

export function autoSplit(playerList) {
  const byPos = { G: [], D: [], F: [] };
  for (const p of playerList) {
    (byPos[p.position] || byPos.F).push(p);
  }
  for (const arr of Object.values(byPos)) {
    arr.sort((a, b) => b.pts - a.pts);
  }
  const w = [], b = [];
  byPos.G.forEach((g, i) => (i % 2 === 0 ? w : b).push(g));
  let flip = w.length <= b.length;
  [...byPos.D, ...byPos.F].forEach(p => { (flip ? w : b).push(p); flip = !flip; });
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
