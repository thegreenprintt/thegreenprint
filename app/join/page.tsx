"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ComplianceCheckbox } from "@/components/ui/ComplianceCheckbox";

const TIERS = [
  {
    name: "Member", price: "$47", period: "/month",
    tagline: "Get in the room.",
    desc: "The foundation. Learn how Jay trades, follow daily setups, and get inside the community.",
    popular: false, gold: false, elite: false,
    cta: "Get Started →",
    whopUrl: "https://whop.com/the-greenprint/",
    included: [
      "The Greenprint community (Telegram)",
      "Daily trade alerts before market open",
      "Daily watchlist from Jay",
      "Weekly live trading session (1x/week)",
      "Session replays (last 4 weeks)",
      "Onboarding guide + broker setup",
    ],
    locked: ["App access","Scanner","Pre-market breakdowns","1-on-1 coaching"],
  },
  {
    name: "Trader", price: "$97", period: "/month",
    tagline: "Trade with the tools.",
    desc: "The full platform. Real-time scanner, app access, and daily live breakdowns.",
    popular: true, gold: true, elite: false,
    cta: "Get Started →",
    whopUrl: "https://whop.com/the-greenprint/",
    included: [
      "Everything in Member",
      "Full app access (iOS + Android)",
      "Scanner — real-time signals",
      "Pre-market live breakdown (daily)",
      "2x live sessions per week",
      "Premium alerts channel",
      "Dedicated Trader Telegram channel",
      "Trade recap videos after close",
    ],
    locked: ["1-on-1 coaching","Elite channel","Portfolio review"],
  },
  {
    name: "Elite", price: "$297", period: "/month",
    tagline: "Direct access. No filter.",
    desc: "Jay's time. Limited to 20 members. Price locked forever once you're in.",
    popular: false, gold: true, elite: true,
    cta: "Apply for Elite →",
    whopUrl: "https://whop.com/the-greenprint/",
    included: [
      "Everything in Trader",
      "Monthly 45-min 1-on-1 with Jay",
      "Private Elite Telegram channel",
      "Real-time alerts (live as Jay takes them)",
      "Monthly portfolio review",
      "Direct DM access to Jay",
      "Early access to all new features",
      "Founding Elite badge",
      "Price locked forever",
    ],
    locked: [],
    spotsNote: "Limited to 20 members.",
  },
];

function Check({ gold }: { gold?: boolean }) {
  return (
    <svg className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${gold ? "text-gold" : "text-accent"}`} fill="none" viewBox="0 0 14 14">
      <path d="M2 7l4 4 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function JoinPage() {
  const [agreed, setAgreed] = useState(false);

  return (
    <motion.div
      initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.3}}
      className="min-h-screen bg-bg pb-24"
    >
      {/* Header */}
      <div className="text-center pt-16 pb-12 px-4">
        <Link href="/" className="inline-flex items-center gap-2 mb-10 group">
          <div className="w-7 h-7 bg-accent rounded flex items-center justify-center">
            <span className="text-bg font-black text-xs">GP</span>
          </div>
          <span className="font-bold text-sm tracking-widest uppercase text-text">The Greenprint</span>
        </Link>
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted mb-2">Choose Your Plan</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text mb-3">Get Access.</h1>
        <p className="text-muted max-w-md mx-auto text-sm">
          Every plan includes live sessions with Jay. Cancel anytime.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {TIERS.map((tier, i) => (
            <motion.div key={tier.name}
              initial={{opacity:0,y:30}} animate={{opacity:1,y:0}}
              transition={{delay:i*0.1,duration:0.4}}
              className={`relative bg-surface rounded-card p-6 border flex flex-col ${
                tier.elite ? "border-gold/50" :
                tier.popular ? "border-gold/30" : "border-border"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gold text-bg text-[10px] font-black px-3 py-1 rounded font-mono tracking-widest uppercase">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="mb-5">
                <p className="font-mono text-[10px] tracking-widest uppercase text-muted mb-1">{tier.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className={`text-4xl font-black ${tier.elite ? "text-gold" : "text-text"}`}>{tier.price}</span>
                  <span className="text-muted text-sm mb-1">{tier.period}</span>
                </div>
                <p className={`text-xs font-mono mb-2 ${tier.elite ? "text-gold" : "text-accent"}`}>{tier.tagline}</p>
                <p className="text-xs text-muted leading-relaxed">{tier.desc}</p>
              </div>
              <div className="space-y-2 mb-6 flex-1">
                {tier.included.map(item => (
                  <div key={item} className="flex items-start gap-2.5">
                    <Check gold={tier.elite} />
                    <span className="text-xs text-text leading-relaxed">{item}</span>
                  </div>
                ))}
                {tier.locked.map(item => (
                  <div key={item} className="flex items-start gap-2.5 opacity-30">
                    <span className="text-muted text-xs mt-0.5 flex-shrink-0">—</span>
                    <span className="text-xs text-muted">{item}</span>
                  </div>
                ))}
              </div>
              <div>
                <a href={agreed ? tier.whopUrl : undefined} target="_blank" rel="noopener noreferrer"
                  onClick={e => !agreed && e.preventDefault()}>
                  <Button
                    variant={tier.elite ? "gold" : "accent"}
                    fullWidth
                    disabled={!agreed}
                  >
                    {tier.cta}
                  </Button>
                </a>
                {tier.spotsNote && (
                  <p className="text-[10px] text-gold/60 text-center mt-2 font-mono">{tier.spotsNote}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Compliance checkbox */}
        <div className="bg-surface border border-border rounded-card p-5 mb-4 max-w-xl mx-auto">
          <ComplianceCheckbox onChange={setAgreed} />
        </div>
        {!agreed && (
          <p className="text-[10px] text-muted text-center mb-6">
            Please accept the terms above to enable checkout.
          </p>
        )}

        <p className="text-[10px] text-muted text-center max-w-lg mx-auto">
          Payments processed securely via Whop. Cancel anytime from your dashboard.{" "}
          <Link href="/refund-policy" className="underline">See Refund Policy</Link> for full details.
        </p>
      </div>
    </motion.div>
  );
}
