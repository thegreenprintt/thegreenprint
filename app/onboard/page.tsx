"use client";
import { useState, useEffect, useRef } from "react";

const BROKER_URL = "https://members.livvfxtrading.com/client/register/6a65379bb16ad";
const BOT_URL = "https://t.me/TheOnlyGreenprintBot";
const NEW_TRADERS_URL = "https://t.me/TheGreenprintt";

function OnboardCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { w = window.innerWidth; h = window.innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener("resize", resize);
    const P = Math.max(18, Math.min(40, Math.floor(w / 30)));
    const pts = Array.from({ length: P }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .24, vy: (Math.random() - .5) * .24, r: Math.random() * 1.4 + .5 }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; }
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j]; const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        if (d < 14400) { ctx.strokeStyle = `rgba(0,255,133,${(1 - d / 14400) * .07})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      for (const p of pts) { ctx.fillStyle = "rgba(0,255,133,.25)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} aria-hidden style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: .45, zIndex: 0 }} />;
}

const SIGNUP = [
  { n: 1, t: "Tap the green button below", d: "It opens the LivvFX signup page." },
  { n: 2, t: "Fill in the form → Sign Up", d: "Email, name, password, country, phone." },
  { n: 3, t: "Click the email they send you", d: "Check spam too. Your account is now live." },
];

const DEMO = [
  { n: 1, t: "Download TradeLocker", d: "App Store or Google Play. This is where you trade." },
  { n: 2, t: "Log in", d: "Email: your LivvFX email · Password: your LivvFX password · Server: LIVVFX" },
  { n: 3, t: "Create a demo account", d: "Set leverage 1:500 and size $10,000. Practice here first — it's fake money." },
];

const DEPOSIT = [
  { n: 1, t: "Log in at members.livvfxtrading.com", d: "Same email and password." },
  { n: 2, t: "Menu → My Fund → Deposit", d: "Pick Card (instant) or Crypto." },
  { n: 3, t: "Enter the amount → Submit → pay", d: "Crypto: pick the network, then send to the address shown." },
  { n: 4, t: "My Wallet → Wallet To Trading Account", d: "⚠️ Don't skip. Money in your wallet can't be traded — move it in." },
  { n: 5, t: "Open TradeLocker", d: "Your balance is there. Ready." },
];

const WITHDRAW = [
  { n: 1, t: "My Wallet → Trading Account To Wallet", d: "Enter the amount → Submit." },
  { n: 2, t: "My Fund → Withdraw", d: "Pick your crypto network." },
  { n: 3, t: "Paste your wallet address + amount", d: "Double-check the address." },
  { n: 4, t: "Enter your 2FA code → Submit", d: "Paid the same day — minutes to a few hours." },
];

const TOTAL = 3;

export default function OnboardPage() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"demo" | "deposit" | "withdraw">("demo");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("gp_onboard") || "null");
      if (s?.step) setStep(Math.min(s.step, TOTAL));
      if (s?.done) setDone(s.done);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem("gp_onboard", JSON.stringify({ step, done })); } catch {} } }, [step, done, ready]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const toggle = (k: string) => setDone(d => ({ ...d, [k]: !d[k] }));
  const pct = Math.round((step / TOTAL) * 100);

  const Row = ({ k, n, t, d }: { k: string; n: number; t: string; d: string }) => (
    <button onClick={() => toggle(k)} className="ob-card"
      style={{ display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left", width: "100%", padding: "13px 14px", borderRadius: 13, cursor: "pointer",
        background: done[k] ? "rgba(0,255,133,.07)" : "rgba(255,255,255,.04)",
        border: done[k] ? "1px solid rgba(0,255,133,.35)" : "1px solid rgba(255,255,255,.09)" }}>
      <span style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: done[k] ? "#00FF85" : "rgba(255,255,255,.06)", border: done[k] ? "none" : "1px solid rgba(255,255,255,.16)", color: "#000", fontWeight: 900, fontSize: 12 }}>
        {done[k] ? "✓" : n}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", color: done[k] ? "#00FF85" : "#fff", fontWeight: 700, fontSize: 13.5, marginBottom: 2 }}>{t}</span>
        <span style={{ display: "block", color: "rgba(255,255,255,.48)", fontSize: 12.5, lineHeight: 1.5 }}>{d}</span>
      </span>
    </button>
  );

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <style>{`
        @keyframes ob-rise{from{opacity:0;transform:translateY(22px);filter:blur(6px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}
        @keyframes ob-aurora{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.15)}}
        @keyframes ob-pop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        @keyframes ob-confetti{0%{transform:translate(0,0) rotate(0) scale(1);opacity:1}100%{transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(.4);opacity:0}}
        @keyframes ob-shine{from{transform:translateX(-150%) skewX(-20deg)}to{transform:translateX(350%) skewX(-20deg)}}
        @keyframes ob-glow{0%,100%{box-shadow:0 0 22px rgba(0,255,133,.3)}50%{box-shadow:0 0 40px rgba(0,255,133,.55)}}
        .ob-step{animation:ob-rise .55s cubic-bezier(.16,.8,.3,1) both}
        .ob-btn{position:relative;overflow:hidden;transition:transform .25s cubic-bezier(.2,.8,.3,1),box-shadow .25s}
        .ob-btn:hover{transform:translateY(-2px) scale(1.01);box-shadow:0 0 32px rgba(0,255,133,.45)}
        .ob-btn::after{content:"";position:absolute;top:0;bottom:0;width:40%;left:0;background:linear-gradient(105deg,transparent,rgba(255,255,255,.32),transparent);animation:ob-shine 3.2s ease-in-out infinite;pointer-events:none}
        .ob-card{transition:transform .22s cubic-bezier(.2,.8,.3,1),border-color .22s,background .22s}
        .ob-card:hover{transform:translateY(-2px);border-color:rgba(0,255,133,.3)!important}
        .ob-pop{animation:ob-pop .7s cubic-bezier(.3,1.4,.5,1) both}
        .ob-hero{animation:ob-glow 3s ease-in-out infinite}
        @media(prefers-reduced-motion:reduce){.ob-step,.ob-pop,.ob-btn::after,.ob-hero{animation:none!important}}
      `}</style>
      <OnboardCanvas />
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div style={{ position: "absolute", top: "-12%", left: "-10%", width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,133,.07) 0%, transparent 65%)", filter: "blur(50px)", animation: "ob-aurora 18s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-12%", width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,200,100,.05) 0%, transparent 65%)", filter: "blur(60px)", animation: "ob-aurora 24s ease-in-out infinite reverse" }} />
      </div>

      <div className="fixed top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <div className="h-full bg-[#00FF85] transition-all duration-700" style={{ width: pct + "%", boxShadow: "0 0 12px rgba(0,255,133,.9)" }} />
      </div>

      <div className="max-w-lg mx-auto px-6 pt-12 pb-28 relative">
        <p className="text-white/30 text-xs tracking-widest uppercase" style={{ marginBottom: 24 }}>Step {step} of {TOTAL}</p>

        {/* ── 1 · BROKER ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="ob-step">
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: "#00FF85" }}>Step 1</span>
            <h2 style={{ fontSize: 26, fontWeight: 900, margin: "10px 0 12px", lineHeight: 1.2 }}>Open your broker account</h2>
            <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>
              This is where you trade. Sign up with LivvFX using my link — that&apos;s what makes my signals free for you.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }}>
              {SIGNUP.map(s => <Row key={s.n} k={"g" + s.n} n={s.n} t={s.t} d={s.d} />)}
            </div>

            <a href={BROKER_URL} target="_blank" rel="noopener noreferrer" onClick={() => toggle("g1")}
              className="ob-btn block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center"
              style={{ boxShadow: "0 0 26px rgba(0,255,133,.35)", textDecoration: "none", marginBottom: 30 }}>
              Sign Up With LivvFX →
            </a>

            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {([["demo", "Demo Account"], ["deposit", "Deposit"], ["withdraw", "Withdraw"]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 11, cursor: "pointer", fontWeight: 800, fontSize: 12,
                    background: tab === id ? "#00FF85" : "rgba(255,255,255,.05)",
                    color: tab === id ? "#000" : "rgba(255,255,255,.5)",
                    border: tab === id ? "none" : "1px solid rgba(255,255,255,.1)", transition: "all .2s" }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {(tab === "demo" ? DEMO : tab === "deposit" ? DEPOSIT : WITHDRAW).map(s => (
                <Row key={tab + s.n} k={tab[0] + s.n} n={s.n} t={s.t} d={s.d} />
              ))}
            </div>
          </div>
        )}

        {/* ── 2 · CHATS VIA BOT ──────────────────────────────────── */}
        {step === 2 && (
          <div className="ob-step">
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: "#00FF85" }}>Step 2</span>
            <h2 style={{ fontSize: 26, fontWeight: 900, margin: "10px 0 12px", lineHeight: 1.2 }}>Get in the chats</h2>
            <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>
              Open the bot, follow the steps it gives you, and you&apos;ll be let into the signals chat automatically.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }}>
              <Row k="c1" n={1} t="Tap the button below to open the bot" d="It's a Telegram chat. Hit START." />
              <Row k="c2" n={2} t="Send a screenshot of your LivvFX dashboard" d="Just a picture of your account page — that's how we know you signed up." />
              <Row k="c3" n={3} t="Follow the steps the bot gives you" d="It walks you through the rest. You get access automatically." />
            </div>

            <a href={BOT_URL} target="_blank" rel="noopener noreferrer" onClick={() => toggle("c1")}
              className="ob-btn block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center"
              style={{ boxShadow: "0 0 26px rgba(0,255,133,.35)", textDecoration: "none", marginBottom: 12 }}>
              Open The Bot →
            </a>
            <a href={NEW_TRADERS_URL} target="_blank" rel="noopener noreferrer"
              className="block w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold text-sm text-center"
              style={{ textDecoration: "none" }}>
              Join the 2026 New Traders chat →
            </a>
          </div>
        )}

        {/* ── 3 · TRADE WITH US ──────────────────────────────────── */}
        {step === 3 && (
          <div className="ob-step">
            <div className="relative w-14 h-14 mx-auto mb-6">
              <div className="ob-pop w-14 h-14 bg-[#00FF85] rounded-full flex items-center justify-center" style={{ boxShadow: "0 0 40px rgba(0,255,133,.6)" }}>
                <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              {[...Array(12)].map((_, i) => {
                const ang = (i / 12) * Math.PI * 2, dist = 62 + (i % 3) * 26;
                const colors = ["#00FF85", "#C9A84C", "#ffffff", "#00cc6a"];
                return <span key={i} aria-hidden style={{
                  position: "absolute", top: "50%", left: "50%", width: i % 2 ? 5 : 7, height: i % 2 ? 5 : 7,
                  borderRadius: i % 3 === 0 ? "50%" : 2, background: colors[i % 4],
                  ["--cx" as any]: `${Math.cos(ang) * dist}px`, ["--cy" as any]: `${Math.sin(ang) * dist}px`,
                  ["--cr" as any]: `${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`,
                  animation: `ob-confetti ${.9 + (i % 4) * .15}s cubic-bezier(.2,.8,.4,1) ${.25 + (i % 5) * .04}s both`, pointerEvents: "none",
                }} />;
              })}
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 12px", lineHeight: 1.2, textAlign: "center" }}>You&apos;re in. Now trade with us.</h2>
            <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, lineHeight: 1.6, marginBottom: 22, textAlign: "center" }}>
              Take the signals when they drop, and hop in the calls that get posted in the chats. Here&apos;s how to place a trade in TradeLocker:
            </p>

            <video controls playsInline preload="metadata" src="/videos/tradelocker-tutorial.mp4"
              className="w-full rounded-xl border border-white/10 bg-black" style={{ marginBottom: 24 }} />

            <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
              <a href="/stream" className="ob-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 15px", borderRadius: 13, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", textDecoration: "none" }}>
                <span>
                  <span style={{ display: "block", color: "#fff", fontWeight: 700, fontSize: 13.5 }}>Live sessions</span>
                  <span style={{ display: "block", color: "rgba(255,255,255,.45)", fontSize: 12, marginTop: 2 }}>Wednesdays · 8:00 AM CST</span>
                </span>
                <span style={{ color: "rgba(0,255,133,.6)" }}>→</span>
              </a>
              <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="ob-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 15px", borderRadius: 13, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", textDecoration: "none" }}>
                <span>
                  <span style={{ display: "block", color: "#fff", fontWeight: 700, fontSize: 13.5 }}>Free signals</span>
                  <span style={{ display: "block", color: "rgba(255,255,255,.45)", fontSize: 12, marginTop: 2 }}>Open the chat</span>
                </span>
                <span style={{ color: "rgba(0,255,133,.6)" }}>→</span>
              </a>
            </div>

            <a href="/" className="block w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold text-base text-center" style={{ textDecoration: "none" }}>
              Back to Home
            </a>
            <p style={{ fontSize: 10.5, color: "rgba(255,255,255,.22)", lineHeight: 1.6, marginTop: 20, textAlign: "center" }}>
              Educational only. Not financial advice. Trading involves risk of loss.
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-10">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-base">
              ← Back
            </button>
          )}
          {step < TOTAL && (
            <button onClick={() => setStep(s => Math.min(s + 1, TOTAL))} className="ob-btn flex-1 py-3.5 rounded-xl bg-[#00FF85] text-black font-bold text-base" style={{ boxShadow: "0 0 22px rgba(0,255,133,.3)" }}>
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
