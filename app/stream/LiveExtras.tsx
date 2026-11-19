"use client";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

// Live extras shared by /stream (viewers) and /go-live (host):
// pinned message, now playing, and the live trade card. One small read every 3s.
const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const PATH = `${FB}/live/extras`;

export type LiveTrade = { side?: string; symbol?: string; entry?: string; sl?: string; tps?: string; status?: string; ts?: number };
export type LiveExtrasData = {
  pinned?: { msg?: string; ts?: number } | null;
  nowplaying?: { title?: string; ts?: number } | null;
  trade?: LiveTrade | null;
};

export function useLiveExtras(ms = 3000): LiveExtrasData {
  const [x, setX] = useState<LiveExtrasData>({});
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${PATH}.json`, { cache: "no-store" });
        const d = await r.json();
        if (alive) setX(d && typeof d === "object" ? d : {});
      } catch {}
    };
    load();
    const id = setInterval(load, ms);
    return () => { alive = false; clearInterval(id); };
  }, [ms]);
  return x;
}

export async function setLiveExtra(key: "pinned" | "nowplaying" | "trade", value: unknown) {
  try {
    await fetch(`${PATH}/${key}.json`, {
      method: value === null ? "DELETE" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: value === null ? undefined : JSON.stringify(value),
    });
  } catch {}
}

const XCSS = `
@keyframes lxEq{0%,100%{height:4px}50%{height:13px}}
@keyframes lxIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes lxGlow{0%,100%{box-shadow:0 0 0 0 rgba(0,255,133,0)}50%{box-shadow:0 0 22px 2px rgba(0,255,133,.25)}}
.lx-eq{display:inline-flex;align-items:flex-end;gap:2px;height:13px}
.lx-eq i{display:block;width:3px;border-radius:2px;background:#00FF85;animation:lxEq .9s ease-in-out infinite}
.lx-eq i:nth-child(2){animation-delay:.2s}.lx-eq i:nth-child(3){animation-delay:.45s}.lx-eq i:nth-child(4){animation-delay:.1s}
.lx-glass{background:rgba(5,9,7,.78);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:14px;color:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;animation:lxIn .4s ease both}
.lx-row{display:flex;justify-content:space-between;gap:14px;font-size:12px;padding:3px 0}
.lx-row span:first-child{color:rgba(255,255,255,.5)}
.lx-row span:last-child{font-weight:800}
@media(max-width:700px){.lx-card{transform:scale(.86);transform-origin:top right}.lx-np{max-width:62%!important}}
`;

function statusColor(s: string) {
  const u = s.toUpperCase();
  if (u.includes("SL")) return "#FF3B5C";
  if (u.includes("TP") || u.includes("PRINT") || u.includes("SMACK")) return "#00FF85";
  return "#FFC832";
}

// Overlay on top of the viewer's video: trade card (top right) + now playing (bottom left).
export function VideoExtras() {
  const x = useLiveExtras();
  const [min, setMin] = useState(false);
  const t = x.trade;
  const np = x.nowplaying?.title;
  const buy = (t?.side || "").toUpperCase() === "BUY";
  return (
    <>
      <style>{XCSS}</style>
      {t && t.symbol && (
        <div className="lx-glass lx-card" onClick={e => { e.stopPropagation(); setMin(m => !m); }}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 20, minWidth: min ? 0 : 190, padding: min ? "8px 12px" : "12px 14px", cursor: "pointer", borderColor: buy ? "rgba(0,255,133,.45)" : "rgba(255,59,92,.45)", animation: "lxIn .4s ease both, lxGlow 3s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 6, background: buy ? "#00FF85" : "#FF3B5C", color: buy ? "#03110a" : "#fff" }}>{buy ? "BUY" : "SELL"}</span>
            <span style={{ fontWeight: 900, fontSize: 14 }}>{t.symbol}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{min ? "▾" : "▴"}</span>
          </div>
          {!min && (
            <div style={{ marginTop: 8 }}>
              {t.entry && <div className="lx-row"><span>Entry</span><span>{t.entry}</span></div>}
              {t.sl && <div className="lx-row"><span>Stop loss</span><span style={{ color: "#FF3B5C" }}>{t.sl}</span></div>}
              {(t.tps || "").split(",").map(s => s.trim()).filter(Boolean).map((tp, i) => (
                <div key={i} className="lx-row"><span>TP{i + 1}</span><span style={{ color: "#00FF85" }}>{tp}</span></div>
              ))}
              {t.status && <div style={{ marginTop: 8, textAlign: "center", fontSize: 11.5, fontWeight: 900, letterSpacing: "1px", padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,.06)", color: statusColor(t.status) }}>{t.status}</div>}
              <div style={{ marginTop: 6, fontSize: 9.5, color: "rgba(255,255,255,.3)", textAlign: "center" }}>Educational only. Not financial advice.</div>
            </div>
          )}
        </div>
      )}
      {np && (
        <div className="lx-glass lx-np" style={{ position: "absolute", left: 12, bottom: 12, zIndex: 20, maxWidth: "45%", padding: "8px 12px", display: "flex", alignItems: "center", gap: 9, pointerEvents: "none" }}>
          <span className="lx-eq"><i /><i /><i /><i /></span>
          <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{np}</span>
        </div>
      )}
    </>
  );
}

// Pinned host message shown above the chat.
export function PinnedBanner() {
  const x = useLiveExtras();
  const msg = x.pinned?.msg;
  if (!msg) return null;
  return (
    <div className="lx-glass" style={{ margin: "8px 10px 0", padding: "10px 12px", borderColor: "rgba(0,255,133,.35)", background: "rgba(0,255,133,.07)", fontSize: 13, lineHeight: 1.45 }}>
      <style>{XCSS}</style>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "1.5px", color: "#00FF85", marginBottom: 3 }}>📌 PINNED BY HOST</div>
      <div style={{ wordBreak: "break-word" }}>{msg}</div>
    </div>
  );
}

// Host controls for the studio: pin, now playing, trade card.
export function HostExtras() {
  const x = useLiveExtras(4000);
  const [pin, setPin] = useState("");
  const [song, setSong] = useState("");
  const [side, setSide] = useState("BUY");
  const [symbol, setSymbol] = useState("");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tps, setTps] = useState("");
  const [status, setStatus] = useState("LIVE TRADE");
  const [saved, setSaved] = useState("");
  const flash = (s: string) => { setSaved(s); setTimeout(() => setSaved(""), 1800); };
  const inp: CSSProperties = { width: "100%", padding: "10px 12px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit", minWidth: 0, boxSizing: "border-box" };
  const btn = (on?: boolean): CSSProperties => ({ padding: "10px 12px", borderRadius: 10, fontWeight: 800, fontSize: 12.5, cursor: "pointer", border: on ? "1px solid rgba(0,255,133,.45)" : "1px solid rgba(255,255,255,.12)", background: on ? "rgba(0,255,133,.14)" : "rgba(255,255,255,.05)", color: on ? "#00FF85" : "#fff", whiteSpace: "nowrap", fontFamily: "inherit" });
  const lbl: CSSProperties = { fontSize: 10.5, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,.4)", margin: "2px 0 8px" };
  const sendTrade = async (st?: string) => {
    if (!symbol.trim()) return;
    const s = st || status;
    setStatus(s);
    await setLiveExtra("trade", { side, symbol: symbol.trim().toUpperCase(), entry: entry.trim(), sl: sl.trim(), tps: tps.trim(), status: s, ts: Date.now() });
    flash("Trade card updated");
  };
  return (
    <div className="gp-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={lbl}>✨ Viewer screen</div>
        {saved && <span style={{ fontSize: 12, color: "#00FF85", fontWeight: 700 }}>✓ {saved}</span>}
      </div>

      <div>
        <div style={lbl}>📌 Pinned message {x.pinned?.msg ? <span style={{ color: "#00FF85" }}>· on</span> : null}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={inp} value={pin} onChange={e => setPin(e.target.value)} placeholder={x.pinned?.msg || "e.g. Free signals: t.me/TheGreenprintt"} />
          <button style={btn(true)} onClick={async () => { if (!pin.trim()) return; await setLiveExtra("pinned", { msg: pin.trim(), ts: Date.now() }); setPin(""); flash("Pinned"); }}>Pin</button>
          {x.pinned?.msg && <button style={btn()} onClick={async () => { await setLiveExtra("pinned", null); flash("Unpinned"); }}>Unpin</button>}
        </div>
      </div>

      <div>
        <div style={lbl}>🎵 Now playing {x.nowplaying?.title ? <span style={{ color: "#00FF85" }}>· on</span> : null}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={inp} value={song} onChange={e => setSong(e.target.value)} placeholder={x.nowplaying?.title || "Artist, song"} />
          <button style={btn(true)} onClick={async () => { if (!song.trim()) return; await setLiveExtra("nowplaying", { title: song.trim(), ts: Date.now() }); setSong(""); flash("Song showing"); }}>Show</button>
          {x.nowplaying?.title && <button style={btn()} onClick={async () => { await setLiveExtra("nowplaying", null); flash("Song hidden"); }}>Hide</button>}
        </div>
      </div>

      <div>
        <div style={lbl}>📈 Trade card {x.trade?.symbol ? <span style={{ color: "#00FF85" }}>· {x.trade.side} {x.trade.symbol}</span> : null}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button style={{ ...btn(side === "BUY"), flex: 1 }} onClick={() => setSide("BUY")}>BUY</button>
          <button style={{ ...btn(false), flex: 1, ...(side === "SELL" ? { border: "1px solid rgba(255,59,92,.5)", background: "rgba(255,59,92,.14)", color: "#FF3B5C" } : {}) }} onClick={() => setSide("SELL")}>SELL</button>
          <input style={{ ...inp, flex: 1.4 }} value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="XAUUSD" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <input style={inp} value={entry} onChange={e => setEntry(e.target.value)} placeholder="Entry" inputMode="decimal" />
          <input style={inp} value={sl} onChange={e => setSl(e.target.value)} placeholder="Stop loss" inputMode="decimal" />
        </div>
        <input style={{ ...inp, marginBottom: 8 }} value={tps} onChange={e => setTps(e.target.value)} placeholder="TPs, separated by commas (TP1, TP2, TP3...)" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ ...btn(true), flex: 1 }} onClick={() => sendTrade("LIVE TRADE")}>Show card</button>
          {["TP1 SMACKED", "TP2 SMACKED", "TP3 SMACKED", "FULL PRINT", "SL HIT"].map(s => (
            <button key={s} style={{ ...btn(status === s), fontSize: 11 }} onClick={() => sendTrade(s)}>{s}</button>
          ))}
          {x.trade?.symbol && <button style={{ ...btn(), fontSize: 11 }} onClick={async () => { await setLiveExtra("trade", null); flash("Card hidden"); }}>Hide card</button>}
        </div>
      </div>
    </div>
  );
}
