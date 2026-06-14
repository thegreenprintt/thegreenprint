"use client";
import { useState } from "react";

const PASSWORD = "greenprint";

const TOTAL_STEPS = 8;

const APPS = [
  { name: "1House", desc: "Community platform", ios: "https://apps.apple.com/us/app/1house/id6754260060", android: "#" },
  { name: "TradingView", desc: "Charts & analysis", ios: "https://apps.apple.com/us/app/tradingview-stock-market/id1205990992", android: "https://play.google.com/store/apps/details?id=com.tradingview.tradingviewapp" },
  { name: "TradeLocker", desc: "Trading platform", ios: "https://apps.apple.com/us/app/tradelocker/id6447196449", android: "https://play.google.com/store/apps/details?id=com.tradelocker.mobile" },
  { name: "Zoom", desc: "Live sessions", ios: "https://apps.apple.com/us/app/zoom-one-platform-to-connect/id546505307", android: "https://play.google.com/store/apps/details?id=us.zoom.videomeetings" },
  { name: "Telegram", desc: "Community chat", ios: "https://apps.apple.com/us/app/telegram-messenger/id686449807", android: "https://play.google.com/store/apps/details?id=org.telegram.messenger" },
  { name: "Boards", desc: "Task management", ios: "https://apps.apple.com/us/app/boards-com/id1507677341", android: "#" },
];

const FOCUS_AREAS = [
  { id: "day-trading", icon: "📈", label: "Day Trading" },
  { id: "investing", icon: "💰", label: "Investing" },
  { id: "real-estate", icon: "🏢", label: "Commercial Real Estate" },
  { id: "all", icon: "⚡", label: "All of the Above" },
];

const EXPERIENCE_LEVELS = [
  { id: "beginner", label: "Complete beginner — just starting" },
  { id: "some", label: "Some experience — made a few trades" },
  { id: "experienced", label: "I've been trading — want to level up" },
];

export default function OnboardPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [name, setName] = useState("");
  const [step, setStep] = useState(1);
  const [focus, setFocus] = useState<string[]>([]);
  const [experience, setExperience] = useState("");

  const tryUnlock = () => {
    if (pw.toLowerCase().trim() === PASSWORD) { setUnlocked(true); setPwError(false); }
    else setPwError(true);
  };

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep(s => Math.max(s - 1, 1));
  const firstName = name.split(" ")[0];

  if (!unlocked) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
            <span className="text-bg font-black text-xs">GP</span>
          </div>
          <span className="font-bold tracking-widest uppercase text-text text-sm">The Greenprint</span>
        </div>
        <h1 className="text-2xl font-bold text-text text-center mb-2">Member Onboarding</h1>
        <p className="text-muted text-sm text-center mb-8">Enter the access code to continue.</p>
        <input
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setPwError(false); }}
          onKeyDown={e => e.key === "Enter" && tryUnlock()}
          placeholder="Access code"
          className={`w-full bg-surface border rounded-card px-4 py-3 text-text text-sm outline-none mb-3 ${pwError ? "border-red-500" : "border-border"}`}
          autoFocus
        />
        {pwError && <p className="text-red-400 text-xs mb-3">Incorrect code. Try again.</p>}
        <button onClick={tryUnlock} className="w-full bg-accent text-bg font-black py-3 rounded-card text-sm">
          Continue →
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-surface">
        <div className="h-full bg-accent transition-all duration-500" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <button onClick={back} disabled={step === 1} className="text-muted hover:text-text transition-colors disabled:opacity-0 text-sm">← Back</button>
        <span className="font-mono text-[10px] tracking-widest text-muted uppercase">Step {step} of {TOTAL_STEPS}</span>
        <div className="w-16" />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div key={step}>

            {step === 1 && (
              <div className="text-center">
                <div className="w-14 h-14 bg-accent rounded-card flex items-center justify-center mx-auto mb-6">
                  <span className="text-bg font-black text-xl">GP</span>
                </div>
                <h1 className="text-3xl font-bold text-text mb-3">Welcome to The Greenprint.</h1>
                <p className="text-muted mb-8">What's your name?</p>
                <input value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && name.trim() && next()}
                  placeholder="Your first name" autoFocus
                  className="w-full bg-surface border border-border rounded-card px-4 py-3 text-text text-sm outline-none mb-6" />
                <button onClick={next} disabled={!name.trim()} className="w-full bg-accent text-bg font-black py-3 rounded-card text-sm disabled:opacity-40">
                  Begin →
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-text mb-8">What are you focused on, {firstName}?</h2>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {FOCUS_AREAS.map(f => (
                    <button key={f.id} onClick={() => setFocus(prev => prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id])}
                      className={`p-4 rounded-card border text-left transition-all ${focus.includes(f.id) ? "border-accent bg-accent/5 text-text" : "border-border bg-surface text-muted"}`}>
                      <div className="text-xl mb-2">{f.icon}</div>
                      <div className="text-sm font-medium">{f.label}</div>
                    </button>
                  ))}
                </div>
                <button onClick={next} disabled={focus.length === 0} className="w-full bg-accent text-bg font-black py-3 rounded-card text-sm disabled:opacity-40">Continue →</button>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-text mb-8">Where are you right now?</h2>
                <div className="space-y-3 mb-8">
                  {EXPERIENCE_LEVELS.map(e => (
                    <button key={e.id} onClick={() => setExperience(e.id)}
                      className={`w-full p-4 rounded-card border text-left text-sm transition-all ${experience === e.id ? "border-accent bg-accent/5 text-text" : "border-border bg-surface text-muted"}`}>
                      {e.label}
                    </button>
                  ))}
                </div>
                <button onClick={next} disabled={!experience} className="w-full bg-accent text-bg font-black py-3 rounded-card text-sm disabled:opacity-40">Continue →</button>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-2xl font-bold text-text mb-3">Join the community.</h2>
                <p className="text-muted mb-8">847 members. Daily alerts. Live discussion.</p>
                <div className="bg-surface border border-border rounded-card p-5 mb-6">
                  <p className="text-xs text-muted uppercase tracking-widest font-mono mb-1">Telegram</p>
                  <p className="font-semibold text-text mb-3">The Greenprint Community</p>
                  <a href="https://t.me/+Hz_sp0s32jVjNDQx" target="_blank" rel="noopener noreferrer">
                    <button className="w-full bg-accent text-bg font-black py-3 rounded-card text-sm">Join Telegram →</button>
                  </a>
                </div>
                <button onClick={next} className="w-full border border-border bg-surface text-muted py-3 rounded-card text-sm">Continue →</button>
              </div>
            )}

            {step === 5 && (
              <div>
                <h2 className="text-2xl font-bold text-text mb-3">Download your tools.</h2>
                <p className="text-muted mb-6">Everything you need to trade, learn, and connect.</p>
                <div className="space-y-3 mb-6">
                  {APPS.map(app => (
                    <div key={app.name} className="bg-surface border border-border rounded-card p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-text">{app.name}</p>
                        <p className="text-xs text-muted">{app.desc}</p>
                      </div>
                      <div className="flex gap-2">
                        <a href={app.ios} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-muted border border-border rounded px-2 py-1 hover:text-text">iOS</a>
                        <a href={app.android} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-muted border border-border rounded px-2 py-1 hover:text-text">Android</a>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={next} className="w-full bg-accent text-bg font-black py-3 rounded-card text-sm">Continue →</button>
              </div>
            )}

            {step === 6 && (
              <div>
                <h2 className="text-2xl font-bold text-text mb-3">Set up your broker.</h2>
                <p className="text-muted mb-6">Follow these steps to get your trading account ready.</p>
                <div className="space-y-4 mb-6">
                  {[
                    { n: "01", title: "Register at GenesisFX", body: "Create your account using the link provided in the community." },
                    { n: "02", title: "Set Leverage to 1:500", body: "In your account settings, set leverage to 1:500." },
                    { n: "03", title: "Download TradeLocker", body: "Use the TradeLocker app to access your account on mobile." },
                    { n: "04", title: "Connect Your Credentials", body: "Log into TradeLocker using your GenesisFX account details." },
                  ].map(s => (
                    <div key={s.n} className="bg-surface border border-border rounded-card p-4">
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-xs text-muted flex-shrink-0 mt-0.5">{s.n}</span>
                        <div>
                          <p className="text-sm font-semibold text-text mb-1">{s.title}</p>
                          <p className="text-xs text-muted leading-relaxed">{s.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={next} className="w-full bg-accent text-bg font-black py-3 rounded-card text-sm">Continue →</button>
              </div>
            )}

            {step === 7 && (
              <div>
                <h2 className="text-2xl font-bold text-text mb-3">Watch these first.</h2>
                <p className="text-muted mb-6">Foundation videos — watch within 72 hours.</p>
                <div className="space-y-4 mb-6">
                  {[
                    { title: "Foundation Video 1", desc: "Getting started with the platform and your first week." },
                    { title: "Foundation Video 2", desc: "Jay's trading framework and daily routine." },
                  ].map((v, i) => (
                    <div key={i} className="bg-surface border border-border rounded-card overflow-hidden">
                      <div className="aspect-video bg-black flex items-center justify-center">
                        <div className="text-center"><div className="text-3xl mb-2">▶</div><p className="text-xs text-muted">Video {i + 1}</p></div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-semibold text-text mb-1">{v.title}</p>
                        <p className="text-xs text-muted">{v.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={next} className="w-full bg-accent text-bg font-black py-3 rounded-card text-sm">Continue →</button>
              </div>
            )}

            {step === 8 && (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-text mb-3">You're all set{firstName ? ", " + firstName : ""}. 🎉</h2>
                <div className="space-y-3 mb-10 text-left">
                  {["Profile configured","Community joined","Tools downloaded","Broker set up","Foundation videos queued"].map(item => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-bg" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="text-sm text-text">{item}</span>
                    </div>
                  ))}
                </div>
                <a href="/"><button className="w-full bg-accent text-bg font-black py-3 rounded-card text-sm">Go to The Greenprint →</button></a>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
