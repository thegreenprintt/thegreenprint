"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const TOTAL_STEPS = 9;

const APPS = [
  { name: "1House", desc: "Community platform", ios: "https://apps.apple.com/us/app/1house/id6754260060", android: "https://play.google.com/store/search?q=1house&c=apps" },
  { name: "TradingView", desc: "Charts & analysis", ios: "https://apps.apple.com/us/app/tradingview-stock-market/id1205990992", android: "https://play.google.com/store/apps/details?id=com.tradingview.tradingviewapp" },
  { name: "TradeLocker", desc: "Trading platform", ios: "https://apps.apple.com/us/app/tradelocker/id6447196449", android: "https://play.google.com/store/apps/details?id=com.tradelocker.mobile" },
  { name: "Zoom", desc: "Live sessions", ios: "https://apps.apple.com/us/app/zoom-one-platform-to-connect/id546505307", android: "https://play.google.com/store/apps/details?id=us.zoom.videomeetings" },
  { name: "Telegram", desc: "Community chat", ios: "https://apps.apple.com/us/app/telegram-messenger/id686449807", android: "https://play.google.com/store/apps/details?id=org.telegram.messenger" },
  { name: "Boards", desc: "Task management", ios: "https://apps.apple.com/us/app/boards-com/id1507677341", android: "https://play.google.com/store/search?q=boards+kanban&c=apps" },
];

const STARTER_APPS = [
  { name: "Green Print", desc: "Your community app", ios: "#", android: "#" },
  { name: "TradingView", desc: "Charts & analysis", ios: "https://apps.apple.com/us/app/tradingview-stock-market/id1205990992", android: "https://play.google.com/store/apps/details?id=com.tradingview.tradingviewapp" },
  { name: "TradeLocker", desc: "Trading platform", ios: "https://apps.apple.com/us/app/tradelocker/id6447196449", android: "https://play.google.com/store/apps/details?id=com.tradelocker.mobile" },
  { name: "Zoom", desc: "Live sessions", ios: "https://apps.apple.com/us/app/zoom-one-platform-to-connect/id546505307", android: "https://play.google.com/store/apps/details?id=us.zoom.videomeetings" },
  { name: "Telegram", desc: "Community chat", ios: "https://apps.apple.com/us/app/telegram-messenger/id686449807", android: "https://play.google.com/store/apps/details?id=org.telegram.messenger" },
];

const FOCUS_AREAS = [
  { id: "day-trading", icon: "📈", label: "Day Trading" },
  { id: "investing", icon: "💹", label: "Investing" },
  { id: "real-estate", icon: "🏦", label: "Commercial Real Estate" },
  { id: "all", icon: "⚡", label: "All of the Above" },
];

const EXPERIENCE_LEVELS = [
  { id: "beginner", label: "Complete beginner — just starting" },
  { id: "some", label: "Some experience — made a few trades" },
  { id: "experienced", label: "I've been trading — want to level up" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("there");
  const [tier, setTier] = useState<string>("member");
  const [focus, setFocus] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [plan] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("plan") || "pro" : "pro");
  const apps = plan === "starter" ? STARTER_APPS : APPS;

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("users").select("name,tier").eq("id", user.id).single();
      if (data) { setName((data.name || "there").split(" ")[0]); setTier(data.tier || "member"); }
    })();
  }, []);

  const next = () => { setStep(s => Math.min(s + 1, TOTAL_STEPS)); };
  const back = () => { setStep(s => Math.max(s - 1, 1)); };

  const complete = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("users").update({
      onboarding_complete: true,
      focus_areas: focus,
      experience_level: experience,
    }).eq("id", user.id);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-surface">
        <div className="h-full bg-accent" style={{ width: `${(step / TOTAL_STEPS) * 100}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Step counter */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <button onClick={back} disabled={step === 1}
          className="text-muted hover:text-text transition-colors disabled:opacity-0 text-sm">
          ← Back
        </button>
        <span className="font-mono text-[10px] tracking-widest text-muted uppercase">
          Step {step} of {TOTAL_STEPS}
        </span>
        <div className="w-16" />
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div key={step}>
              {step === 1 && (
                <div className="text-center">
                  <div className="w-14 h-14 bg-accent rounded-card flex items-center justify-center mx-auto mb-8">
                    <span className="text-bg font-black text-xl">GP</span>
                  </div>
                  <h1 className="text-3xl font-bold text-text mb-3">Welcome to The Greenprint, {name}.</h1>
                  <p className="text-muted mb-10">This takes about 2 minutes.</p>
                  <Button size="lg" fullWidth onClick={next}>Begin →</Button>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-2xl font-bold text-text mb-8">What are you focused on?</h2>
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {FOCUS_AREAS.map(f => (
                      <button key={f.id} onClick={() => {
                        setFocus(prev => prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id]);
                      }}
                        className={`p-4 rounded-card border text-left transition-all ${
                          focus.includes(f.id)
                            ? "border-accent bg-accent/5 text-text"
                            : "border-border bg-surface text-muted hover:border-border/80"
                        }`}
                      >
                        <div className="text-xl mb-2">{f.icon}</div>
                        <div className="text-sm font-medium">{f.label}</div>
                      </button>
                    ))}
                  </div>
                  <Button size="lg" fullWidth onClick={next} disabled={focus.length === 0}>Continue →</Button>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="text-2xl font-bold text-text mb-8">Where are you right now?</h2>
                  <div className="space-y-3 mb-8">
                    {EXPERIENCE_LEVELS.map(e => (
                      <button key={e.id} onClick={() => setExperience(e.id)}
                        className={`w-full p-4 rounded-card border text-left text-sm transition-all ${
                          experience === e.id
                            ? "border-accent bg-accent/5 text-text"
                            : "border-border bg-surface text-muted hover:border-border/80"
                        }`}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                  <Button size="lg" fullWidth onClick={next} disabled={!experience}>Continue →</Button>
                </div>
              )}

              {step === 4 && (
                <div className="text-center">
                  {tier === "member" ? (
                    <>
                      <h2 className="text-2xl font-bold text-text mb-3">Scanner unlocks at Trader.</h2>
                      <p className="text-muted mb-8">Upgrade to access real-time signals built for your strategy.</p>
                      <div className="relative mb-8 rounded-card overflow-hidden border border-border">
                        <div className="blur-sm pointer-events-none select-none p-4 font-mono text-xs">
                          <div className="flex justify-between text-muted mb-2 uppercase tracking-wider text-[10px]">
                            <span>TICKER</span><span>SIGNAL</span><span>CHANGE</span><span>TIME</span>
                          </div>
                          {["NVDA BREAKOUT +3.4%","AAPL MOMENTUM +1.2%","SPY SETUP +0.6%"].map(r => (
                            <div key={r} className="flex justify-between py-1.5 border-t border-border/30 text-text/30">{r}</div>
                          ))}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                          <div className="text-center">
                            <div className="text-accent text-2xl mb-2">⚡</div>
                            <p className="text-xs text-muted">Upgrade to unlock</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <a href="/join" className="flex-1"><Button fullWidth variant="ghost">Upgrade to Trader →</Button></a>
                        <Button fullWidth onClick={next}>Continue →</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-text mb-3">Your scanner is ready.</h2>
                      <p className="text-muted mb-8">Real-time signals. Built for your strategy.</p>
                      <div className="flex gap-3">
                        <a href="/scanner" className="flex-1"><Button fullWidth>Launch Scanner →</Button></a>
                        <Button fullWidth variant="ghost" onClick={next}>Continue →</Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 5 && (
                <div>
                  <h2 className="text-2xl font-bold text-text mb-3">Join the community.</h2>
                  <p className="text-muted mb-8">847 members. Daily alerts. Live discussion.</p>
                  <div className="bg-surface border border-border rounded-card p-5 mb-6">
                    <p className="text-xs text-muted uppercase tracking-widest font-mono mb-1">Telegram</p>
                    <p className="font-semibold text-text mb-3">The Greenprint Community</p>
                    <a href="https://t.me/+DePriulD4GFlOTNh" target="_blank" rel="noopener noreferrer">
                      <Button fullWidth>Join Telegram →</Button>
                    </a>
                  </div>
                  <Button fullWidth variant="ghost" onClick={next}>Continue →</Button>
                </div>
              )}

              {step === 6 && (
                <div>
                  <h2 className="text-2xl font-bold text-text mb-3">Download your tools.</h2>
                  <p className="text-muted mb-6">Everything you need to trade, learn, and connect.</p>
                  <div className="space-y-3 mb-6">
                    {apps.map(app => (
                      <div key={app.name} className="bg-surface border border-border rounded-card p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-text">{app.name}</p>
                          <p className="text-xs text-muted">{app.desc}</p>
                        </div>
                        <div className="flex gap-2">
                          <a href={app.ios} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-mono text-muted border border-border rounded px-2 py-1 hover:text-text hover:border-accent/30 transition-colors">
                            iOS
                          </a>
                          <a href={app.android} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-mono text-muted border border-border rounded px-2 py-1 hover:text-text hover:border-accent/30 transition-colors">
                            Android
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button fullWidth onClick={next}>Continue →</Button>
                </div>
              )}

              {step === 7 && (
                <div>
                  <h2 className="text-2xl font-bold text-text mb-3">Set up your broker.</h2>
                  <p className="text-muted mb-6">Follow these steps to get your trading account ready.</p>
                  <div className="space-y-4 mb-6">
                    {[
                      { n: "01", title: "Register at GenesisFX", body: "Create your account using the affiliate link below. Use referral code JACWAL843.", action: { label: "Register at GenesisFX →", url: "https://dashboard.genesisfxmarkets.com/auth/register?ref=JACWAL843" } },
                      { n: "02", title: "Set Leverage to 1:500", body: "In your account settings, set your leverage to 1:500 for maximum flexibility." },
                      { n: "03", title: "Download TradeLocker", body: "Use the TradeLocker app (downloaded in Step 6) as your primary trading platform." },
                      { n: "04", title: "Connect Your Credentials", body: "Log into TradeLocker using your GenesisFX account credentials." },
                    ].map(s => (
                      <div key={s.n} className="bg-surface border border-border rounded-card p-4">
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-xs text-muted flex-shrink-0 mt-0.5">{s.n}</span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-text mb-1">{s.title}</p>
                            <p className="text-xs text-muted leading-relaxed">{s.body}</p>
                            {(s as any).action && (
                              <a href={(s as any).action.url} target="_blank" rel="noopener noreferrer"
                                className="inline-block mt-2 text-xs text-accent hover:text-accent/80 transition-colors">
                                {(s as any).action.label}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button fullWidth onClick={next}>Continue →</Button>
                </div>
              )}

              {step === 8 && (
                <div>
                  <h2 className="text-2xl font-bold text-text mb-3">Watch these first.</h2>
                  <p className="text-muted mb-6">Foundation videos — watch within 72 hours.</p>
                  <div className="space-y-4 mb-6">
                    {[
                      { title: "Foundation Video 1", desc: "Getting started with the platform and your trading journey.", url: "https://drive.google.com/file/d/1/preview" },
                      { title: "Foundation Video 2", desc: "Jay's trading framework and daily routine breakdown.", url: "https://drive.google.com/file/d/2/preview" },
                    ].map((v, i) => (
                      <div key={i} className="bg-surface border border-border rounded-card overflow-hidden">
                        <div className="aspect-video bg-black flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-3xl mb-2">▶</div>
                            <p className="text-xs text-muted">Video {i + 1}</p>
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-sm font-semibold text-text mb-1">{v.title}</p>
                          <p className="text-xs text-muted">{v.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button fullWidth onClick={next}>Continue →</Button>
                </div>
              )}

              {step === 9 && (
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-text mb-8">You&apos;re all set.</h2>
                  <div className="space-y-3 mb-10 text-left">
                    {[
                      "Profile configured",
                      "Scanner access set",
                      "Community joined",
                      "Broker set up",
                      "Foundation videos queued",
                    ].map((item, i) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-bg" fill="none" viewBox="0 0 12 12">
                            <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span className="text-sm text-text">{item}</span>
                      </div>
                    ))}
                  </div>
                  <Button size="lg" fullWidth onClick={complete}>Enter Dashboard →</Button>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
