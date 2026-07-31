"use client";
import { useState, useEffect, useRef } from "react";

const BROKER_URL = "https://members.livvfxtrading.com/client/register/6a65379bb16ad";
const SIGNALS_URL = "https://t.me/TheOnlyGreenprintBot";
const COMMUNITY_URL = "https://t.me/+NFLNaB00u65mOTM5";
const MARKET_BULLY_URL = "https://t.me/+1rvPMKd6MRw3NGUx";

// ── Ambient constellation canvas (visual only) ───────────────────────────────
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
  { name: "Telegram", desc: "Where every signal drops", ios: "https://apps.apple.com/us/app/telegram-messenger/id686449807", android: "https://play.google.com/store/apps/details?id=org.telegram.messenger" },
  { name: "TradingView", desc: "Charts & analysis", ios: "https://apps.apple.com/us/app/tradingview-stock-market/id1205990992", android: "https://play.google.com/store/apps/details?id=com.tradingview.tradingviewapp" },
  { name: "TradeLocker", desc: "Place your trades", ios: "https://apps.apple.com/us/app/tradelocker/id6447196449", android: "https://play.google.com/store/apps/details?id=com.tradelocker.mobile" },
  { name: "1House", desc: "Community platform", ios: "https://apps.apple.com/us/app/1house/id6754260060", android: "" },
];

const BROKER_STEPS = [
  { n: 1, title: "Open the LivvFX signup page", desc: "Use the button below — it has to be this link so you're placed under The Greenprint and unlock the free signals." },
  { n: 2, title: "Fill in your real details", desc: "Email, first + last name, password, country, phone. Use your real name — it has to match your ID for verification." },
  { n: 3, title: "Verify your email", desc: "Check your inbox (and spam) and click the confirmation link from LivvFX." },
  { n: 4, title: "Complete verification (KYC)", desc: "Upload a photo ID and a proof of address. Takes about 5 minutes. Do it now — you can't withdraw profits until it's done." },
  { n: 5, title: "Grab your platform login", desc: "Once approved, your LivvFX portal shows your trading account number, password, and server. Screenshot it — you'll need it in the next step." },
];

const PLATFORM_STEPS = [
  { n: 1, title: "Download the trading app", desc: "Install the platform your LivvFX portal lists (TradeLocker or MT5) from the App Store or Google Play." },
  { n: 2, title: "Log in with your LivvFX credentials", desc: "Use the account number, password, and server from your portal — not your portal email/password." },
  { n: 3, title: "Start on a DEMO account first", desc: "In the app, create a demo account (set leverage to 1:500, size $10,000). Take signals on demo until you can follow them without hesitating." },
  { n: 4, title: "Fund when you're ready", desc: "Deposit from your LivvFX portal — only risk capital you can afford to lose. Small is fine. Consistency beats size." },
];

const SIGNAL_STEPS = [
  { n: 1, title: "The alert hits your phone", desc: "You'll get something like: BUY XAUUSD @ 2358.40 · SL 2352.00 · TP1 2364.00 · TP2 2371.00." },
  { n: 2, title: "Open your trading app", desc: "Pull up the exact pair in the signal. Don't substitute a different pair." },
  { n: 3, title: "Match the direction and price", desc: "BUY means buy, SELL means sell. If price has already run past the entry, skip it — never chase." },
  { n: 4, title: "Set your stop loss FIRST", desc: "Enter the SL from the signal before anything else. This is the rule that keeps you alive." },
  { n: 5, title: "Size it to your risk, not your hope", desc: "Risk 1–2% of your account on the trade. The app shows lot size — start with the smallest that fits that rule." },
  { n: 6, title: "Set your take profits", desc: "TP1 and TP2 from the signal. Common play: close half at TP1, move your stop to break-even, let the rest ride to TP2." },
  { n: 7, title: "Then leave it alone", desc: "No moving stops wider. No adding to losers. The plan was set before emotion showed up — let it play out." },
  { n: 8, title: "Log the result", desc: "Win or loss, write it down. Your journal is what turns copied signals into your own skill." },
];

const TOTAL_STEPS = 7;

export default function OnboardPage() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState("");
  const [ready, setReady] = useState(false);

  // resume where they left off
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("gp_onboard") || "null");
      if (s?.step) setStep(Math.min(s.step, TOTAL_STEPS));
      if (s?.done) setDone(s.done);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem("gp_onboard", JSON.stringify({ step, done })); } catch {} } }, [step, done, ready]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep(s => Math.max(s - 1, 1));
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  const toggle = (k: string) => setDone(d => ({ ...d, [k]: !d[k] }));
  const copy = async (text: string, tag: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(tag); setTimeout(() => setCopied(""), 1800); } catch {}
  };

  // interactive checklist row
  const Check = ({ k, n, title, desc }: { k: string; n: number; title: string; desc: string }) => (
    <button onClick={() => toggle(k)} className="ob-card"
      style={{ display: "flex", gap: 13, alignItems: "flex-start", textAlign: "left", width: "100%", padding: "14px 15px", borderRadius: 14, cursor: "pointer",
        background: done[k] ? "rgba(0,255,133,.07)" : "rgba(255,255,255,.04)",
        border: done[k] ? "1px solid rgba(0,255,133,.35)" : "1px solid rgba(255,255,255,.09)" }}>
      <span style={{ width: 26, height: 26, borderRadius: 9, flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: done[k] ? "#00FF85" : "rgba(255,255,255,.06)", border: done[k] ? "none" : "1px solid rgba(255,255,255,.18)",
        color: "#000", fontWeight: 900, fontSize: 13 }}>{done[k] ? "✓" : n}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", color: done[k] ? "#00FF85" : "#fff", fontWeight: 700, fontSize: 13.5, marginBottom: 3, textDecoration: done[k] ? "line-through" : "none", textDecorationColor: "rgba(0,255,133,.5)" }}>{title}</span>
        <span style={{ display: "block", color: "rgba(255,255,255,.5)", fontSize: 12.5, lineHeight: 1.55 }}>{desc}</span>
      </span>
    </button>
  );

  const groupPct = (keys: string[]) => Math.round((keys.filter(k => done[k]).length / keys.length) * 100);
  const Meter = ({ keys, label }: { keys: string[]; label: string }) => {
    const p = groupPct(keys);
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

  const Tag = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[#00FF85]" style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase" }}>{children}</span>
  );
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 25, fontWeight: 900, color: "#fff", margin: "10px 0 12px", lineHeight: 1.2, letterSpacing: "-.01em" }}>{children}</h2>
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <p style={{ color: "rgba(255,255,255,.52)", fontSize: 14, lineHeight: 1.65, marginBottom: 22 }}>{children}</p>
  );

  const brokerKeys = BROKER_STEPS.map((_, i) => "b" + i);
  const platKeys = PLATFORM_STEPS.map((_, i) => "p" + i);
  const sigKeys = SIGNAL_STEPS.map((_, i) => "s" + i);

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
        .ob-btn:active { transform: translateY(0) scale(.99); }
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
          <p className="text-white/30 text-xs tracking-widest uppercase">Step {step} of {TOTAL_STEPS}</p>
          <p style={{ fontSize: 11, color: "rgba(0,255,133,.55)", fontWeight: 800, letterSpacing: ".1em" }}>{pct}%</p>
        </div>

        {/* ── 1 · WELCOME ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="ob-step" style={{ textAlign: "center" }}>
            <div className="ob-hero" style={{ width: 74, height: 74, borderRadius: 22, background: "linear-gradient(135deg,#00FF85,#00cc6a)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32 }}>🌿</div>
            <Tag>Welcome to the family</Tag>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "12px 0 14px", lineHeight: 1.15, letterSpacing: "-.02em" }}>
              Get My Trades.<br /><span className="text-[#00FF85]">For Free.</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,.55)", fontSize: 14.5, lineHeight: 1.7, marginBottom: 26 }}>
              No subscription. No paywall. Open your trading account under The Greenprint, and my live signals come straight to your phone — the same ones I'm taking myself.
            </p>
            <div style={{ display: "grid", gap: 9, marginBottom: 26, textAlign: "left" }}>
              {[
                ["📲", "Free signals", "Entry, stop loss, and targets — sent the moment I take the trade."],
                ["🎓", "Learn as you go", "Every signal is a lesson. You'll understand the why, not just copy."],
                ["💬", "Real community", "Ask questions, post your wins, never trade alone again."],
              ].map(([icon, t, d]) => (
                <div key={t} className="ob-card" style={{ display: "flex", gap: 12, padding: "13px 14px", borderRadius: 14, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span>
                    <span style={{ display: "block", color: "#fff", fontWeight: 700, fontSize: 13.5 }}>{t}</span>
                    <span style={{ display: "block", color: "rgba(255,255,255,.45)", fontSize: 12.5, lineHeight: 1.5, marginTop: 2 }}>{d}</span>
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", lineHeight: 1.6 }}>
              Takes about 10 minutes. Your progress saves automatically — you can close this and come back.
            </p>
          </div>
        )}

        {/* ── 2 · FREE SIGNALS ───────────────────────────────────── */}
        {step === 2 && (
          <div className="ob-step">
            <Tag>Step one · free</Tag>
            <H>Join the Free Signals channel</H>
            <P>This is where every trade drops. Tap in now so you're inside before the next signal — it's free, and it stays free.</P>

            <div style={{ padding: "18px 18px 16px", borderRadius: 18, background: "linear-gradient(160deg, rgba(0,255,133,.09), rgba(0,0,0,0) 70%)", border: "1px solid rgba(0,255,133,.3)", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: "#229ED9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.412 14.6l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.736.959z" /></svg>
                </div>
                <div>
                  <p style={{ color: "#fff", fontWeight: 800, fontSize: 15, margin: 0 }}>Greenprint Free Signals</p>
                  <p style={{ color: "rgba(255,255,255,.45)", fontSize: 12, margin: "2px 0 0" }}>Live entries · stops · targets</p>
                </div>
              </div>
              <a href={SIGNALS_URL} target="_blank" rel="noopener noreferrer" onClick={() => toggle("joinedSignals")}
                className="ob-btn block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center"
                style={{ boxShadow: "0 0 26px rgba(0,255,133,.35)", textDecoration: "none" }}>
                Get Free Signals →
              </a>
              <button onClick={() => copy(SIGNALS_URL, "sig")} style={{ width: "100%", marginTop: 9, background: "transparent", border: "none", color: copied === "sig" ? "#00FF85" : "rgba(255,255,255,.35)", fontSize: 11.5, cursor: "pointer", fontWeight: 600 }}>
                {copied === "sig" ? "✓ Link copied" : "or copy the link"}
              </button>
            </div>

            <Check k="joinedSignals" n={1} title="I'm in the free signals channel" desc="Tap the button above, then hit START in Telegram so the bot can reach you." />
            <div style={{ height: 10 }} />
            <Check k="notifOn" n={2} title="Notifications turned ON" desc="In Telegram, open the channel → tap the name → make sure it's unmuted. A signal you see an hour late is a signal you can't take." />

            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", lineHeight: 1.6, marginTop: 20 }}>
              Signals are educational — not financial advice. You place your own trades and manage your own risk.
            </p>
          </div>
        )}

        {/* ── 3 · BROKER ─────────────────────────────────────────── */}
        {step === 3 && (
          <div className="ob-step">
            <Tag>Step two · your account</Tag>
            <H>Open your LivvFX account</H>
            <P>This is the one thing I ask. Sign up through my link and the signals stay free forever — that's the whole deal.</P>

            <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(0,255,133,.05)", border: "1px solid rgba(0,255,133,.18)", marginBottom: 20 }}>
              <p style={{ color: "#00FF85", fontWeight: 800, fontSize: 11.5, letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 6px" }}>Why it's free for you</p>
              <p style={{ color: "rgba(255,255,255,.6)", fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
                When you trade through my LivvFX link, the broker pays me a small share of the spread you'd pay anyway. It costs you nothing extra — and it means I get paid for teaching instead of charging you a monthly fee. Our goals line up: I only win if you keep trading, so I'd rather you last years than blow up in a week.
              </p>
            </div>

            <Meter keys={brokerKeys} label="Account setup" />
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
              {BROKER_STEPS.map((s, i) => <Check key={s.n} k={"b" + i} n={s.n} title={s.title} desc={s.desc} />)}
            </div>

            <a href={BROKER_URL} target="_blank" rel="noopener noreferrer" onClick={() => toggle("b0")}
              className="ob-btn block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center"
              style={{ boxShadow: "0 0 26px rgba(0,255,133,.35)", textDecoration: "none" }}>
              Open My LivvFX Account →
            </a>
            <button onClick={() => copy(BROKER_URL, "brk")} style={{ width: "100%", marginTop: 9, background: "transparent", border: "none", color: copied === "brk" ? "#00FF85" : "rgba(255,255,255,.35)", fontSize: 11.5, cursor: "pointer", fontWeight: 600 }}>
              {copied === "brk" ? "✓ Link copied" : "or copy the signup link"}
            </button>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,.28)", lineHeight: 1.6, marginTop: 16 }}>
              Disclosure: The Greenprint receives compensation from LivvFX for accounts opened through this link. Trading involves substantial risk of loss.
            </p>
          </div>
        )}

        {/* ── 4 · PLATFORM ───────────────────────────────────────── */}
        {step === 4 && (
          <div className="ob-step">
            <Tag>Step three · your platform</Tag>
            <H>Set up where you trade</H>
            <P>Your LivvFX portal gives you the login for your trading platform. Get it on your phone, then practice on demo before a dollar is at risk.</P>

            <Meter keys={platKeys} label="Platform setup" />
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
              {PLATFORM_STEPS.map((s, i) => <Check key={s.n} k={"p" + i} n={s.n} title={s.title} desc={s.desc} />)}
            </div>

            <video controls playsInline preload="metadata" src="/videos/tradelocker-tutorial.mp4"
              className="w-full rounded-xl border border-white/10 bg-black" style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.32)", lineHeight: 1.6, marginBottom: 20 }}>
              Walkthrough: setting up your account inside TradeLocker. Same idea if your portal gives you MT5 — log in with the credentials from LivvFX.
            </p>

            <div style={{ padding: "13px 15px", borderRadius: 14, background: "rgba(255,200,50,.06)", border: "1px solid rgba(255,200,50,.22)" }}>
              <p style={{ color: "#ffc832", fontWeight: 800, fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", margin: "0 0 5px" }}>⚠️ Don't skip demo</p>
              <p style={{ color: "rgba(255,255,255,.55)", fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
                Take at least 10 signals on demo first. If you can follow the plan there, you're ready for real money. If you can't, real money won't fix it.
              </p>
            </div>
          </div>
        )}

        {/* ── 5 · HOW TO TAKE A SIGNAL ───────────────────────────── */}
        {step === 5 && (
          <div className="ob-step">
            <Tag>Step four · the skill</Tag>
            <H>How to take a signal</H>
            <P>This is the part most people get wrong. Read it once now, then come back to it before your first live trade.</P>

            <div style={{ padding: "14px 16px", borderRadius: 14, background: "#0b0f0c", border: "1px solid rgba(0,255,133,.25)", marginBottom: 20, fontFamily: "monospace" }}>
              <p style={{ color: "rgba(255,255,255,.3)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 8px" }}>What a signal looks like</p>
              <p style={{ color: "#00FF85", fontWeight: 700, fontSize: 13.5, margin: 0, lineHeight: 1.7 }}>
                🟢 BUY XAUUSD<br />Entry 2358.40<br />SL 2352.00<br />TP1 2364.00 · TP2 2371.00
              </p>
            </div>

            <Meter keys={sigKeys} label="Signal playbook" />
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
              {SIGNAL_STEPS.map((s, i) => <Check key={s.n} k={"s" + i} n={s.n} title={s.title} desc={s.desc} />)}
            </div>

            <div style={{ padding: "13px 15px", borderRadius: 14, background: "rgba(0,255,133,.05)", border: "1px solid rgba(0,255,133,.2)" }}>
              <p style={{ color: "#00FF85", fontWeight: 800, fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", margin: "0 0 5px" }}>The one rule</p>
              <p style={{ color: "rgba(255,255,255,.6)", fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
                Never risk more than 1–2% on a single trade. Ten losses in a row can't end you at 1%. It can at 20%. Survival is the strategy.
              </p>
            </div>
          </div>
        )}

        {/* ── 6 · APPS + COMMUNITY ───────────────────────────────── */}
        {step === 6 && (
          <div className="ob-step">
            <Tag>Step five · get plugged in</Tag>
            <H>Apps & community</H>
            <P>Four apps and two chats. This is the daily setup — signals in one hand, charts in the other.</P>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
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

            <p style={{ color: "rgba(255,255,255,.45)", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 800, marginBottom: 11 }}>The chats</p>
            <div className="flex flex-col gap-3">
              {[
                { url: COMMUNITY_URL, name: "The Greenprint", desc: "Main community chat" },
                { url: MARKET_BULLY_URL, name: "Market Bully Community", desc: "Strategy talk" },
              ].map(c => (
                <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className="ob-card flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10" style={{ textDecoration: "none" }}>
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

        {/* ── 7 · DONE ───────────────────────────────────────────── */}
        {step === 7 && (
          <div className="ob-step text-center pt-6">
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
            <h2 className="text-3xl font-bold text-white mb-4">You're In.</h2>
            <p className="text-white/50 text-base leading-relaxed mb-8">
              Account open, signals live, playbook in your head. Next signal that drops — you're taking it with me.
            </p>

            <div style={{ display: "grid", gap: 8, marginBottom: 26, textAlign: "left" }}>
              {[
                ["Live sessions", "Wednesdays 8:00 AM CST", "/stream"],
                ["Free signals", "In your Telegram now", SIGNALS_URL],
              ].map(([t, d, href]) => (
                <a key={t} href={href} target={String(href).startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  className="ob-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 15px", borderRadius: 13, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", textDecoration: "none" }}>
                  <span>
                    <span style={{ display: "block", color: "#fff", fontWeight: 700, fontSize: 13 }}>{t}</span>
                    <span style={{ display: "block", color: "rgba(255,255,255,.45)", fontSize: 12, marginTop: 2 }}>{d}</span>
                  </span>
                  <span style={{ color: "rgba(0,255,133,.6)" }}>→</span>
                </a>
              ))}
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
            {step > 1 && (
              <button onClick={prev} className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-base">Back</button>
            )}
            <button onClick={next} className="ob-btn flex-1 py-3.5 rounded-xl bg-[#00FF85] text-black font-bold text-base" style={{ boxShadow: "0 0 22px rgba(0,255,133,.3)" }}>
              {step === 1 ? "Let's Go" : "Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
