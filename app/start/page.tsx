"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ── /start — interactive welcome quiz for the IG bio link ───────────────────
// Asks 3 questions, captures name + email, then routes:
//   ready to invest  → paid options + book a call
//   not right now    → free path (broker + free signals chat)
// Every answer is saved so Jay knows who to follow up with and how.

const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const NEW_TRADERS_URL = "https://t.me/TheGreenprintt";
const ONEHOUSE_URL = "https://subscribe.1houseglobal.com/jay";
const CALENDLY = "https://calendly.com/waltonjacob300/one-on-one-with-jacob";

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
    const P = window.innerWidth < 640 ? 16 : 30;
    const pts = Array.from({ length: P }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, r: Math.random() * 1.4 + .5 }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; }
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j]; const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        if (d < 15000) { ctx.strokeStyle = `rgba(0,255,133,${(1 - d / 15000) * .08})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      for (const p of pts) { ctx.fillStyle = "rgba(0,255,133,.28)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} aria-hidden style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: .45, zIndex: 0 }} />;
}

const WHY_TEXT: Record<string, string> = {
  income: "extra income", freedom: "financial freedom", skill: "a real skill", fulltime: "doing this full-time",
};

const QUESTIONS = [
  {
    key: "experience",
    q: "Have you traded before?",
    sub: "Be honest — it changes what I point you to.",
    options: [
      { v: "never", label: "Never traded", emoji: "🌱", r: "Perfect. No bad habits to unlearn — that's actually an advantage." },
      { v: "tried", label: "Tried it, didn't stick", emoji: "🔁", r: "That's almost everybody. Usually the plan failed you, not the other way around." },
      { v: "active", label: "I trade now", emoji: "📈", r: "Good. Then you already know what a real system is worth." },
    ],
  },
  {
    key: "why",
    q: "What's got you into trading?",
    sub: "There's no wrong answer.",
    options: [
      { v: "income", label: "Extra income on the side", emoji: "💵", r: "Real answer. That's how it starts for damn near everybody." },
      { v: "freedom", label: "Financial freedom", emoji: "🕊️", r: "That's the one. Freedom is just having options you can afford." },
      { v: "skill", label: "Learn a real skill", emoji: "🎯", r: "Respect. Nobody can take a skill away from you." },
      { v: "fulltime", label: "Do this full-time one day", emoji: "🚀", r: "Big goal — and everybody doing it full-time started exactly where you are." },
    ],
  },
  {
    key: "budget",
    q: "Do you have $100–$200 to invest in yourself right now?",
    sub: "This just tells me which lane fits you today.",
    options: [
      { v: "yes", label: "Yes — I'm ready to go", emoji: "✅", r: "Say less. Then let's do this properly — I'll handle you personally." },
      { v: "no", label: "Not right now", emoji: "⏳", r: "No shame in that at all. Most people start there. Me included." },
    ],
  },
  {
    key: "ideas",
    showIf: (a: Record<string, string>) => a.budget === "no",
    q: "If the money's not there yet — would you still want my trade ideas?",
    sub: "They're free either way. I just want to know how to help you.",
    options: [
      { v: "yes", label: "Yes — send me the trades", emoji: "🙌", r: "That's all I needed to hear. Let's get you set up." },
      { v: "learn", label: "I want to learn first", emoji: "📚", r: "Smart. Learn first, earn after — that order matters more than people think." },
      { v: "looking", label: "Just looking around", emoji: "👀", r: "Fair enough. Look around as long as you need — I'll be here." },
    ],
  },
];

export default function StartPage() {
  const [screen, setScreen] = useState<"welcome" | "q" | "capture" | "result">("welcome");
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [screen, qi]);

  const shows = (i: number, a: Record<string, string>) => {
    const q: any = QUESTIONS[i];
    return !q.showIf || q.showIf(a);
  };

  const pick = (key: string, v: string) => {
    const next = { ...answers, [key]: v };
    setAnswers(next);
    const opt: any = (QUESTIONS[qi].options as any[]).find(o => o.v === v);
    setFlash(opt?.r || "");
    setTimeout(() => {
      setFlash("");
      let n = qi + 1;
      while (n < QUESTIONS.length && !shows(n, next)) n++;
      if (n < QUESTIONS.length) setQi(n); else setScreen("capture");
    }, opt?.r ? 1500 : 220);
  };

  const back = () => {
    const prevFrom = (start: number) => {
      let p = start - 1;
      while (p >= 0 && !shows(p, answers)) p--;
      return p;
    };
    if (screen === "capture") {
      const p = prevFrom(QUESTIONS.length);
      setScreen("q"); setQi(Math.max(0, p)); return;
    }
    if (screen === "q") {
      const p = prevFrom(qi);
      if (p >= 0) setQi(p); else setScreen("welcome");
    }
  };

  const submit = async () => {
    if (!name.trim()) { setErr("What should I call you?"); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("Enter a valid email so I can reach you."); return; }
    const digits = phone.replace(/\D/g, "");
    if (answers.budget === "yes" && digits.length < 10) { setErr("Drop your number so I can reach out personally."); return; }
    if (digits.length > 0 && digits.length < 10) { setErr("That number looks short — check it?"); return; }
    setErr(""); setSaving(true);
    const ready = answers.budget === "yes";
    try {
      const key = email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 60);
      await fetch(`${FB}/live/leads/${key}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          src: "start-quiz",
          path: ready ? "🔥 CALL — ready ($100-200)" : answers.ideas === "yes" ? "WANTS TRADES (free)" : answers.ideas === "learn" ? "WANTS TO LEARN (free)" : "browsing",
          experience: answers.experience || "",
          why: answers.why || "",
          budget: answers.budget || "",
          wantsIdeas: answers.ideas || "",
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
        }),
      });
      localStorage.setItem("gp_viewer", JSON.stringify({ name: name.trim(), email: email.trim() }));
      // ping Jay's phone instantly — speed to lead is everything
      fetch("/api/lead-alert", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), email: email.trim(), phone: phone.trim(),
          experience: answers.experience, why: answers.why, budget: answers.budget, wantsIdeas: answers.ideas,
        }),
      }).catch(() => {});
    } catch {}
    setSaving(false);
    setScreen("result");
  };

  const ready = answers.budget === "yes";
  const firstName = name.trim().split(" ")[0] || "";

  const card: React.CSSProperties = { display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "16px 16px", borderRadius: 15, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.1)", color: "#fff", fontWeight: 700, fontSize: 14.5, textAlign: "left", cursor: "pointer" };

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(900px 600px at 50% -5%, #0a1810 0%, #050705 60%)", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 22px", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes st-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes st-glow{0%,100%{box-shadow:0 0 26px rgba(0,255,133,.35)}50%{box-shadow:0 0 46px rgba(0,255,133,.6)}}
        @keyframes st-shine{from{transform:translateX(-150%) skewX(-20deg)}to{transform:translateX(350%) skewX(-20deg)}}
        @keyframes st-pulse{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes st-pop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
        .st-in{opacity:0;animation:st-rise .55s cubic-bezier(.16,.8,.3,1) forwards}
        .st-cta{position:relative;overflow:hidden;animation:st-glow 3s ease-in-out infinite;transition:transform .2s}
        .st-cta:hover{transform:translateY(-2px) scale(1.015)} .st-cta:active{transform:scale(.99)}
        .st-cta::after{content:"";position:absolute;top:0;bottom:0;width:38%;left:0;background:linear-gradient(105deg,transparent,rgba(255,255,255,.35),transparent);animation:st-shine 3.4s ease-in-out infinite;pointer-events:none}
        .st-opt{transition:transform .18s cubic-bezier(.2,.8,.3,1),background .18s,border-color .18s}
        .st-opt:hover{transform:translateY(-2px);background:rgba(0,255,133,.08)!important;border-color:rgba(0,255,133,.4)!important}
        .st-opt:active{transform:scale(.985)}
        .st-inp{width:100%;padding:15px 16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.13);border-radius:14px;color:#fff;font-size:15px;outline:none;box-sizing:border-box;transition:border-color .2s,box-shadow .2s}
        .st-inp:focus{border-color:rgba(0,255,133,.5);box-shadow:0 0 0 3px rgba(0,255,133,.1)}
        .st-pop{animation:st-pop .6s cubic-bezier(.3,1.4,.5,1) both}
        @media(prefers-reduced-motion:reduce){.st-in,.st-cta,.st-cta::after,.st-pop{animation:none;opacity:1}}
      `}</style>
      <Constellation />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 420 }}>

        {/* ── WELCOME ── */}
        {screen === "welcome" && (
          <div style={{ textAlign: "center" }}>
            <div className="st-in" style={{ animationDelay: ".05s" }}>
              <div style={{ width: 74, height: 74, borderRadius: 21, background: "linear-gradient(135deg,#00FF85,#00c864)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 0 40px rgba(0,255,133,.35)" }}>
                <svg width="34" height="34" viewBox="0 0 16 16" fill="none"><path d="M2 12L6 7L9 10L13 4" stroke="#050705" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
            <div className="st-in" style={{ animationDelay: ".15s", display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(0,255,133,.1)", border: "1px solid rgba(0,255,133,.28)", borderRadius: 20, padding: "5px 13px", marginBottom: 18 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF85", animation: "st-pulse 1.6s infinite" }} />
              <span style={{ color: "#00FF85", fontSize: 11, fontWeight: 800, letterSpacing: ".1em" }}>LIVE WEDNESDAYS · 8AM CST</span>
            </div>
            <h1 className="st-in" style={{ animationDelay: ".25s", fontSize: "clamp(30px,8.5vw,42px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-.03em", margin: "0 0 12px" }}>
              Welcome to<br /><span style={{ color: "#00FF85" }}>The Greenprint</span>
            </h1>
            <p className="st-in" style={{ animationDelay: ".35s", color: "rgba(255,255,255,.55)", fontSize: 15, lineHeight: 1.65, margin: "0 0 28px" }}>
              Glad you made it 🤝 Answer 3 quick questions and I&apos;ll point you exactly where to start.
            </p>
            <button onClick={() => setScreen("q")} className="st-cta"
              style={{ display: "block", width: "100%", padding: "18px 0", borderRadius: 16, background: "linear-gradient(135deg,#00FF85,#00c864)", color: "#000", fontWeight: 900, fontSize: 17, border: "none", cursor: "pointer", marginBottom: 12 }}>
              Start Here →
            </button>
            <p className="st-in" style={{ animationDelay: ".5s", color: "rgba(0,255,133,.5)", fontSize: 12, fontWeight: 700, margin: 0 }}>
              Takes 30 seconds
            </p>
          </div>
        )}

        {/* ── JAY'S REPLY (between questions) ── */}
        {screen === "q" && flash && (
          <div className="st-in" style={{ textAlign: "center", padding: "20px 0" }}>
            <div className="st-pop" style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#00FF85,#00c864)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 0 34px rgba(0,255,133,.45)" }}>
              <svg width="24" height="24" viewBox="0 0 16 16" fill="none"><path d="M2 12L6 7L9 10L13 4" stroke="#050705" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.4, letterSpacing: "-.01em", margin: 0, color: "#fff" }}>{flash}</p>
          </div>
        )}

        {/* ── QUESTIONS ── */}
        {screen === "q" && !flash && (
          <div key={qi} className="st-in" style={{ animationDelay: "0s" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 26 }}>
              {QUESTIONS.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= qi ? "#00FF85" : "rgba(255,255,255,.12)", boxShadow: i <= qi ? "0 0 8px rgba(0,255,133,.6)" : "none", transition: "all .4s" }} />
              ))}
            </div>
            <p style={{ color: "rgba(0,255,133,.6)", fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 10px" }}>
              Question {qi + 1} of {QUESTIONS.length}
            </p>
            <h2 style={{ fontSize: 25, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-.02em", margin: "0 0 8px" }}>{QUESTIONS[qi].q}</h2>
            <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13.5, margin: "0 0 24px" }}>{QUESTIONS[qi].sub}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {QUESTIONS[qi].options.map(o => (
                <button key={o.v} onClick={() => pick(QUESTIONS[qi].key, o.v)} className="st-opt"
                  style={{ ...card, ...(answers[QUESTIONS[qi].key] === o.v ? { background: "rgba(0,255,133,.1)", borderColor: "rgba(0,255,133,.45)" } : {}) }}>
                  <span style={{ fontSize: 20 }}>{o.emoji}</span>
                  <span style={{ flex: 1 }}>{o.label}</span>
                  <span style={{ color: "rgba(255,255,255,.25)" }}>→</span>
                </button>
              ))}
            </div>
            <button onClick={back} style={{ marginTop: 22, background: "transparent", border: "none", color: "rgba(255,255,255,.35)", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>← Back</button>
          </div>
        )}

        {/* ── NAME + EMAIL ── */}
        {screen === "capture" && (
          <div className="st-in">
            <p style={{ color: "rgba(0,255,133,.6)", fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 10px" }}>Last step</p>
            <h2 style={{ fontSize: 25, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-.02em", margin: "0 0 8px" }}>How do I reach you?</h2>
            <p style={{ color: "rgba(255,255,255,.45)", fontSize: 13.5, lineHeight: 1.6, margin: "0 0 24px" }}>
              {answers.budget === "yes"
                ? "I reach out personally to everyone who's ready — drop your number and I'll get you set up myself."
                : "So I know who you are, and I can text you when we go live."}
            </p>
            <input className="st-inp" value={name} onChange={e => { setName(e.target.value); setErr(""); }} placeholder="Your first name" style={{ marginBottom: 11 }} />
            <input className="st-inp" value={email} onChange={e => { setEmail(e.target.value); setErr(""); }} type="email" placeholder="Your email" style={{ marginBottom: 11 }} />
            <input className="st-inp" value={phone} onChange={e => { setPhone(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && submit()} type="tel"
              placeholder={answers.budget === "yes" ? "Phone number" : "Phone number (optional)"} />
            {err && <p style={{ color: "#ff5566", fontSize: 13, margin: "12px 0 0" }}>{err}</p>}
            <button onClick={submit} disabled={saving} className="st-cta"
              style={{ display: "block", width: "100%", padding: "17px 0", borderRadius: 16, background: saving ? "rgba(255,255,255,.1)" : "linear-gradient(135deg,#00FF85,#00c864)", color: saving ? "rgba(255,255,255,.4)" : "#000", fontWeight: 900, fontSize: 16.5, border: "none", cursor: saving ? "wait" : "pointer", marginTop: 18 }}>
              {saving ? "One sec…" : "Show Me →"}
            </button>
            <button onClick={back} style={{ marginTop: 18, background: "transparent", border: "none", color: "rgba(255,255,255,.35)", fontSize: 13, cursor: "pointer", fontWeight: 600, width: "100%" }}>← Back</button>
          </div>
        )}

        {/* ── RESULT ── */}
        {screen === "result" && (
          <div className="st-in">
            <div className="st-pop" style={{ width: 58, height: 58, borderRadius: "50%", background: "linear-gradient(135deg,#00FF85,#00c864)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 0 36px rgba(0,255,133,.5)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>

            {ready ? (
              <>
                <h2 style={{ fontSize: 25, fontWeight: 900, lineHeight: 1.2, textAlign: "center", margin: "0 0 10px" }}>
                  Perfect{firstName ? `, ${firstName}` : ""} — I&apos;ll reach out personally.
                </h2>
                <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, lineHeight: 1.65, textAlign: "center", margin: "0 0 22px" }}>
                  You said you&apos;re after <span style={{ color: "#00FF85", fontWeight: 700 }}>{WHY_TEXT[answers.why] || "this"}</span>{answers.experience === "never" ? " and you're starting fresh" : answers.experience === "tried" ? " and you've been burned before" : ""} — that&apos;s exactly what we&apos;ll map out.
                  <br /><br />
                  Keep an eye on your phone, I&apos;ll hit you directly. <span style={{ color: "rgba(255,255,255,.75)", fontWeight: 600 }}>While you wait, get in the chat so you&apos;re already in the room.</span>
                </p>
                <a href={NEW_TRADERS_URL} target="_blank" rel="noopener noreferrer" className="st-cta"
                  style={{ display: "block", width: "100%", padding: "17px 0", borderRadius: 16, background: "linear-gradient(135deg,#00FF85,#00c864)", color: "#000", fontWeight: 900, fontSize: 16.5, textAlign: "center", textDecoration: "none", marginBottom: 10 }}>
                  💬 Join the Chat Now
                </a>
                <Link href="/onboard"
                  style={{ display: "block", width: "100%", padding: "15px 0", borderRadius: 15, background: "rgba(0,255,133,.07)", border: "1px solid rgba(0,255,133,.28)", color: "#00FF85", fontWeight: 800, fontSize: 14, textAlign: "center", textDecoration: "none", marginBottom: 10 }}>
                  Get a head start — set up my account →
                </Link>
                <a href={CALENDLY} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", width: "100%", padding: "15px 0", borderRadius: 15, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.13)", color: "#fff", fontWeight: 800, fontSize: 14, textAlign: "center", textDecoration: "none" }}>
                  Or pick a time to talk →
                </a>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: 25, fontWeight: 900, lineHeight: 1.2, textAlign: "center", margin: "0 0 10px" }}>
                  {answers.ideas === "looking" ? `All good${firstName ? `, ${firstName}` : ""} — look around.` : `Say less${firstName ? `, ${firstName}` : ""}. You&apos;re in.`}
                </h2>
                <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, lineHeight: 1.65, textAlign: "center", margin: "0 0 24px" }}>
                  {answers.ideas === "looking"
                    ? "No pressure at all. Watch a live session, sit in the chat, and see if it's for you. I'll be here."
                    : <>You want <span style={{ color: "#00FF85", fontWeight: 700 }}>{WHY_TEXT[answers.why] || "this"}</span> — and you don&apos;t need to pay me a dime to start. Open your trading account through The Greenprint and my trade breakdowns come to you free in the chat. Setup takes about 5 minutes.</>}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 13px", borderRadius: 12, background: "rgba(0,255,133,.06)", border: "1px solid rgba(0,255,133,.2)", marginBottom: 18 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00FF85", flexShrink: 0, animation: "st-pulse 1.6s infinite" }} />
                  <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", lineHeight: 1.5 }}>
                    Next live session: <b style={{ color: "#fff" }}>Wednesday 8:00 AM CST</b> — be set up before then.
                  </span>
                </div>
                <Link href="/onboard" className="st-cta"
                  style={{ display: "block", width: "100%", padding: "17px 0", borderRadius: 16, background: "linear-gradient(135deg,#00FF85,#00c864)", color: "#000", fontWeight: 900, fontSize: 16.5, textAlign: "center", textDecoration: "none", marginBottom: 10 }}>
                  Set Me Up Free →
                </Link>
                <a href={NEW_TRADERS_URL} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", width: "100%", padding: "15px 0", borderRadius: 15, background: "rgba(0,255,133,.07)", border: "1px solid rgba(0,255,133,.28)", color: "#00FF85", fontWeight: 800, fontSize: 14, textAlign: "center", textDecoration: "none", marginBottom: 10 }}>
                  💬 Join the 2026 New Traders chat
                </a>
                <Link href="/stream"
                  style={{ display: "block", width: "100%", padding: "15px 0", borderRadius: 15, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.13)", color: "#fff", fontWeight: 800, fontSize: 14, textAlign: "center", textDecoration: "none" }}>
                  ▶ Watch a live session
                </Link>
              </>
            )}

            <p style={{ color: "rgba(255,255,255,.22)", fontSize: 10.5, lineHeight: 1.6, marginTop: 26, textAlign: "center" }}>
              Educational content only. Not financial advice. Trading involves risk of loss.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
