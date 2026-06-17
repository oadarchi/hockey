// client/src/App.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { auth, players as playersApi, games as gamesApi, seasons as seasonsApi } from "./utils/api.js";
import { autoSplit, fmt, POS_META, posList, skillOf, SKILL_DEFAULT } from "./utils/helpers.js";

// ── Logo (base64 embedded so no external file needed) ────────────────────────
// Replace LOGO_PLACEHOLDER with your base64 PNG:
// const LOGO = "data:image/png;base64,<paste here>";
const LOGO = null; // set to base64 string to show logo

// ── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{--bg:#f4f6f9;--c1:#fff;--c2:#f8f9fc;--bdr:#dde2eb;--blue:#1358a5;--ice:#1d6fd6;
  --muted:#8496a9;--txt:#1a2535;--red:#c8102e;--grn:#16a34a;--gold:#d97706;}
.app{font-family:'DM Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--txt);}
.hdr{background:#0d1b2e;border-bottom:3px solid var(--blue);padding:0 20px;position:sticky;top:0;z-index:99;box-shadow:0 2px 12px rgba(0,0,0,.2);}
.hdr-in{max-width:1200px;margin:0 auto;height:56px;display:flex;align-items:center;justify-content:space-between;gap:10px;}
.logo{font-family:'Oswald',sans-serif;font-weight:700;font-size:18px;letter-spacing:1.5px;display:flex;align-items:center;gap:9px;color:#fff;min-width:0;}
.logo-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.logo-yr{background:var(--blue);color:#fff;font-size:11px;padding:2px 7px;border-radius:3px;letter-spacing:1px;flex-shrink:0;}
.nav{background:#fff;border-bottom:1px solid var(--bdr);box-shadow:0 1px 4px rgba(0,0,0,.06);}
.nav-in{max-width:1200px;margin:0 auto;display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.nav-in::-webkit-scrollbar{display:none;}
.nbtn{font-family:'Oswald',sans-serif;font-size:13px;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;padding:13px 18px;color:var(--muted);background:none;border:none;cursor:pointer;border-bottom:2px solid transparent;transition:all .18s;-webkit-tap-highlight-color:transparent;}
.nbtn:hover{color:var(--txt);}.nbtn.on{color:var(--blue);border-bottom-color:var(--blue);}
.pg{max-width:1200px;margin:0 auto;padding:24px 18px;}
.card{background:var(--c1);border:1px solid var(--bdr);border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.05);}
.card-pad{padding:18px 20px;}
.tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{font-family:'Oswald',sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);padding:10px 14px;text-align:left;background:#f8f9fc;border-bottom:1px solid var(--bdr);white-space:nowrap;}
.tbl th.r,.tbl td.r{text-align:right;}
.tbl td{padding:10px 14px;border-bottom:1px solid #eef1f6;font-size:14px;vertical-align:middle;}
.tbl tr:last-child td{border-bottom:none;}.tbl tr:hover td{background:#f0f5ff;}
.badge{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:4px;font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;flex-shrink:0;}
.pts-big{font-family:'Oswald',sans-serif;font-size:17px;font-weight:700;color:var(--blue);}
.btn{font-family:'Oswald',sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;padding:9px 16px;border:none;border-radius:5px;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:5px;-webkit-tap-highlight-color:transparent;}
.btn-b{background:var(--blue);color:#fff;}.btn-b:hover{background:#1a6ed4;}.btn-b:disabled{opacity:.35;cursor:default;}
.btn-o{background:transparent;border:1px solid var(--bdr);color:var(--muted);}.btn-o:hover{border-color:var(--blue);color:var(--blue);}
.btn-r{background:#fff0f2;color:var(--red);border:1px solid #fbc8cf;}
.btn-g{background:#f0fdf4;color:var(--grn);border:1px solid #bbf7d0;}
.btn-sm{padding:6px 12px;font-size:11px;}
.inp{background:#fff;border:1px solid var(--bdr);color:var(--txt);padding:9px 12px;border-radius:5px;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;}
.inp:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(19,88,165,.08);}
.sel{background:#fff;border:1px solid var(--bdr);color:var(--txt);padding:9px 12px;border-radius:5px;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;}
.slbl{font-family:'Oswald',sans-serif;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.slbl::after{content:'';flex:1;height:1px;background:var(--bdr);}
.tabs{display:flex;gap:3px;background:#eef1f6;padding:4px;border-radius:7px;border:1px solid var(--bdr);width:fit-content;margin-bottom:20px;overflow-x:auto;max-width:100%;}
.tab{font-family:'Oswald',sans-serif;font-size:12px;letter-spacing:.8px;text-transform:uppercase;padding:7px 14px;border:none;border-radius:5px;cursor:pointer;background:transparent;color:var(--muted);transition:all .15s;white-space:nowrap;}
.tab.on{background:var(--blue);color:#fff;}
.ci-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:7px;}
.pc{background:#fff;border:1px solid var(--bdr);border-radius:6px;padding:10px 12px;display:flex;align-items:center;gap:8px;transition:all .14s;user-select:none;box-shadow:0 1px 2px rgba(0,0,0,.04);}
.pc.clickable{cursor:pointer;-webkit-tap-highlight-color:transparent;}.pc.clickable:hover{border-color:var(--blue);}
.pc.on{border-color:var(--blue);background:#eff5ff;}
.chk{width:18px;height:18px;border-radius:3px;border:2px solid;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;transition:all .14s;}
.teams-g{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.t-hdr{font-family:'Oswald',sans-serif;font-size:16px;font-weight:700;letter-spacing:3px;text-align:center;padding:13px 16px;}
.t-hdr-w{background:linear-gradient(135deg,#e8edf5,#f4f7fc);color:#0d1520;border-bottom:1px solid var(--bdr);}
.t-hdr-b{background:linear-gradient(135deg,#0d1825,#162232);color:#8aa4c0;border-bottom:1px solid #243448;}
.t-row{display:flex;align-items:center;gap:8px;padding:8px 12px;margin:0 5px 4px;border-radius:5px;}
.t-row-w{background:#f7f9fd;}.t-row-b{background:#f0f2f5;}
.sc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;}
.sc{background:#fff;border:1px solid var(--bdr);border-radius:8px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.sc-v{font-family:'Oswald',sans-serif;font-size:26px;font-weight:700;color:var(--blue);}
.sc-l{font-family:'Oswald',sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:4px;}
.gc{background:#fff;border:1px solid var(--bdr);border-radius:7px;padding:12px 16px;transition:all .15s;box-shadow:0 1px 2px rgba(0,0,0,.04);}
.score-d{font-family:'Oswald',sans-serif;font-size:48px;font-weight:700;letter-spacing:6px;line-height:1;}
.rb{display:inline-flex;align-items:center;padding:3px 12px;border-radius:20px;font-family:'Oswald',sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;}
.rb-w{background:#e8f0fe;color:#1358a5;border:1px solid #b8d0f8;}
.rb-b{background:#f1f3f5;color:#5a6a7a;border:1px solid var(--bdr);}
.rb-d{background:#fef3c7;color:#d97706;border:1px solid #fde68a;}
.view-only-banner{display:flex;align-items:center;gap:8px;padding:8px 14px;background:#f8f9fc;border:1px solid var(--bdr);border-radius:6px;margin-bottom:14px;font-size:12px;color:var(--muted);}
.pw-box{position:absolute;right:0;top:46px;background:#0d1b2e;border:1px solid #1358a5;border-radius:8px;padding:16px;min-width:220px;z-index:300;box-shadow:0 8px 24px rgba(0,0,0,.4);}
.pw-inp{width:100%;background:#06101d;border:1px solid #1a3050;color:#e8f0fe;padding:9px 10px;border-radius:5px;font-family:'DM Sans',sans-serif;font-size:15px;outline:none;margin-bottom:6px;}
.pw-inp.err{border-color:#c8102e;}
.pw-btn{width:100%;font-family:'Oswald',sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;background:#1358a5;color:#fff;border:none;padding:10px 0;border-radius:5px;cursor:pointer;}
.pw-btn:hover{background:#1a6ed4;}
.spinner{display:inline-block;width:20px;height:20px;border:2px solid var(--bdr);border-top-color:var(--blue);border-radius:50%;animation:spin .7s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.oswald{font-family:'Oswald',sans-serif;} .w100{width:100%;} .ta-c{text-align:center;}
@media(max-width:640px){
  .hdr{padding:0 12px;} .hdr-in{height:52px;}
  .logo{font-size:15px;gap:7px;} .logo img{width:30px;height:30px;} .logo-yr{display:none;}
  .nxt-hide{display:none;} .nbtn{padding:11px 13px;font-size:11px;}
  .pg{padding:16px 12px;} .sc-grid{grid-template-columns:1fr 1fr;gap:8px;}
  .mob-hide{display:none !important;} .tbl th,.tbl td{padding:9px 10px;font-size:13px;}
  .ci-grid{grid-template-columns:1fr 1fr;} .teams-g{grid-template-columns:1fr;}
  .tabs{width:100%;} .btn{padding:9px 12px;font-size:11px;} .btn-sm{padding:7px 10px;}
  .pw-box{position:fixed;top:50%;left:50%;right:auto;transform:translate(-50%,-50%);min-width:280px;max-width:90vw;}
}
@media(max-width:380px){.logo-title{display:none;} .ci-grid{grid-template-columns:1fr;}}
`;

// ── Shared components ─────────────────────────────────────────────────────────

function Bdg({ pos }) {
  const s = POS_META[pos] || POS_META.F;
  return <span className="badge" style={{ background: s.bg, color: s.c }}>{pos}</span>;
}

// One or more position badges for a player (handles multi-position F/D)
function PosBadges({ p }) {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {posList(p).map(pos => <Bdg key={pos} pos={pos} />)}
    </span>
  );
}

// Small skill chip (1..10)
function SkillChip({ value }) {
  return (
    <span className="oswald" title="Skill (komandu balansēšanai)"
      style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700,
        color: "var(--gold)", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, padding: "1px 6px" }}>
      ⚡{value ?? SKILL_DEFAULT}
    </span>
  );
}

function Spinner() {
  return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><div className="spinner" /></div>;
}

// Multi-select position picker (at least one stays selected)
function PosPicker({ value, onChange }) {
  const sel = Array.isArray(value) ? value : [value || "F"];
  const toggle = v => {
    const has = sel.includes(v);
    const next = has ? sel.filter(x => x !== v) : [...sel, v];
    onChange(next.length ? next : [v]); // never empty
  };
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {["F", "D", "G"].map(v => {
        const s = POS_META[v], on = sel.includes(v);
        return (
          <button key={v} type="button" title={s.full} onClick={() => toggle(v)}
            style={{ fontFamily: "Oswald,sans-serif", fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 5, border: on ? "none" : "1px solid var(--bdr)", cursor: "pointer", letterSpacing: 1, background: on ? s.bg : "#fff", color: on ? s.c : "var(--muted)", boxShadow: on ? "0 1px 4px rgba(0,0,0,.18)" : "none" }}>
            {v}
          </button>
        );
      })}
    </div>
  );
}

// ── STANDINGS ─────────────────────────────────────────────────────────────────

function Standings({ seasonId, allGames }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""), [pf, setPf] = useState("");

  useEffect(() => {
    setLoading(true);
    playersApi.list(seasonId).then(setList).finally(() => setLoading(false));
  }, [seasonId]);

  const filtered = useMemo(() =>
    list.filter(p => p.active && (!pf || p.position === pf) && p.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.pts - a.pts || b.gp - a.gp),
    [list, q, pf]);

  const played = allGames.filter(g => g.status === "played").length;
  const upcoming = allGames.filter(g => !g.cancelled && g.status === "upcoming").length;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="slbl" style={{ marginBottom: 8 }}>Sezona · Katru trešdienu 21:15 · Volvo Halle</div>
        <h1 className="oswald" style={{ fontSize: 34, fontWeight: 700, letterSpacing: 1, marginBottom: 4, color: "var(--txt)" }}>AA DĪĶA ČEMPIONĀTS</h1>
      </div>
      <div className="sc-grid">
        {[["Spēlētāji", list.filter(p=>p.active).length], ["Spēlētas", played], ["Atlikušās", upcoming], ["Rekords", (filtered[0]?.pts || 0) + " pts"]].map(([l, v]) => (
          <div key={l} className="sc"><div className="sc-l">{l}</div><div className="sc-v">{v}</div></div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <input className="inp" style={{ width: 210 }} placeholder="Meklēt..." value={q} onChange={e => setQ(e.target.value)} />
        <div style={{ display: "flex", gap: 4 }}>
          {[["", "Visi"], ["F", "F"], ["D", "D"], ["G", "G"]].map(([v, l]) => (
            <button key={v} className={`btn btn-sm ${pf === v ? "btn-b" : "btn-o"}`} onClick={() => setPf(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="card">
        {loading ? <Spinner /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr>
                <th style={{ width: 32 }}>#</th><th>Spēlētājs</th><th>Poz.</th>
                <th className="r">Pts</th>
                <th className="r mob-hide">Sp.</th>
                <th className="r mob-hide" style={{ color: "var(--grn)" }}>U</th>
                <th className="r mob-hide" style={{ color: "var(--gold)" }}>N</th>
                <th className="r mob-hide" style={{ color: "var(--red)" }}>Z</th>
              </tr></thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id}>
                    <td className="oswald" style={{ fontWeight: 600, color: "var(--muted)" }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>
                      {p.name}
                      {i === 0 && <span style={{ marginLeft: 8, fontSize: 10, color: "var(--gold)", fontFamily: "Oswald,sans-serif", letterSpacing: 1 }}>★ LĪDERIS</span>}
                    </td>
                    <td><PosBadges p={p} /></td>
                    <td className="r"><span className="pts-big">{p.pts}</span></td>
                    <td className="r mob-hide" style={{ color: "var(--muted)" }}>{p.gp}</td>
                    <td className="r mob-hide" style={{ color: "var(--grn)", fontWeight: 600 }}>{p.wins}</td>
                    <td className="r mob-hide" style={{ color: "var(--gold)" }}>{p.draws}</td>
                    <td className="r mob-hide" style={{ color: "var(--red)" }}>{p.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── GAME DAY ──────────────────────────────────────────────────────────────────

function GameDay({ seasonId, allGames, allPlayers, isAdmin, isSuper, onGamesChange }) {
  const upcoming = allGames.filter(g => !g.cancelled);
  const nextGame = allGames.find(g => !g.cancelled && g.status === "upcoming");
  const [gid, setGid] = useState(nextGame?.id || upcoming[0]?.id || null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ph, setPh] = useState("ci");
  const [cids, setCids] = useState([]);
  const [guests, setGuests] = useState([]); // "+1 / svešais" ad-hoc players for this game
  const [teams, setTeams] = useState(null);
  const [ws, setWs] = useState(""), [bs, setBs] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false), [cancelNote, setCancelNote] = useState("");
  const [imp, setImp] = useState(false), [impTxt, setImpTxt] = useState("");

  const game = allGames.find(g => g.id === gid);
  const active = allPlayers.filter(p => p.active);
  const roster = [...active, ...guests]; // registered players + this game's guests

  // Load game detail when gid changes
  useEffect(() => {
    if (!gid) return;
    setLoading(true);
    gamesApi.get(gid).then(d => {
      setDetail(d);
      if (d.white_team?.length || d.black_team?.length) {
        const all = [...d.white_team, ...d.black_team];
        setGuests(all.filter(p => p.guest));
        setCids(all.map(p => p.id));
        setTeams({ white: d.white_team, black: d.black_team });
        if (d.white_score !== null) { setWs(String(d.white_score)); setBs(String(d.black_score)); setPh("rs"); }
        else setPh("tm");
      } else { setCids([]); setGuests([]); setTeams(null); setPh("ci"); }
    }).finally(() => setLoading(false));
  }, [gid]);

  const toggle = id => { if (isAdmin) setCids(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };

  const addGuest = async () => {
    const g = await playersApi.addGuest({ name: `Svešais ${guests.length + 1}`, positions: ["F"], skill: SKILL_DEFAULT });
    setGuests(prev => [...prev, g]);
    setCids(prev => [...prev, g.id]);
  };

  const removeGuest = id => {
    setGuests(prev => prev.filter(p => p.id !== id));
    setCids(prev => prev.filter(x => x !== id));
  };

  const doSplit = async () => {
    const ps = roster.filter(p => cids.includes(p.id));
    const res = autoSplit(ps);
    setTeams({ white: res.white, black: res.black });
    await gamesApi.saveTeams(gid, { white_ids: res.white.map(p => p.id), black_ids: res.black.map(p => p.id) });
    setPh("tm");
  };

  const swap = (pid, from) => {
    setTeams(prev => {
      if (!prev) return prev;
      const pl = [...prev.white, ...prev.black].find(p => p.id === pid);
      return !pl ? prev : from === "white"
        ? { white: prev.white.filter(p => p.id !== pid), black: [...prev.black, pl] }
        : { white: [...prev.white, pl], black: prev.black.filter(p => p.id !== pid) };
    });
  };

  const saveTeams = async () => {
    if (!teams) return;
    await gamesApi.saveTeams(gid, { white_ids: teams.white.map(p => p.id), black_ids: teams.black.map(p => p.id) });
    setPh("rs");
  };

  const doResult = async () => {
    const wv = parseInt(ws), bv = parseInt(bs);
    if (isNaN(wv) || isNaN(bv)) return;
    setSaving(true);
    try {
      await gamesApi.saveResult(gid, { white_score: wv, black_score: bv });
      setDetail(d => ({ ...d, white_score: wv, black_score: bv, awarded: 1, status: "played" }));
      onGamesChange();
    } finally { setSaving(false); }
  };

  const doCancelGame = async () => {
    await gamesApi.update(gid, { cancelled: 1, cancel_note: cancelNote });
    onGamesChange(); setCancelOpen(false); setCancelNote("");
  };

  const doImport = () => {
    const lines = impTxt.split("\n").map(s => s.trim().toLowerCase()).filter(Boolean);
    setCids(roster.filter(p => lines.some(l => p.name.toLowerCase().includes(l))).map(p => p.id));
    setImp(false); setImpTxt("");
  };

  const tPts   = side => (teams?.[side] || []).reduce((s, p) => s + (p.pts || 0), 0);
  const tSkill = side => (teams?.[side] || []).reduce((s, p) => s + skillOf(p), 0);

  if (!game) return <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>Nav pieejamu spēļu</div>;

  return (
    <div>
      {!isAdmin && <div className="view-only-banner">👁 Skatīšanās režīms — piesakies kā admin, lai rediģētu</div>}

      {/* Game selector */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div className="slbl" style={{ marginBottom: 6 }}>Izvēlies spēli</div>
          <select className="sel" value={gid} onChange={e => setGid(+e.target.value)}>
            {upcoming.map(g => <option key={g.id} value={g.id}>Sp.{g.game_num} · {fmt(g.date)}{g.status === "played" ? " ✓" : ""}</option>)}
          </select>
        </div>
        <div style={{ padding: "8px 16px", background: "var(--c2)", border: "1px solid var(--bdr)", borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Lokācija</div>
          <div className="oswald" style={{ fontSize: 14, color: "var(--ice)", marginTop: 4 }}>{game.location} · {game.time}</div>
        </div>
        {isAdmin && !game.cancelled && game.status === "upcoming" && (
          <button className="btn btn-r btn-sm" onClick={() => setCancelOpen(v => !v)}>Atcelt spēli</button>
        )}
        {game.cancelled && (
          <div style={{ padding: "6px 14px", background: "#fff0f2", border: "1px solid #fbc8cf", borderRadius: 5 }}>
            <span className="oswald" style={{ fontSize: 12, color: "var(--red)", letterSpacing: 1 }}>❌ ATCELTS{game.cancel_note ? ` · ${game.cancel_note}` : ""}</span>
          </div>
        )}
      </div>

      {cancelOpen && isAdmin && (
        <div className="card card-pad" style={{ borderColor: "#fbc8cf", marginBottom: 16 }}>
          <div style={{ fontSize: 13, marginBottom: 8, color: "var(--muted)" }}>Atcelšanas iemesls:</div>
          <input className="inp w100" style={{ marginBottom: 8 }} value={cancelNote} onChange={e => setCancelNote(e.target.value)} placeholder="Piem. nav ledus..." />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-r btn-sm" onClick={doCancelGame}>Apstiprināt</button>
            <button className="btn btn-o btn-sm" onClick={() => setCancelOpen(false)}>Atcelt</button>
          </div>
        </div>
      )}

      <div className="tabs">
        {[["ci", "1. Pieteikšanās"], ["tm", "2. Komandas"], ["rs", "3. Rezultāts"]].map(([k, l]) => (
          <button key={k} className={`tab ${ph === k ? "on" : ""}`} onClick={() => setPh(k)}>{l}</button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* CHECK-IN */}
          {ph === "ci" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div className="slbl" style={{ marginBottom: 0 }}>{cids.length} pieteikušies · {active.length} kopā{guests.length ? ` · +${guests.length} svešie` : ""}</div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="btn btn-sm btn-o" onClick={() => setImp(v => !v)}>📋 Importēt</button>
                    <button className="btn btn-sm btn-o" onClick={addGuest}>➕ Svešais (+1)</button>
                    <button className="btn btn-sm btn-o" onClick={() => setCids(active.map(p => p.id))}>Atzīmēt visus</button>
                    <button className="btn btn-sm btn-o" onClick={() => setCids([])}>Notīrīt</button>
                    <button className="btn btn-b btn-sm" onClick={doSplit} disabled={cids.length < 2}>Sadalīt komandās →</button>
                  </div>
                )}
              </div>
              {imp && isAdmin && (
                <div className="card card-pad" style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>Ielīmē vārdus (katrs savā rindā):</div>
                  <textarea className="inp w100" rows={5} value={impTxt} onChange={e => setImpTxt(e.target.value)} style={{ marginBottom: 8, resize: "vertical" }} placeholder={"Jānis\nPēteris..."} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-b btn-sm" onClick={doImport}>Importēt</button>
                    <button className="btn btn-o btn-sm" onClick={() => setImp(false)}>Aizvērt</button>
                  </div>
                </div>
              )}
              <div className="ci-grid">
                {roster.map(p => {
                  const on = cids.includes(p.id);
                  return (
                    <div key={p.id} className={`pc ${on ? "on" : ""} ${isAdmin ? "clickable" : ""}`} onClick={() => toggle(p.id)}
                      style={p.guest ? { borderStyle: "dashed", borderColor: on ? "var(--blue)" : "#c9b896", background: on ? "#eff5ff" : "#fffdf5" } : undefined}>
                      <div className="chk" style={{ borderColor: on ? "var(--blue)" : "var(--bdr)", background: on ? "var(--blue)" : "transparent", color: "#fff" }}>{on && "✓"}</div>
                      <PosBadges p={p} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {!!p.guest && <span title="Svešais / +1" style={{ color: "var(--gold)" }}>+1 </span>}{p.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.guest ? "svešais" : `${p.pts} pts`}</div>
                      </div>
                      {isAdmin && !!p.guest && (
                        <button title="Noņemt svešo" onClick={e => { e.stopPropagation(); removeGuest(p.id); }}
                          style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TEAMS */}
          {ph === "tm" && (
            <div>
              {!teams ? (
                <div style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
                  <div style={{ marginBottom: 16 }}>Nav sadalītas komandas.</div>
                  {isAdmin && <button className="btn btn-b" onClick={() => setPh("ci")}>← Uz pieteikšanos</button>}
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <div className="slbl" style={{ marginBottom: 0 }}>
                      ⬜ {teams.white.length} sp. · ⬛ {teams.black.length} sp.
                      {Math.abs(teams.white.length - teams.black.length) <= 1
                        && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--grn)", fontFamily: "Oswald,sans-serif", letterSpacing: 1 }}>✓ LĪDZSVAROTS</span>}
                    </div>
                    {isAdmin && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-sm btn-o" onClick={() => setPh("ci")}>← Atpakaļ</button>
                        <button className="btn btn-b btn-sm" onClick={saveTeams}>Saglabāt →</button>
                      </div>
                    )}
                  </div>
                  <div className="teams-g">
                    {[["white", "⬜ BALTIE", "t-hdr-w"], ["black", "⬛ MELNIE", "t-hdr-b"]].map(([side, label, hdrCls]) => (
                      <div key={side} className="card">
                        <div className={`t-hdr ${hdrCls}`}>{label}</div>
                        <div style={{ padding: "10px 0" }}>
                          {(teams[side] || []).map(p => (
                            <div key={p.id} className={`t-row t-row-${side === "white" ? "w" : "b"}`}>
                              {isAdmin && side === "black" && <button className="btn btn-sm btn-o" style={{ padding: "3px 8px" }} onClick={() => swap(p.id, "black")}>←</button>}
                              <PosBadges p={p} />
                              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                                {!!p.guest && <span style={{ color: "var(--gold)" }}>+1 </span>}{p.name}
                              </span>
                              <span className="oswald" style={{ fontSize: 13, color: "var(--ice)", marginRight: isAdmin && side === "white" ? 4 : 0 }}>{p.pts}</span>
                              {isAdmin && side === "white" && <button className="btn btn-sm btn-o" style={{ padding: "3px 8px" }} onClick={() => swap(p.id, "white")}>→</button>}
                            </div>
                          ))}
                          <div style={{ margin: "8px 14px 4px", paddingTop: 8, borderTop: "1px solid var(--bdr)", fontSize: 12, color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
                            <span>Kopā:</span>
                            <span className="oswald" style={{ color: "var(--ice)" }}>{tPts(side)} pts</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* RESULT */}
          {ph === "rs" && (
            <div>
              <div className="slbl">Rezultāts — Sp.{game.game_num} · {fmt(game.date)}</div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
                <div className="card card-pad" style={{ minWidth: 280 }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 12, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
                    {[["BALTIE", ws, setWs, "var(--txt)"], ["MELNIE", bs, setBs, "#546880"]].map(([lbl, val, setVal, clr], i) => (
                      <div key={lbl} style={{ textAlign: "center", display: "flex", alignItems: "center", gap: i === 1 ? 0 : 0 }}>
                        {i === 1 && <div className="oswald" style={{ fontSize: 28, color: "var(--muted)", margin: "0 8px", paddingBottom: 12 }}>:</div>}
                        <div>
                          <div className="oswald" style={{ fontSize: 12, color: "var(--muted)", letterSpacing: 2, marginBottom: 8 }}>{lbl}</div>
                          <input className="inp" type="number" min="0" max="50" value={val} onChange={e => setVal(e.target.value)} disabled={!isAdmin}
                            style={{ width: 80, textAlign: "center", fontFamily: "Oswald,sans-serif", fontSize: 38, fontWeight: 700, height: 72, padding: 0, color: clr }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {isAdmin ? (
                    <>
                      <button className="btn btn-b w100" style={{ justifyContent: "center" }} onClick={doResult} disabled={saving || ws === "" || bs === ""}>
                        {saving ? "Saglabā..." : detail?.awarded ? "✎ Atjaunināt" : "✓ Apstiprināt & piešķirt punktus"}
                      </button>
                      {detail?.awarded ? <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "var(--grn)" }}>✓ Punkti jau piešķirti</div> : null}
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "8px 0", fontSize: 12, color: "var(--muted)", fontFamily: "Oswald,sans-serif", letterSpacing: 1 }}>🔒 TIKAI ADMIN</div>
                  )}
                </div>
                {detail?.white_score !== null && detail?.white_score !== undefined && (
                  <div style={{ textAlign: "center", padding: "16px 24px" }}>
                    <div className="oswald" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 3, marginBottom: 8 }}>GALĪGAIS REZULTĀTS</div>
                    <div className="score-d">
                      <span style={{ color: "var(--txt)" }}>{detail.white_score}</span>
                      <span style={{ color: "var(--muted)", margin: "0 10px" }}>:</span>
                      <span style={{ color: "#8aa0b8" }}>{detail.black_score}</span>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      {detail.white_score > detail.black_score && <span className="rb rb-w">⬜ Baltie uzvar</span>}
                      {detail.black_score > detail.white_score && <span className="rb rb-b">⬛ Melnie uzvar</span>}
                      {detail.white_score === detail.black_score && <span className="rb rb-d">🤝 Neizšķirts</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── CALENDAR ──────────────────────────────────────────────────────────────────

function Calendar({ allGames, isAdmin, onGamesChange }) {
  const [editing, setEditing] = useState(null), [nd, setNd] = useState(""), [nt, setNt] = useState("");
  const [cnOpen, setCnOpen] = useState(null), [cnNote, setCnNote] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const update = async (id, body) => {
    await gamesApi.update(id, body);
    onGamesChange();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="slbl" style={{ marginBottom: 6 }}>Sezona</div>
          <h2 className="oswald" style={{ fontSize: 28, fontWeight: 700, color: "var(--txt)" }}>SPĒĻU KALENDĀRS</h2>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--muted)" }}>
          <span><span style={{ color: "var(--grn)" }}>■</span> {allGames.filter(g => g.status === "played" && !g.cancelled).length} spēlēta</span>
          <span><span style={{ color: "var(--ice)" }}>■</span> {allGames.filter(g => g.status === "upcoming" && !g.cancelled).length} plānota</span>
          <span><span style={{ color: "var(--red)" }}>■</span> {allGames.filter(g => g.cancelled).length} atcelta</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {allGames.map(g => {
          const isNow = g.date === today, isEdit = editing === g.id, isCnOpen = cnOpen === g.id;
          const hasr = g.white_score !== null;
          return (
            <div key={g.id} className="gc" style={{ border: `1px solid ${isNow ? "var(--blue)" : g.cancelled ? "#fbc8cf" : "var(--bdr)"}`, background: isNow ? "#eff5ff" : "#fff", opacity: g.cancelled ? 0.65 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div className="oswald" style={{ color: "var(--muted)", fontSize: 12, width: 26, textAlign: "center", flexShrink: 0 }}>{g.game_num}</div>
                <div style={{ minWidth: 150, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="oswald" style={{ fontWeight: 600, fontSize: 15, color: g.cancelled ? "var(--muted)" : "var(--txt)" }}>{fmt(g.date)}</span>
                    {isNow && <span className="oswald" style={{ fontSize: 10, color: "var(--ice)", background: "#e8f0fe", padding: "2px 7px", borderRadius: 3, letterSpacing: 1 }}>ŠODIEN</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{g.time} · {g.location}</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", flexShrink: 0 }}>
                  {g.cancelled ? <span className="oswald" style={{ fontSize: 12, color: "var(--red)", letterSpacing: 1 }}>❌ ATCELTS{g.cancel_note ? ` · ${g.cancel_note}` : ""}</span>
                    : hasr ? (
                      <div style={{ textAlign: "center" }}>
                        <div className="oswald" style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4 }}>
                          <span style={{ color: "var(--txt)" }}>{g.white_score}</span>
                          <span style={{ color: "var(--muted)", margin: "0 4px" }}>:</span>
                          <span style={{ color: "#8aa0b8" }}>{g.black_score}</span>
                        </div>
                        <div style={{ marginTop: 3 }}>
                          {g.white_score > g.black_score ? <span className="rb rb-w" style={{ fontSize: 10 }}>⬜ Baltie</span>
                            : g.black_score > g.white_score ? <span className="rb rb-b" style={{ fontSize: 10 }}>⬛ Melnie</span>
                            : <span className="rb rb-d" style={{ fontSize: 10 }}>🤝 Neizšķirts</span>}
                        </div>
                      </div>
                    ) : g.status === "played" ? <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>Nav rezultāta</span>
                    : <span className="oswald" style={{ fontSize: 11, color: "var(--ice)", letterSpacing: 1 }}>PLĀNOTA</span>}
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 5 }}>
                      {!g.cancelled && g.status === "upcoming" && (
                        <>
                          <button className="btn btn-sm btn-o" onClick={() => { setEditing(isEdit ? null : g.id); setNd(g.date); setNt(g.time); }}>✎</button>
                          <button className="btn btn-sm btn-r" onClick={() => setCnOpen(isCnOpen ? null : g.id)}>Atcelt</button>
                        </>
                      )}
                      {!!g.cancelled && <button className="btn btn-sm btn-g" onClick={() => update(g.id, { cancelled: 0, cancel_note: "" })}>Atjaunot</button>}
                    </div>
                  )}
                </div>
              </div>
              {isCnOpen && isAdmin && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--bdr)" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <input className="inp" style={{ maxWidth: 280 }} value={cnNote} onChange={e => setCnNote(e.target.value)} placeholder="Atcelšanas iemesls..." />
                    <button className="btn btn-r btn-sm" onClick={() => { update(g.id, { cancelled: 1, cancel_note: cnNote }); setCnOpen(null); setCnNote(""); }}>Apstiprināt</button>
                    <button className="btn btn-o btn-sm" onClick={() => setCnOpen(null)}>Atcelt</button>
                  </div>
                </div>
              )}
              {isEdit && isAdmin && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--bdr)", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div className="oswald" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 4 }}>JAUNS DATUMS</div>
                    <input type="date" className="inp" style={{ width: "auto" }} value={nd} onChange={e => setNd(e.target.value)} />
                  </div>
                  <div>
                    <div className="oswald" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 4 }}>JAUNS LAIKS</div>
                    <input type="time" className="inp" style={{ width: "auto" }} value={nt} onChange={e => setNt(e.target.value)} />
                  </div>
                  <div style={{ marginTop: 18, display: "flex", gap: 6 }}>
                    <button className="btn btn-b btn-sm" onClick={() => { update(g.id, { date: nd || g.date, time: nt || g.time }); setEditing(null); }}>Saglabāt</button>
                    <button className="btn btn-o btn-sm" onClick={() => setEditing(null)}>Atcelt</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ARCHIVE ───────────────────────────────────────────────────────────────────

function Archive({ seasonId }) {
  const [seasonsList, setSeasonsList] = useState([]);
  const [selSeason, setSelSeason] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    seasonsApi.list().then(s => {
      setSeasonsList(s);
      // Default to previous season if exists
      const prev = s.find(x => !x.active) || s[0];
      if (prev) setSelSeason(prev.id);
    });
  }, []);

  useEffect(() => {
    if (!selSeason) return;
    setLoading(true);
    seasonsApi.standings(selSeason).then(setStandings).finally(() => setLoading(false));
  }, [selSeason]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="slbl" style={{ marginBottom: 6 }}>Sezonu arhīvs</div>
        <h2 className="oswald" style={{ fontSize: 28, fontWeight: 700, color: "var(--txt)" }}>ARHĪVS</h2>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {seasonsList.map(s => (
            <button key={s.id} className={`btn ${selSeason === s.id ? "btn-b" : "btn-o"}`} onClick={() => setSelSeason(s.id)}>
              {s.name}{s.active ? " (aktīvā)" : ""}
            </button>
          ))}
        </div>
      </div>
      {loading ? <Spinner /> : standings.length > 0 ? (
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr>
                <th style={{ width: 32 }}>#</th><th>Spēlētājs</th><th>Poz.</th>
                <th className="r">Pts</th><th className="r">Sp.</th>
                <th className="r" style={{ color: "var(--grn)" }}>U</th>
                <th className="r" style={{ color: "var(--gold)" }}>N</th>
                <th className="r" style={{ color: "var(--red)" }}>Z</th>
              </tr></thead>
              <tbody>
                {standings.map((p, i) => (
                  <tr key={p.id}>
                    <td className="oswald" style={{ fontWeight: 600, color: "var(--muted)" }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{p.name}{i === 0 && <span style={{ marginLeft: 8, fontSize: 10, color: "var(--gold)", fontFamily: "Oswald,sans-serif", letterSpacing: 1 }}>★ LĪDERIS</span>}</td>
                    <td><PosBadges p={p} /></td>
                    <td className="r"><span className="pts-big">{p.pts}</span></td>
                    <td className="r" style={{ color: "var(--muted)" }}>{p.gp}</td>
                    <td className="r" style={{ color: "var(--grn)", fontWeight: 600 }}>{p.wins}</td>
                    <td className="r" style={{ color: "var(--gold)" }}>{p.draws}</td>
                    <td className="r" style={{ color: "var(--red)" }}>{p.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : selSeason && <div style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>Nav datu šai sezonai</div>}
    </div>
  );
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────

function Admin({ seasonId, isSuper, allPlayers, onPlayersChange, allGames, onGamesChange, seasonsList, onSeasonsChange }) {
  const [tab, setTab] = useState("pl");
  const [eid, setEid] = useState(null), [ed, setEd] = useState({});
  const [np, setNp] = useState({ name: "", positions: ["F"], skill: SKILL_DEFAULT });
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "pts", dir: "desc" });
  const [gmEdit, setGmEdit] = useState(null), [gwv, setGwv] = useState(""), [gbv, setGbv] = useState("");
  const [newSeason, setNewSeason] = useState({ name: "", start_date: "", end_date: "" });
  const [msg, setMsg] = useState("");

  const sortVal = (p, key) => key === "name" ? p.name.toLowerCase() : key === "skill" ? skillOf(p) : p.pts;
  const toggleSort = key => setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" });
  const fp = allPlayers
    .filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const va = sortVal(a, sort.key), vb = sortVal(b, sort.key);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sort.dir === "asc" ? cmp : -cmp;
    });
  const SortTh = ({ k, label, cls }) => (
    <th className={cls} onClick={() => toggleSort(k)} style={{ cursor: "pointer", userSelect: "none" }} title="Šķirot">
      {label}{sort.key === k ? <span style={{ marginLeft: 4, color: "var(--blue)" }}>{sort.dir === "asc" ? "▲" : "▼"}</span> : <span style={{ marginLeft: 4, opacity: .3 }}>↕</span>}
    </th>
  );
  const flash = m => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const savePlayer = async () => {
    const body = { name: ed.name, positions: ed.positions, pts: ed.pts, season_id: seasonId };
    if (isSuper) body.skill = ed.skill;
    await playersApi.update(eid, body);
    onPlayersChange(); setEid(null); flash("✓ Saglabāts");
  };
  const addPlayer = async () => {
    if (!np.name.trim()) return;
    const body = { name: np.name.trim(), positions: np.positions };
    if (isSuper) body.skill = np.skill;
    await playersApi.add(body);
    onPlayersChange(); setNp({ name: "", positions: ["F"], skill: SKILL_DEFAULT }); flash("✓ Pievienots");
  };
  const deletePlayer = async (p) => {
    if (!window.confirm(`Dzēst spēlētāju "${p.name}"? Tiks dzēsta visa viņa statistika.`)) return;
    await playersApi.remove(p.id);
    onPlayersChange(); flash("✓ Spēlētājs dzēsts");
  };
  const deleteSeason = async (s) => {
    if (!window.confirm(`Dzēst sezonu "${s.name}" ar visām spēlēm un statistiku? Šo nevar atsaukt.`)) return;
    await seasonsApi.remove(s.id);
    onSeasonsChange?.(); onGamesChange(); flash("✓ Sezona dzēsta");
  };
  const saveResult = async (g) => {
    const wv = parseInt(gwv), bv = parseInt(gbv);
    if (isNaN(wv) || isNaN(bv)) return;
    await gamesApi.saveResult(g.id, { white_score: wv, black_score: bv });
    onGamesChange(); setGmEdit(null); flash("✓ Rezultāts saglabāts");
  };
  const createSeason = async () => {
    if (!newSeason.name || !newSeason.start_date || !newSeason.end_date) return;
    await seasonsApi.create(newSeason);
    onGamesChange(); flash("✓ Sezona izveidota — atsvaidzini lapu"); setNewSeason({ name: "", start_date: "", end_date: "" });
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 className="oswald" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4, color: "var(--txt)" }}>ADMIN PANELIS</h2>
        {msg && <div style={{ marginTop: 8, padding: "6px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 5, fontSize: 13, color: "var(--grn)", display: "inline-block" }}>{msg}</div>}
      </div>
      <div className="tabs">
        {[["pl", "Spēlētāji"], ["gm", "Spēles"], ["add", "+ Jauns"], ["sz", "Sezonas"]].map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* PLAYERS */}
      {tab === "pl" && (
        <div>
          <div style={{ marginBottom: 12 }}><input className="inp" style={{ maxWidth: 260 }} placeholder="Meklēt..." value={q} onChange={e => setQ(e.target.value)} /></div>
          <div className="card">
            <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead><tr><SortTh k="name" label="Spēlētājs" /><th>Pozīcija</th>{isSuper && <SortTh k="skill" label="Skill" />}<SortTh k="pts" label="Punkti" cls="r" /><th>Statuss</th><th>Darbības</th></tr></thead>
                <tbody>
                  {fp.map(p => (
                    <tr key={p.id}>
                      <td style={{ minWidth: 160 }}>{eid === p.id ? <input className="inp w100" value={ed.name} onChange={e => setEd(d => ({ ...d, name: e.target.value }))} /> : <span style={{ fontWeight: 500 }}>{p.name}</span>}</td>
                      <td style={{ minWidth: 130 }}>{eid === p.id ? <PosPicker value={ed.positions} onChange={v => setEd(d => ({ ...d, positions: v }))} /> : <PosBadges p={p} />}</td>
                      {isSuper && (
                        <td style={{ minWidth: 90 }}>
                          {eid === p.id
                            ? <input className="inp" type="number" min="1" max="10" value={ed.skill} onChange={e => setEd(d => ({ ...d, skill: Math.max(1, Math.min(10, +e.target.value || 1)) }))} style={{ width: 60, textAlign: "center" }} />
                            : <SkillChip value={skillOf(p)} />}
                        </td>
                      )}
                      <td className="r" style={{ minWidth: 80 }}>{eid === p.id ? <input className="inp" type="number" value={ed.pts} onChange={e => setEd(d => ({ ...d, pts: +e.target.value || 0 }))} style={{ width: 72, textAlign: "right" }} /> : <span className="pts-big">{p.pts}</span>}</td>
                      <td><span className="oswald" style={{ fontSize: 11, letterSpacing: 1, color: p.active ? "var(--grn)" : "var(--muted)" }}>{p.active ? "● AKTĪVS" : "○ NEAKTĪVS"}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 5 }}>
                          {eid === p.id
                            ? <><button className="btn btn-b btn-sm" onClick={savePlayer}>Sagl.</button><button className="btn btn-o btn-sm" onClick={() => setEid(null)}>Atcelt</button></>
                            : <><button className="btn btn-o btn-sm" onClick={() => { setEid(p.id); setEd({ name: p.name, positions: posList(p), pts: p.pts, skill: skillOf(p) }); }}>✎</button>
                                <button className="btn btn-o btn-sm" onClick={async () => { await playersApi.update(p.id, { active: p.active ? 0 : 1 }); onPlayersChange(); }}>{p.active ? "Deakt." : "Akt."}</button>
                                {isSuper && <button className="btn btn-r btn-sm" onClick={() => deletePlayer(p)}>🗑</button>}</>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GAMES */}
      {tab === "gm" && (
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead><tr><th>#</th><th>Datums</th><th>Statuss</th><th className="r">⬜</th><th className="r">⬛</th><th className="r">Rezultāts</th><th>Darbības</th></tr></thead>
              <tbody>
                {allGames.map(g => {
                  const isGmEdit = gmEdit === g.id;
                  return (
                    <>
                      <tr key={g.id} style={{ opacity: g.cancelled ? 0.55 : 1 }}>
                        <td className="oswald" style={{ color: "var(--muted)" }}>{g.game_num}</td>
                        <td className="oswald" style={{ fontSize: 13, whiteSpace: "nowrap" }}>{fmt(g.date)}</td>
                        <td><span className="oswald" style={{ fontSize: 11, letterSpacing: 1, color: g.cancelled ? "var(--red)" : g.status === "played" ? "var(--grn)" : "var(--ice)" }}>{g.cancelled ? "ATCELTS" : g.status === "played" ? "✓" : "PLĀNOTA"}</span></td>
                        <td className="r" style={{ fontSize: 12, color: "var(--muted)" }}>{g.white_count || 0}</td>
                        <td className="r" style={{ fontSize: 12, color: "var(--muted)" }}>{g.black_count || 0}</td>
                        <td className="r">{g.white_score !== null && g.white_score !== undefined ? <span className="oswald" style={{ fontSize: 15 }}>{g.white_score}<span style={{ color: "var(--muted)" }}>:</span><span style={{ color: "#8aa0b8" }}>{g.black_score}</span></span> : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                        <td><button className="btn btn-o btn-sm" onClick={() => { setGmEdit(isGmEdit ? null : g.id); setGwv(g.white_score ?? ""); setGbv(g.black_score ?? ""); }}>{g.white_score !== null ? "✎" : "Ievadīt"}</button></td>
                      </tr>
                      {isGmEdit && (
                        <tr key={`${g.id}-e`}>
                          <td colSpan={7} style={{ background: "var(--c2)", padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span className="oswald" style={{ fontSize: 12, color: "var(--muted)", letterSpacing: 1 }}>BALTIE:</span>
                              <input className="inp" type="number" min="0" max="50" value={gwv} onChange={e => setGwv(e.target.value)} style={{ width: 64, textAlign: "center" }} />
                              <span className="oswald" style={{ fontSize: 20, color: "var(--muted)" }}>:</span>
                              <input className="inp" type="number" min="0" max="50" value={gbv} onChange={e => setGbv(e.target.value)} style={{ width: 64, textAlign: "center" }} />
                              <span className="oswald" style={{ fontSize: 12, color: "var(--muted)", letterSpacing: 1 }}>MELNIE</span>
                              <button className="btn btn-b btn-sm" onClick={() => saveResult(g)}>Saglabāt</button>
                              <button className="btn btn-o btn-sm" onClick={() => setGmEdit(null)}>Atcelt</button>
                              {g.awarded ? <span style={{ fontSize: 12, color: "var(--grn)" }}>✓ Punkti piešķirti</span> : null}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD PLAYER */}
      {tab === "add" && (
        <div style={{ maxWidth: 400 }}>
          <div className="card card-pad">
            <h3 className="oswald" style={{ fontSize: 18, marginBottom: 18, color: "var(--txt)" }}>Jauns spēlētājs</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="oswald" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 4 }}>VĀRDS UZVĀRDS</div>
                <input className="inp w100" value={np.name} onChange={e => setNp(p => ({ ...p, name: e.target.value }))} placeholder="Jānis Bērziņš" onKeyDown={e => e.key === "Enter" && addPlayer()} />
              </div>
              <div>
                <div className="oswald" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 6 }}>POZĪCIJA(-S) — var vairākas</div>
                <PosPicker value={np.positions} onChange={v => setNp(p => ({ ...p, positions: v }))} />
              </div>
              {isSuper && (
                <div>
                  <div className="oswald" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 6 }}>SKILL (1–10)</div>
                  <input className="inp" type="number" min="1" max="10" value={np.skill} onChange={e => setNp(p => ({ ...p, skill: Math.max(1, Math.min(10, +e.target.value || 1)) }))} style={{ width: 80, textAlign: "center" }} />
                </div>
              )}
              <button className="btn btn-b w100" style={{ justifyContent: "center" }} onClick={addPlayer}>+ Pievienot</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW SEASON */}
      {tab === "sz" && (
        <div style={{ maxWidth: 400 }}>
          <div className="card card-pad">
            <h3 className="oswald" style={{ fontSize: 18, marginBottom: 18, color: "var(--txt)" }}>Jauna sezona</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Automātiski ģenerē trešdienu spēles no sākuma līdz beigu datumam. Aktīvā sezona tiks deaktivēta.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="oswald" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 4 }}>SEZONAS NOSAUKUMS</div>
                <input className="inp w100" value={newSeason.name} onChange={e => setNewSeason(s => ({ ...s, name: e.target.value }))} placeholder="piem. 2027" />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="oswald" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 4 }}>SĀKUMS</div>
                  <input type="date" className="inp w100" value={newSeason.start_date} onChange={e => setNewSeason(s => ({ ...s, start_date: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="oswald" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 4 }}>BEIGAS</div>
                  <input type="date" className="inp w100" value={newSeason.end_date} onChange={e => setNewSeason(s => ({ ...s, end_date: e.target.value }))} />
                </div>
              </div>
              <button className="btn btn-b w100" style={{ justifyContent: "center" }} onClick={createSeason} disabled={!newSeason.name || !newSeason.start_date || !newSeason.end_date}>Izveidot sezonu</button>
            </div>
          </div>

          {(seasonsList?.length > 0) && (
            <div className="card card-pad" style={{ marginTop: 16 }}>
              <h3 className="oswald" style={{ fontSize: 15, marginBottom: 12, color: "var(--txt)" }}>Esošās sezonas</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {seasonsList.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 8, borderBottom: "1px solid #eef1f6" }}>
                    <span className="oswald" style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</span>
                    {s.active === 1 && <span className="oswald" style={{ fontSize: 10, color: "var(--grn)", letterSpacing: 1 }}>● AKTĪVA</span>}
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{s.start_date} → {s.end_date}</span>
                    {isSuper && <button className="btn btn-r btn-sm" style={{ marginLeft: "auto" }} onClick={() => deleteSeason(s)}>🗑 Dzēst</button>}
                  </div>
                ))}
              </div>
              {!isSuper && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>Sezonu dzēšana pieejama tikai superadmin.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("st");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuper, setIsSuper] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pw, setPw] = useState(""), [pwErr, setPwErr] = useState(false);
  const [seasonId, setSeasonId] = useState(null);
  const [seasonsList, setSeasonsList] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [booting, setBooting] = useState(true);

  // Check auth on load
  useEffect(() => {
    auth.status().then(d => { setIsAdmin(d.isAdmin); setIsSuper(d.isSuper); });
  }, []);

  const loadSeasons = useCallback(() => seasonsApi.list().then(setSeasonsList), []);

  // Load active season
  useEffect(() => {
    seasonsApi.list().then(s => {
      setSeasonsList(s);
      const active = s.find(x => x.active) || s[0];
      if (active) setSeasonId(active.id);
    }).finally(() => setBooting(false));
  }, []);

  const loadGames   = useCallback(() => { if (seasonId) gamesApi.list(seasonId).then(setAllGames); }, [seasonId]);
  const loadPlayers = useCallback(() => { if (seasonId) playersApi.list(seasonId).then(setAllPlayers); }, [seasonId]);

  useEffect(() => { loadGames(); loadPlayers(); }, [seasonId]);

  const tryLogin = async () => {
    try {
      const r = await auth.login(pw);
      setIsAdmin(true); setIsSuper(r.role === "super");
      setLoginOpen(false); setPw(""); setPwErr(false);
    }
    catch { setPwErr(true); setPw(""); }
  };
  const logout = async () => { await auth.logout(); setIsAdmin(false); setIsSuper(false); };

  const nextGame = allGames.find(g => !g.cancelled && g.status === "upcoming");

  if (booting) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "var(--bg)" }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="app">
      <style>{CSS}</style>

      {/* HEADER */}
      <div className="hdr">
        <div className="hdr-in">
          <div className="logo">
            {LOGO && <img src={LOGO} alt="" style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 4 }} />}
            <span className="logo-title">AA DĪĶA ČEMPIONĀTS</span>
            <span className="logo-yr">2026</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {nextGame && (
              <div className="nxt-hide" style={{ textAlign: "right", fontSize: 12 }}>
                <div className="oswald" style={{ fontSize: 11, letterSpacing: 2, color: "#7ab4e8" }}>NĀKAMĀ SPĒLE</div>
                <div style={{ color: "#8aadcc", marginTop: 3 }}>{fmt(nextGame.date)} · {nextGame.time}</div>
              </div>
            )}
            <div style={{ position: "relative" }}>
              {isAdmin
                ? <button onClick={logout} title="Iziet" style={{ fontFamily: "Oswald,sans-serif", fontSize: 12, letterSpacing: 1,
                    background: isSuper ? "rgba(217,119,6,.2)" : "rgba(22,163,74,.2)",
                    color: isSuper ? "#fbbf24" : "#22c55e",
                    border: `1px solid ${isSuper ? "rgba(217,119,6,.4)" : "rgba(22,163,74,.35)"}`,
                    padding: "6px 14px", borderRadius: 5, cursor: "pointer" }}>● {isSuper ? "SUPER" : "ADMIN"}</button>
                : <button onClick={() => setLoginOpen(v => !v)} style={{ fontFamily: "Oswald,sans-serif", fontSize: 16, background: "transparent", color: "#4a6a8a", border: "1px solid #1a3050", padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>🔒</button>}
              {loginOpen && !isAdmin && (
                <div className="pw-box">
                  <div className="oswald" style={{ fontSize: 11, letterSpacing: 2, color: "#7ab4e8", marginBottom: 10 }}>ADMIN PAROLE</div>
                  <input type="password" className={`pw-inp${pwErr ? " err" : ""}`} value={pw}
                    onChange={e => { setPw(e.target.value); setPwErr(false); }}
                    onKeyDown={e => e.key === "Enter" && tryLogin()} autoFocus placeholder="Ievadi paroli..." />
                  {pwErr && <div className="oswald" style={{ fontSize: 11, color: "#c8102e", marginBottom: 8, letterSpacing: 1 }}>NEPAREIZA PAROLE</div>}
                  <button className="pw-btn" onClick={tryLogin}>Ieiet</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NAV */}
      <div className="nav">
        <div className="nav-in">
          {[["st","🏒 Tabula"],["gd","🎯 Spēles Diena"],["cal","📅 Kalendārs"],["arc","📁 Arhīvs"],["adm","⚙ Admin"]].map(([k, l]) => (
            <button key={k} className={`nbtn ${view === k ? "on" : ""}`} onClick={() => { setView(k); setLoginOpen(false); }}>{l}</button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="pg">
        {view === "st"  && <Standings seasonId={seasonId} allGames={allGames} />}
        {view === "gd"  && <GameDay seasonId={seasonId} allGames={allGames} allPlayers={allPlayers} isAdmin={isAdmin} isSuper={isSuper} onGamesChange={loadGames} />}
        {view === "cal" && <Calendar allGames={allGames} isAdmin={isAdmin} onGamesChange={loadGames} />}
        {view === "arc" && <Archive seasonId={seasonId} />}
        {view === "adm" && (isAdmin
          ? <Admin seasonId={seasonId} isSuper={isSuper} allPlayers={allPlayers} onPlayersChange={loadPlayers} allGames={allGames} onGamesChange={loadGames} seasonsList={seasonsList} onSeasonsChange={loadSeasons} />
          : <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>🔒</div>
              <h2 className="oswald" style={{ fontSize: 22, letterSpacing: 2, color: "var(--txt)", marginBottom: 8 }}>NEPIECIEŠAMA ADMIN PIEKĻUVE</h2>
              <p style={{ fontSize: 13, color: "var(--muted)" }}>Izmanto 🔒 pogu augšā labajā stūrī.</p>
            </div>
        )}
      </div>
    </div>
  );
}
