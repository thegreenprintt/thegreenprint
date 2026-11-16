"use client";

/* 1HOUSE x THE GREENPRINT : TRADING SIM
   Standalone practice game. Practice money only. Imports nothing from the app. */

import { useEffect, useMemo, useRef, useState } from "react";

const G = "#00ff87";
const RED = "#ff5a6e";
const GOLD = "#ffd27a";
const INK = "#05080b";
const KEY = "gp_sim_v1";
const START = 500;
const W = 360;
const H = 230;
const CW = 300;
const N = 65;

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function build(pts: number[][], n: number, seed: number, noise: number, wick: number, startOpen?: number) {
  const r = rng(seed); const out: any[] = []; let prev = startOpen !== undefined ? startOpen : pts[0][1];
  for (let i = 0; i < n; i++) {
    let a = pts[0]; let b = pts[pts.length - 1];
    for (let k = 0; k < pts.length - 1; k++) if (i >= pts[k][0] && i <= pts[k + 1][0]) { a = pts[k]; b = pts[k + 1]; break; }
    const t = b[0] === a[0] ? 0 : (i - a[0]) / (b[0] - a[0]);
    const c = a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 2 * noise;
    const o = prev;
    out.push({ o, c, h: Math.max(o, c) + r() * wick, l: Math.min(o, c) - r() * wick });
    prev = c;
  }
  return out;
}

const S1 = build([[0, 2380], [8, 2396], [13, 2388], [21, 2406], [27, 2397], [35, 2418], [39, 2407], [43, 2401], [50, 2415], [58, 2428], [64, 2433]], N, 11, 1.1, 1.4);
const S2 = build([[0, 18520], [9, 18440], [15, 18480], [24, 18390], [30, 18430], [39, 18452], [42, 18466], [50, 18400], [58, 18350], [64, 18330]], N, 22, 4, 6);
const S3 = build([[0, 38930], [5, 38958], [10, 38905], [15, 38955], [20, 38910], [25, 38950], [28, 39010], [33, 38995], [39, 38968]], 40, 33, 6, 8);

const LV: any[] = [
  { name: "Ride the Trend", sym: "XAUUSD · GOLD", dir: "buy", dec: 2,
    brief: "Gold is printing higher highs (HH) and higher lows (HL). That is an uptrend, and price just pulled back. Trade with the trend. Pick your direction, put your stop loss below the last higher low, then set your take profit.",
    win: "That is the move. You traded with the trend, and your stop loss sat below structure, outside the noise.",
    tight: "Your stop loss sat inside the noise. Price dipped, tagged it, then ran without you. Your stop loss goes below the last higher low, not right under your entry.",
    wrong: "You fought the trend. Higher highs and higher lows mean buyers are in control. Trade with the trend, not against it.",
    pre: () => S1.slice(0, 40), post: () => S1.slice(40),
    tags: [[8, "HH"], [13, "HL"], [21, "HH"], [27, "HL"], [35, "HH"]] },
  { name: "Leverage Correctly", sym: "NAS100", dir: "sell", dec: 1,
    brief: "NAS is in a downtrend with lower highs, and price just rallied into a supply zone (the red box). Sellers live there. Take the trade, but this level is about leverage. Leverage lets you control a big position with a small account, and it cuts both ways. Use it so you only risk 1% to 3% of your account. Over leverage and you fail, even if you win.",
    win: "Clean. You sold from supply, your stop loss sat above the zone, and you used leverage correctly. That is how accounts survive.",
    tight: "Price spiked into the supply zone and tagged your stop loss before dropping. Your stop loss goes above the whole zone, not inside it.",
    wrong: "Lower highs and lower lows mean sellers are in control, and price is sitting in supply. That was a sell.",
    pre: () => S2.slice(0, 40), post: () => S2.slice(40),
    zone: [18440, 18470] },
  { name: "Secure TP1", sym: "US30", dir: "buy", dec: 0, tp1: true,
    brief: "US30 broke out above resistance (the gold line) and is retesting it from above. That is a break of structure. Buy the retest. When price reaches TP1 (1x your risk), the game will pause and ask you what to do. Choose wisely.",
    win: "You secured TP1, moved your stop loss to breakeven, and when price reversed you still walked away green. That is the win win.",
    tight: "Price tagged your stop loss before it could run. Your stop loss goes below the retest, under the old resistance.",
    wrong: "Price broke resistance and held it as support. That is bullish structure. That was a buy.",
    rode: "Price tagged TP1 and you let it ride. It reversed and took your whole stop loss. At TP1, secure it and move your stop loss to breakeven. Win win.",
    pre: () => S3,
    post: (e: number, sl: number) => { const R = Math.abs(e - sl); return build([[0, e], [7, e + 1.25 * R], [12, e + 0.6 * R], [20, e - 1.35 * R], [24, e - 1.2 * R]], 25, 44, R * 0.07, R * 0.1, e); },
    line: 38960 },
];
const RISKS = [1, 2, 3, 5, 10];
const fmt = (n: number) => (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2);

export default function Sim() {
  const [sv, setSv] = useState<any>({ bal: START, unlocked: 1, stars: {}, blown: 0, streak: 0 });
  const [loaded, setLoaded] = useState(false);
  const [li, setLi] = useState(0);
  const [phase, setPhase] = useState("intro");
  const [series, setSeries] = useState<any[]>(LV[0].pre());
  const [shown, setShown] = useState(40);
  const [dir, setDir] = useState("");
  const [mode, setMode] = useState("");
  const [sl, setSl] = useState<any>(null);
  const [tp, setTp] = useState<any>(null);
  const [risk, setRisk] = useState(1);
  const [res, setRes] = useState<any>(null);
  const [livePnl, setLivePnl] = useState(0);
  const [balShown, setBalShown] = useState(START);
  const [err, setErr] = useState("");
  const timer = useRef<any>(null);
  const st = useRef<any>({});
  const audio = useRef<any>(null);
  const canvas = useRef<any>(null);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) { const v = JSON.parse(raw); setSv(v); setBalShown(v.bal); } } catch (e) {}
    setLoaded(true);
    const hidden: any[] = [];
    const hide = () => document.querySelectorAll("body *").forEach((el: any) => {
      const cs = getComputedStyle(el);
      if ((cs.position === "fixed" || cs.position === "sticky") && el.childElementCount < 6 && /educational purposes only/i.test(el.textContent || "") && !hidden.includes(el)) { hidden.push(el); el.style.display = "none"; }
    });
    hide(); const t = setTimeout(hide, 800);
    return () => { clearTimeout(t); clearInterval(timer.current); hidden.forEach((el: any) => { el.style.display = ""; }); };
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem(KEY, JSON.stringify(sv)); } catch (e) {} } }, [sv, loaded]);
  useEffect(() => {
    let raf = 0; const from = balShown; const t0 = performance.now();
    const step = (now: number) => { const t = Math.min(1, (now - t0) / 900); setBalShown(from + (sv.bal - from) * (1 - Math.pow(1 - t, 3))); if (t < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sv.bal]);

  const tone = (f: number, d: number, when = 0, type: any = "triangle", g = 0.05) => {
    try {
      if (!audio.current) { const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (AC) audio.current = new AC(); }
      const ac = audio.current; if (!ac) return; if (ac.state === "suspended") ac.resume();
      const o = ac.createOscillator(); const gn = ac.createGain(); const t0 = ac.currentTime + when;
      o.type = type; o.frequency.value = f; gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(g, t0 + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(gn); gn.connect(ac.destination); o.start(t0); o.stop(t0 + d + 0.02);
    } catch (e) {}
  };
  const buzz = (p: any) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
  const burst = () => {
    const c = canvas.current; if (!c) return; c.width = innerWidth; c.height = innerHeight; const ctx = c.getContext("2d");
    const ps = Array.from({ length: 110 }, () => { const a = Math.random() * 6.28; const s = 4 + Math.random() * 10; return { x: c.width / 2, y: c.height * 0.35, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, l: 60 + Math.random() * 20, col: [G, GOLD, "#fff", "#9affce"][(Math.random() * 4) | 0] }; });
    const f = () => { ctx.clearRect(0, 0, c.width, c.height); let alive = 0; ps.forEach((p) => { if (p.l <= 0) return; alive++; p.vy += 0.17; p.x += p.vx; p.y += p.vy; p.l--; ctx.globalAlpha = Math.min(1, p.l / 30); ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, 7, 4); }); if (alive) requestAnimationFrame(f); else ctx.clearRect(0, 0, c.width, c.height); };
    f();
  };

  const L = LV[li];
  const pre = useMemo(() => LV[li].pre(), [li]);
  const entry = pre[pre.length - 1].c;
  const R = sl !== null ? Math.abs(entry - sl) : 0;
  const rr = sl !== null && tp !== null && R > 0 ? Math.abs(tp - entry) / R : 0;
  const riskAmt = (sv.bal * risk) / 100;
  const valid = !!dir && sl !== null && tp !== null && (dir === "buy" ? sl < entry && tp > entry : sl > entry && tp < entry);

  const startLevel = (i: number) => {
    clearInterval(timer.current); setLi(i); setPhase("brief"); setDir(""); setMode(""); setSl(null); setTp(null); setRisk(1); setRes(null); setErr(""); setLivePnl(0);
    const p = LV[i].pre(); setSeries(p); setShown(p.length); tone(330, 0.12); tone(494, 0.16, 0.08);
  };

  const pickDir = (d: string) => { setDir(d); setMode("sl"); setErr(""); tone(d === "buy" ? 660 : 440, 0.08, 0, "square", 0.03); buzz(8); };
  const tapChart = (e: any) => {
    if (phase !== "setup" || !mode) return;
    const r = e.currentTarget.getBoundingClientRect(); const yv = ((e.clientY - r.top) / r.height) * H;
    const p = Number((hi - ((yv - 10) / (H - 20)) * (hi - lo)).toFixed(L.dec));
    tone(520, 0.06, 0, "square", 0.03); buzz(6);
    if (mode === "sl") { setSl(p); setMode("tp"); } else { setTp(p); setMode(""); }
    setErr("");
  };

  const finish = (exit: number, why: string) => {
    clearInterval(timer.current);
    const s = st.current; const lv = LV[s.li];
    const pnl = Math.round((s.realized + (s.half * s.riskAmt * (exit - s.entry) * s.sign) / s.R) * 100) / 100;
    const checks: any[] = [["Stop loss set before entry", true], ["Leverage used correctly (1% to 3% risk)", s.risk <= 3], ["Traded with the trend", s.dir === lv.dir], ["Reward at least 1.5x your risk", s.rr >= 1.5]];
    if (lv.tp1) checks.push(["Secured TP1, stop loss to breakeven", (s.tp1Done && !s.rode) || why === "tp"]);
    const trendOk = s.dir === lv.dir; const riskOk = s.risk <= 3;
    const pass = trendOk && riskOk && pnl >= 0;
    const passed = checks.filter((c) => c[1]).length;
    const stars = pass ? (passed === checks.length ? 3 : passed >= checks.length - 1 ? 2 : 1) : 0;
    let lesson = lv.win;
    if (!trendOk) lesson = lv.wrong;
    else if (why === "sl" && s.rode) lesson = lv.rode;
    else if (why === "sl") lesson = lv.tight;
    else if (why === "be") lesson = lv.win;
    else if (why === "end") lesson = "Price never reached your take profit, so the trade closed at the end of the session. Set your target at a realistic level, like the last high or low.";
    if (trendOk && !riskOk) lesson = (pnl >= 0 ? "You won, but " : "") + "you were over leveraged, risking " + s.risk + "% on one trade. That is gambling. A couple of trades like that and the account is gone. Use leverage so you risk 1% to 3%.";
    let nb = Math.round((sv.bal + pnl) * 100) / 100; let blown = false;
    if (nb < 50) { blown = true; nb = START; }
    setSv((v: any) => ({ ...v, bal: nb, blown: v.blown + (blown ? 1 : 0), streak: pnl > 0 ? v.streak + 1 : 0, stars: { ...v.stars, [s.li]: Math.max(v.stars[s.li] || 0, stars) }, unlocked: pass ? Math.max(v.unlocked, s.li + 2) : v.unlocked }));
    setRes({ pnl, why, checks, pass, stars, lesson, blown });
    setPhase("result");
    if (pnl > 0) { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, i * 0.08)); buzz([15, 40, 20]); burst(); }
    else if (pnl === 0) { tone(600, 0.2); }
    else { tone(160, 0.35, 0, "sawtooth", 0.05); buzz(120); }
  };

  const step = () => {
    const s = st.current; const k = s.all[s.i]; const lv = LV[s.li];
    if (!k) { finish(s.all[s.all.length - 1].c, "end"); return; }
    setShown(s.i + 1);
    setLivePnl(Math.round((s.realized + (s.half * s.riskAmt * (k.c - s.entry) * s.sign) / s.R) * 100) / 100);
    const adverse = s.sign > 0 ? k.l <= s.sl : k.h >= s.sl;
    if (adverse) { finish(s.sl, s.sl === s.entry ? "be" : "sl"); return; }
    if (lv.tp1 && !s.tp1Done) {
      const t1 = s.entry + s.sign * s.R;
      if (s.sign > 0 ? k.h >= t1 : k.l <= t1) { clearInterval(timer.current); s.i++; setPhase("tp1"); tone(880, 0.12); tone(1175, 0.18, 0.1); buzz([20, 30, 20]); return; }
    }
    if (s.sign > 0 ? k.h >= s.tp : k.l <= s.tp) { finish(s.tp, "tp"); return; }
    s.i++; tone(300 + Math.random() * 60, 0.03, 0, "sine", 0.012);
  };
  const run = () => { clearInterval(timer.current); timer.current = setInterval(step, 170); };

  const place = () => {
    if (!valid) { setErr(dir === "buy" ? "For a buy, your stop loss goes below entry and your take profit above it." : "For a sell, your stop loss goes above entry and your take profit below it."); tone(150, 0.2, 0, "sawtooth", 0.04); return; }
    const post = L.post(entry, sl); const all = pre.concat(post); setSeries(all);
    st.current = { li, all, i: pre.length, sl, tp, entry, R, sign: dir === "buy" ? 1 : -1, riskAmt, realized: 0, half: 1, tp1Done: false, rode: false, risk, dir, rr };
    setPhase("play"); tone(220, 0.1, 0, "square", 0.05); tone(440, 0.14, 0.08, "square", 0.05); buzz(20); run();
  };
  const secure = () => { const s = st.current; s.tp1Done = true; s.realized += 0.5 * s.riskAmt; s.half = 0.5; s.sl = s.entry; setSl(s.entry); setPhase("play"); [784, 988].forEach((f, i) => tone(f, 0.15, i * 0.07)); run(); };
  const ride = () => { st.current.tp1Done = true; st.current.rode = true; setPhase("play"); run(); };

  /* chart scale */
  const vis = series.slice(0, shown);
  const prices = series.flatMap((k: any) => [k.h, k.l]).concat([sl, tp, entry, L.zone ? L.zone[0] : null, L.zone ? L.zone[1] : null].filter((x: any) => x !== null) as number[]);
  let lo = Math.min(...prices); let hi = Math.max(...prices); const pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
  const y = (p: number) => 10 + ((hi - p) / (hi - lo)) * (H - 20);
  const cw = CW / N;
  const line = (p: number, col: string, label: string, dash?: boolean) => (
    <g key={label}>
      <line x1={0} x2={CW} y1={y(p)} y2={y(p)} stroke={col} strokeWidth={1.4} strokeDasharray={dash ? "4 4" : undefined} />
      <rect x={CW + 2} y={y(p) - 8} width={56} height={16} rx={4} fill={col} />
      <text x={CW + 30} y={y(p) + 4} textAnchor="middle" fontSize={9} fontWeight={800} fill="#06110c">{label}</text>
    </g>
  );

  const total = LV.length;
  const done = (sv.unlocked || 1) > total;

  if (!loaded) return <div style={{ position: "fixed", inset: 0, background: INK }} />;

  return (
    <div style={shell}>
      <style dangerouslySetInnerHTML={{ __html: KF }} />
      <canvas ref={canvas} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 90 }} />

      <div style={hud}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9.5, letterSpacing: ".2em", color: "rgba(255,255,255,.5)", fontWeight: 800 }}>{"PRACTICE ACCOUNT"}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: balShown >= START ? G : RED, letterSpacing: "-.5px" }}>{fmt(balShown)}</div>
          </div>
          <div style={pill}>{"🔥 " + sv.streak}</div>
          {sv.blown > 0 && <div style={{ ...pill, color: RED }}>{"💥 " + sv.blown}</div>}
          <a href="/quest" style={{ ...pill, textDecoration: "none" }}>{"🏔️ Quest"}</a>
        </div>
        <div style={{ maxWidth: 480, margin: "10px auto 0", display: "flex", gap: 6 }}>
          {LV.map((lv: any, i: number) => { const open = i < (sv.unlocked || 1); const on = i === li && phase !== "intro"; return (
            <button key={i} disabled={!open} onClick={() => startLevel(i)} style={{ flex: 1, padding: "7px 4px", borderRadius: 11, border: "1px solid " + (on ? G : "rgba(255,255,255,.1)"), background: on ? "rgba(0,255,135,.12)" : "rgba(255,255,255,.03)", color: open ? "#fff" : "rgba(255,255,255,.3)", cursor: open ? "pointer" : "default", fontFamily: "inherit" }}>
              <div style={{ fontSize: 10, fontWeight: 900 }}>{open ? "LEVEL " + (i + 1) : "🔒 LEVEL " + (i + 1)}</div>
              <div style={{ fontSize: 10, color: GOLD, marginTop: 2 }}>{[0, 1, 2].map((k) => (k < (sv.stars[i] || 0) ? "★" : "☆")).join("")}</div>
            </button>); })}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "8px 14px 40px", position: "relative", zIndex: 10 }}>
        {phase === "intro" ? (
          <div style={{ textAlign: "center", paddingTop: 30, animation: "gsRise .5s ease both" }}>
            <div style={{ fontSize: 11, letterSpacing: ".32em", color: G, fontWeight: 800 }}>{"1HOUSE × THE GREENPRINT"}</div>
            <div style={{ fontSize: 70, margin: "14px 0 0" }}>{"📈"}</div>
            <h1 style={{ ...shine, margin: "6px 0 0", fontSize: 44, fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1 }}>{"TRADING SIM"}</h1>
            <p style={{ color: "rgba(255,255,255,.65)", fontSize: 15, lineHeight: 1.55, maxWidth: 340, margin: "14px auto 0" }}>{"You get a " + fmt(START) + " practice account. Read the chart, set your stop loss and take profit, then watch it play out live. Trade the playbook and grow it. Get reckless and blow it."}</p>
            <button onClick={() => startLevel(Math.min((sv.unlocked || 1) - 1, total - 1))} style={{ ...bigBtn, marginTop: 26, animation: "gsPulse 1.8s ease-in-out infinite" }}><span style={{ position: "relative", zIndex: 1 }}>{sv.unlocked > 1 ? "▶  CONTINUE" : "▶  START TRADING"}</span><span style={sheen} /></button>
            <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12, marginTop: 12 }}>{"Practice money. No real funds are used."}</div>
          </div>
        ) : (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
            <div style={{ fontSize: 17, fontWeight: 900 }}>{"Level " + (li + 1) + ": " + L.name}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.5)" }}>{L.sym}</div>
          </div>

          <div style={{ position: "relative", marginTop: 8, borderRadius: 18, overflow: "hidden", border: "1px solid " + (phase === "setup" && mode ? (mode === "sl" ? RED : G) : "rgba(255,255,255,.1)"), background: "linear-gradient(180deg,#0a1014,#06090c)", boxShadow: phase === "play" ? "0 0 30px rgba(0,255,135,.15)" : "none", transition: "border-color .2s" }}>
            <svg viewBox={"0 0 " + W + " " + H} width="100%" style={{ display: "block", touchAction: "manipulation", cursor: phase === "setup" && mode ? "crosshair" : "default" }} onClick={tapChart}>
              {[0.2, 0.4, 0.6, 0.8].map((f) => (<line key={f} x1={0} x2={CW} y1={10 + f * (H - 20)} y2={10 + f * (H - 20)} stroke="rgba(255,255,255,.05)" />))}
              {L.zone && (<g><rect x={0} y={y(L.zone[1])} width={CW} height={y(L.zone[0]) - y(L.zone[1])} fill="rgba(255,90,110,.13)" /><text x={6} y={y(L.zone[1]) + 11} fontSize={9} fontWeight={800} fill={RED}>{"SUPPLY"}</text></g>)}
              {L.line && (<g><line x1={0} x2={CW} y1={y(L.line)} y2={y(L.line)} stroke={GOLD} strokeDasharray="6 4" strokeWidth={1.2} /><text x={6} y={y(L.line) - 4} fontSize={9} fontWeight={800} fill={GOLD}>{"RESISTANCE"}</text></g>)}
              {phase !== "play" && phase !== "tp1" && phase !== "result" && (<g><rect x={pre.length * cw} y={0} width={CW - pre.length * cw} height={H} fill="rgba(255,255,255,.025)" /><line x1={pre.length * cw} x2={pre.length * cw} y1={0} y2={H} stroke="rgba(255,255,255,.15)" strokeDasharray="3 4" /><text x={pre.length * cw + (CW - pre.length * cw) / 2} y={H / 2} textAnchor="middle" fontSize={26} fontWeight={900} fill="rgba(255,255,255,.12)">{"?"}</text></g>)}
              {vis.map((k: any, i: number) => { const up = k.c >= k.o; const col = up ? G : RED; const x = i * cw + cw / 2; return (
                <g key={i} style={i >= pre.length ? { animation: "gsCandle .25s ease both" } : undefined}>
                  <line x1={x} x2={x} y1={y(k.h)} y2={y(k.l)} stroke={col} strokeWidth={1} />
                  <rect x={x - cw * 0.34} y={y(Math.max(k.o, k.c))} width={cw * 0.68} height={Math.max(1, Math.abs(y(k.o) - y(k.c)))} fill={col} rx={0.6} />
                </g>); })}
              {L.tags && L.tags.map((t: any) => { const k = pre[t[0]]; const hh = t[1] === "HH"; return (<text key={t[0]} x={t[0] * cw + cw / 2} y={hh ? y(k.h) - 5 : y(k.l) + 12} textAnchor="middle" fontSize={8.5} fontWeight={900} fill={hh ? "#9affce" : GOLD}>{t[1]}</text>); })}
              {line(entry, "#e9eef2", "ENTRY", true)}
              {sl !== null && line(sl, RED, sl === entry && phase !== "setup" ? "BE" : "SL")}
              {tp !== null && line(tp, G, "TP")}
              {phase === "setup" && mode && (<text x={CW / 2} y={H - 8} textAnchor="middle" fontSize={10} fontWeight={800} fill={mode === "sl" ? RED : G} style={{ animation: "gsBlink 1.2s ease-in-out infinite" }}>{mode === "sl" ? "TAP THE CHART TO PLACE YOUR STOP LOSS" : "TAP THE CHART TO PLACE YOUR TAKE PROFIT"}</text>)}
            </svg>
            {(phase === "play" || phase === "tp1") && (<div style={{ position: "absolute", left: 10, top: 8, fontSize: 18, fontWeight: 900, color: livePnl >= 0 ? G : RED, textShadow: "0 2px 10px #000" }}>{(livePnl >= 0 ? "+" : "") + fmt(livePnl)}</div>)}
          </div>

          {phase === "brief" && (<div style={{ marginTop: 12, animation: "gsRise .4s ease both" }}>
            <Guide text={L.brief} />
            <button onClick={() => { setPhase("setup"); tone(440, 0.1); }} style={{ ...bigBtn, marginTop: 12 }}><span style={{ position: "relative", zIndex: 1 }}>{"LET'S TRADE  →"}</span><span style={sheen} /></button>
          </div>)}

          {phase === "setup" && (<div style={{ marginTop: 12 }}>
            <div style={label}>{"1 · DIRECTION"}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={() => pickDir("buy")} style={{ ...dirBtn, borderColor: dir === "buy" ? G : "rgba(255,255,255,.12)", background: dir === "buy" ? "rgba(0,255,135,.16)" : "rgba(255,255,255,.03)", color: dir === "buy" ? G : "#fff" }}>{"▲ BUY"}</button>
              <button onClick={() => pickDir("sell")} style={{ ...dirBtn, borderColor: dir === "sell" ? RED : "rgba(255,255,255,.12)", background: dir === "sell" ? "rgba(255,90,110,.16)" : "rgba(255,255,255,.03)", color: dir === "sell" ? RED : "#fff" }}>{"▼ SELL"}</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button disabled={!dir} onClick={() => setMode("sl")} style={{ ...modeBtn, opacity: dir ? 1 : 0.4, borderColor: mode === "sl" ? RED : "rgba(255,255,255,.12)" }}>{"2 · STOP LOSS"}<div style={{ color: RED, fontSize: 13, marginTop: 2 }}>{sl !== null ? sl.toFixed(L.dec) : "tap chart"}</div></button>
              <button disabled={!dir} onClick={() => setMode("tp")} style={{ ...modeBtn, opacity: dir ? 1 : 0.4, borderColor: mode === "tp" ? G : "rgba(255,255,255,.12)" }}>{"3 · TAKE PROFIT"}<div style={{ color: G, fontSize: 13, marginTop: 2 }}>{tp !== null ? tp.toFixed(L.dec) : "tap chart"}</div></button>
            </div>
            <div style={{ ...label, marginTop: 12 }}>{"4 · LEVERAGE · RISK PER TRADE"}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {RISKS.map((r) => (<button key={r} onClick={() => { setRisk(r); tone(r > 3 ? 200 : 600, 0.06, 0, "square", 0.03); }} style={{ flex: 1, padding: "10px 0", borderRadius: 11, fontWeight: 900, fontSize: 13, cursor: "pointer", fontFamily: "inherit", border: "1px solid " + (risk === r ? (r > 3 ? RED : G) : "rgba(255,255,255,.12)"), background: risk === r ? (r > 3 ? "rgba(255,90,110,.16)" : "rgba(0,255,135,.14)") : "rgba(255,255,255,.03)", color: r > 3 ? "#ff9aa6" : "#fff" }}>{r + "%"}</button>))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12.5, color: "rgba(255,255,255,.7)", fontWeight: 700 }}>
              <span>{"Entry " + entry.toFixed(L.dec)}</span><span>{"Risking " + fmt(riskAmt)}</span><span style={{ color: rr >= 1.5 ? G : rr > 0 ? GOLD : "rgba(255,255,255,.5)" }}>{"R:R " + (rr ? rr.toFixed(2) : "--")}</span>
            </div>
            {err && <div style={{ color: GOLD, fontSize: 13, marginTop: 8 }}>{err}</div>}
            <button disabled={!dir || sl === null || tp === null} onClick={place} style={{ ...bigBtn, marginTop: 12, opacity: !dir || sl === null || tp === null ? 0.45 : 1 }}><span style={{ position: "relative", zIndex: 1 }}>{"▶  PLACE TRADE"}</span><span style={sheen} /></button>
          </div>)}

          {phase === "play" && (<div style={{ marginTop: 14, textAlign: "center", color: "rgba(255,255,255,.7)", fontWeight: 800, fontSize: 14 }}><span style={{ animation: "gsBlink 1s ease-in-out infinite" }}>{"● LIVE"}</span>{"  Trade running. Hands off the wheel."}</div>)}

          {phase === "tp1" && (<div style={{ ...card, marginTop: 12, borderColor: GOLD, animation: "gsPop .35s ease both", textAlign: "center" }}>
            <div style={{ fontSize: 11, letterSpacing: ".25em", color: GOLD, fontWeight: 900 }}>{"TP1 REACHED"}</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6 }}>{"You are up 1x your risk. What is the move?"}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={secure} style={{ ...dirBtn, borderColor: G, background: "rgba(0,255,135,.14)", color: G, fontSize: 13 }}>{"Close half, stop loss to breakeven"}</button>
              <button onClick={ride} style={{ ...dirBtn, borderColor: "rgba(255,255,255,.2)", fontSize: 13 }}>{"Let it ride"}</button>
            </div>
          </div>)}

          {phase === "result" && res && (<div style={{ marginTop: 12, animation: "gsPop .4s ease both" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, letterSpacing: ".3em", fontWeight: 900, color: res.pass ? G : RED }}>{res.why === "tp" ? "TAKE PROFIT HIT" : res.why === "be" ? "STOPPED AT BREAKEVEN" : res.why === "sl" ? "STOP LOSS HIT" : "SESSION CLOSED"}</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: res.pnl >= 0 ? G : RED, letterSpacing: "-1px", textShadow: "0 0 26px " + (res.pnl >= 0 ? "rgba(0,255,135,.4)" : "rgba(255,90,110,.4)") }}>{(res.pnl >= 0 ? "+" : "") + fmt(res.pnl)}</div>
              <div style={{ fontSize: 26, color: GOLD, letterSpacing: 4 }}>{[0, 1, 2].map((k) => (k < res.stars ? "★" : "☆")).join("")}</div>
            </div>
            {res.blown && <div style={{ ...card, marginTop: 10, borderColor: RED, textAlign: "center", color: "#ff9aa6", fontWeight: 800 }}>{"💥 ACCOUNT BLOWN. That is what over leveraging does. Fresh " + fmt(START) + " loaded. Run it back."}</div>}
            <div style={{ ...card, marginTop: 10 }}>
              {res.checks.map((c: any) => (<div key={c[0]} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, fontWeight: 700, padding: "4px 0", color: c[1] ? "#fff" : "#ff9aa6" }}><span style={{ color: c[1] ? G : RED, fontWeight: 900 }}>{c[1] ? "✓" : "✗"}</span>{c[0]}</div>))}
            </div>
            <div style={{ marginTop: 10 }}><Guide text={res.lesson} /></div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => startLevel(li)} style={{ ...dirBtn, fontSize: 14 }}>{"↻ Run it back"}</button>
              {res.pass && li + 1 < total && <button onClick={() => startLevel(li + 1)} style={{ ...bigBtn, flex: 1, padding: "14px 0", fontSize: 14 }}><span style={{ position: "relative", zIndex: 1 }}>{"NEXT LEVEL  →"}</span></button>}
            </div>
            {res.pass && done && li === total - 1 && (<div style={{ ...card, marginTop: 14, borderColor: "rgba(0,255,135,.4)", textAlign: "center" }}>
              <div style={{ fontSize: 30 }}>{"🏆"}</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{"You just traded the playbook."}</div>
              <p style={{ color: "rgba(255,255,255,.65)", fontSize: 14, lineHeight: 1.5, margin: "6px 0 12px" }}>{"Next step: set up your real tools, then take this exact process to a demo account. Same rules. Real chart."}</p>
              <a href="/quest" style={{ ...bigBtn, display: "block", textDecoration: "none", padding: "14px 0", fontSize: 14, boxSizing: "border-box" }}>{"GO TO THE CLIMB  →"}</a>
            </div>)}
          </div>)}
        </>)}
      </div>
    </div>
  );
}

function Guide({ text }: { text: string }) {
  const [k, setK] = useState(0);
  useEffect(() => { setK(0); const id = setInterval(() => setK((v: number) => { if (v >= text.length) { clearInterval(id); return v; } return v + 2; }), 16); return () => clearInterval(id); }, [text]);
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{ flex: "0 0 auto", width: 38, height: 38, borderRadius: 13, background: "radial-gradient(circle at 50% 30%, #12382a, #05080b)", border: "1px solid rgba(0,255,135,.5)", boxShadow: "0 0 16px rgba(0,255,135,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: G, fontSize: 18 }}>{"G"}</div>
      <div onClick={() => setK(text.length)} style={{ flex: 1, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "4px 16px 16px 16px", padding: "10px 13px", fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,.9)", cursor: "pointer" }}>{text.slice(0, k)}</div>
    </div>
  );
}

const shell: any = { position: "fixed", inset: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", background: "radial-gradient(130% 70% at 50% -10%, rgba(0,255,135,.11), transparent 55%), " + INK, color: "#fff", fontFamily: "var(--font-inter), Inter, system-ui, sans-serif" };
const hud: any = { position: "sticky", top: 0, zIndex: 40, padding: "calc(10px + env(safe-area-inset-top)) 14px 10px", background: "linear-gradient(180deg, rgba(5,8,11,.96), rgba(5,8,11,.85) 80%, transparent)", backdropFilter: "blur(10px)" };
const pill: any = { flex: "0 0 auto", fontSize: 12.5, fontWeight: 800, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.04)", color: "#fff" };
const card: any = { borderRadius: 18, padding: 14, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)" };
const label: any = { fontSize: 10, letterSpacing: ".2em", color: "rgba(255,255,255,.5)", fontWeight: 800 };
const dirBtn: any = { flex: 1, padding: "14px 8px", borderRadius: 13, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer", fontFamily: "inherit" };
const modeBtn: any = { flex: 1, padding: "10px 8px", borderRadius: 13, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", color: "#fff", fontWeight: 800, fontSize: 11, letterSpacing: ".08em", cursor: "pointer", fontFamily: "inherit" };
const bigBtn: any = { position: "relative", overflow: "hidden", width: "100%", padding: "16px 0", borderRadius: 16, border: "none", cursor: "pointer", fontWeight: 900, fontSize: 16, color: "#06110c", background: "linear-gradient(135deg,#00ff87,#00d774)", boxShadow: "0 14px 38px rgba(0,255,135,.35)", fontFamily: "inherit" };
const sheen: any = { position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)", backgroundSize: "200% 100%", animation: "gsShine 2.4s linear infinite", pointerEvents: "none" };
const shine: any = { background: "linear-gradient(90deg,#fff,#9affce,#fff)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "gsShine 5s linear infinite" };
const KF = "@keyframes gsShine{0%{background-position:0% 50%}100%{background-position:200% 50%}}" +
  "@keyframes gsRise{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}" +
  "@keyframes gsPop{0%{opacity:0;transform:scale(.85)}100%{opacity:1;transform:scale(1)}}" +
  "@keyframes gsPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}" +
  "@keyframes gsBlink{0%,100%{opacity:1}50%{opacity:.35}}" +
  "@keyframes gsCandle{0%{opacity:0}100%{opacity:1}}";
