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
  { n: 1, title: "Create Your GenesisFX Account", desc: "Sign up at GenesisFX using the link below.", href: "https://dashboard.genesisfxmarkets.com/auth/register?ref=JACWAL843", linkLabel: "Open GenesisFX" },
  { n: 2, title: "Verify Your Identity", desc: "Complete KYC verification — takes about 5 minutes. Have your ID ready." },
  { n: 3, title: "Download TradeLocker", desc: "Install TradeLocker from the App Store or Google Play, then open the app." },
];

const DEMO_STEPS = [
  { n: 1, title: "Open the Menu", desc: "Tap the 3 lines in the top left corner of TradeLocker." },
  { n: 2, title: "Press TradeLocker", desc: "Tap TradeLocker from the menu to access account options." },
  { n: 3, title: "Select New Account", desc: "Tap New Account to begin setting up your demo." },
  { n: 4, title: "Set Account Type to Demo", desc: "On the first dropdown, switch it from Live to Demo." },
  { n: 5, title: "Name Your Account", desc: "In the second field, type a name — keep it simple, like Demo." },
  { n: 6, title: "Keep the Broker as GenFX", desc: "Leave the third option set to GenFX or Standard — don't change it." },
  { n: 7, title: "Set Leverage to 1:500", desc: "Change the leverage setting to 1:500." },
  { n: 8, title: "Set Account Size", desc: "Keep it at $10,000 or change it to whatever amount you want to practice with. Then confirm to create the account." },
];

const ARIN_CLIPS = [
  { n: 1, title: "New Trader Start Here", desc: "Begin here — no exceptions." },
  { n: 2, title: "Market Basics", desc: "Foundation for everything we do." },
  { n: 3, title: "Market Bully Strategy", desc: "The core strategy used inside The Greenprint." },
];

const FULL_ONBOARDING_VIDEO = {
  title: "Full Onboarding",
  desc: "If you're not getting phone guidance, watch this video. Otherwise, follow the next steps.",
  url: "https://drive.google.com/file/d/197t2VfgGJEHYr_NFy79ZTOwXEsEE5RQr/preview"
};

const TRADELOCKER_VIDEO = {
  title: "TradeLocker Phone Overview",
  desc: "Master TradeLocker platform setup and trading execution.",
  url: "https://drive.google.com/file/d/1KoIlb3yrBQ7pvAhqM8_RkEA5KIC07Gu6/preview"
};

const TOTAL_STEPS = 8;

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

        {step === 1 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Your Home Base</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Log In to 1House</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              1House is where everything lives — the community, the content, and your connection to The Greenprint. Log in and take 5 minutes to explore before moving on. Get familiar with how it is laid out.
            </p>
            <a href="https://www.1house.tv" target="_blank" rel="noopener noreferrer" className="block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center mb-4">
              Open 1House
            </a>
            <a href="https://apps.apple.com/us/app/1house/id6754260060" target="_blank" rel="noopener noreferrer" className="block w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold text-base text-center">
              Download the App (iOS)
            </a>
          </div>
        )}

        {step === 2 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Onboarding</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">{FULL_ONBOARDING_VIDEO.title}</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6">{FULL_ONBOARDING_VIDEO.desc}</p>
            <div className="aspect-video bg-black/50 border border-white/20 rounded-xl mb-6 flex items-center justify-center overflow-hidden">
              <iframe src={FULL_ONBOARDING_VIDEO.url} className="w-full h-full" allowFullScreen></iframe>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Setup</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Download Your Apps</h2>
            <p className="text-white/50 text-sm mb-6">These are the tools you will use every day inside The Greenprint.</p>
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
                      <a href={app.android} target="_blank" rel="noopener noreferrer" className="text-[#00FF85] text-xs font-semibold border border-[#00FF85]/30 px-2 py-1 rounded-lg">Android</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Community</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Join the Chats</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6">Get plugged in. This is where signals, updates, and live session alerts happen.</p>
            <div className="flex flex-col gap-3">
              <a href="https://t.me/+Hz_sp0s32jVjNDQx" target="_blank" rel="noopener noreferrer" className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                <p className="text-white font-semibold text-sm">The Greenprint</p>
                <p className="text-white/40 text-xs">Main community chat</p>
                <p className="text-[#00FF85] text-xs mt-2">→</p>
              </a>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Go Live</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Set Up Your Broker</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6">First get your GenesisFX account set up, then create your demo account in TradeLocker. No funding needed yet — this is all about getting your demo running so you can start practicing.</p>
            <div className="space-y-6">
              <div>
                <h3 className="text-white font-semibold text-sm mb-4">GENESISFX ACCOUNT</h3>
                <div className="space-y-3">
                  {BROKER_STEPS.map(s => (
                    <div key={s.n} className="text-sm">
                      <p className="text-white/40 text-xs font-mono mb-1">{s.n}</p>
                      <p className="text-white font-semibold">{s.title}</p>
                      <p className="text-white/50 text-xs mt-1">{s.desc}</p>
                      {s.href && (
                        <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-[#00FF85] text-xs font-semibold mt-2 inline-block hover:underline">
                          {s.linkLabel} →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm mb-4">CREATE A DEMO ACCOUNT IN TRADELOCKER</h3>
                <div className="space-y-3">
                  {DEMO_STEPS.map(s => (
                    <div key={s.n} className="text-sm">
                      <p className="text-white/40 text-xs font-mono mb-1">{s.n}</p>
                      <p className="text-white font-semibold">{s.title}</p>
                      <p className="text-white/50 text-xs mt-1">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Trading Platform</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">{TRADELOCKER_VIDEO.title}</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6">{TRADELOCKER_VIDEO.desc}</p>
            <div className="aspect-video bg-black/50 border border-white/20 rounded-xl mb-6 flex items-center justify-center overflow-hidden">
              <iframe src={TRADELOCKER_VIDEO.url} className="w-full h-full" allowFullScreen></iframe>
            </div>
          </div>
        )}

        {step === 7 && (
          <div>
            <span className="text-[#00FF85] text-xs font-semibold tracking-widest uppercase">Education</span>
            <h2 className="text-2xl font-bold text-white mt-3 mb-4">Watch Arin Long's Clips</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6">Watch these in order on her 1House channel. This is your foundation before you touch a live chart.</p>
            <div className="space-y-3 mb-6">
              {ARIN_CLIPS.map(clip => (
                <div key={clip.n} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white/40 text-xs font-mono mb-1">{clip.n}</p>
                  <p className="text-white font-semibold text-sm">{clip.title}</p>
                  <p className="text-white/50 text-xs mt-1">{clip.desc}</p>
                </div>
              ))}
            </div>
            <a href="https://www.1house.tv" target="_blank" rel="noopener noreferrer" className="block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center">
              Open Arin's Channel on 1House →
            </a>
          </div>
        )}

        {step === 8 && (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-6">You are All Set.</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-8">You have got the apps, the broker, the community access, and the foundation. Welcome to The Greenprint — we will see you inside.</p>
            <a href="https://t.me/+Hz_sp0s32jVjNDQx" target="_blank" rel="noopener noreferrer" className="block w-full py-4 rounded-2xl bg-[#00FF85] text-black font-bold text-base text-center">
              Join the Telegram →
            </a>
          </div>
        )}

        <div className="flex gap-3 mt-12">
          <button onClick={prev} disabled={step === 1} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition">
            ← Back
          </button>
          <button onClick={next} disabled={step === TOTAL_STEPS} className="flex-1 py-3 rounded-xl bg-[#00FF85] text-black font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#00FF85]/80 transition">
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
