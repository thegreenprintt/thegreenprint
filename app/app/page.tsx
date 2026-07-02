"use client";
import { useState, useEffect, useRef } from "react";

// ─── THE GREENPRINT APP ──────────────────────────────────────────────────────
// Standalone app shell at /app — does not touch the stream, site, or studio.
// Tabs: Live · Picks · Community · Journal

const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const get = async (p: string) => { try { const r = await fetch(`${FB}/${p}.json`, { cache: "no-store" }); return await r.json(); } catch { return null; } };
const push = async (p: string, d: unknown) => { try { await fetch(`${FB}/${p}.json`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); } catch {} };

type Msg = { name: string; msg: string; ts: number };
type Trade = { id: string; sym: string; side: "LONG" | "SHORT"; entry: number; exit: number; qty: number; notes: string; ts: number };
type PropPick = { player: string; team: string; opp: string; prop: string; line: number; pick: "OVER" | "UNDER"; l5: number; l10: number; l20: number; board: string };

const CHAT_COLORS = ["#00ff87", "#ff6b6b", "#ffd93d", "#6bcbff", "#c77dff", "#ff9f43", "#48dbfb", "#ff6b9d"];
const nc = (n: string) => CHAT_COLORS[n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % CHAT_COLORS.length];

// ─── SAMPLE PICKS BOARD (live Underdog/PrizePicks feed hooks up next) ────────
const PICKS: Record<string, PropPick[]> = {
  NBA: [
    { player: "Luka Doncic", team: "LAL", opp: "vs PHX", prop: "Points", line: 28.5, pick: "OVER", l5: 100, l10: 80, l20: 75, board: "Underdog" },
    { player: "Shai Gilgeous-Alexander", team: "OKC", opp: "vs DEN", prop: "Points", line: 31.5, pick: "OVER", l5: 80, l10: 80, l20: 70, board: "PrizePicks" },
    { player: "Nikola Jokic", team: "DEN", opp: "@ OKC", prop: "Rebounds", line: 11.5, pick: "OVER", l5: 80, l10: 70, l20: 75, board: "Underdog" },
    { player: "Jayson Tatum", team: "BOS", opp: "vs MIA", prop: "3-PT Made", line: 3.5, pick: "UNDER", l5: 80, l10: 70, l20: 65, board: "PrizePicks" },
    { player: "Anthony Edwards", team: "MIN", opp: "@ GSW", prop: "Points", line: 26.5, pick: "OVER", l5: 60, l10: 70, l20: 65, board: "Underdog" },
    { player: "Tyrese Haliburton", team: "IND", opp: "vs NYK", prop: "Assists", line: 9.5, pick: "OVER", l5: 80, l10: 60, l20: 60, board: "PrizePicks" },
  ],
  NFL: [
    { player: "Josh Allen", team: "BUF", opp: "vs MIA", prop: "Pass Yards", line: 249.5, pick: "OVER", l5: 80, l10: 70, l20: 70, board: "Underdog" },
    { player: "CeeDee Lamb", team: "DAL", opp: "@ PHI", prop: "Receptions", line: 7.5, pick: "UNDER", l5: 80, l10: 70, l20: 65, board: "PrizePicks" },
    { player: "Christian McCaffrey", team: "SF", opp: "vs SEA", prop: "Rush Yards", line: 89.5, pick: "OVER", l5: 60, l10: 70, l20: 70, board: "Underdog" },
    { player: "Tyreek Hill", team: "MIA", opp: "@ BUF", prop: "Rec Yards", line: 79.5, pick: "OVER", l5: 60, l10: 60, l20: 65, board: "PrizePicks" },
  ],
  MLB: [
    { player: "Aaron Judge", team: "NYY", opp: "vs BOS", prop: "Total Bases", line: 1.5, pick: "OVER", l5: 80, l10: 70, l20: 70, board: "Underdog" },
    { player: "Shohei Ohtani", team: "LAD", opp: "@ SD", prop: "Hits+Runs+RBI", line: 2.5, pick: "OVER", l5: 80, l10: 80, l20: 65, board: "PrizePicks" },
    { player: "Corbin Burnes", team: "ARI", opp: "vs COL", prop: "Strikeouts", line: 6.5, pick: "UNDER", l5: 60, l10: 60, l20: 60, board: "Underdog" },
  ],
};
const grade = (p: PropPick) => (p.l20 >= 70 && p.l5 >= 80 ? "SMASH" : p.l20 >= 62 ? "LEAN" : "PASS");
const gradeColor = (g: string) => (g === "SMASH" ? "#00ff87" : g === "LEAN" ? "#ffd93d" : "rgba(255,255,255,.35)");

const fmtMoney = (n: number) => (n < 0 ? "-$" : "+$") + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function GreenprintApp() {
  const [tab, setTab] = useState<"live" | "picks" | "chat" | "journal">("live");
  const [isLive, setIsLive] = useState(false);
  const [watching, setWatching] = useState(false);
  const [league, setLeague] = useState<"NBA" | "NFL" | "MLB">("NBA");
  const [boardFilter, setBoardFilter] = useState<"All" | "Underdog" | "PrizePicks">("All");

  // Community chat
  const [chatName, setChatName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const lastSend = useRef(0);
  const chatEnd = useRef<HTMLDivElement>(null);

  // Journal
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [fSym, setFSym] = useState(""); const [fSide, setFSide] = useState<"LONG" | "SHORT">("LONG");
  const [fEntry, setFEntry] = useState(""); const [fExit, setFExit] = useState("");
  const [fQty, setFQty] = useState(""); const [fNotes, setFNotes] = useState("");

  // ── live status (same signal the stream uses — read-only) ──
  useEffect(() => {
    const poll = () => get("livestatus").then(d => setIsLive(!!d?.live));
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, []);

  // ── chat identity ──
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gp_viewer") || "null");
      if (saved?.name) setChatName(saved.name);
      else { const n = localStorage.getItem("gp_chat_name"); if (n) setChatName(n); }
    } catch {}
    try { const t = JSON.parse(localStorage.getItem("gp_journal") || "[]"); if (Array.isArray(t)) setTrades(t); } catch {}
  }, []);

  // ── community chat polling ──
  useEffect(() => {
    if (tab !== "chat") return;
    const poll = async () => {
      const data = await get("community/chat");
      if (!data || typeof data !== "object") return;
      setMsgs((Object.values(data) as Msg[]).filter(m => m?.msg && m?.name).sort((a, b) => a.ts - b.ts).slice(-60));
    };
    poll();
    const id = setInterval(poll, 2500);
    return () => clearInterval(id);
  }, [tab]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const sendMsg = async () => {
    const text = draft.trim(); if (!text || !chatName) return;
    const now = Date.now(); if (now - lastSend.current < 1500) return;
    lastSend.current = now; setDraft("");
    setMsgs(m => [...m, { name: chatName, msg: text, ts: now }]);
    await push("community/chat", { name: chatName, msg: text, ts: now });
  };

  const saveTrades = (t: Trade[]) => { setTrades(t); try { localStorage.setItem("gp_journal", JSON.stringify(t)); } catch {} };
  const addTrade = () => {
    const entry = parseFloat(fEntry), exit = parseFloat(fExit), qty = parseFloat(fQty);
    if (!fSym.trim() || isNaN(entry) || isNaN(exit) || isNaN(qty) || qty <= 0) { alert("Fill in symbol, entry, exit and size"); return; }
    const t: Trade = { id: String(Date.now()), sym: fSym.trim().toUpperCase(), side: fSide, entry, exit, qty, notes: fNotes.trim(), ts: Date.now() };
    saveTrades([t, ...trades]);
    setFSym(""); setFEntry(""); setFExit(""); setFQty(""); setFNotes(""); setShowForm(false);
  };
  const pnl = (t: Trade) => (t.exit - t.entry) * t.qty * (t.side === "LONG" ? 1 : -1);
  const totalPnl = trades.reduce((a, t) => a + pnl(t), 0);
  const wins = trades.filter(t => pnl(t) > 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;

  const picks = PICKS[league].filter(p => boardFilter === "All" || p.board === boardFilter).sort((a, b) => b.l20 - a.l20);

  const card: React.CSSProperties = { background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, backdropFilter: "blur(20px)" };

  return (
    <div style={{ minHeight: "100dvh", background: "#030503", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.92)}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 24px rgba(0,255,135,.25)}50%{box-shadow:0 0 48px rgba(0,255,135,.55)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes orb{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.9;transform:scale(1.1)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(0,255,135,.25);border-radius:4px}
        .tabIn{animation:fadeUp .35s ease}
        .gpInput{width:100%;padding:13px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;color:#fff;font-size:15px;outline:none;box-sizing:border-box}
        .gpInput:focus{border-color:rgba(0,255,135,.5)}
        .gpBtn{background:linear-gradient(135deg,#00ff87,#00c864);border:none;border-radius:14px;color:#000;font-weight:900;cursor:pointer;font-size:15px}
        .chip{border-radius:20px;padding:7px 16px;font-size:13px;font-weight:800;cursor:pointer;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);transition:all .15s}
        .chip.on{background:rgba(0,255,135,.14);border-color:rgba(0,255,135,.5);color:#00ff87}
        .navBtn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 0 5px;background:none;border:none;cursor:pointer;color:rgba(255,255,255,.35);font-size:10px;font-weight:800;letter-spacing:.5px}
        .navBtn.on{color:#00ff87}
        .navBtn.on .navIco{background:rgba(0,255,135,.14);box-shadow:0 0 18px rgba(0,255,135,.3)}
        .navIco{width:44px;height:30px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:17px;transition:all .2s}
      `}</style>

      {/* ambient glow */}
      <div style={{ position: "absolute", top: -140, left: "50%", transform: "translateX(-50%)", width: 480, height: 320, background: "radial-gradient(ellipse,rgba(0,255,135,.14) 0%,transparent 65%)", animation: "orb 5s ease-in-out infinite", pointerEvents: "none" }} />

      {/* ── header ── */}
      <div style={{ padding: "calc(env(safe-area-inset-top,0px) + 14px) 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 2, maxWidth: 560, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: "linear-gradient(135deg,#00ff87,#00c864)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 4px 20px rgba(0,255,135,.35)" }}>🌿</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: "-.5px", background: "linear-gradient(90deg,#fff,#00ff87,#fff)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 5s linear infinite" }}>The Greenprint</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "2.5px", textTransform: "uppercase", fontWeight: 700 }}>Trade · Bet · Win</div>
          </div>
        </div>
        {isLive ? (
          <button onClick={() => { setTab("live"); setWatching(true); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,45,85,.14)", border: "1px solid rgba(255,45,85,.45)", borderRadius: 20, padding: "6px 13px", cursor: "pointer" }}>
            <span style={{ width: 7, height: 7, background: "#ff2d55", borderRadius: "50%", animation: "pulse 1.1s infinite", display: "inline-block" }} />
            <span style={{ color: "#ff2d55", fontWeight: 900, fontSize: 11, letterSpacing: "1.5px" }}>LIVE</span>
          </button>
        ) : (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "6px 13px", letterSpacing: "1.5px", fontWeight: 700 }}>OFFLINE</span>
        )}
      </div>

      {/* ── body ── */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1, maxWidth: 560, width: "100%", margin: "0 auto", boxSizing: "border-box", padding: "6px 16px 18px" }}>

        {/* ══ LIVE ══ */}
        {tab === "live" && (
          <div className="tabIn">
            {isLive ? (
              watching ? (
                <div style={{ ...card, overflow: "hidden", height: "calc(100dvh - 220px)", minHeight: 380, border: "1px solid rgba(0,255,135,.3)" }}>
                  <iframe src="/stream" allow="autoplay; fullscreen; picture-in-picture" style={{ width: "100%", height: "100%", border: "none", display: "block", background: "#000" }} title="Greenprint Live" />
                </div>
              ) : (
                <div style={{ ...card, padding: 34, textAlign: "center", border: "1px solid rgba(0,255,135,.35)", animation: "glowPulse 2.2s infinite" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                    <span style={{ width: 10, height: 10, background: "#ff2d55", borderRadius: "50%", animation: "pulse 1.1s infinite", display: "inline-block" }} />
                    <span style={{ color: "#ff2d55", fontWeight: 900, fontSize: 13, letterSpacing: "3px" }}>LIVE NOW</span>
                  </div>
                  <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900, letterSpacing: "-.5px" }}>Live Trading Session</h2>
                  <p style={{ color: "rgba(255,255,255,.45)", fontSize: 14, margin: "0 0 26px" }}>The stream is on right now. Tap in.</p>
                  <button className="gpBtn" onClick={() => setWatching(true)} style={{ padding: "16px 44px", animation: "glowPulse 2s infinite" }}>▶ Watch Stream</button>
                </div>
              )
            ) : (
              <div style={{ ...card, padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 54, marginBottom: 16 }}>📡</div>
                <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,.75)" }}>Stream Offline</h2>
                <p style={{ color: "rgba(255,255,255,.35)", fontSize: 13.5, margin: "0 0 6px" }}>The moment we go live, this page lights up automatically.</p>
                <p style={{ color: "rgba(0,255,135,.6)", fontSize: 12.5, margin: 0, fontWeight: 700 }}>Keep the app open — no refresh needed.</p>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <button onClick={() => setTab("picks")} style={{ ...card, padding: "20px 16px", textAlign: "left", cursor: "pointer", color: "#fff" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🎯</div>
                <div style={{ fontWeight: 900, fontSize: 15 }}>Today&apos;s Picks</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginTop: 3 }}>Highest probability props</div>
              </button>
              <a href="/onboard" style={{ ...card, padding: "20px 16px", textAlign: "left", textDecoration: "none", color: "#fff", display: "block" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🚀</div>
                <div style={{ fontWeight: 900, fontSize: 15 }}>Get Onboarded</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginTop: 3 }}>Broker, chats &amp; setup</div>
              </a>
            </div>
          </div>
        )}

        {/* ══ PICKS ══ */}
        {tab === "picks" && (
          <div className="tabIn">
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {(["NBA", "NFL", "MLB"] as const).map(l => (
                <button key={l} className={`chip${league === l ? " on" : ""}`} onClick={() => setLeague(l)}>{l}</button>
              ))}
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                {(["All", "Underdog", "PrizePicks"] as const).map(b => (
                  <button key={b} className={`chip${boardFilter === b ? " on" : ""}`} style={{ padding: "7px 11px", fontSize: 11 }} onClick={() => setBoardFilter(b)}>{b === "PrizePicks" ? "PP" : b === "Underdog" ? "UD" : "All"}</button>
                ))}
              </div>
            </div>

            <div style={{ background: "rgba(0,255,135,.06)", border: "1px solid rgba(0,255,135,.2)", borderRadius: 14, padding: "10px 14px", marginBottom: 14, fontSize: 11.5, color: "rgba(0,255,135,.8)", fontWeight: 600 }}>
              ⚡ Sample board — live Underdog / PrizePicks feed with real L20 stats is being wired up next.
            </div>

            {picks.map((p, i) => {
              const g = grade(p);
              return (
                <div key={i} style={{ ...card, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>{p.player}</div>
                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{p.team} {p.opp} · <span style={{ color: "rgba(255,255,255,.55)" }}>{p.board}</span></div>
                    </div>
                    <span style={{ background: g === "SMASH" ? "rgba(0,255,135,.14)" : g === "LEAN" ? "rgba(255,217,61,.12)" : "rgba(255,255,255,.05)", border: `1px solid ${gradeColor(g)}44`, color: gradeColor(g), borderRadius: 10, padding: "5px 12px", fontSize: 11, fontWeight: 900, letterSpacing: "1.5px" }}>{g}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
                    <span style={{ background: p.pick === "OVER" ? "rgba(0,255,135,.12)" : "rgba(255,107,107,.12)", color: p.pick === "OVER" ? "#00ff87" : "#ff6b6b", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 900 }}>{p.pick === "OVER" ? "▲ OVER" : "▼ UNDER"}</span>
                    <span style={{ fontWeight: 900, fontSize: 15 }}>{p.line}</span>
                    <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)" }}>{p.prop}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {([["L5", p.l5], ["L10", p.l10], ["L20", p.l20]] as [string, number][]).map(([label, v]) => (
                      <div key={label} style={{ background: "rgba(255,255,255,.03)", borderRadius: 10, padding: "8px 10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "rgba(255,255,255,.4)", fontWeight: 800, marginBottom: 5 }}>
                          <span>{label}</span><span style={{ color: v >= 70 ? "#00ff87" : v >= 60 ? "#ffd93d" : "rgba(255,255,255,.6)" }}>{v}%</span>
                        </div>
                        <div style={{ height: 4, background: "rgba(255,255,255,.07)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${v}%`, height: "100%", borderRadius: 3, background: v >= 70 ? "linear-gradient(90deg,#00c864,#00ff87)" : v >= 60 ? "#ffd93d" : "rgba(255,255,255,.3)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ COMMUNITY ══ */}
        {tab === "chat" && (
          <div className="tabIn" style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 190px)", minHeight: 360 }}>
            {!chatName ? (
              <div style={{ ...card, padding: 30, textAlign: "center", margin: "auto 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <h3 style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 19 }}>Join the Community</h3>
                <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13, margin: "0 0 20px" }}>Pick a name — it shows next to your messages.</p>
                <input className="gpInput" value={nameDraft} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && nameDraft.trim()) { setChatName(nameDraft.trim()); try { localStorage.setItem("gp_chat_name", nameDraft.trim()); } catch {} } }} placeholder="Your name" style={{ marginBottom: 12 }} />
                <button className="gpBtn" style={{ width: "100%", padding: "14px 0" }} onClick={() => { if (nameDraft.trim()) { setChatName(nameDraft.trim()); try { localStorage.setItem("gp_chat_name", nameDraft.trim()); } catch {} } }}>Enter Chat →</button>
              </div>
            ) : (
              <>
                <div style={{ ...card, flex: 1, overflowY: "auto", padding: "14px 14px 6px", marginBottom: 10 }}>
                  {msgs.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 0" }}>
                      <div style={{ fontSize: 34, marginBottom: 10 }}>🌿</div>
                      <p style={{ color: "rgba(255,255,255,.25)", fontSize: 13, margin: 0 }}>Be the first to say something.</p>
                    </div>
                  )}
                  {msgs.map((m, i) => (
                    <div key={i} style={{ marginBottom: 12, display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: (m.name === "Host" ? "#ff9900" : nc(m.name)) + "22", border: `1.5px solid ${m.name === "Host" ? "#ff9900" : nc(m.name)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: m.name === "Host" ? "#ff9900" : nc(m.name) }}>
                        {m.name === "Host" ? "G" : m.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ color: m.name === "Host" ? "#ff9900" : nc(m.name), fontWeight: 800, fontSize: 12 }}>{m.name}</span>
                        <span style={{ display: "block", color: "rgba(255,255,255,.82)", fontSize: 13.5, wordBreak: "break-word", lineHeight: 1.45 }}>{m.msg}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEnd} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="gpInput" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder={`Chat as ${chatName}...`} style={{ flex: 1 }} />
                  <button className="gpBtn" onClick={sendMsg} style={{ padding: "0 20px", fontSize: 17 }}>→</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ JOURNAL ══ */}
        {tab === "journal" && (
          <div className="tabIn">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ ...card, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", fontWeight: 800, letterSpacing: "1px", marginBottom: 6 }}>NET P&amp;L</div>
                <div style={{ fontWeight: 900, fontSize: 17, color: totalPnl >= 0 ? "#00ff87" : "#ff6b6b" }}>{trades.length ? fmtMoney(totalPnl) : "—"}</div>
              </div>
              <div style={{ ...card, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", fontWeight: 800, letterSpacing: "1px", marginBottom: 6 }}>WIN RATE</div>
                <div style={{ fontWeight: 900, fontSize: 17, color: winRate >= 50 ? "#00ff87" : "#ffd93d" }}>{trades.length ? winRate + "%" : "—"}</div>
              </div>
              <div style={{ ...card, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", fontWeight: 800, letterSpacing: "1px", marginBottom: 6 }}>TRADES</div>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{trades.length}</div>
              </div>
            </div>

            {!showForm ? (
              <button className="gpBtn" style={{ width: "100%", padding: "15px 0", marginBottom: 14 }} onClick={() => setShowForm(true)}>＋ Log a Trade</button>
            ) : (
              <div style={{ ...card, padding: 18, marginBottom: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input className="gpInput" value={fSym} onChange={e => setFSym(e.target.value)} placeholder="Symbol (ES, SPY...)" />
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["LONG", "SHORT"] as const).map(s => (
                      <button key={s} onClick={() => setFSide(s)} style={{ flex: 1, borderRadius: 14, border: fSide === s ? `1px solid ${s === "LONG" ? "#00ff87" : "#ff6b6b"}` : "1px solid rgba(255,255,255,.1)", background: fSide === s ? (s === "LONG" ? "rgba(0,255,135,.12)" : "rgba(255,107,107,.12)") : "rgba(255,255,255,.04)", color: fSide === s ? (s === "LONG" ? "#00ff87" : "#ff6b6b") : "rgba(255,255,255,.5)", fontWeight: 900, fontSize: 12, cursor: "pointer" }}>{s}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input className="gpInput" value={fEntry} onChange={e => setFEntry(e.target.value)} placeholder="Entry" inputMode="decimal" />
                  <input className="gpInput" value={fExit} onChange={e => setFExit(e.target.value)} placeholder="Exit" inputMode="decimal" />
                  <input className="gpInput" value={fQty} onChange={e => setFQty(e.target.value)} placeholder="Size" inputMode="decimal" />
                </div>
                <input className="gpInput" value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Notes — setup, mistake, lesson..." style={{ marginBottom: 12 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="gpBtn" style={{ flex: 1, padding: "13px 0" }} onClick={addTrade}>Save Trade</button>
                  <button onClick={() => setShowForm(false)} style={{ padding: "0 18px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, color: "rgba(255,255,255,.6)", fontWeight: 800, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}

            {trades.length === 0 && !showForm && (
              <div style={{ ...card, padding: 36, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📓</div>
                <p style={{ color: "rgba(255,255,255,.35)", fontSize: 13.5, margin: 0 }}>Your journal is empty. Every pro tracks their trades — start with your last one.</p>
              </div>
            )}

            {trades.map(t => {
              const p = pnl(t);
              return (
                <div key={t.id} style={{ ...card, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: p >= 0 ? "rgba(0,255,135,.1)" : "rgba(255,107,107,.1)", border: `1px solid ${p >= 0 ? "rgba(0,255,135,.35)" : "rgba(255,107,107,.35)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, color: p >= 0 ? "#00ff87" : "#ff6b6b", flexShrink: 0 }}>{t.sym.slice(0, 4)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontWeight: 900, fontSize: 14 }}>{t.sym}</span>
                      <span style={{ fontSize: 10, fontWeight: 900, color: t.side === "LONG" ? "#00ff87" : "#ff6b6b", background: t.side === "LONG" ? "rgba(0,255,135,.1)" : "rgba(255,107,107,.1)", borderRadius: 6, padding: "2px 7px" }}>{t.side}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginTop: 3 }}>{t.entry} → {t.exit} · {t.qty}x{t.notes ? ` · ${t.notes}` : ""}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 14.5, color: p >= 0 ? "#00ff87" : "#ff6b6b" }}>{fmtMoney(p)}</div>
                    <button onClick={() => saveTrades(trades.filter(x => x.id !== t.id))} style={{ background: "none", border: "none", color: "rgba(255,255,255,.25)", fontSize: 10.5, cursor: "pointer", padding: 0, marginTop: 3 }}>remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── bottom nav ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", background: "rgba(3,5,3,.9)", backdropFilter: "blur(24px)", paddingBottom: "env(safe-area-inset-bottom,0px)", position: "relative", zIndex: 3 }}>
        <div style={{ display: "flex", maxWidth: 560, margin: "0 auto" }}>
          <button className={`navBtn${tab === "live" ? " on" : ""}`} onClick={() => setTab("live")}><span className="navIco">📺</span>LIVE</button>
          <button className={`navBtn${tab === "picks" ? " on" : ""}`} onClick={() => setTab("picks")}><span className="navIco">🎯</span>PICKS</button>
          <button className={`navBtn${tab === "chat" ? " on" : ""}`} onClick={() => setTab("chat")}><span className="navIco">💬</span>COMMUNITY</button>
          <button className={`navBtn${tab === "journal" ? " on" : ""}`} onClick={() => setTab("journal")}><span className="navIco">📓</span>JOURNAL</button>
        </div>
      </div>
    </div>
  );
}
