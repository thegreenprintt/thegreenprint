"use client";

import { useEffect, useRef, useState } from "react";

/* ────────────────────────────────────────────────────────────────────────────
   THE GREENPRINT — app shell
   Sleek dark, Robinhood/Outlier energy. Tabs: Scores · Picks · Trades ·
   Community · Live. Data: ESPN free feeds. Trades + chat persist per-device.
──────────────────────────────────────────────────────────────────────────── */

const GREEN = "#00FF87";
const INK = "#05080B";

const SPORTS = ["NFL", "NBA", "WNBA", "MLB", "NHL"];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
.gp *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
.gp{font-family:'Inter',system-ui,sans-serif;color:#fff}
.gp .disp{font-family:'Space Grotesk','Inter',sans-serif}
@keyframes gpUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes gpPop{0%{opacity:0;transform:scale(.94)}100%{opacity:1;transform:scale(1)}}
@keyframes gpPulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes gpShim{0%{background-position:-360px 0}100%{background-position:360px 0}}
@keyframes gpGlow{0%,100%{opacity:.5}50%{opacity:.9}}
.gp .up{animation:gpUp .5s cubic-bezier(.2,.8,.2,1) both}
.gp .pop{animation:gpPop .4s ease both}
.gp .skel{background:linear-gradient(90deg,rgba(255,255,255,.05) 25%,rgba(255,255,255,.11) 37%,rgba(255,255,255,.05) 63%);background-size:720px 100%;animation:gpShim 1.3s infinite}
.gp .tab{transition:color .2s,background .2s,transform .15s}
.gp .tab:active{transform:scale(.9)}
.gp .card{transition:transform .18s ease,border-color .2s,box-shadow .2s}
.gp .card:hover{transform:translateY(-3px);border-color:rgba(0,255,135,.4);box-shadow:0 20px 46px rgba(0,0,0,.5),0 0 0 1px rgba(0,255,135,.12)}
.gp .btn{transition:transform .12s,filter .2s}
.gp .btn:active{transform:scale(.96)}
.gp .live-dot{animation:gpPulse 1.1s infinite}
.gp input,.gp select{font-family:inherit}
.gp::-webkit-scrollbar{width:0}
`;

type Rate = { hit: number; of: number; pct: number };
type Slip = {
  player: string; headshot?: string; pos?: string; team: string; opp: string;
  stat: string; line: number; side: "Over" | "Under"; tier: "ELITE" | "STRONG" | "LEAN";
  l5: Rate; l10: Rate; season: Rate; spark?: { v: number; hit: boolean }[];
  pid?: string; eid?: string; sk?: string; league: string;
};
type BoxMap = Record<string, { state: string; detail: string; players: Record<string, Record<string, number>> }>;
type Side = { abbr: string; name: string; logo: string; score: number | null; record: string; winner: boolean };
type Situation = { poss: string; dd: string; last: string };
type Game = { id: string; state: string; detail: string; clock: string; period?: number; start: string; situation?: Situation | null; home: Side; away: Side };
type Trade = { id: number; pair: string; side: "BUY" | "SELL"; pnl: number; note: string; ts: number };
type Msg = { id: number; user: string; text: string; ts: number };
type Leg = { player: string; headshot?: string; pos?: string; team: string; opp: string; stat: string; line: number; side: "Over" | "Under"; tier: string; pid?: string; eid?: string; sk?: string; league: string };
type SavedSlip = { id: number; ts: number; legs: Leg[] };

const tierColor = (t: string) => (t === "ELITE" ? GREEN : t === "STRONG" ? "#67E8FF" : "#FFC24B");
const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
/* ── shared bits ─────────────────────────────────────────────────────────── */
function SportBar({ sport, setSport }: { sport: string; setSport: (s: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 0 4px" }}>
      {SPORTS.map((s) => (
        <button key={s} className="btn" onClick={() => setSport(s)}
          style={{
            padding: "8px 16px", borderRadius: 999, fontWeight: 800, fontSize: 13, cursor: "pointer",
            whiteSpace: "nowrap", border: "1px solid " + (sport === s ? GREEN : "rgba(255,255,255,.12)"),
            background: sport === s ? GREEN : "rgba(255,255,255,.03)", color: sport === s ? INK : "#fff",
          }}>{s}</button>
      ))}
    </div>
  );
}
const Skel = ({ h }: { h: number }) => <div className="skel" style={{ height: h, borderRadius: 16, marginBottom: 12 }} />;
const Empty = ({ t }: { t: string }) => <div style={{ color: "rgba(255,255,255,.5)", padding: "44px 6px", textAlign: "center", fontSize: 14.5 }}>{t}</div>;

/* ── SCORES ──────────────────────────────────────────────────────────────── */
function TeamRow({ s, live, poss }: { s: Side; live: boolean; poss?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
      <div style={{ width: 26, height: 26, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {s.logo ? <img src={s.logo} alt="" width={26} height={26} /> : null}
      </div>
      <div style={{ flex: 1, fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
        <span>{s.abbr || s.name}</span>
        {poss ? <span title="has possession" style={{ fontSize: 11, lineHeight: 1 }}>🏈</span> : null}
      </div>
      {s.record ? <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginRight: 8 }}>{s.record}</div> : null}
      <div className="disp" style={{ fontSize: 20, fontWeight: 700, color: s.winner ? GREEN : "#fff", minWidth: 30, textAlign: "right" }}>
        {s.score != null ? s.score : "–"}
      </div>
    </div>
  );
}
function ScoresTab({ sport }: { sport: string }) {
  const [games, setGames] = useState<Game[]>([]);
  const [st, setSt] = useState<"load" | "ok" | "empty">("load");
  useEffect(() => {
    let live = true;
    const pull = () => fetch(`/api/props?type=scores&league=${sport}&t=${Date.now()}`).then((r) => r.json()).then((d) => {
      if (!live) return; const g: Game[] = d?.games || []; setGames(g); setSt(g.length ? "ok" : "empty");
    }).catch(() => live && setSt("empty"));
    setSt("load"); pull();
    const iv = setInterval(pull, 12000);
    return () => { live = false; clearInterval(iv); };
  }, [sport]);
  if (st === "load") return <div>{[0, 1, 2].map((i) => <Skel key={i} h={96} />)}</div>;
  if (st === "empty") return <Empty t={`No ${sport} games on the board right now.`} />;
  const anyLive = games.some((g) => g.state === "in");
  return (
    <div>
      {anyLive ? (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", color: "rgba(255,255,255,.5)" }}>
          <span className="live-dot" style={{ width: 7, height: 7, borderRadius: 999, background: GREEN, display: "inline-block" }} />
          UPDATING LIVE · REFRESHES EVERY 12s
        </div>
      ) : null}
      {games.map((g, i) => {
        const isLive = g.state === "in";
        const sit = isLive ? g.situation : null;
        const awayPoss = !!(sit && sit.poss && g.away.abbr && sit.poss === g.away.abbr);
        const homePoss = !!(sit && sit.poss && g.home.abbr && sit.poss === g.home.abbr);
        return (
          <div key={g.id} className="card up" style={{ animationDelay: `${i * 40}ms`, background: "linear-gradient(180deg,#0C1319,#080D11)", border: isLive ? "1px solid rgba(0,255,135,.28)" : "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", color: isLive ? GREEN : "rgba(255,255,255,.45)", display: "flex", alignItems: "center", gap: 6 }}>
                {isLive ? <span className="live-dot" style={{ width: 7, height: 7, borderRadius: 999, background: GREEN, display: "inline-block" }} /> : null}
                {g.detail || (g.state === "pre" ? "Upcoming" : "Final")}
              </span>
              {isLive && g.clock ? <span className="disp" style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>{g.clock}</span> : null}
            </div>
            <TeamRow s={g.away} live={isLive} poss={awayPoss} />
            <TeamRow s={g.home} live={isLive} poss={homePoss} />
            {sit && (sit.dd || sit.last) ? (
              <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,.06)", fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.45 }}>
                {sit.dd ? <span style={{ color: GREEN, fontWeight: 700 }}>{sit.dd}</span> : null}
                {sit.dd && sit.last ? " · " : ""}
                {sit.last || ""}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ── PICKS ───────────────────────────────────────────────────────────────── */
function Ring({ pct }: { pct: number }) {
  const r = 20, c = 2 * Math.PI * r, off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  const col = pct >= 80 ? GREEN : pct >= 65 ? "#67E8FF" : "#FFC24B";
  return (
    <svg width={52} height={52} viewBox="0 0 52 52" style={{ flex: "0 0 auto" }}>
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="5" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 26 26)" style={{ transition: "stroke-dashoffset .8s ease" }} />
      <text x="25.5" y="29.5" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-0.5">{pct}</text>
      <text x="25.5" y="29.5" dx="12" textAnchor="middle" fontSize="8" fontWeight="700" fill="rgba(255,255,255,.5)" fontFamily="Inter, system-ui, sans-serif">%</text>
    </svg>
  );
}
function Spark({ data, side }: { data?: { v: number; hit: boolean }[]; side: string }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "rgba(255,255,255,.4)" }}>LAST 10</span>
        <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)" }}>
          <span style={{ color: GREEN, fontWeight: 800 }}>{data.filter((d) => d.hit).length}/10 hit</span> {side.toLowerCase()}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
            <div style={{ height: Math.max(14, (d.v / max) * 100) + "%", borderRadius: 3, background: d.hit ? GREEN : "rgba(255,90,90,.5)", transition: "height .5s ease" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
function PickProgress({ s, box }: { s: Slip; box: BoxMap }) {
  const tk = s.eid && box[s.eid] ? box[s.eid] : null;
  if (!tk) return null;
  const cur = s.pid && tk.players && tk.players[s.pid] ? tk.players[s.pid][s.sk || ""] : undefined;
  if (cur == null || isNaN(cur as number)) return null;
  const isLive = tk.state === "in";
  const isFinal = tk.state === "post";
  if (!isLive && !isFinal) return null;
  const hit = s.side === "Over" ? cur > s.line : cur < s.line;
  let right;
  if (isFinal) right = <span style={{ fontWeight: 900, color: hit ? GREEN : "#FF7C7C" }}>{hit ? "✅ HIT" : "❌ MISS"}</span>;
  else if (s.side === "Over") right = hit ? <span style={{ fontWeight: 800, color: GREEN }}>on pace ✅</span> : <span style={{ color: "rgba(255,255,255,.55)" }}>needs {(s.line - cur).toFixed(1)}</span>;
  else right = hit ? <span style={{ fontWeight: 800, color: GREEN }}>under ✅</span> : <span style={{ fontWeight: 800, color: "#FF7C7C" }}>❌ over</span>;
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}>
      <span style={{ color: "rgba(255,255,255,.6)" }}>
        {isLive ? <span className="live-dot" style={{ color: GREEN, fontWeight: 800 }}>● LIVE </span> : null}
        <span className="disp" style={{ fontWeight: 800, color: "#fff" }}>{cur}</span> / {s.line} {s.stat}
      </span>
      {right}
    </div>
  );
}
function SlipCard({ s, i, box, added, onToggle }: { s: Slip; i: number; box: BoxMap; added: boolean; onToggle: () => void }) {
  return (
    <div className="card up" style={{ animationDelay: `${i * 45}ms`, background: "linear-gradient(180deg,#0C1319,#080D11)", border: "1px solid rgba(0,255,135,.14)", borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,.06)", overflow: "hidden", flex: "0 0 auto" }}>
          {s.headshot ? <img src={s.headshot} alt="" width={44} height={44} style={{ objectFit: "cover" }} /> : null}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15.5 }}>{s.player}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 1 }}>{s.pos ? s.pos + " · " : ""}{s.team} vs {s.opp}</div>
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: ".07em", color: INK, background: tierColor(s.tier), padding: "5px 8px", borderRadius: 7 }}>{s.tier}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
        <Ring pct={s.l10.pct} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
            <span className="disp" style={{ fontSize: 15, fontWeight: 700, color: s.side === "Over" ? GREEN : "#FF7C7C" }}>{s.side}</span>
            <span className="disp" style={{ fontSize: 23, fontWeight: 700 }}>{s.line}</span>
            <span style={{ fontSize: 13.5, color: "rgba(255,255,255,.65)", fontWeight: 600 }}>{s.stat}</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 4 }}>
            L5 {s.l5.hit}/{s.l5.of} · L10 {s.l10.hit}/{s.l10.of} · Szn {s.season.pct}%
          </div>
        </div>
      </div>
      <Spark data={s.spark} side={s.side} />
      <PickProgress s={s} box={box} />
      <AddButton added={added} onClick={onToggle} />
    </div>
  );
}
function LockCard({ s, box, added, onToggle }: { s: Slip; box: BoxMap; added: boolean; onToggle: () => void }) {
  return (
    <div className="card up" style={{ background: "linear-gradient(135deg,rgba(0,255,135,.16),rgba(12,19,25,.92))", border: "1px solid rgba(0,255,135,.5)", borderRadius: 18, padding: 16, marginBottom: 16, boxShadow: "0 12px 40px rgba(0,255,135,.14)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: ".08em", color: GREEN }}>🔒 LOCK OF THE DAY</span>
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".06em", color: INK, background: GREEN, padding: "3px 8px", borderRadius: 999 }}>{s.tier}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,.06)", flex: "0 0 auto" }}>
          {s.headshot ? <img src={s.headshot} alt="" width={52} height={52} style={{ objectFit: "cover" }} /> : null}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{s.player}</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)", marginTop: 2 }}>{s.pos ? s.pos + " · " : ""}{s.team} vs {s.opp}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 6 }}>
            <span className="disp" style={{ fontSize: 16, fontWeight: 800, color: s.side === "Over" ? GREEN : "#FF7C7C" }}>{s.side}</span>
            <span className="disp" style={{ fontSize: 24, fontWeight: 800 }}>{s.line}</span>
            <span style={{ fontSize: 13.5, color: "rgba(255,255,255,.65)", fontWeight: 600 }}>{s.stat}</span>
          </div>
        </div>
        <Ring pct={s.l10.pct} />
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(0,255,135,.18)" }}>
        Hit <span style={{ color: GREEN, fontWeight: 800 }}>{s.l10.hit}/{s.l10.of}</span> of the last 10 · L5 {s.l5.hit}/{s.l5.of} · Season {s.season.pct}%
      </div>
      <PickProgress s={s} box={box} />
      <AddButton added={added} onClick={onToggle} />
    </div>
  );
}
const legKey = (l: { eid?: string; pid?: string; sk?: string }) => `${l.eid || ""}|${l.pid || ""}|${l.sk || ""}`;
function slipLeg(s: Slip): Leg {
  return { player: s.player, headshot: s.headshot, pos: s.pos, team: s.team, opp: s.opp, stat: s.stat, line: s.line, side: s.side, tier: s.tier, pid: s.pid, eid: s.eid, sk: s.sk, league: s.league };
}
function AddButton({ added, onClick }: { added: boolean; onClick: () => void }) {
  return (
    <button className="btn" onClick={onClick}
      style={{ marginTop: 12, width: "100%", border: "1px solid " + (added ? GREEN : "rgba(255,255,255,.16)"), background: added ? "rgba(0,255,135,.12)" : "rgba(255,255,255,.03)", color: added ? GREEN : "#fff", borderRadius: 11, padding: "10px 12px", fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}>
      {added ? "✓ On your slip — tap to remove" : "+ Add to slip"}
    </button>
  );
}
function LegRow({ l, box }: { l: Leg; box: BoxMap }) {
  const tk = l.eid && box[l.eid] ? box[l.eid] : null;
  const cur = tk && l.pid && tk.players && tk.players[l.pid] ? tk.players[l.pid][l.sk || ""] : undefined;
  const has = cur != null && !isNaN(cur as number);
  const isFinal = !!(tk && tk.state === "post");
  const isLive = !!(tk && tk.state === "in");
  const hit = has ? (l.side === "Over" ? (cur as number) > l.line : (cur as number) < l.line) : false;
  let right;
  if (isFinal && has) right = <span style={{ fontWeight: 900, color: hit ? GREEN : "#FF7C7C" }}>{hit ? "✅" : "❌"}</span>;
  else if (isLive && has) right = <span className="live-dot" style={{ fontWeight: 800, color: hit ? GREEN : "rgba(255,255,255,.55)" }}>{hit ? "✅ on pace" : "● live"}</span>;
  else right = <span style={{ color: "rgba(255,255,255,.4)", fontSize: 11.5 }}>upcoming</span>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.05)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.player}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>{l.side} {l.line} {l.stat} · {l.team}</div>
      </div>
      {has ? <span className="disp" style={{ fontSize: 14, fontWeight: 800 }}>{cur as number}<span style={{ color: "rgba(255,255,255,.4)", fontWeight: 600, fontSize: 11.5 }}>/{l.line}</span></span> : null}
      <span style={{ minWidth: 54, textAlign: "right", fontSize: 12 }}>{right}</span>
    </div>
  );
}
function MySlips({ saved, onRemove }: { saved: SavedSlip[]; onRemove: (id: number) => void }) {
  const [box, setBox] = useState<BoxMap>({});
  useEffect(() => {
    const keys: string[] = [];
    for (const s of saved) for (const l of s.legs) if (l.eid) { const k = l.league + "|" + l.eid; if (keys.indexOf(k) === -1) keys.push(k); }
    if (!keys.length) { setBox({}); return; }
    let live = true;
    const pull = async () => {
      const m: BoxMap = {};
      await Promise.all(keys.map(async (k) => {
        const i = k.indexOf("|"); const lg = k.slice(0, i); const eid = k.slice(i + 1);
        try { const d = await fetch(`/api/props?type=box&league=${lg}&event=${eid}&t=${Date.now()}`).then((r) => r.json()); if (d && d.players) m[eid] = d; } catch (e) {}
      }));
      if (live) setBox(m);
    };
    pull(); const iv = setInterval(pull, 20000);
    return () => { live = false; clearInterval(iv); };
  }, [saved]);
  if (!saved.length) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", color: GREEN, margin: "0 2px 10px" }}>🎟️ MY SLIPS</div>
      {saved.map((s) => {
        let fin = 0, finHit = 0, hitting = 0, started = 0;
        for (const l of s.legs) {
          const tk = l.eid && box[l.eid] ? box[l.eid] : null;
          const cur = tk && l.pid && tk.players && tk.players[l.pid] ? tk.players[l.pid][l.sk || ""] : undefined;
          const has = cur != null && !isNaN(cur as number);
          const good = has ? (l.side === "Over" ? (cur as number) > l.line : (cur as number) < l.line) : false;
          if (tk && (tk.state === "in" || tk.state === "post")) started++;
          if (tk && tk.state === "post" && has) { fin++; if (good) finHit++; }
          if (tk && tk.state === "in" && good) hitting++;
        }
        const allFinal = fin === s.legs.length && s.legs.length > 0;
        const won = allFinal && finHit === s.legs.length;
        const status = allFinal ? (won ? "WON" : "LOST") : started ? "LIVE" : "UPCOMING";
        const stCol = allFinal ? (won ? GREEN : "#FF7C7C") : started ? GREEN : "rgba(255,255,255,.5)";
        return (
          <div key={s.id} className="card" style={{ background: "linear-gradient(180deg,#0C1319,#080D11)", border: "1px solid " + (allFinal ? (won ? "rgba(0,255,135,.5)" : "rgba(255,124,124,.4)") : "rgba(255,255,255,.08)"), borderRadius: 16, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>{s.legs.length}-leg slip</span>
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".05em", color: INK, background: stCol, padding: "3px 8px", borderRadius: 999 }}>{status}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.45)" }}>{finHit + hitting}/{s.legs.length} hitting</span>
              <button className="btn" onClick={() => onRemove(s.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.35)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
            </div>
            {s.legs.map((l, i) => <LegRow key={i} l={l} box={box} />)}
          </div>
        );
      })}
    </div>
  );
}
function SlipBar({ slip, onSave, onClear }: { slip: Leg[]; onSave: () => void; onClear: () => void }) {
  if (!slip.length) return null;
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 72, zIndex: 25, display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto", width: "100%", maxWidth: 588, display: "flex", alignItems: "center", gap: 10, background: "rgba(10,16,20,.97)", border: "1px solid rgba(0,255,135,.4)", borderRadius: 14, padding: "10px 12px", boxShadow: "0 14px 44px rgba(0,0,0,.55)" }}>
        <span style={{ fontWeight: 800, fontSize: 13.5 }}>{slip.length} {slip.length === 1 ? "pick" : "picks"} on slip</span>
        <button className="btn" onClick={onClear} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>clear</button>
        <span style={{ flex: 1 }} />
        <button className="btn" onClick={onSave} style={{ background: GREEN, color: INK, border: "none", borderRadius: 10, padding: "9px 18px", fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}>Save &amp; track</button>
      </div>
    </div>
  );
}

function PicksTab({ sport }: { sport: string }) {
  const [slips, setSlips] = useState<Slip[]>([]);
  const [st, setSt] = useState<"load" | "ok" | "empty">("load");
  const [box, setBox] = useState<BoxMap>({});
  const [slip, setSlip] = useState<Leg[]>([]);
  const [saved, setSaved] = useState<SavedSlip[]>([]);
  useEffect(() => { setSlip(load<Leg[]>("gp_slip", [])); setSaved(load<SavedSlip[]>("gp_savedslips", [])); }, []);
  useEffect(() => {
    let live = true; setSt("load");
    fetch(`/api/props?league=${sport}&t=${Date.now()}`).then((r) => r.json()).then((d) => {
      if (!live) return; const a: Slip[] = d?.slips || []; setSlips(a); setSt(a.length ? "ok" : "empty");
    }).catch(() => live && setSt("empty"));
    return () => { live = false; };
  }, [sport]);
  useEffect(() => {
    if (!slips.length) return;
    const eids: string[] = [];
    for (const s of slips) if (s.eid && eids.indexOf(s.eid) === -1) eids.push(s.eid);
    if (!eids.length) return;
    let live = true;
    const pull = async () => {
      const m: BoxMap = {};
      await Promise.all(eids.map(async (eid) => {
        try { const d = await fetch(`/api/props?type=box&league=${sport}&event=${eid}&t=${Date.now()}`).then((r) => r.json()); if (d && d.players) m[eid] = d; } catch (e) {}
      }));
      if (live) setBox(m);
    };
    pull();
    const iv = setInterval(pull, 20000);
    return () => { live = false; clearInterval(iv); };
  }, [slips, sport]);
  const toggle = (s: Slip) => {
    const k = legKey(s);
    setSlip((prev) => { const ex = prev.some((x) => legKey(x) === k); const next = ex ? prev.filter((x) => legKey(x) !== k) : [...prev, slipLeg(s)]; save("gp_slip", next); return next; });
  };
  const inSlip = (s: Slip) => slip.some((x) => legKey(x) === legKey(s));
  const saveSlip = () => { if (!slip.length) return; setSaved((prev) => { const ns = [{ id: Date.now(), ts: Date.now(), legs: slip }, ...prev]; save("gp_savedslips", ns); return ns; }); setSlip([]); save("gp_slip", []); };
  const clearSlip = () => { setSlip([]); save("gp_slip", []); };
  const removeSaved = (id: number) => { setSaved((prev) => { const ns = prev.filter((s) => s.id !== id); save("gp_savedslips", ns); return ns; }); };
  if (st === "load") return <div>{[0, 1, 2].map((i) => <Skel key={i} h={118} />)}</div>;
  if (st === "empty" && !saved.length) return <Empty t={`No ${sport} slate to grade yet — check back on a game day.`} />;
  return (
    <div>
      <MySlips saved={saved} onRemove={removeSaved} />
      {slips.length ? <LockCard s={slips[0]} box={box} added={inSlip(slips[0])} onToggle={() => toggle(slips[0])} /> : null}
      {slips.length > 1 ? <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", color: "rgba(255,255,255,.4)", margin: "4px 2px 12px" }}>MORE TOP PICKS</div> : null}
      {slips.slice(1).map((s, i) => <SlipCard key={i} s={s} i={i} box={box} added={inSlip(s)} onToggle={() => toggle(s)} />)}
      <SlipBar slip={slip} onSave={saveSlip} onClear={clearSlip} />
    </div>
  );
}

/* ── TRADES ──────────────────────────────────────────────────────────────── */
// Screenshot logging: read the image in the browser with tesseract.js (loaded
// on demand from CDN — no server, no cost), then pull the pair / side / P&L out
// of the text and pre-fill the form so the user confirms before it's logged.
function fileToDataURL(f: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("no_ctx"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img_load")); };
    img.src = url;
  });
}
function parseTradeText(raw: string): { pair?: string; side?: "BUY" | "SELL"; pnl?: string } {
  const t = (raw || "").replace(/[|]/g, " ");
  const up = t.toUpperCase();
  let side: "BUY" | "SELL" | undefined;
  if (/\bSELL\b|\bSHORT\b/.test(up)) side = "SELL";
  else if (/\bBUY\b|\bLONG\b/.test(up)) side = "BUY";
  let pair: string | undefined;
  const sym = up.match(/\b(XAUUSD|XAGUSD|US30|US100|NAS100|NASDAQ100|GER40|GER30|SPX500|US500|UK100|BTCUSD|ETHUSD|[A-Z]{3}\/?[A-Z]{3}|[A-Z]{2,5}\d{2,3})\b/);
  if (sym) pair = sym[1].replace("/", "");
  let pnl: string | undefined;
  const money = t.match(/[-+]?\$?\s?\d[\d,]*\.\d{2}/g) || t.match(/[-+]\$?\s?\d[\d,]*/g) || [];
  if (money.length) {
    const signed = money.find((s) => /[-+]/.test(s.trim()[0]));
    const norm = (s: string) => parseFloat(s.replace(/[^0-9.\-+]/g, ""));
    if (signed) pnl = String(norm(signed));
    else {
      const nums = money.map(norm).filter((n) => !isNaN(n));
      if (nums.length) pnl = String(nums.sort((a, b) => Math.abs(b) - Math.abs(a))[0]);
    }
  }
  return { pair, side, pnl };
}
function TradeStats({ trades }: { trades: Trade[] }) {
  if (trades.length < 2) return null;
  const chron = [...trades].reverse();
  let cum = 0; const pts = chron.map((t) => (cum += t.pnl));
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const grossWin = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const pf = grossLoss ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
  const expectancy = trades.reduce((a, t) => a + t.pnl, 0) / trades.length;
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const best = Math.max(...trades.map((t) => t.pnl));
  const worst = Math.min(...trades.map((t) => t.pnl));
  let curW = 0, curL = 0, maxW = 0, maxL = 0;
  for (const t of chron) { if (t.pnl > 0) { curW++; curL = 0; if (curW > maxW) maxW = curW; } else if (t.pnl < 0) { curL++; curW = 0; if (curL > maxL) maxL = curL; } }
  const byPair: Record<string, { n: number; w: number; net: number }> = {};
  for (const t of trades) { const k = t.pair || "—"; if (!byPair[k]) byPair[k] = { n: 0, w: 0, net: 0 }; byPair[k].n++; if (t.pnl > 0) byPair[k].w++; byPair[k].net += t.pnl; }
  const pairs = Object.keys(byPair).map((k) => [k, byPair[k]] as [string, { n: number; w: number; net: number }]).sort((a, b) => b[1].net - a[1].net);
  const W = 300, H = 70, min = Math.min(0, ...pts), max = Math.max(0, ...pts), rng = (max - min) || 1;
  const xs = (i: number) => (pts.length > 1 ? (i / (pts.length - 1)) * W : 0);
  const ys = (v: number) => H - ((v - min) / rng) * H;
  const line = pts.map((v, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  const area = line + ` L${W},${H} L0,${H} Z`;
  const up = pts[pts.length - 1] >= 0;
  const grid = [
    ["Profit factor", isFinite(pf) ? pf.toFixed(2) : "∞", pf >= 1 ? GREEN : "#FF7C7C"],
    ["Avg / trade", (expectancy >= 0 ? "+" : "") + expectancy.toFixed(2), expectancy >= 0 ? GREEN : "#FF7C7C"],
    ["Avg win", "+" + avgWin.toFixed(2), GREEN],
    ["Avg loss", "-" + avgLoss.toFixed(2), "#FF7C7C"],
    ["Best", "+" + best.toFixed(2), GREEN],
    ["Worst", worst.toFixed(2), "#FF7C7C"],
  ];
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ background: "linear-gradient(180deg,#0C1319,#080D11)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", color: "rgba(255,255,255,.45)" }}>EQUITY CURVE</span>
          <span className="disp" style={{ fontSize: 13, fontWeight: 800, color: up ? GREEN : "#FF7C7C" }}>{up ? "+" : ""}{pts[pts.length - 1].toFixed(2)}</span>
        </div>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={up ? "rgba(0,255,135,.35)" : "rgba(255,124,124,.35)"} /><stop offset="100%" stopColor="rgba(0,0,0,0)" /></linearGradient></defs>
          <path d={area} fill="url(#eqg)" />
          <path d={line} fill="none" stroke={up ? GREEN : "#FF7C7C"} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        {grid.map(([l, v, c]) => (
          <div key={l as string} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 11px" }}>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.45)", fontWeight: 600 }}>{l}</div>
            <div className="disp" style={{ fontSize: 15.5, fontWeight: 800, color: c as string, marginTop: 3 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)", margin: "0 2px 14px" }}>Longest streak: <span style={{ color: GREEN, fontWeight: 700 }}>{maxW}W</span> · <span style={{ color: "#FF7C7C", fontWeight: 700 }}>{maxL}L</span></div>
      {pairs.length ? (
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", color: "rgba(255,255,255,.4)", margin: "0 2px 8px" }}>BY PAIR</div>
          {pairs.slice(0, 5).map(([k, d]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{k}</span>
              <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)" }}>{Math.round((d.w / d.n) * 100)}% · {d.n}</span>
              <span className="disp" style={{ fontWeight: 800, fontSize: 13.5, color: d.net >= 0 ? GREEN : "#FF7C7C", minWidth: 64, textAlign: "right" }}>{d.net >= 0 ? "+" : ""}{d.net.toFixed(2)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
function TradesTab() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pair, setPair] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [pnl, setPnl] = useState("");
  const [scan, setScan] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTrades(load<Trade[]>("gp_trades", [])); }, []);
  const onFile = async (e: { target: HTMLInputElement }) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setScan("Reading your screenshot…");
    try {
      const dataUrl = await fileToDataURL(f, 1500);
      const r = await fetch("/api/ocr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: dataUrl }) });
      const d = await r.json();
      const parsed = parseTradeText(d.text || "");
      if (parsed.pair) setPair(parsed.pair);
      if (parsed.side) setSide(parsed.side);
      if (parsed.pnl) setPnl(parsed.pnl);
      setScan(
        parsed.pnl || parsed.pair
          ? "Got it — check the values below, then tap Log."
          : (d.text ? "Couldn't find the trade details — enter it manually." : "Couldn't read that one — enter it manually.")
      );
    } catch (err) {
      setScan("Screenshot read failed — enter it manually.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const add = () => {
    if (!pair.trim() || pnl === "") return;
    const t: Trade = { id: Date.now(), pair: pair.toUpperCase(), side, pnl: parseFloat(pnl) || 0, note: "", ts: Date.now() };
    const next = [t, ...trades]; setTrades(next); save("gp_trades", next); setPair(""); setPnl("");
  };
  const wins = trades.filter((t) => t.pnl > 0).length;
  const losses = trades.filter((t) => t.pnl < 0).length;
  const total = trades.reduce((a, t) => a + t.pnl, 0);
  const inp = { background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, color: "#fff", padding: "11px 12px", fontSize: 14, outline: "none" } as const;
  return (
    <div className="up">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[["Record", `${wins}-${losses}`, "#fff"], ["Win rate", trades.length ? Math.round((wins / (wins + losses || 1)) * 100) + "%" : "–", GREEN], ["Net P&L", (total >= 0 ? "+" : "") + total.toFixed(2), total >= 0 ? GREEN : "#FF7C7C"]].map(([l, v, c]) => (
          <div key={l as string} style={{ background: "linear-gradient(180deg,#0C1319,#080D11)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 12px" }}>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)", fontWeight: 600 }}>{l}</div>
            <div className="disp" style={{ fontSize: 22, fontWeight: 700, color: c as string, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
      <TradeStats trades={trades} />
      <div style={{ background: "linear-gradient(180deg,#0C1319,#080D11)", border: "1px solid rgba(0,255,135,.14)", borderRadius: 16, padding: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input style={{ ...inp, flex: 1 }} placeholder="Pair (e.g. NAS100)" value={pair} onChange={(e) => setPair(e.target.value)} />
          <button className="btn" onClick={() => setSide(side === "BUY" ? "SELL" : "BUY")}
            style={{ ...inp, cursor: "pointer", fontWeight: 800, color: side === "BUY" ? GREEN : "#FF7C7C", minWidth: 74 }}>{side}</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...inp, flex: 1 }} type="number" placeholder="P&L (+/-)" value={pnl} onChange={(e) => setPnl(e.target.value)} />
          <button className="btn" onClick={add} style={{ background: GREEN, color: INK, border: "none", borderRadius: 10, padding: "0 22px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Log</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
        <button className="btn" onClick={() => fileRef.current && fileRef.current.click()}
          style={{ marginTop: 10, width: "100%", background: "rgba(0,255,135,.08)", color: GREEN, border: "1px dashed rgba(0,255,135,.4)", borderRadius: 10, padding: "11px 12px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
          Log from a screenshot
        </button>
        {scan ? <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 8, textAlign: "center" }}>{scan}</div> : null}
      </div>
      {trades.length === 0 ? <Empty t="No trades logged yet. Add your first above." /> : trades.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, marginBottom: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: t.side === "BUY" ? GREEN : "#FF7C7C", minWidth: 40 }}>{t.side}</span>
          <span style={{ flex: 1, fontWeight: 700 }}>{t.pair}</span>
          <span className="disp" style={{ fontWeight: 700, color: t.pnl >= 0 ? GREEN : "#FF7C7C" }}>{t.pnl >= 0 ? "+" : ""}{t.pnl}</span>
        </div>
      ))}
    </div>
  );
}

/* ── SHARED CHAT ROOM (live, via /api/chat + Redis) ──────────────────────── */
function ChatRoom({ label }: { label?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [handle, setHandle] = useState("");
  const [editH, setEditH] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  useEffect(() => {
    let h = load<string>("gp_handle", "");
    if (!h) { h = "Trader" + Math.floor(100 + Math.random() * 900); save("gp_handle", h); }
    setHandle(h);
  }, []);

  useEffect(() => {
    let live = true;
    const pull = () => fetch("/api/chat?t=" + Date.now()).then((r) => r.json()).then((d) => {
      if (!live || !Array.isArray(d.messages)) return;
      setMsgs((prev) => {
        const next = d.messages as Msg[];
        const same = next.length === prev.length && (next.length === 0 || next[next.length - 1].id === prev[prev.length - 1].id);
        return same ? prev : next;
      });
    }).catch(() => {});
    pull();
    const iv = setInterval(pull, 4000);
    return () => { live = false; clearInterval(iv); };
  }, []);

  // Nudge ONLY the chat box (never the page) to the newest line — and only when
  // a new message actually arrives while you're already near the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (msgs.length > lastCount.current) {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
      if (nearBottom || lastCount.current === 0) el.scrollTop = el.scrollHeight;
    }
    lastCount.current = msgs.length;
  }, [msgs]);

  const send = async () => {
    const t = text.trim();
    if (!t || !handle) return;
    setText("");
    setMsgs((m) => [...m, { id: Date.now(), user: handle, text: t, ts: Date.now() }]);
    try {
      await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: handle, text: t }) });
      const d = await fetch("/api/chat?t=" + Date.now()).then((r) => r.json());
      if (Array.isArray(d.messages)) setMsgs(d.messages);
    } catch (e) {}
  };
  const saveHandle = () => { const h = handle.trim() || "Trader"; setHandle(h); save("gp_handle", h); setEditH(false); };

  return (
    <>
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "rgba(255,255,255,.45)", marginBottom: 10 }}>
        <span>{label || "Live room · everyone in the app"}</span>
        {editH ? (
          <input autoFocus value={handle} onChange={(e) => setHandle(e.target.value.slice(0, 24))} onBlur={saveHandle} onKeyDown={(e) => e.key === "Enter" && saveHandle()}
            style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, color: "#fff", padding: "4px 8px", fontSize: 12, outline: "none", maxWidth: 130 }} />
        ) : (
          <button className="btn" onClick={() => setEditH(true)} style={{ background: "none", border: "none", color: GREEN, fontWeight: 700, cursor: "pointer", fontSize: 11.5 }}>@{handle} · edit</button>
        )}
      </div>
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.length === 0 ? <div style={{ color: "rgba(255,255,255,.4)", textAlign: "center", padding: "30px 6px", fontSize: 14 }}>No messages yet — say something.</div> : null}
        {msgs.map((m) => {
          const me = m.user === handle;
          return (
            <div key={m.id} className="pop" style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "78%" }}>
              {!me ? <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, marginBottom: 3 }}>{m.user}</div> : null}
              <div style={{ background: me ? GREEN : "rgba(255,255,255,.06)", color: me ? INK : "#fff", padding: "9px 13px", borderRadius: 14, fontSize: 14, fontWeight: 500 }}>{m.text}</div>
            </div>
          );
        })}
      </div>
      <div style={{ flex: "none", display: "flex", gap: 8, marginTop: 12 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message the room…" style={{ flex: 1, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "#fff", padding: "12px 14px", fontSize: 14, outline: "none" }} />
        <button className="btn" onClick={send} style={{ background: GREEN, color: INK, border: "none", borderRadius: 12, padding: "0 20px", fontWeight: 800, cursor: "pointer" }}>Send</button>
      </div>
    </>
  );
}
function CommunityTab() {
  return (
    <div className="up" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
      <ChatRoom />
    </div>
  );
}

/* ── LIVE (fixed screen: stream on top, live chat below) ─────────────────── */
function LiveTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 168px)" }}>
      <div style={{ flex: "none", position: "relative", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(0,255,135,.2)", background: "linear-gradient(135deg,#0C1319,#05080B)", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,.5)", padding: "5px 10px", borderRadius: 8 }}>
          <span className="live-dot" style={{ width: 8, height: 8, borderRadius: 999, background: "#FF4D4D" }} />
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em" }}>LIVE</span>
        </div>
        <div style={{ textAlign: "center", padding: 20 }}>
          <div className="disp" style={{ fontSize: 20, fontWeight: 700 }}>The Greenprint Live</div>
          <div style={{ color: "rgba(255,255,255,.55)", fontSize: 13, margin: "5px 0 12px" }}>Trading breakdowns, picks &amp; Q&amp;A</div>
          <a href="https://1house.tv" target="_blank" rel="noreferrer" className="btn"
            style={{ display: "inline-block", background: GREEN, color: INK, fontWeight: 800, padding: "10px 20px", borderRadius: 12, textDecoration: "none", fontSize: 13.5 }}>Watch on 1House.tv</a>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, marginTop: 12, display: "flex", flexDirection: "column" }}>
        <ChatRoom label="Live chat · talk during the stream" />
      </div>
    </div>
  );
}

/* ── NAV ─────────────────────────────────────────────────────────────────── */
const ICONS: Record<string, string> = {
  Scores: "M4 6h16M4 12h16M4 18h10",
  Picks: "M5 13l4 4L19 7",
  Trades: "M3 17l6-6 4 4 7-8",
  Community: "M4 5h16v10H7l-3 3V5z",
  Live: "M8 5v14l11-7z",
};
function BottomNav({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const tabs = ["Scores", "Picks", "Trades", "Community", "Live"];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20, background: "rgba(7,11,15,.86)", backdropFilter: "blur(14px)", borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-around", padding: "9px 6px calc(9px + env(safe-area-inset-bottom))" }}>
      {tabs.map((t) => {
        const on = tab === t;
        return (
          <button key={t} className="tab btn" onClick={() => setTab(t)}
            style={{ background: "none", border: "none", cursor: "pointer", color: on ? GREEN : "rgba(255,255,255,.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[t]} /></svg>
            <span style={{ fontSize: 10.5, fontWeight: 700 }}>{t}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── BOOK PICKER (top-right) ─────────────────────────────────────────────── */
const BOOKS = [
  { key: "underdog", label: "UD", color: "#F4C430", domain: "underdogfantasy.com" },
  { key: "prizepicks", label: "PP", color: "#8A5CFF", domain: "prizepicks.com" },
  { key: "fanduel", label: "FD", color: "#1493FF", domain: "fanduel.com" },
  { key: "draftkings", label: "DK", color: "#53D337", domain: "draftkings.com" },
  { key: "sleeper", label: "SL", color: "#FF7A59", domain: "sleeper.com" },
];
function BookIcon({ b, on }: { b: (typeof BOOKS)[number]; on: boolean }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <span style={{ fontSize: 10.5, fontWeight: 900, color: on ? INK : b.color }}>{b.label}</span>
    );
  }
  return (
    <img
      src={`https://icons.duckduckgo.com/ip3/${b.domain}.ico`}
      alt={b.key}
      width={20}
      height={20}
      onError={() => setErr(true)}
      style={{ width: 20, height: 20, borderRadius: 6, objectFit: "cover", display: "block" }}
    />
  );
}
function BookPicker({ book, setBook }: { book: string; setBook: (b: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 7 }}>
      {BOOKS.map((b) => {
        const on = book === b.key;
        return (
          <button key={b.key} className="btn" onClick={() => setBook(b.key)} title={b.key}
            style={{
              width: 32, height: 32, borderRadius: 999, cursor: "pointer", padding: 0,
              background: on ? "#fff" : "rgba(255,255,255,.06)",
              border: on ? "none" : "1px solid rgba(255,255,255,.14)",
              display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto",
              opacity: on ? 1 : 0.62,
              boxShadow: on ? "0 0 0 2px rgba(0,255,133,.8)" : "none",
              transition: "opacity .15s, box-shadow .15s",
            }}><BookIcon b={b} on={on} /></button>
        );
      })}
    </div>
  );
}

/* ── ROOT ────────────────────────────────────────────────────────────────── */
function urlB64ToUint8(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
function NotifyBell() {
  const [state, setState] = useState<"idle" | "on" | "busy" | "denied" | "no">("idle");
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setState("no"); return; }
    if (Notification.permission === "granted") setState("on");
    else if (Notification.permission === "denied") setState("denied");
  }, []);
  const enable = async () => {
    if (state === "on" || state === "busy") return;
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "idle"); return; }
      const d = await fetch("/api/chat?kind=push").then((r) => r.json());
      if (!d || !d.key) { setState("idle"); return; }
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(d.key) });
      await fetch("/api/chat?kind=push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "subscribe", subscription: sub }) });
      setState("on");
    } catch (e) { setState("idle"); }
  };
  if (state === "no") return null;
  return (
    <button className="btn" onClick={enable} title="Notifications" aria-label="Notifications"
      style={{ width: 36, height: 36, borderRadius: 999, flex: "0 0 auto", border: "1px solid " + (state === "on" ? GREEN : "rgba(255,255,255,.16)"), background: state === "on" ? "rgba(0,255,135,.12)" : "rgba(255,255,255,.04)", color: state === "on" ? GREEN : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: state === "on" ? "default" : "pointer" }}>
      {state === "busy"
        ? <span style={{ fontSize: 12, fontWeight: 800 }}>…</span>
        : <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>}
    </button>
  );
}

export default function AppPage() {
  const [tab, setTab] = useState("Scores");
  const [sport, setSport] = useState("NFL");
  const [book, setBook] = useState("underdog");
  useEffect(() => {
    const valid = ["Scores", "Picks", "Trades", "Community", "Live"];
    try {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (t && valid.indexOf(t) !== -1) setTab(t);
    } catch (e) {}
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const onMsg = (e: MessageEvent) => {
        const d = e.data;
        if (d && d.gpTab && valid.indexOf(d.gpTab) !== -1) setTab(d.gpTab);
      };
      navigator.serviceWorker.addEventListener("message", onMsg);
      return () => navigator.serviceWorker.removeEventListener("message", onMsg);
    }
  }, []);
  const showSport = tab === "Scores" || tab === "Picks";
  const outerScroll = tab === "Scores" || tab === "Picks" || tab === "Trades";
  return (
    <div className="gp" style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", background: `radial-gradient(120% 60% at 50% -8%, rgba(0,255,135,.10), transparent 55%), ${INK}` }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* header */}
      <div style={{ flex: "none", zIndex: 15, background: "rgba(5,8,11,.82)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, maxWidth: 620, margin: "0 auto" }}>
          <div className="disp" style={{ fontWeight: 700, fontSize: 17, letterSpacing: ".02em", whiteSpace: "nowrap" }}>THE <span style={{ color: GREEN }}>GREENPRINT</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><NotifyBell /><BookPicker book={book} setBook={setBook} /></div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: outerScroll ? "auto" : "hidden", WebkitOverflowScrolling: "touch" }}>
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "14px 16px 92px" }}>
          {showSport ? <div style={{ marginBottom: 14 }}><SportBar sport={sport} setSport={setSport} /></div> : null}
          {tab === "Scores" && <ScoresTab sport={sport} />}
          {tab === "Picks" && <PicksTab sport={sport} />}
          {tab === "Trades" && <TradesTab />}
          {tab === "Community" && <CommunityTab />}
          {tab === "Live" && <LiveTab />}
        </div>
      </div>

      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
