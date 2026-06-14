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
  { n: 1, title: "Create Your GenesisFX Account", desc: "Sign up at GenesisFX using the link below.", href: "https://client.genesisfx.io/register", linkLabel: "Open GenesisFX →" },
  { n: 2, title: "Verify Your Identity", desc: "Complete KYC verification — takes about 5 minutes. Have your ID ready." },
  { n: 3, title: "Fund Your Account", desc: "Make your initial deposit to activate your trading account." },
  { n: 4, title: "Connect to TradeLocker", desc: "Open TradeLocker, tap Add Account, and enter your GenesisFX credentials." },
  { n: 5, title: "Create a Demo Account", desc: "In TradeLocker, also add a Demo account. Use virtual funds to practice before going live." },
];

const ARIN_CLIPS = [
  { n: 1, title: "New Trader Start Here", desc: "Begin here — no exceptions." },
  { n: 2, title: "Market Basics", desc: "Foundation for everything we do." },
  { n: 3, title: "Market Bully Strategy", desc: "The core strategy used inside The Greenprint." },
];

const TOTAL_STEPS = 6;

export default function OnboardPage() {
  const [step, setStep] = useState(1);

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep(s => Math.max(s - 1, 1));
  const pct = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <div className="h-full bg-[#00FF85] transition-all duration-500" style={{ width: pct + "%" }} />
      </div>

      <div className="max-w-lg mx-auto px-6 pt-12 pb-24">
        <p className="text-white/30 text-xs tracking-widest uppercase mb-10">Step {step} of {TOTAL_STEPS}</p>

        {/* Step 1: 1House */}
        {step === 1 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Your Home Base</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Log In to 1House</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              1House is where everything lives — the community, the content, and your connection to The Greenprint. Log in and take 5 minutes to explore before moving on. Get familiar with how it’s laid out.
            </p>
            <a
              href="https://www.1house.tv"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center mb-4"
            >
              Open 1House →
            </a>
            <a
              href="https://apps.apple.com/us/app/1house/id6754260060"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold text-base text-center"
            >
              Download the App (iOS)
            </a>
          </div>
        )}

        {/* Step 2: Download Apps */}
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
                      <a href={app.ios} target="_blank" rel="noopener noreferrer" className="text-[#00FF85] text-xs font-semibold border border-[#00FF85]/30 px-2 py-1 rounded-lg">iOS</a>
                    )}
                    {app.android && (
                      <a href={app.android} target="_blank" rel="noopener noreferrer" className="text-white/60 text-xs font-semibold border border-white/20 px-2 py-1 rounded-lg">Android</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Join the Chats */}
        {step === 3 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Community</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Join the Chats</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              Get plugged in. The community is where signals, updates, and live session alerts happen. Don’t miss it.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="https://t.me/+thegreenprint"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#00FF85]/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#229ED9] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.412 14.6l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.736.959z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Telegram</p>
                  <p className="text-white/40 text-xs">Main community chat</p>
                </div>
                <span className="ml-auto text-white/30 text-sm">→</span>
              </a>
              <a
                href="https://www.1house.tv"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#00FF85]/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#00FF85]/20 border border-[#00FF85]/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#00FF85] font-black text-base">1H</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">1House Community</p>
                  <p className="text-white/40 text-xs">Platform chat & content</p>
                </div>
                <span className="ml-auto text-white/30 text-sm">→</span>
              </a>
            </div>
          </div>
        )}

        {/* Step 4: Broker + Demo */}
        {step === 4 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Go Live</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Set Up Your Broker</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              We use GenesisFX. Follow these steps to open your account, fund it, and connect to TradeLocker — then also set up a demo account to practice first.
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

        {/* Step 5: Arin's Clips */}
        {step === 5 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Education</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Watch Arin Long’s Clips</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              Watch these in order on her 1House channel. This is your foundation before you touch a live chart.
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {ARIN_CLIPS.map(item => (
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
              className="block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center"
            >
              Open Arin’s Channel on 1House →
            </a>
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
              You’ve got the apps, the broker, the community access, and the foundation. Welcome to The Greenprint — we’ll see you inside.
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
              {step === 1 ? "Let’s Go" : "Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
