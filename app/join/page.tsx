"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ComplianceCheckbox } from "@/components/ui/ComplianceCheckbox";

const WHOP_CHECKOUT = "https://buy.stripe.com/6oUaEX2GtaRAgQ07P14gg00";
const ONEHOUSE_STREAM  = "https://subscribe.1houseglobal.com/jay";
const ONEHOUSE_STARTUP = "https://subscribe.1houseglobal.com/jay";

const TIERS = [
  {
    name: "???",
    price: "???", cents: "", period: "/month",
    tagline: "???",
    desc: "???",
    highlight: false,
    badge: "Coming Soon",
    badgeColor: "rgba(255,255,255,0.12)",
    cta: "Coming Soon",
    ctaStyle: "outline",
    url: null,
    comingSoon: true,
    included: ["???","???","???","???","???"],
    locked: [],
  },
  {
    name: "1House Global Stream",
    price: "\$99", cents: "", period: "/month",
    tagline: "Via our affiliate partner.",
    desc: "Unlimited access to 100+ expert creators across stocks, crypto, real estate, business, AI, and more.",
    highlight: false,
    badge: "Affiliate Partner",
    badgeColor: "rgba(255,255,255,0.2)",
    cta: "Subscribe via 1House \$99/mo",
    ctaStyle: "outline",
    url: ONEHOUSE_STREAM,
    comingSoon: false,
    included: [
      "Unlimited live stream access",
      "100+ expert creators",
      "Stocks, Crypto, Real Estate & more",
      "Day Trading & Options education",
      "E-commerce, AI & Business content",
      "On-demand replay library",
      "1House mobile app included",
      "Live stream alerts & notifications",
      "3-day money-back guarantee",
    ],
    locked: [],
  },
  {
    name: "1House Global Startup",
    price: "\$165", cents: "", period: "/month",
    tagline: "Via our affiliate partner.",
    desc: "Everything in Stream, plus tools to launch and grow your own creator business on the 1House platform.",
    highlight: false,
    badge: "Affiliate Partner",
    badgeColor: "rgba(255,255,255,0.2)",
    cta: "Apply for Startup",
    ctaStyle: "gold",
    url: ONEHOUSE_STARTUP,
    comingSoon: false,
    included: [
      "Everything in 1House Stream",
      "Launch your own creator platform",
      "Custom branded stream page",
      "Monetize your own audience",
      "1House creator dashboard",
      "Integrated payment & subscriptions",
      "Done-for-you setup support",
      "Access to founder community",
    ],
    locked: [],
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
    <div
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
          <div key={i} className="relative flex flex-col rounded-2xl p-7 border transition-all"
            style={{
              border: tier.highlight ? "2px solid #00FF85" : tier.ctaStyle === "gold" ? "1px solid rgba(201,168,76,0.25)" : "1px solid rgba(255,255,255,0.1)",
              background: tier.highlight ? "rgba(0,255,133,0.05)" : tier.ctaStyle === "gold" ? "rgba(201,168,76,0.03)" : "rgba(255,255,255,0.03)",
            }}>
            {/* Badge */}
            {tier.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-black text-xs font-black px-4 py-1.5 rounded-full tracking-wide whitespace-nowrap"
                style={{ background: "#00FF85" }}>
                {tier.badge}
              </div>
            )}
            {tier.affiliate && (
              <div className="mb-3">
                <span className="text-[10px] font-bold tracking-widest uppercase border px-2 py-0.5 rounded-full"
                  style={{ color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.12)" }}>
                  Affiliate Partner
                </span>
              </div>
            )}

            <p className="font-bold text-sm mb-1" style={{ color: tier.highlight ? "#00FF85" : tier.ctaStyle === "gold" ? "#C9A84C" : "rgba(255,255,255,0.55)" }}>
              {tier.name}
            </p>
            <div className="flex items-baseline gap-0.5 mb-1">
              <span className="text-xl" style={{ color: "rgba(255,255,255,0.3)" }}>$</span>
              <span className="text-6xl font-black text-white">{tier.price.replace("$","")}</span>
              {tier.cents && <span className="text-2xl font-black text-white">{tier.cents}</span>}
              <span className="text-sm ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>{tier.period}</span>
            </div>
            {tier.priceSub && <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{tier.priceSub}</p>}
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>{tier.desc}</p>

            <ul className="space-y-3 mb-8 flex-1">
              {tier.included.map((f: string) => (
                <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill={tier.highlight ? "#00FF85" : tier.ctaStyle === "gold" ? "#C9A84C" : "#6366f1"} fillOpacity="0.15"/>
                    <path d="M5 8l2 2 4-4" stroke={tier.highlight ? "#00FF85" : tier.ctaStyle === "gold" ? "#C9A84C" : "#818cf8"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <a href={tier.url} target="_blank" rel="noopener noreferrer"
              className="w-full text-center font-black py-4 rounded-xl text-sm block transition-all"
              style={tier.ctaStyle === "green"
                ? { background: "#00FF85", color: "#080808", boxShadow: "0 0 24px rgba(0,255,133,0.3)" }
                : tier.ctaStyle === "gold"
                ? { background: "rgba(201,168,76,0.12)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }
                : { background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.12)" }}>
              {tier.cta}
            </a>
            {tier.affiliate && (
              <p className="text-xs text-center mt-3" style={{ color: "rgba(255,255,255,0.2)" }}>Via our affiliate link at 1House Global.</p>
            )}
            {!tier.affiliate && (
              <p className="text-xs text-center mt-3" style={{ color: "rgba(255,255,255,0.2)" }}>Cancel anytime. Limited spots available.</p>
            )}
          </div>
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
          Payments processed securely via Stripe. Cancel anytime from your dashboard.{" "}
          <Link href="/refund-policy" className="underline">See Refund Policy</Link> for full details.
        </p>
      </div>
    </div>
  );
}{tier.comingSoon && (
                <div style={{position:"absolute",inset:0,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",background:"rgba(10,10,10,0.6)",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,borderRadius:"inherit"}}>
                  <span style={{fontSize:32}}>🔒</span>
                  <span style={{color:"rgba(255,255,255,0.5)",fontSize:13,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase"}}>Coming Soon</span>
                </div>
              )}
              
