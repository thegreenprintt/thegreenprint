"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TOTAL_STEPS = 9;

const APPS = [
  { name: "1House", desc: "Community platform", ios: "https://apps.apple.com/us/app/1house/id6754260060", android: "https://play.google.com/store/search?q=1house&c=apps" },
  { name: "TradingView", desc: "Charts & analysis", ios: "https://apps.apple.com/us/app/tradingview/id1207793864", android: "https://play.google.com/store/apps/details?id=com.tradingview.tradingview" },
  { name: "Whop", desc: "Membership portal", ios: "https://apps.apple.com/us/app/whop/id1477770576", android: "https://play.google.com/store/apps/details?id=com.whop" },
  { name: "Telegram", desc: "Community chat", ios: "https://apps.apple.com/us/app/telegram-messenger/id686449807", android: "https://play.google.com/store/apps/details?id=org.telegram.messenger" },
  { name: "Boards", desc: "Task management", ios: "https://apps.apple.com/us/app/trello-trello/id461429836", android: "https://play.google.com/store/apps/details?id=com.trello.trello" },
  { name: "Thinkorswim", desc: "Options flow", ios: "https://apps.apple.com/us/app/thinkorswim-market-watch/id1335840352", android: "https://play.google.com/store/apps/details?id=com.thinkorswim.android.thinkorswim" },
  { name: "Discord", desc: "Trader community", ios: "https://apps.apple.com/us/app/discord/id985644456", android: "https://play.google.com/store/apps/details?id=com.discord" },
  { name: "Thinkific", desc: "AI Trading Assistant", ios: "https://apps.apple.com/us/app/thinkific/id519523976", android: "https://play.google.com/store/apps/details?id=com.thinkific.thinkific" },
  { name: "Twitter/X", desc: "Market alerts", ios: "https://apps.apple.com/us/app/twitter/id333903033", android: "https://play.google.com/store/apps/details?id=com.twitter.android" },
  { name: "YouTube", desc: "Trading Recaps", ios: "https://apps.apple.com/us/app/youtube/id544007686", android: "https://play.google.com/store/apps/details?id=com.google.android.youtube" },
];

const EXPERIENCE_LEVELS = [
  { id: "beginner", title: "Beginner", desc: "I haven't started yet" },
  { id: "learning", title: "In The Learning Phase", desc: "I know the basics, refining my setup" },
  { id: "consistent", title: "Consistently Profitable", desc: "I'm trading profitably most days" },
  { id: "scaling", title: "Scaling Up", desc: "I want to grow my account and trade larger" },
];

const FOCUS_AREAS = [
  { id: "daytrading", label: "Day Trading" },
  { id: "options", label: "Options" },
  { id: "swings", label: "Swing Trading" },
  { id: "crypto", label: "Crypto" },
  { id: "longterm", label: "Long-term Investing" },
];

const BROKER_STEPS_DATA = [
  { n: "01", title: "Create Your Account", body: "Sign up at TradeLocker using your email address." },
  { n: "02", title: "Fund Your Account", body: "Start with risk capital you can afford to lose.", action: { label: "Open TradeLocker →", url: "https://tradelocker.com" } },
  { n: "03", title: "Download the App", body: "TradeLocker is your primary trading platform." },
  { n: "04", title: "Connect Your Credentials", body: "Log into TradeLocker using your GenesisFX account credentials." },
];

const TOPICS = [
  { title: "Gaps & Gos", desc: "When to buy and when to sell based on market structure" },
  { title: "Risk Management", desc: "Protecting your capital while maximizing gains" },
  { title: "Opening Routine", desc: "Before the market opens, what to watch" },
  { title: "Entry Techniques", desc: "Getting in at the right price, every time" },
];

const ORB = ({ style }: { style: React.CSSProperties }) => (
  <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none", ...style }} />
);

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("there");
  const [tier, setTier] = useState<string>("member");
  const [focus, setFocus] = useState<string[]>([]);
  const [experience, setExperience] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.user_metadata?.full_name) setName(data.user.user_metadata.full_name.split(" ")[0]);
    });
  }, []);

  const handleFinish = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return;
    await supabase.from("profiles").upsert({ id: data.user.id, experience: experience, focus: focus, onboarded: true });
    router.push("/dashboard");
  };

  const btn = (onClick: () => void, label: string, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 14, letterSpacing: "0.04em", transition: "all 0.2s", background: disabled ? "rgba(255,255,255,0.06)" : "#00FF85", color: disabled ? "rgba(255,255,255,0.2)" : "#000", boxShadow: disabled ? "none" : "0 0 24px rgba(0,255,133,0.3)" }}>{label}</button>
  );

  const stepLabel = (n: number) => (
    <p style={{ fontFamily: "monospace", fontSize: 11, color: "#00FF85", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10, opacity: 0.8 }}>Step {n} of {TOTAL_STEPS}</p>
  );

  const heading = (text: string, sub?: string) => (
    <div style={{ marginBottom: sub ? 6 : 28 }}>
      <h2 style={{ fontSize: 26, fontWeight: 900, color: "white", margin: 0, lineHeight: 1.25 }}>{text}</h2>
      {sub && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 6, marginBottom: 24 }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #060608 0%, #080d08 50%, #060a08 100%)", position: "relative", overflow: "hidden" }}>
      <ORB style={{ top: "-8%", left: "-8%", width: 500, height: 500, background: "radial-gradient(circle, rgba(0,255,133,0.07) 0%, transparent 70%)" }} />
      <ORB style={{ bottom: "-12%", right: "-8%", width: 600, height: 600, background: "radial-gradient(circle, rgba(0,200,100,0.05) 0%, transparent 70%)" }} />
      <ORB style={{ top: "45%", right: "10%", width: 280, height: 280, background: "radial-gradient(circle, rgba(0,255,133,0.04) 0%, transparent 70%)" }} />
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.05)", zIndex: 50 }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg, #00FF85, #00cc6a)", width: `${(step / TOTAL_STEPS) * 100}%`, transition: "width 0.45s ease", boxShadow: "0 0 10px rgba(0,255,133,0.7)" }} />
      </div>
      <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} disabled={step === 1} style={{ position: "fixed", top: 20, left: 20, zIndex: 40, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: step === 1 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.45)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontFamily: "monospace", cursor: step === 1 ? "default" : "pointer", letterSpacing: "0.08em" }}>← Back</button>
      <div style={{ position: "fixed", top: 22, right: 20, zIndex: 40, fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em" }}>{step} / {TOTAL_STEPS}</div>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px 48px" }}>
        <div style={{ width: "100%", maxWidth: 500, position: "relative", zIndex: 10 }}>
          {step === 1 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 68, height: 68, borderRadius: 18, background: "linear-gradient(135deg, #00FF85, #00cc6a)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", boxShadow: "0 0 40px rgba(0,255,133,0.35), 0 0 80px rgba(0,255,133,0.1)" }}>
                <span style={{ fontWeight: 900, fontSize: 22, color: "#000", fontFamily: "monospace", letterSpacing: "-0.02em" }}>GP</span>
              </div>
              <h1 style={{ fontSize: 34, fontWeight: 900, color: "white", marginBottom: 10, lineHeight: 1.2, letterSpacing: "-0.02em" }}>Welcome to The Greenprint,{" "}<span style={{ color: "#00FF85" }}>{name}.</span></h1>
              <p style={{ color: "rgba(255,255,255,0.35)", marginBottom: 40, fontSize: 15 }}>This takes about 2 minutes.</p>
              <button onClick={() => setStep(2)} style={{ background: "#00FF85", color: "#000", fontWeight: 900, fontSize: 15, padding: "15px 44px", borderRadius: 12, border: "none", cursor: "pointer", letterSpacing: "0.04em", boxShadow: "0 0 28px rgba(0,255,133,0.35)" }}>Begin →</button>
              <p style={{ marginTop: 36, fontSize: 11, color: "rgba(255,255,255,0.18)", lineHeight: 1.8 }}>Educational purposes only. Not financial advice. Trading involves risk of loss.{" "}<a href="/disclaimer" style={{ color: "rgba(0,255,133,0.4)", textDecoration: "none" }}>See disclaimer →</a></p>
            </div>
          )}
          {step === 2 && (
            <div>
              {stepLabel(2)}
              {heading("What are you focused on?", "Select all that apply.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                {FOCUS_AREAS.map(f => (
                  <button key={f.id} onClick={() => setFocus(prev => prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id])} style={{ padding: "14px 18px", borderRadius: 12, cursor: "pointer", textAlign: "left", border: focus.includes(f.id) ? "1px solid rgba(0,255,133,0.5)" : "1px solid rgba(255,255,255,0.08)", background: focus.includes(f.id) ? "rgba(0,255,133,0.07)" : "rgba(255,255,255,0.03)", color: focus.includes(f.id) ? "#00FF85" : "rgba(255,255,255,0.75)", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s" }}><span>{f.label}</span>{focus.includes(f.id) && <span style={{ fontSize: 13, color: "#00FF85" }}>✓</span>}</button>
                ))}
              </div>
              {btn(() => setStep(3), "Continue →", focus.length === 0)}
            </div>
          )}
          {step === 3 && (
            <div>
              {stepLabel(3)}
              {heading("Where are you right now?")}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                {EXPERIENCE_LEVELS.map(e => (
                  <button key={e.id} onClick={() => setExperience(e.id)} style={{ padding: "16px 18px", borderRadius: 12, cursor: "pointer", textAlign: "left", border: experience === e.id ? "1px solid rgba(0,255,133,0.5)" : "1px solid rgba(255,255,255,0.08)", background: experience === e.id ? "rgba(0,255,133,0.07)" : "rgba(255,255,255,0.03)", transition: "all 0.15s" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: experience === e.id ? "#00FF85" : "white", marginBottom: 3 }}>{e.title}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{e.desc}</div>
                  </button>
                ))}
              </div>
              {btn(() => setStep(4), "Continue →", !experience)}
            </div>
          )}
          {step === 4 && (
            <div style={{ textAlign: "center" }}>
              {tier === "member" ? (
                <>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(0,255,133,0.08)", border: "1px solid rgba(0,255,133,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px", fontSize: 26 }}>📋</div>
                  <h2 style={{ fontSize: 26, fontWeight: 900, color: "white", marginBottom: 8 }}>Your Greenprint Plan</h2>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginBottom: 28 }}>Here's what you have access to as a member.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 28, textAlign: "left" }}>
                    {["Live class access", "Telegram community", "Trading tools", "Video library", "App ecosystem", "Daily alerts"].map(item => (
                      <div key={item} style={{ padding: "11px 14px", borderRadius: 10, background: "rgba(0,255,133,0.04)", border: "1px solid rgba(0,255,133,0.1)", display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "#00FF85", fontSize: 11 }}>✓</span><span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 500 }}>{item}</span></div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <a href="/join" style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "block", textAlign: "center" }}>Upgrade to Trader →</a>
                    <a href="/scanner" style={{ flex: 1, padding: "13px", borderRadius: 12, border: "none", background: "#00FF85", color: "#000", fontSize: 13, fontWeight: 800, textDecoration: "none", display: "block", textAlign: "center", boxShadow: "0 0 20px rgba(0,255,133,0.3)" }}>Launch Scanner →</a>
                  </div>
                  <button onClick={() => setStep(5)} style={{ marginTop: 12, background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 13, cursor: "pointer", padding: "8px" }}>Continue setup →</button>
                </>
              ) : (
                <>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px", fontSize: 26 }}>👤</div>
                  <h2 style={{ fontSize: 26, fontWeight: 900, color: "white", marginBottom: 10 }}>Let's get you set up</h2>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginBottom: 28 }}>We'll walk you through everything step by step.</p>
                  {btn(() => setStep(5), "Continue →")}
                </>
              )}
            </div>
          )}
          {step === 5 && (
            <div>
              {stepLabel(5)}
              {heading("Join the community.", "847 members. Daily alerts. Live discussion.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                <a href="https://t.me/+NFLNaB00u65mOTM5" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(38,165,222,0.12)", border: "1px solid rgba(38,165,222,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>💬</div>
                  <div style={{ flex: 1 }}><div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Greenprint Chat</div><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>Telegram — daily calls & alerts</div></div>
                  <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 16 }}>→</span>
                </a>
              </div>
              {btn(() => setStep(6), "Done →")}
            </div>
          )}
          {step === 6 && (
            <div>
              {stepLabel(6)}
              {heading("Download your apps.", "The tools you'll use daily.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28, maxHeight: 380, overflowY: "auto", paddingRight: 2 }}>
                {APPS.map(app => (
                  <div key={app.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div><div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600, fontSize: 13 }}>{app.name}</div><div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{app.desc}</div></div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <a href={app.ios} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "3px 7px", textDecoration: "none" }}>iOS</a>
                      <a href={app.android} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "3px 7px", textDecoration: "none" }}>Android</a>
                    </div>
                  </div>
                ))}
              </div>
              {btn(() => setStep(7), "Done →")}
            </div>
          )}
          {step === 7 && (
            <div>
              {stepLabel(7)}
              {heading("Set up your broker.", "Follow these steps to get your trading account ready.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                {BROKER_STEPS_DATA.map(s => (
                  <div key={s.n} style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(0,255,133,0.6)", flexShrink: 0, marginTop: 2 }}>{s.n}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: "white", fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{s.title}</p>
                      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0 }}>{s.body}</p>
                      {(s as any).action && (<a href={(s as any).action.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, fontSize: 11, fontFamily: "monospace", color: "rgba(0,255,133,0.6)", border: "1px solid rgba(0,255,133,0.2)", borderRadius: 6, padding: "3px 9px", textDecoration: "none" }}>{(s as any).action.label}</a>)}
                    </div>
                  </div>
                ))}
              </div>
              {btn(() => setStep(8), "Got it →")}
            </div>
          )}
          {step === 8 && (
            <div>
              {stepLabel(8)}
              {heading("Watch these first.", "Foundation videos — watch within 72 hours.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                {TOPICS.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, padding: "15px 18px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", alignItems: "flex-start" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(0,255,133,0.07)", border: "1px solid rgba(0,255,133,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 11, color: "rgba(0,255,133,0.6)", flexShrink: 0 }}>{i + 1}</div>
                    <div><div style={{ color: "white", fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{t.title}</div><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{t.desc}</div></div>
                  </div>
                ))}
              </div>
              {btn(() => setStep(9), "I'll watch them →")}
            </div>
          )}
          {step === 9 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #00FF85, #00cc6a)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", boxShadow: "0 0 50px rgba(0,255,133,0.45), 0 0 100px rgba(0,255,133,0.15)", fontSize: 28 }}>✓</div>
              <h2 style={{ fontSize: 34, fontWeight: 900, color: "white", marginBottom: 10, letterSpacing: "-0.02em" }}>You're all set, <span style={{ color: "#00FF85" }}>{name}</span>.</h2>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 15, marginBottom: 40 }}>Your Greenprint is ready. Let's start trading.</p>
              <button onClick={handleFinish} style={{ background: "#00FF85", color: "#000", fontWeight: 900, fontSize: 16, padding: "16px 52px", borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 0 36px rgba(0,255,133,0.4)", letterSpacing: "0.04em" }}>Enter Dashboard →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
