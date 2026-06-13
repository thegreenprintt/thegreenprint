"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// ── Animated scanner tickers in hero bg ──────────────────────────
const FAKE_TICKERS = [
  { sym: "AAPL", sig: "BREAKOUT", ch: "+2.1%", bull: true },
  { sym: "NVDA", sig: "MOMENTUM", ch: "+3.4%", bull: true },
  { sym: "TSLA", sig: "REVERSAL", ch: "-1.2%", bull: false },
  { sym: "AMD",  sig: "BREAKOUT", ch: "+4.7%", bull: true },
  { sym: "SPY",  sig: "SETUP",    ch: "+0.8%", bull: true },
  { sym: "QQQ",  sig: "MOMENTUM", ch: "+1.6%", bull: true },
  { sym: "AMZN", sig: "BREAKOUT", ch: "+2.9%", bull: true },
  { sym: "META", sig: "MOMENTUM", ch: "+3.1%", bull: true },
  { sym: "MSFT", sig: "SETUP",    ch: "+1.1%", bull: true },
];

function HeroScannerBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      <div className="absolute inset-0 opacity-[0.06]">
        <table className="w-full font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-border">
              {["TICKER","SIGNAL","CHANGE","VOL","TIME"].map(h => (
                <th key={h} className="px-4 py-2 text-left text-muted tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({length: 20}).map((_, i) => {
              const t = FAKE_TICKERS[i % FAKE_TICKERS.length];
              return (
                <tr key={i} className="border-b border-border/30">
                  <td className="px-4 py-2 text-text font-bold">{t.sym}</td>
                  <td className="px-4 py-2"><span className={`px-1.5 py-0.5 text-[9px] rounded ${
                    t.sig === "BREAKOUT" ? "bg-accent text-bg" :
                    t.sig === "MOMENTUM" ? "border border-accent text-accent" :
                    t.sig === "REVERSAL" ? "bg-red text-white" :
                    "border border-gold text-gold"
                  }`}>{t.sig}</span></td>
                  <td className={`px-4 py-2 ${t.bull ? "text-accent" : "text-red"}`}>{t.ch}</td>
                  <td className="px-4 py-2 text-muted">HI</td>
                  <td className="px-4 py-2 text-muted">{String(9+Math.floor(i/4)).padStart(2,"0")}:{String(i*3%60).padStart(2,"0")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-bg/60 via-bg/80 to-bg" />
    </div>
  );
}

// ── Ticker tape ───────────────────────────────────────────────────
const TAPE = ["SPY","NVDA","AAPL","TSLA","AMD","QQQ","AMZN","META","MSFT","GOOGL","SOFI","PLTR","COIN","MSTR","GLD"];

function TickerTape() {
  const items = [...TAPE, ...TAPE].map((sym, i) => ({
    sym,
    ch: (Math.random() * 5 - 1.5).toFixed(2),
    bull: Math.random() > 0.35,
    key: i,
  }));
  return (
    <div className="bg-surface border-y border-border overflow-hidden py-2.5" aria-hidden>
      <div className="ticker-inner flex whitespace-nowrap gap-8" style={{width: "200%"}}>
        {[...items, ...items].map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2 font-mono text-xs">
            <span className="text-text font-bold">{t.sym}</span>
            <span className={t.bull ? "text-accent" : "text-red"}>
              {t.bull ? "+" : ""}{t.ch}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Pricing tier data ─────────────────────────────────────────────
const TIERS = [
  {
    name: "Member",
    price: "$47",
    period: "/month",
    tagline: "Get in the room.",
    desc: "The foundation. Learn how Jay trades, follow daily setups, and get inside the community.",
    popular: false,
    gold: false,
    cta: "Get Started →",
    included: [
      "The Greenprint community (Telegram)",
      "Daily trade alerts before market open",
      "Daily watchlist from Jay",
      "Weekly live trading session (1x/week)",
      "Session replays (last 4 weeks)",
      "Onboarding guide + broker setup",
    ],
    locked: ["App access", "Scanner", "Pre-market breakdowns", "1-on-1 coaching"],
  },
  {
    name: "Trader",
    price: "$97",
    period: "/month",
    tagline: "Trade with the tools.",
    desc: "The full platform. Real-time scanner, app access, and daily live breakdowns.",
    popular: true,
    gold: true,
    cta: "Get Started →",
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
    locked: ["1-on-1 coaching", "Elite channel", "Portfolio review"],
  },
  {
    name: "Elite",
    price: "$297",
    period: "/month",
    tagline: "Direct access. No filter.",
    desc: "Jay's time. Limited to 20 members. Price locked forever once you're in.",
    popular: false,
    gold: true,
    elite: true,
    cta: "Apply for Elite →",
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

function CheckIcon({ gold }: { gold?: boolean }) {
  return (
    <svg className={`w-3.5 h-3.5 flex-shrink-0 ${gold ? "text-gold" : "text-accent"}`} fill="none" viewBox="0 0 14 14">
      <path d="M2 7l4 4 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.3}}>
      <Nav />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center bg-bg overflow-hidden">
        <HeroScannerBg />
        <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto pt-20">
          <motion.p
            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.1,duration:0.5}}
            className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted mb-8"
          >
            Est. 2025 — The Movement
          </motion.p>
          <motion.h1
            initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2,duration:0.5}}
            className="text-[40px] sm:text-[56px] lg:text-[72px] font-black leading-[1.05] tracking-tight text-text mb-6"
          >
            Build Wealth.<br />Own Your Future.
          </motion.h1>
          <motion.p
            initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3,duration:0.5}}
            className="text-base sm:text-lg text-muted max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Day trading, investing, and commercial real estate. The strategies and systems that
            create generational wealth. All in one place.
          </motion.p>
          <motion.div
            initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.4,duration:0.5}}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-14"
          >
            <Link href="/join"><Button size="lg">Access Mentorship →</Button></Link>
            <Link href="/stream"><Button size="lg" variant="ghost">Watch Live</Button></Link>
          </motion.div>
          {/* Stats */}
          <motion.div
            initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5,duration:0.5}}
            className="flex flex-wrap justify-center gap-8 sm:gap-12"
          >
            {[
              { val: "500+", label: "Students" },
              { val: "$847K+", label: "Volume" },
              { val: "85%", label: "Win Rate" },
              { val: "19", label: "Years Old & Building" },
            ].map(s => (
              <Link key={s.label} href="/earnings-disclaimer" className="text-center group">
                <div className="font-mono text-xl sm:text-2xl font-bold text-accent group-hover:text-accent/80 transition-colors">
                  {s.val}<span className="text-muted text-sm">*</span>
                </div>
                <div className="text-[11px] text-muted mt-0.5">{s.label}</div>
              </Link>
            ))}
          </motion.div>
        </div>
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg to-transparent" />
      </section>

      {/* ── TICKER TAPE ── */}
      <TickerTape />

      {/* ── WHAT WE DO ── */}
      <section id="what-we-do" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted mb-3">What We Do</p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text mb-12">The Full Picture.</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "📈", title: "Day Trading", body: "Stocks, options & futures. Real setups. Real results every session." },
            { icon: "💹", title: "Investing", body: "Long-term portfolio building through disciplined asset selection." },
            { icon: "🏦", title: "Commercial Loans", body: "Capital structured around your deal, not your W-2." },
            { icon: "🧠", title: "Mentorship", body: "Coached by someone who is actively doing it. Not just teaching it." },
          ].map((c, i) => (
            <motion.div key={c.title}
              initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
              transition={{delay:i*0.1,duration:0.4}}
            >
              <Card className="h-full hover:border-border/80 transition-colors">
                <div className="text-2xl mb-4">{c.icon}</div>
                <h3 className="font-semibold text-text mb-2">{c.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{c.body}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PROGRAMS / PRICING ── */}
      <section id="programs" className="py-24 px-4 sm:px-6 bg-surface/30">
        <div className="max-w-7xl mx-auto">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted mb-3">Programs</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text mb-4">Choose Your Level.</h2>
          <p className="text-muted mb-14 max-w-xl">
            Every tier includes live trading sessions with Jay. Pick the level of access that matches where you are.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-x-auto">
            {TIERS.map((tier, i) => (
              <motion.div key={tier.name}
                initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
                transition={{delay:i*0.12,duration:0.4}}
                className={`relative bg-surface rounded-card p-6 border flex flex-col ${
                  (tier as any).elite ? "border-gold/50" :
                  tier.popular ? "border-gold/30" :
                  "border-border"
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
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted mb-1">{tier.name}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className={`text-4xl font-black ${(tier as any).elite ? "text-gold" : "text-text"}`}>{tier.price}</span>
                    <span className="text-muted text-sm mb-1">{tier.period}</span>
                  </div>
                  <p className={`text-xs font-mono mb-2 ${(tier as any).elite ? "text-gold" : "text-accent"}`}>{tier.tagline}</p>
                  <p className="text-xs text-muted leading-relaxed">{tier.desc}</p>
                </div>

                <div className="space-y-2 mb-6 flex-1">
                  {tier.included.map(item => (
                    <div key={item} className="flex items-start gap-2.5">
                      <CheckIcon gold={(tier as any).elite} />
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
                  <Link href="/join">
                    <Button
                      variant={(tier as any).elite ? "gold" : "accent"}
                      fullWidth
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                  {(tier as any).spotsNote && (
                    <p className="text-[10px] text-gold/60 text-center mt-2 font-mono">{(tier as any).spotsNote}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-[10px] text-muted text-center mt-8 max-w-2xl mx-auto">
            Results not typical. Past performance is not indicative of future results.{" "}
            <Link href="/earnings-disclaimer" className="underline">See earnings disclaimer.</Link>{" "}
            All subscriptions auto-renew monthly. Cancel anytime from your dashboard.
          </p>
        </div>
      </section>

      {/* ── BOOK A CALL ── */}
      <section id="book-a-call" className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted mb-3">Book a Call</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text mb-12">
            Book a 1-on-1 Call with Us.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: "📞", title: "Discovery Call", body: "Free 15-min intro." },
              { icon: "📊", title: "Strategy Session", body: "Custom plan built around your exact goals." },
              { icon: "🎯", title: "Private Coaching", body: "Ongoing mentorship for serious members." },
            ].map((c, i) => (
              <motion.div key={c.title}
                initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
                transition={{delay:i*0.1,duration:0.4}}
              >
                <Card className="text-center hover:border-accent/20 transition-colors cursor-pointer group">
                  <div className="text-2xl mb-3">{c.icon}</div>
                  <h3 className="font-semibold text-text mb-2 group-hover:text-accent transition-colors">{c.title}</h3>
                  <p className="text-xs text-muted">{c.body}</p>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/join">
              <Button size="lg">Book a Call →</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── REAL ESTATE ── */}
      <section id="real-estate" className="py-24 px-4 sm:px-6 bg-surface/30">
        <div className="max-w-7xl mx-auto">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted mb-3">Real Estate</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text mb-4">
            Ready to Own Real Property?
          </h2>
          <p className="text-muted mb-2 max-w-2xl">Trading builds income. Real estate builds legacy.</p>
          <p className="text-sm text-muted mb-8 max-w-2xl leading-relaxed">
            Through our lending partner, access DSCR loans, fix & flip financing, SBA programs, and more
            — structured around your deal, not your W-2.
          </p>

          <div className="bg-surface border border-gold/20 rounded-card p-6 mb-10 max-w-xl">
            <p className="font-mono text-sm text-gold leading-relaxed">
              &ldquo;No W-2 required.<br />Same-day pre-qualification available.&rdquo;
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[
              { title: "Real Estate Investors", body: "Qualify on rental income, not tax returns." },
              { title: "Business Owners", body: "SBA and bank statement programs." },
              { title: "First-Time Investors", body: "Guided from product selection through closing." },
            ].map((c, i) => (
              <motion.div key={c.title}
                initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
                transition={{delay:i*0.1,duration:0.4}}
              >
                <Card>
                  <h3 className="font-semibold text-text mb-2 text-sm">{c.title}</h3>
                  <p className="text-xs text-muted">{c.body}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
            {[
              { num: "01", name: "DSCR Loans" },
              { num: "02", name: "Fix & Flip" },
              { num: "03", name: "Commercial RE" },
              { num: "04", name: "SBA 7(a) & 504" },
              { num: "05", name: "Cash-Out Refi" },
              { num: "06", name: "Hard Money & Bridge" },
            ].map(p => (
              <div key={p.num} className="bg-surface border border-border rounded-card p-4 text-center">
                <div className="font-mono text-xs text-muted mb-1">{p.num}</div>
                <div className="text-xs text-text font-medium leading-tight">{p.name}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10">
            {[
              { val: "38", label: "States" },
              { val: "8+", label: "Loan Programs" },
              { val: "21 Day", label: "Avg Close" },
              { val: "100%", label: "Business Purpose" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="font-mono text-2xl font-bold text-accent">{s.val}</div>
                <div className="text-xs text-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a href="https://equitynestcapital.com/contact.html" target="_blank" rel="noopener noreferrer">
              <Button size="lg">Start Application →</Button>
            </a>
            <a href="https://equitynestcapital.com/loans.html" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="ghost">View Loan Products</Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── FOUNDER ── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted mb-3">The Founder</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text mb-8">
            Real Experience. Real Results.
          </h2>
          <blockquote className="text-xl sm:text-2xl font-light text-text leading-relaxed mb-10 italic">
            &ldquo;I don&apos;t teach what I read. I teach what I&apos;ve done — and I&apos;m 19 doing it.&rdquo;
          </blockquote>
          <p className="text-sm text-muted leading-relaxed mb-4">
            The Greenprint wasn&apos;t built in a classroom. It was built in the market — through real
            trades, real losses, and real wins. No theory. No fluff.
          </p>
          <p className="text-sm text-muted leading-relaxed mb-10">
            From day trading to breaking into commercial lending — The Greenprint is a full ecosystem
            built for people who refuse to wait for permission to build wealth.
          </p>
          <Link href="/join">
            <Button size="lg">Join The Movement →</Button>
          </Link>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="members" className="py-24 px-4 sm:px-6 bg-surface/30">
        <div className="max-w-7xl mx-auto">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted mb-3">Members</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text mb-12">What They Said.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Marcus T.", tier: "Member",
                quote: "In 3 weeks I went from clueless to confidently executing my own trades. The alerts and live sessions changed everything for me."
              },
              {
                name: "Destiny R.", tier: "Member",
                quote: "Profitable in my first month. This is different — it&apos;s not just signals, it&apos;s real education that actually sticks with you."
              },
              {
                name: "Jordan K.", tier: "Private Member",
                quote: "Private coaching is worth every dollar. He walks you through his actual thought process on live trades. Nothing else compares."
              },
            ].map((t, i) => (
              <motion.div key={t.name}
                initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
                transition={{delay:i*0.1,duration:0.4}}
              >
                <Card className="flex flex-col h-full">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_,i) => (
                      <svg key={i} className="w-3 h-3 text-gold" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-muted leading-relaxed mb-4 flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <p className="text-xs font-semibold text-text">{t.name}</p>
                    <p className="text-[10px] text-muted">{t.tier}</p>
                    <p className="text-[10px] text-muted/60 mt-2 italic">
                      Results not typical. Individual outcomes vary.{" "}
                      <Link href="/earnings-disclaimer" className="underline">See full earnings disclaimer.</Link>
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text mb-6">
            Ready to Build Your Greenprint?
          </h2>
          <p className="text-muted mb-10 leading-relaxed">
            Stop watching others win. Get in the room. Start building. The only thing between you
            and financial freedom is the decision to start.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/join"><Button size="lg">Access Mentorship →</Button></Link>
            <Link href="/join"><Button size="lg" variant="ghost">Book a Free Call</Button></Link>
          </div>
        </div>
      </section>

      <Footer />
    </motion.div>
  );
}
