"use client";
import { useState, useEffect, useRef } from "react";

// ── MEMBER onboarding (1House Stream $99 / Startup $200) ────────────────────
// Free-tier onboarding lives at /onboard. This is the paid member path.

const BROKER_URL = "https://members.livvfxtrading.com/client/register/6a65379bb16ad";
const SIGNALS_URL = "https://t.me/TheOnlyGreenprintBot";
const COMMUNITY_URL = "https://t.me/+NFLNaB00u65mOTM5";
const MARKET_BULLY_URL = "https://t.me/+1rvPMKd6MRw3NGUx";
const ARIN_URL = "https://www.1house.tv/educators/a782da2a-81c6-4c32-9f6a-e36c9c74e218";

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
    const P = Math.max(20, Math.min(46, Math.floor(w / 28)));
    const pts = Array.from({ length: P }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .26, vy: (Math.random() - .5) * .26, r: Math.random() * 1.5 + .5 }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; }
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j]; const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        if (d < 14400) { ctx.strokeStyle = `rgba(0,255,133,${(1 - d / 14400) * .08})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      for (const p of pts) { ctx.fillStyle = "rgba(0,255,133,.28)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} aria-hidden style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: .5, zIndex: 0 }} />;
}

const APPS = [
  { name: "1House", desc: "Community platform", ios: "https://apps.apple.com/us/app/1house/id6754260060", android: "" },
  { name: "TradingView", desc: "Charts & analysis", ios: "https://apps.apple.com/us/app/tradingview-stock-market/id1205990992", android: "https://play.google.com/store/apps/details?id=com.tradingview.tradingviewapp" },
  { name: "TradeLocker", desc: "Trading platform", ios: "https://apps.apple.com/us/app/tradelocker/id6447196449", android: "https://play.google.com/store/apps/details?id=com.tradelocker.mobile" },
  { name: "Zoom", desc: "Live sessions", ios: "https://apps.apple.com/us/app/zoom-one-platform-to-connect/id546505307", android: "https://play.google.com/store/apps/details?id=us.zoom.videomeetings" },
  { name: "Telegram", desc: "Community chat", ios: "https://apps.apple.com/us/app/telegram-messenger/id686449807", android: "https://play.google.com/store/apps/details?id=org.telegram.messenger" },
  { name: "Boards", desc: "Task management", ios: "https://apps.apple.com/us/app/boards-com/id1507677341", android: "" },
];

// LivvFX account setup (replaces the old GenesisFX flow)
const BROKER_STEPS = [
  { n: 1, title: "Create Your LivvFX Account", desc: "Sign up through the link below so you're placed under The Greenprint.", href: BROKER_URL, linkLabel: "Open LivvFX Signup" },
  { n: 2, title: "Fill In Your Real Details", desc: "Email, first + last name, password, country, and phone. Your name has to match your ID for verification." },
  { n: 3, title: "Verify Your Email", desc: "Check your inbox and spam for the confirmation link from LivvFX, then click it." },
  { n: 4, title: "Complete Verification (KYC)", desc: "Upload a photo ID and proof of address in the portal — about 5 minutes. Required before you can withdraw." },
  { n: 5, title: "Get Your Platform Login", desc: "Once approved, your portal shows your trading account number, password, and server. Screenshot it — you need it to log into the app." },
];

const PLATFORM_STEPS = [
  { n: 1, title: "Download Your Trading App", desc: "Install the platform your LivvFX portal lists — TradeLocker or MT5 — from the App Store or Google Play." },
  { n: 2, title: "Log In With LivvFX Credentials", desc: "Use the account number, password, and server from your portal (not your portal email and password)." },
  { n: 3, title: "Create A Demo Account First", desc: "In the app, open a demo: leverage 1:500, size $10,000. Practice the signals here before real money." },
  { n: 4, title: "Fund When You're Ready", desc: "Deposit from inside your LivvFX portal. Only risk capital you can afford to lose — start small, stay consistent." },
];

const ARIN_CLIPS = [
  { n: 1, title: "New Trader Start Here", desc: "Begin here — no exceptions." },
  { n: 2, title: "Market Basics", desc: "Foundation for everything we do." },
  { n: 3, title: "Market Bully Strategy", desc: "The core strategy used inside The Greenprint." },
];

const TOTAL_STEPS = 6;

export default function MembersOnboardPage() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("gp_members_onboard") || "null");
      if (s?.step) setStep(Math.min(s.step, TOTAL_STEPS));
      if (s?.done) setDone(s.done);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem("gp_members_onboard", JSON.stringify({ step, done })); } catch {} } }, [step, done, ready]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep(s => Math.max(s - 1, 1));
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  const toggle = (k: string) => setDone(d => ({ ...d, [k]: !d[k] }));

  const Check = ({ k, n, title, desc, href, linkLabel }: { k: string; n: number; title: string; desc: string; href?: string; linkLabel?: string }) => (
    <div className="ob-card" style={{ padding: "14px 15px", borderRadius: 14,
      background: done[k] ? "rgba(0,255,133,.07)" : "rgba(255,255,255,.04)",
      border: done[k] ? "1px solid rgba(0,255,133,.35)" : "1px solid rgba(255,255,255,.09)" }}>
      <div onClick={() => toggle(k)} style={{ display: "flex", gap: 13, alignItems: "flex-start", cursor: "pointer" }}>
        <span style={{ width: 26, height: 26, borderRadius: 9, flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: done[k] ? "#00FF85" : "rgba(255,255,255,.06)", border: done[k] ? "none" : "1px solid rgba(255,255,255,.18)", color: "#000", fontWeight: 900, fontSize: 13 }}>
          {done[k] ? "✓" : n}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", color: done[k] ? "#00FF85" : "#fff", fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{title}</span>
          <span style={{ display: "block", color: "rgba(255,255,255,.5)", fontSize: 12.5, lineHeight: 1.55 }}>{desc}</span>
        </span>
      </div>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => toggle(k)}
          style={{ display: "inline-block", marginTop: 10, marginLeft: 39, fontSize: 12, fontWeight: 800, color: "#00FF85", border: "1px solid rgba(0,255,133,.3)", borderRadius: 8, padding: "6px 12px", textDecoration: "none" }}>
          {linkLabel} →
        </a>
      )}
    </div>
  );

  const Meter = ({ keys, label }: { keys: string[]; label: string }) => {
    const p = Math.round((keys.filter(k => done[k]).length / keys.length) * 100);
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: p === 100 ? "#00FF85" : "rgba(255,255,255,.35)", fontWeight: 800, marginBottom: 6 }}>
          <span>{p === 100 ? "✓ " + label + " complete" : label}</span><span>{p}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: p + "%", background: "linear-gradient(90deg,#00cc6a,#00FF85)", transition: "width .45s cubic-bezier(.2,.8,.3,1)", boxShadow: p ? "0 0 10px rgba(0,255,133,.7)" : "none" }} />
        </div>
      </div>
    );
  };

  const brokerKeys = BROKER_STEPS.map((_, i) => "b" + i);
  const platKeys = PLATFORM_STEPS.map((_, i) => "p" + i);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <style>{`
        @keyframes ob-rise { from{opacity:0; transform:translateY(24px); filter:blur(7px)} to{opacity:1; transform:translateY(0); filter:blur(0)} }
        @keyframes ob-aurora { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-30px) scale(1.15)} }
        @keyframes ob-pop { 0%{transform:scale(0); opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1); opacity:1} }
        @keyframes ob-confetti { 0%{transform:translate(0,0) rotate(0) scale(1); opacity:1} 100%{transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(.4); opacity:0} }
        @keyframes ob-shine { from{transform:translateX(-150%) skewX(-20deg)} to{transform:translateX(350%) skewX(-20deg)} }
        @keyframes ob-glow { 0%,100%{box-shadow:0 0 22px rgba(0,255,133,.30)} 50%{box-shadow:0 0 40px rgba(0,255,133,.55)} }
        .ob-step { animation: ob-rise .6s cubic-bezier(.16,.8,.3,1) both; }
        .ob-btn { position:relative; overflow:hidden; transition: transform .25s cubic-bezier(.2,.8,.3,1), box-shadow .25s ease; }
        .ob-btn:hover { transform: translateY(-2px) scale(1.01); box-shadow: 0 0 32px rgba(0,255,133,.45); }
        .ob-btn::after { content:""; position:absolute; top:0; bottom:0; width:40%; left:0;
          background: linear-gradient(105deg, transparent, rgba(255,255,255,.32), transparent);
          animation: ob-shine 3.2s ease-in-out infinite; pointer-events:none; }
        .ob-card { transition: transform .25s cubic-bezier(.2,.8,.3,1), border-color .25s, background .25s; }
        .ob-card:hover { transform: translateY(-2px); border-color: rgba(0,255,133,.3) !important; }
        .ob-pop { animation: ob-pop .7s cubic-bezier(.3,1.4,.5,1) both; }
        .ob-hero { animation: ob-glow 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .ob-step,.ob-pop,.ob-btn::after,.ob-hero { animation:none !important } }
      `}</style>
      <OnboardCanvas />
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div style={{ position: "absolute", top: "-12%", left: "-10%", width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,133,0.07) 0%, transparent 65%)", filter: "blur(50px)", animation: "ob-aurora 18s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-12%", width: 540, height: 540, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,200,100,0.05) 0%, transparent 65%)", filter: "blur(60px)", animation: "ob-aurora 24s ease-in-out infinite reverse" }} />
      </div>

      <div className="fixed top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <div className="h-full bg-[#00FF85] transition-all duration-700" style={{ width: pct + "%", boxShadow: "0 0 12px rgba(0,255,133,.9), 0 0 30px rgba(0,255,133,.4)" }} />
      </div>

      <div className="max-w-lg mx-auto px-6 pt-12 pb-28 relative">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
          <p className="text-white/30 text-xs tracking-widest uppercase">Member Setup · Step {step} of {TOTAL_STEPS}</p>
          <p style={{ fontSize: 11, color: "rgba(0,255,133,.55)", fontWeight: 800, letterSpacing: ".1em" }}>{pct}%</p>
        </div>

        {/* 1 · 1HOUSE */}
        {step === 1 && (
          <div className="ob-step">
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Your Home Base</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Log In to 1House</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              1House is where everything lives — the community, the content, and your connection to The Greenprint. Log in and take 5 minutes to explore before moving on. Get familiar with how it is laid out.
            </p>
            <a href="https://www.1house.tv" target="_blank" rel="noopener noreferrer" className="ob-btn block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center mb-4" style={{ textDecoration: "none" }}>
              Open 1House
            </a>
            <a href="https://apps.apple.com/us/app/1house/id6754260060" target="_blank" rel="noopener noreferrer" className="block w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold text-base text-center" style={{ textDecoration: "none" }}>
              Download the App (iOS)
            </a>
          </div>
        )}

        {/* 2 · APPS */}
        {step === 2 && (
          <div className="ob-step">
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Setup</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Download Your Apps</h2>
            <p className="text-white/50 text-sm mb-6">These are the tools you will use every day inside The Greenprint.</p>
            <video controls playsInline preload="metadata" src="/videos/1house-onboarding.mp4" className="w-full rounded-xl border border-white/10 bg-black mb-6" />
            <div className="flex flex-col gap-3">
              {APPS.map(app => (
                <div key={app.name} className="ob-card flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-white font-semibold text-sm">{app.name}</p>
                    <p className="text-white/40 text-xs">{app.desc}</p>
                  </div>
                  <div className="flex gap-2">
                    {app.ios && <a href={app.ios} target="_blank" rel="noopener noreferrer" className="text-[#00FF85] text-xs font-semibold border border-[#00FF85]/30 px-2 py-1 rounded-lg">iOS</a>}
                    {app.android && <a href={app.android} target="_blank" rel="noopener noreferrer" className="text-white/60 text-xs font-semibold border border-white/20 px-2 py-1 rounded-lg">Android</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3 · CHATS (now includes FREE SIGNALS) */}
        {step === 3 && (
          <div className="ob-step">
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Community</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Join the Chats</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-7">
              Get plugged in. This is where signals, updates, and live session alerts happen.
            </p>

            <div style={{ padding: "16px 16px 14px", borderRadius: 18, background: "linear-gradient(160deg, rgba(0,255,133,.09), rgba(0,0,0,0) 70%)", border: "1px solid rgba(0,255,133,.3)", marginBottom: 14 }}>
              <p style={{ color: "#00FF85", fontWeight: 800, fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 10px" }}>⚡ Start here — live signals</p>
              <a href={SIGNALS_URL} target="_blank" rel="noopener noreferrer" className="ob-btn flex items-center gap-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(0,255,133,.25)", textDecoration: "none" }}>
                <div className="w-10 h-10 rounded-xl bg-[#229ED9] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="#fff" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.412 14.6l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.736.959z" /></svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Greenprint Free Signals</p>
                  <p className="text-white/40 text-xs">Live entries · stops · targets</p>
                </div>
                <span className="ml-auto text-[#00FF85] text-sm">→</span>
              </a>
              <p style={{ color: "rgba(255,255,255,.35)", fontSize: 11.5, lineHeight: 1.55, margin: "10px 0 0" }}>
                Tap START in Telegram, then make sure notifications are unmuted so you never miss an entry.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { url: COMMUNITY_URL, name: "The Greenprint", desc: "Main community chat" },
                { url: MARKET_BULLY_URL, name: "Market Bully Community", desc: "Market Bully chat" },
              ].map(c => (
                <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className="ob-card flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#00FF85]/40 transition-colors" style={{ textDecoration: "none" }}>
                  <div className="w-10 h-10 rounded-xl bg-[#229ED9] flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="#fff" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.412 14.6l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.736.959z" /></svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{c.name}</p>
                    <p className="text-white/40 text-xs">{c.desc}</p>
                  </div>
                  <span className="ml-auto text-white/30 text-sm">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 4 · BROKER — LivvFX */}
        {step === 4 && (
          <div className="ob-step">
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Go Live</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-3">Set Up Your Broker</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-7">
              Create your LivvFX account, verify it, then set up your trading platform. Practice on demo first — funding comes when you can follow the plan without hesitating.
            </p>

            <Meter keys={brokerKeys} label="LivvFX account" />
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 26 }}>
              {BROKER_STEPS.map((s, i) => <Check key={s.n} k={"b" + i} n={s.n} title={s.title} desc={s.desc} href={(s as any).href} linkLabel={(s as any).linkLabel} />)}
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 22 }}>
              <Meter keys={platKeys} label="Trading platform" />
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {PLATFORM_STEPS.map((s, i) => <Check key={s.n} k={"p" + i} n={s.n} title={s.title} desc={s.desc} />)}
              </div>
            </div>

            <p style={{ fontSize: 11, color: "rgba(255,255,255,.28)", lineHeight: 1.6, marginTop: 18 }}>
              Disclosure: The Greenprint receives compensation from LivvFX for accounts opened through this link. Trading involves substantial risk of loss.
            </p>
          </div>
        )}

        {/* 5 · EDUCATION */}
        {step === 5 && (
          <div className="ob-step">
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Education</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Watch Arin Long&apos;s Clips</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              Watch these in order on her 1House channel. This is your foundation before you touch a live chart.
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {ARIN_CLIPS.map(item => (
                <div key={item.n} className="ob-card flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-7 h-7 rounded-full bg-[#00FF85]/10 border border-[#00FF85]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#00FF85] text-xs font-bold">{item.n}</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{item.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <a href={ARIN_URL} target="_blank" rel="noopener noreferrer" className="ob-btn block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center" style={{ textDecoration: "none" }}>
              Open Arin&apos;s Channel on 1House →
            </a>
          </div>
        )}

        {/* 6 · DONE */}
        {step === 6 && (
          <div className="ob-step text-center pt-8">
            <div className="relative w-16 h-16 mx-auto mb-8">
              <div className="ob-pop w-16 h-16 bg-[#00FF85] rounded-full flex items-center justify-center" style={{ boxShadow: "0 0 40px rgba(0,255,133,.6), 0 0 90px rgba(0,255,133,.25)" }}>
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              {[...Array(14)].map((_, i) => {
                const ang = (i / 14) * Math.PI * 2, dist = 70 + (i % 3) * 30;
                const colors = ["#00FF85", "#C9A84C", "#ffffff", "#00cc6a"];
                return <span key={i} aria-hidden style={{
                  position: "absolute", top: "50%", left: "50%", width: i % 2 ? 6 : 8, height: i % 2 ? 6 : 8,
                  borderRadius: i % 3 === 0 ? "50%" : 2, background: colors[i % 4],
                  ["--cx" as any]: `${Math.cos(ang) * dist}px`, ["--cy" as any]: `${Math.sin(ang) * dist}px`,
                  ["--cr" as any]: `${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`,
                  animation: `ob-confetti ${.9 + (i % 4) * .15}s cubic-bezier(.2,.8,.4,1) ${.25 + (i % 5) * .04}s both`, pointerEvents: "none",
                }} />;
              })}
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">You are All Set.</h2>
            <p className="text-white/50 text-base leading-relaxed mb-8">
              You have got the apps, the broker, the community access, and the foundation. Welcome to The Greenprint — we will see you inside.
            </p>
            <video controls playsInline preload="metadata" src="/videos/tradelocker-tutorial.mp4" className="w-full rounded-xl border border-white/10 bg-black mb-4" />
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", lineHeight: 1.6, marginBottom: 24 }}>
              Platform walkthrough — setting up and placing your first trade.
            </p>
            <div style={{ display: "grid", gap: 8, marginBottom: 22, textAlign: "left" }}>
              <a href="/stream" className="ob-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 15px", borderRadius: 13, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", textDecoration: "none" }}>
                <span>
                  <span style={{ display: "block", color: "#fff", fontWeight: 700, fontSize: 13 }}>Live sessions</span>
                  <span style={{ display: "block", color: "rgba(255,255,255,.45)", fontSize: 12, marginTop: 2 }}>Wednesdays 8:00 AM CST</span>
                </span>
                <span style={{ color: "rgba(0,255,133,.6)" }}>→</span>
              </a>
            </div>
            <a href={SIGNALS_URL} target="_blank" rel="noopener noreferrer" className="ob-btn block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center mb-3" style={{ textDecoration: "none" }}>
              Open Free Signals →
            </a>
            <a href="/" className="block w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold text-base text-center" style={{ textDecoration: "none" }}>
              Back to Home
            </a>
          </div>
        )}

        {step < TOTAL_STEPS && (
          <div className="flex gap-3 mt-11">
            {step > 1 && <button onClick={prev} className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-base">Back</button>}
            <button onClick={next} className="ob-btn flex-1 py-3.5 rounded-xl bg-[#00FF85] text-black font-bold text-base" style={{ boxShadow: "0 0 22px rgba(0,255,133,.3)" }}>
              {step === 1 ? "Let's Go" : "Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
