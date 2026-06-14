"use client";
import { useState } from "react";

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

const DEMO_STEPS = [
  { n: 1, title: "Open TradeLocker", desc: "Launch the TradeLocker app on your device." },
  { n: 2, title: "Add a Demo Account", desc: "Tap the account selector at the top, then tap “Add Account” and choose Demo." },
  { n: 3, title: "Practice the Platform", desc: "Use virtual funds to explore charts, place trades, and get comfortable before going live." },
];

const TOTAL_STEPS = 6;

export default function OnboardPage() {
  const [step, setStep] = useState(1);

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep(s => Math.max(s - 1, 1));
  const pct = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <div className="h-full bg-[#00FF85] transition-all duration-500" style={{ width: pct + "%" }} />
      </div>

      <div className="max-w-lg mx-auto px-6 pt-12 pb-24">
        <p className="text-white/30 text-xs tracking-widest uppercase mb-10">Step {step} of {TOTAL_STEPS}</p>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div>
            <div className="w-14 h-14 bg-[#00FF85] rounded-2xl flex items-center justify-center mb-8">
              <span className="text-black font-black text-2xl">G</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Welcome to The Greenprint.</h1>
            <p className="text-white/50 text-base leading-relaxed mb-6">
              You’re now part of something built for real results. Over the next few steps we’ll get you fully set up — from the right apps to your broker account — so you’re ready to trade alongside the community.
            </p>
            <p className="text-white/30 text-sm">This takes about 10 minutes. Let’s go.</p>
          </div>
        )}

     Step 2: Watch Arin's Clips */}
        {step === 5 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Education First</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Watch Arin's Clips</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              Start with Arin Long's channel on 1House. Watch these in order before moving on.
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { n: 1, title: "New Trader Start Here", desc: "Begin here — no exceptions." },
                { n: 2, title: "Market Basics", desc: "Foundation for everything we do." },
                { n: 3, title: "Market Bully Strategy", desc: "The core strategy used inside The Greenprint." },
              ].map(item => (
                <div key={item.n} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
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
            <a
              href="https://www.1house.tv/educators/a782da2a-81c6-4c32-9f6a-e36c9c74e218"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-base text-center hover:border-[#00FF85]/40 transition-colors"
            >
              Open Arin's Channel on 1House →
            </a>
          </div>
        )}

        {/*    {/* Step 3: Download Apps */}
        {step === 2 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Setup</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Download Your Apps</h2>
            <p className="text-white/50 text-sm mb-6">These are the tools you’ll use every day inside The Greenprint.</p>
            <div className="flex flex-col gap-3">
              {APPS.map(app => (
                <div key={app.name} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-white font-semibold text-sm">{app.name}</p>
                    <p className="text-white/40 text-xs">{app.desc}</p>
                  </div>
                  <div className="flex gap-2">
                    {app.ios && (
                      <a href={app.ios} target="_blank" rel="noopener noreferrer" className="text-[#00FF85] text-xs font-semibold border border-[#00FF85]/30 px-2 py-1 rounded-lg hover:bg-[#00FF85]/10 transition-colors">iOS</a>
                    )}
                    {app.android && (
                      <a href={app.android} target="_blank" rel="noopener noreferrer" className="text-white/60 text-xs font-semibold border border-white/20 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">Android</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Create Demo Account */}
        {step === 3 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Practice</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Create a Demo Account</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              Before you go live, set up a demo account in TradeLocker. Practice executing trades, reading charts, and building your process — risk-free.
            </p>
            <div className="flex flex-col gap-4">
              {DEMO_STEPS.map(s => (
                <div key={s.n} className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#00FF85]/10 border border-[#00FF85]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#00FF85] text-xs font-bold">{s.n}</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">{s.title}</p>
                    <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Broker Setup */}
        {step === 4 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Go Live</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Set Up Your Broker</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              We use GenesisFX as our broker. Follow these steps to open and fund your live account, then connect it to TradeLocker.
            </p>
            <div className="flex flex-col gap-4">
              {BROKER_STEPS.map(s => (
                <div key={s.n} className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#00FF85]/10 border border-[#00FF85]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#00FF85] text-xs font-bold">{s.n}</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">{s.title}</p>
                    <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                    {s.href && (
                      <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-[#00FF85] text-sm font-semibold">{s.linkLabel}</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Complete */}
        {step === 6 && (
          <div className="text-center pt-8">
            <div className="w-16 h-16 bg-[#00FF85] rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">You’re All Set.</h2>
            <p className="text-white/50 text-base leading-relaxed mb-10">
              You’ve got the apps, the broker, and the knowledge to get started. Welcome to The Greenprint — we’ll see you inside.
            </p>
            <a href="https://t.me/+thegreenprint" target="_blank" rel="noopener noreferrer" className="block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center mb-3">
              Join the Telegram →
            </a>
            <a href="/" className="block w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold text-base text-center">
              Back to Home
            </a>
          </div>
        )}

        {/* Navigation */}
        {step < TOTAL_STEPS && (
          <div className="flex gap-3 mt-12">
            {step > 1 && (
              <button onClick={prev} className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-base">
                Back
              </button>
            )}
            <button onClick={next} className="flex-1 py-3.5 rounded-xl bg-[#00FF85] text-black font-bold text-base">
              {step === 1 ? "Get Started" : "Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}        {/* Step 3: Create Demo Account */}
        {step === 3 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Practice</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Create a Demo Account</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              Before you go live, set up a demo account in TradeLocker. Practice executing trades, reading charts, and building your process — risk-free.
            </p>
            <div className="flex flex-col gap-4">
              {DEMO_STEPS.map(s => (
                <div key={s.n} className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#00FF85]/10 border border-[#00FF85]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#00FF85] text-xs font-bold">{s.n}</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">{s.title}</p>
                    <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Broker Setup */}
        {step === 4 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Go Live</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Set Up Your Broker</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              We use GenesisFX as our broker. Follow these steps to open and fund your live account, then connect it to TradeLocker.
            </p>
            <div className="flex flex-col gap-4">
              {BROKER_STEPS.map(s => (
                <div key={s.n} className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#00FF85]/10 border border-[#00FF85]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#00FF85] text-xs font-bold">{s.n}</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">{s.title}</p>
                    <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                    {s.href && (
                      <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-[#00FF85] text-sm font-semibold">{s.linkLabel}</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Complete */}
        {step === 6 && (
          <div className="text-center pt-8">
            <div className="w-16 h-16 bg-[#00FF85] rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">You’re All Set.</h2>
            <p className="text-white/50 text-base leading-relaxed mb-10">
              You’ve got the apps, the broker, and the knowledge to get started. Welcome to The Greenprint — we’ll see you inside.
            </p>
            <a href="https://t.me/+thegreenprint" target="_blank" rel="noopener noreferrer" className="block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center mb-3">
              Join the Telegram →
            </a>
            <a href="/" className="block w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold text-base text-center">
              Back to Home
            </a>
          </div>
        )}

        {/* Navigation */}
        {step < TOTAL_STEPS && (
          <div className="flex gap-3 mt-12">
            {step > 1 && (
              <button onClick={prev} className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-base">
                Back
              </button>
            )}
            <button onClick={next} className="flex-1 py-3.5 rounded-xl bg-[#00FF85] text-black font-bold text-base">
              {step === 1 ? "Get Started" : "Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
