"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";

// ── /start — the link-in-bio landing page ───────────────────────────────────
// One screen, one job: turn a stranger from social into someone in the chat.
// No nav, no scroll, no decisions.

function Constellation() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { w = window.innerWidth; h = window.innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener("resize", resize);
    const lite = window.innerWidth < 640;
    const P = lite ? 18 : 34;
    const pts = Array.from({ length: P }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.5 + .5 }));
    const CW = 30; const count = Math.ceil(w / CW) + 2;
    let price = h * .72;
    const newCandle = () => { const o = price; let c = o + (Math.random() - .42) * 26; c = Math.max(h * .5, Math.min(h * .92, c)); price = c; return { o, c, hi: Math.max(o, c) + Math.random() * 12, lo: Math.min(o, c) - Math.random() * 12 }; };
    const candles = Array.from({ length: count }, newCandle);
    let off = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; }
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j]; const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        if (d < 15000) { ctx.strokeStyle = `rgba(0,255,133,${(1 - d / 15000) * .09})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      for (const p of pts) { ctx.fillStyle = "rgba(0,255,133,.3)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      off -= .3; if (off <= -CW) { off += CW; candles.shift(); candles.push(newCandle()); }
      ctx.save(); ctx.shadowBlur = lite ? 0 : 10;
      candles.forEach((cd, i) => {
        const x = i * CW + off; const up = cd.c <= cd.o; const col = up ? "#00FF85" : "#1d5f42";
        ctx.shadowColor = col; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.globalAlpha = .3;
        ctx.beginPath(); ctx.moveTo(x + CW / 2, cd.lo); ctx.lineTo(x + CW / 2, cd.hi); ctx.stroke();
        ctx.globalAlpha = up ? .26 : .17; ctx.fillRect(x + 5, Math.min(cd.o, cd.c), CW - 10, Math.max(3, Math.abs(cd.o - cd.c)));
      });
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} aria-hidden style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: .5, zIndex: 0 }} />;
}

export default function StartPage() {
  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(900px 600px at 50% -5%, #0a1810 0%, #050705 60%)", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 22px", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes st-rise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes st-glow{0%,100%{box-shadow:0 0 26px rgba(0,255,133,.35)}50%{box-shadow:0 0 46px rgba(0,255,133,.6)}}
        @keyframes st-shine{from{transform:translateX(-150%) skewX(-20deg)}to{transform:translateX(350%) skewX(-20deg)}}
        @keyframes st-pulse{0%,100%{opacity:1}50%{opacity:.45}}
        .st-in{opacity:0;animation:st-rise .7s cubic-bezier(.16,.8,.3,1) forwards}
        .st-cta{position:relative;overflow:hidden;animation:st-glow 3s ease-in-out infinite;transition:transform .2s}
        .st-cta:hover{transform:translateY(-2px) scale(1.015)}
        .st-cta:active{transform:scale(.99)}
        .st-cta::after{content:"";position:absolute;top:0;bottom:0;width:38%;left:0;background:linear-gradient(105deg,transparent,rgba(255,255,255,.35),transparent);animation:st-shine 3.4s ease-in-out infinite;pointer-events:none}
        .st-sec{transition:background .2s,border-color .2s,transform .2s}
        .st-sec:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.22);transform:translateY(-1px)}
        @media(prefers-reduced-motion:reduce){.st-in,.st-cta,.st-cta::after{animation:none;opacity:1}}
      `}</style>
      <Constellation />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 400, textAlign: "center" }}>
        {/* logo */}
        <div className="st-in" style={{ animationDelay: ".05s" }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#00FF85,#00c864)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 0 40px rgba(0,255,133,.35)" }}>
            <svg width="34" height="34" viewBox="0 0 16 16" fill="none">
              <path d="M2 12L6 7L9 10L13 4" stroke="#050705" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* live badge */}
        <div className="st-in" style={{ animationDelay: ".15s", display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(0,255,133,.1)", border: "1px solid rgba(0,255,133,.28)", borderRadius: 20, padding: "5px 13px", marginBottom: 18 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF85", animation: "st-pulse 1.6s infinite" }} />
          <span style={{ color: "#00FF85", fontSize: 11, fontWeight: 800, letterSpacing: ".1em" }}>LIVE WEDNESDAYS · 8AM CST</span>
        </div>

        <h1 className="st-in" style={{ animationDelay: ".25s", fontSize: "clamp(32px,9vw,44px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-.03em", margin: "0 0 14px" }}>
          I post my trades<br /><span style={{ color: "#00FF85" }}>live. For free.</span>
        </h1>

        <p className="st-in" style={{ animationDelay: ".35s", color: "rgba(255,255,255,.55)", fontSize: 15, lineHeight: 1.6, margin: "0 0 30px" }}>
          Entries, stops, and targets sent straight to your phone. No subscription, no card — just follow along and learn how I trade.
        </p>

        <Link href="/onboard" className="st-cta"
          style={{ display: "block", width: "100%", padding: "18px 0", borderRadius: 16, background: "linear-gradient(135deg,#00FF85,#00c864)", color: "#000", fontWeight: 900, fontSize: 17, textDecoration: "none", marginBottom: 12 }}>
          Get Free Signals →
        </Link>

        <p className="st-in" style={{ animationDelay: ".5s", color: "rgba(0,255,133,.5)", fontSize: 12, fontWeight: 700, margin: "0 0 26px" }}>
          Takes 5 minutes · No credit card
        </p>

        <div className="st-in" style={{ animationDelay: ".6s", display: "flex", gap: 9 }}>
          <Link href="/stream" className="st-sec" style={{ flex: 1, padding: "13px 0", borderRadius: 13, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            ▶ Watch Live
          </Link>
          <Link href="/" className="st-sec" style={{ flex: 1, padding: "13px 0", borderRadius: 13, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            The Greenprint
          </Link>
        </div>

        <p className="st-in" style={{ animationDelay: ".7s", color: "rgba(255,255,255,.22)", fontSize: 10.5, lineHeight: 1.6, marginTop: 28 }}>
          Educational content only. Not financial advice. Trading involves risk of loss.
        </p>
      </div>
    </div>
  );
}
