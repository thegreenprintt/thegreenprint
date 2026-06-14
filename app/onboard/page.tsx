"use client";
import { useState } from "react";

const PASSWORD = "legacy";

const APPS = [
  { name: "1House", desc: "Community platform", ios: "https://apps.apple.com/us/app/1house/id6754260060", android: "" },
  { name: "TradingView", desc: "Charts & analysis", ios: "https://apps.apple.com/us/app/tradingview-stock-market/id1205990992", android: "https://play.google.com/store/apps/details?id=com.tradingview.tradingviewapp" },
  { name: "TradeLocker", desc: "Trading platform", ios: "https://apps.apple.com/us/app/tradelocker/id6447196449", android: "https://play.google.com/store/apps/details?id=com.tradelocker.mobile" },
  { name: "Zoom", desc: "Live sessions", ios: "https://apps.apple.com/us/app/zoom-one-platform-to-connect/id546505307", android: "https://play.google.com/store/apps/details?id=us.zoom.videomeetings" },
  { name: "Telegram", desc: "Community chat", ios: "https://apps.apple.com/us/app/telegram-messenger/id686449807", android: "https://play.google.com/store/apps/details?id=org.telegram.messenger" },
  { name: "Boards", desc: "Task management", ios: "https://apps.apple.com/us/app/boards-com/id1507677341", android: "" },
];

const BROKER_STEPS = [
  { n: 1, title: "Create Your Account", desc: "Sign up at GenesisFX using the link below.", href: "https://client.genesisfx.io/register", linkLabel: "Open GenesisFX →" },
  { n: 2, title: "Verify Your Identity", desc: "Complete KYC verification — takes about 5 minutes. Have your ID ready." },
  { n: 3, title: "Fund Your Account", desc: "Make your initial deposit to activate your trading account." },
  { n: 4, title: "Connect to TradeLocker", desc: "Open TradeLocker, add a new account, and enter your GenesisFX credentials." },
];

const TOTAL_STEPS = 5;

export default function OnboardPage() {
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [step, setStep] = useState(1);

  function handleUnlock(e: any) {
    e.preventDefault();
    if (pw === PASSWORD) {
      setUnlocked(true);
    } else {
      setPwErr(true);
      setTimeout(() => setPwErr(false), 2000);
    }
  }

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep(s => Math.max(s - 1, 1));
  const pct = Math.round((step / TOTAL_STEPS) * 100);

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-[#00FF85] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-black font-black text-2xl">G</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Member Onboarding</h1>
          <p className="text-white/40 text-sm mb-8">Enter your access code to get started.</p>
          <form onSubmit={handleUnlock} className="flex flex-col gap-3">
            <input
              type="password"
              value={pw}
              onChange={e => { setPw(e.target.value); setPwErr(false); }}
              placeholder="Access code"
              autoFocus
              className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${pwErr ? "border-red-500" : "border-white/10"} text-white placeholder-white/30 focus:outline-none focus:border-[#00FF85]/50 text-center tracking-widest`}
            />
            {pwErr && <p className="text-red-400 text-sm">Incorrect code. Try again.</p>}
            <button type="submit" className="w-full py-3 rounded-xl bg-[#00FF85] text-black font-bold text-base">
              Get Started
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <div className="h-full bg-[#00FF85] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div className="max-w-lg mx-auto px-6 pt-12 pb-20">
        <p className="text-white/30 text-xs tracking-widest uppercase mb-10">
          Step {step} of {TOTAL_STEPS}
        </p>

        {step === 1 && (
          <div>
            <h2 className="text-4xl font-black mb-4">Welcome to<br />The Greenprint.</h2>
            <p className="text-white/60 text-base leading-relaxed mb-4">
              You're officially in. This setup takes about 5 minutes — follow each step and you'll be trading alongside the community by the end.
            </p>
            <p className="text-white/60 text-base leading-relaxed mb-10">
              We'll get your apps downloaded, your broker set up, and your community access activated.
            </p>
            <button onClick={next} className="w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base">
              Let's Go →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-4xl font-black mb-4">Join the<br />Community.</h2>
            <p className="text-white/60 text-base leading-relaxed mb-8">
              Our Telegram is where everything happens — real-time trade alerts, live session announcements, and the full community. Join before anything else.
            </p>
            <a
              href="https://t.me/+thegreenprint"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-[#229ED9] text-white font-bold text-base mb-4"
            >
              Join Telegram Community →
            </a>
            <button onClick={next} className="w-full py-4 rounded-2xl border border-white/10 text-white/50 font-semibold text-base">
              Already in → Continue
            </button>
            <button onClick={prev} className="mt-6 text-white/25 text-sm block mx-auto">← Back</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-4xl font-black mb-4">Download<br />Your Apps.</h2>
            <p className="text-white/60 text-base mb-8">Get all of these on your phone. You'll use every one of them.</p>
            <div className="flex flex-col gap-3 mb-8">
              {APPS.map(app => (
                <div key={app.name} className="flex items-center justify-between bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div>
                    <p className="font-bold text-white">{app.name}</p>
                    <p className="text-white/40 text-xs mt-0.5">{app.desc}</p>
                  </div>
                  <div className="flex gap-2">
                    {app.ios && (
                      <a href={app.ios} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 font-medium">
                        iOS
                      </a>
                    )}
                    {app.android && (
                      <a href={app.android} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 font-medium">
                        Android
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={next} className="w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base">
              Got them all → Next
            </button>
            <button onClick={prev} className="mt-6 text-white/25 text-sm block mx-auto">← Back</button>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-4xl font-black mb-4">Set Up<br />Your Broker.</h2>
            <p className="text-white/60 text-base mb-8">
              We trade through GenesisFX connected to TradeLocker. Follow these four steps to get your account live.
            </p>
            <div className="flex flex-col gap-4 mb-8">
              {BROKER_STEPS.map(s => (
                <div key={s.n} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#00FF85] text-black text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      {s.n}
                    </span>
                    <div>
                      <p className="font-bold text-white">{s.title}</p>
                      <p className="text-white/40 text-sm mt-1">{s.desc}</p>
                      {s.href && (
                        <a href={s.href} target="_blank" rel="noopener noreferrer"
                          className="inline-block mt-2 text-sm text-[#00FF85] font-semibold">
                          {s.linkLabel}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={next} className="w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base">
              Broker is set up → Next
            </button>
            <button onClick={prev} className="mt-6 text-white/25 text-sm block mx-auto">← Back</button>
          </div>
        )}

        {step === 5 && (
          <div className="text-center">
            <div className="w-20 h-20 bg-[#00FF85] rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-black text-3xl font-black">✓</span>
            </div>
            <h2 className="text-4xl font-black mb-4">You're All Set.</h2>
            <p className="text-white/60 text-base leading-relaxed mb-10">
              Welcome to The Greenprint family. Check Telegram for your first trade alert and watch for the next live session announcement. Let's build.
            </p>
            <a href="/" className="block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center">
              Go to The Greenprint →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
