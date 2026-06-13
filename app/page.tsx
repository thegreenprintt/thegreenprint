"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";

/* ─── Constants ─────────────────────────────────────────────── */
const CALENDLY = "https://calendly.com/waltonjacob300/one-on-one-with-jacob";
const WHOP_URL = "https://whop.com"; // ← update with your real Whop link

/* ─── Fade-in helper ─────────────────────────────────────────── */
function FadeIn({
  children,
  delay = 0,
  className = "",
  y = 30,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Animated counter ───────────────────────────────────────── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (1800 / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─── Ticker ─────────────────────────────────────────────────── */
const TICKERS = [
  { sym: "SPY", price: "542.18", chg: "+1.24%" },
  { sym: "QQQ", price: "468.92", chg: "+1.87%" },
  { sym: "AAPL", price: "211.35", chg: "+0.73%" },
  { sym: "NVDA", price: "128.44", chg: "+3.21%" },
  { sym: "TSLA", price: "248.67", chg: "+2.15%" },
  { sym: "META", price: "524.88", chg: "+1.43%" },
  { sym: "MSFT", price: "438.12", chg: "+0.91%" },
  { sym: "AMZN", price: "198.45", chg: "+1.56%" },
  { sym: "GOOGL", price: "178.23", chg: "+1.12%" },
  { sym: "AMD", price: "165.77", chg: "+2.89%" },
];

function Ticker() {
  const items = [...TICKERS, ...TICKERS];
  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-[#0a0a0a] py-3">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {items.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm">
            <span className="font-bold text-white/70">{t.sym}</span>
            <span className="text-white/50">{t.price}</span>
            <span className="text-[#00FF85] font-semibold">{t.chg}</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Navigation ─────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#080808]/90 backdrop-blur-xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00FF85] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 12L6 7L9 10L13 4"
                stroke="#080808"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            The <span className="text-[#00FF85]">Greenprint</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "How It Works", href: "#how-it-works" },
            { label: "Programs", href: "#pricing" },
            { label: "Live Stream", href: "/stream" },
            { label: "Results", href: "#results" },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-white/60 hover:text-white text-sm transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href={CALENDLY}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2"
          >
            Book a Call
          </Link>
          <Link
            href={WHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm bg-[#00FF85] text-black font-bold px-5 py-2.5 rounded-full hover:bg-[#00e676] transition-all duration-200"
            style={{ boxShadow: "0 0 20px rgba(0,255,133,0.3)" }}
          >
            Join Now
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {menuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0d0d0d] border-t border-white/5 px-6 pb-6"
          >
            <div className="flex flex-col gap-4 pt-4">
              {[
                { label: "How It Works", href: "#how-it-works" },
                { label: "Programs", href: "#pricing" },
                { label: "Live Stream", href: "/stream" },
                { label: "Results", href: "#results" },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-white/60 text-sm hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={CALENDLY}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00FF85] text-sm font-semibold"
              >
                Book a Call
              </Link>
              <Link
                href={WHOP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#00FF85] text-black text-sm font-bold px-5 py-3 rounded-full text-center"
              >
                Join Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

/* ─── Hero ───────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-[#00FF85]/4 blur-[140px]" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-[#00FF85]/3 blur-[100px]" />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* Live badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8 flex items-center gap-2 bg-[#00FF85]/10 border border-[#00FF85]/20 rounded-full px-4 py-2"
      >
        <span className="w-2 h-2 rounded-full bg-[#00FF85] animate-pulse" />
        <span className="text-[#00FF85] text-sm font-medium">Live Trading Community · 2,400+ Members</span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center font-black leading-[0.9] tracking-tight px-4"
        style={{ fontSize: "clamp(56px, 10vw, 130px)" }}
      >
        <span className="block text-white">TRADE</span>
        <span
          className="block text-[#00FF85]"
          style={{ textShadow: "0 0 80px rgba(0,255,133,0.5)" }}
        >
          SMARTER.
        </span>
        <span className="block text-white">WIN BIGGER.</span>
      </motion.h1>

      {/* Sub */}
      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="mt-8 text-white/45 text-center max-w-xl px-6 text-lg leading-relaxed"
      >
        Real-time alerts, live streams, and proven setups from Jacob — the trading community built to put money in your pocket.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-4"
      >
        <Link
          href={WHOP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 bg-[#00FF85] text-black font-bold text-base px-8 py-4 rounded-full hover:bg-[#00e676] transition-all duration-200"
          style={{ boxShadow: "0 0 40px rgba(0,255,133,0.4)" }}
        >
          Get Access Now
          <svg
            className="w-4 h-4 group-hover:translate-x-1 transition-transform"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <Link
          href={CALENDLY}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-white/15 text-white font-semibold text-base px-8 py-4 rounded-full hover:border-white/30 hover:bg-white/5 transition-all duration-200"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Book a Free Call
        </Link>
      </motion.div>

      {/* Stat badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="mt-16 flex flex-wrap justify-center gap-3 px-4"
      >
        {[
          { label: "Active Members", value: "2,400+", color: "#00FF85" },
          { label: "Avg. Win Rate", value: "74%", color: "#C9A84C" },
          { label: "Live Sessions/Mo", value: "20+", color: "#00FF85" },
          { label: "Years Experience", value: "7+", color: "#C9A84C" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 + i * 0.1 }}
            className="bg-white/5 border border-white/8 rounded-2xl px-5 py-3 flex items-center gap-3"
          >
            <span className="font-black text-2xl" style={{ color: stat.color }}>
              {stat.value}
            </span>
            <span className="text-white/40 text-xs">{stat.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-white/20 text-xs tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent"
        />
      </motion.div>
    </section>
  );
}

/* ─── Stats ──────────────────────────────────────────────────── */
function Stats() {
  return (
    <section className="py-20 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { value: 2400, suffix: "+", label: "Members" },
          { value: 74, suffix: "%", label: "Avg Win Rate" },
          { value: 1200, suffix: "+", label: "Trades Shared" },
          { value: 7, suffix: "yrs", label: "Experience" },
        ].map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.1} className="text-center">
            <div
              className="text-5xl font-black mb-2"
              style={{ color: i % 2 === 0 ? "#00FF85" : "#C9A84C" }}
            >
              <Counter target={s.value} suffix={s.suffix} />
            </div>
            <div className="text-white/35 text-sm">{s.label}</div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

/* ─── How It Works ───────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Join The Community",
      desc: "Get instant access to the private Discord, live sessions, and the full Greenprint trading system.",
      icon: "🔐",
    },
    {
      num: "02",
      title: "Learn The System",
      desc: "Follow Jacob's exact strategy — entry signals, risk management, and setups that consistently produce.",
      icon: "📊",
    },
    {
      num: "03",
      title: "Receive Real-Time Alerts",
      desc: "Get notified the second Jacob spots a play. Never miss a move with live push notifications.",
      icon: "⚡",
    },
    {
      num: "04",
      title: "Stack The Wins",
      desc: "Execute with confidence and start building the trading account you've always wanted.",
      icon: "💰",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00FF85]/2 to-transparent pointer-events-none" />
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-[#00FF85] text-sm font-semibold tracking-widest uppercase">The Process</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3">
            How The Greenprint Works
          </h2>
          <p className="text-white/40 mt-4 max-w-lg mx-auto">
            A simple, repeatable system that turns market chaos into consistent profits.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, i) => (
            <FadeIn key={step.num} delay={i * 0.1}>
              <div className="group p-6 rounded-2xl border border-white/8 bg-white/3 hover:border-[#00FF85]/30 hover:bg-[#00FF85]/3 transition-all duration-300 h-full relative">
                <div className="text-3xl mb-4">{step.icon}</div>
                <div className="text-[#00FF85]/40 text-xs font-bold tracking-widest mb-2">{step.num}</div>
                <h3 className="text-white font-bold text-base mb-2">{step.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ───────────────────────────────────────────────── */
function Features() {
  const features = [
    {
      icon: "⚡",
      title: "Real-Time Alerts",
      desc: "Push alerts the second Jacob enters or exits. React before the crowd.",
      badge: "Live",
      badgeColor: "#00FF85",
    },
    {
      icon: "🎥",
      title: "Live Stream Sessions",
      desc: "Watch Jacob trade in real time — every click, every thesis, every exit.",
      badge: null,
      badgeColor: "#00FF85",
    },
    {
      icon: "🔍",
      title: "Options Scanner",
      desc: "AI-powered scanner surfaces unusual options flow before it moves the stock.",
      badge: "Pro",
      badgeColor: "#00FF85",
    },
    {
      icon: "👥",
      title: "Private Community",
      desc: "Curated Discord of serious traders. No noise — just setups, recaps, and wins.",
      badge: null,
      badgeColor: "#00FF85",
    },
    {
      icon: "📖",
      title: "Trading Playbook",
      desc: "The exact strategies, chart setups, and rules Jacob uses every single day.",
      badge: null,
      badgeColor: "#C9A84C",
    },
    {
      icon: "🛡️",
      title: "1-on-1 Mentorship",
      desc: "Elite members get direct access to Jacob for personalized coaching.",
      badge: "Elite",
      badgeColor: "#C9A84C",
    },
  ];

  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-[#00FF85] text-sm font-semibold tracking-widest uppercase">
            Everything You Need
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3">
            Built for Serious Traders
          </h2>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.08}>
              <div className="group p-6 rounded-2xl border border-white/8 bg-white/3 hover:border-white/15 transition-all duration-300 h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-3xl">{f.icon}</div>
                    {f.badge && (
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: `${f.badgeColor}18`,
                          color: f.badgeColor,
                          border: `1px solid ${f.badgeColor}30`,
                        }}
                      >
                        {f.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-base mb-2">{f.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Live Stream Callout ────────────────────────────────────── */
function LiveCallout() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#00FF85]/5 via-transparent to-[#C9A84C]/5 pointer-events-none" />
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div
            className="rounded-3xl p-10 md:p-16 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(0,255,133,0.06) 0%, rgba(0,0,0,0) 60%)",
              border: "1px solid rgba(0,255,133,0.2)",
            }}
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#00FF85]/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-red-500/15 border border-red-500/25 rounded-full px-3 py-1.5 mb-6">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 text-xs font-bold tracking-wide">LIVE SESSIONS</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
                  Watch Jacob Trade{" "}
                  <span className="text-[#00FF85]">In Real Time</span>
                </h2>
                <p className="text-white/45 text-lg leading-relaxed mb-8">
                  No more guessing. Get a front-row seat to live trades — entry, thesis, and exit — streamed directly to you.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href={WHOP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#00FF85] text-black font-bold px-7 py-3.5 rounded-full hover:bg-[#00e676] transition-all"
                    style={{ boxShadow: "0 0 30px rgba(0,255,133,0.3)" }}
                  >
                    Join to Watch Live
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                  <Link
                    href="/stream"
                    className="inline-flex items-center justify-center gap-2 border border-white/15 text-white font-semibold px-7 py-3.5 rounded-full hover:bg-white/5 transition-all"
                  >
                    Preview Stream
                  </Link>
                </div>
              </div>

              {/* Visual mockup */}
              <div className="relative">
                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] overflow-hidden">
                  <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="ml-2 text-white/20 text-xs">thegreenprint.trade/stream</span>
                  </div>
                  <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
                    <div className="w-16 h-16 rounded-2xl bg-[#00FF85]/10 border border-[#00FF85]/20 flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <polygon points="5,3 19,12 5,21" fill="#00FF85" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-white/60 text-sm font-semibold">Stream Active</span>
                      </div>
                      <p className="text-white/25 text-xs">Live when Jacob is trading</p>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {["NVDA", "TSLA", "SPY"].map((sym) => (
                        <span
                          key={sym}
                          className="bg-[#00FF85]/10 border border-[#00FF85]/20 text-[#00FF85] text-xs font-bold px-2.5 py-1 rounded-lg"
                        >
                          {sym}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute -inset-4 bg-[#00FF85]/5 rounded-3xl blur-2xl -z-10" />
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Pricing ────────────────────────────────────────────────── */
function Pricing() {
  const plans = [
    {
      name: "The Greenprint",
      price: "97",
      period: "/mo",
      desc: "Everything you need to start trading profitably.",
      color: "#00FF85",
      popular: false,
      cta: "Get Started",
      features: [
        "Real-time trade alerts",
        "Live stream access",
        "Private Discord community",
        "Weekly market breakdown",
        "Trading playbook PDF",
        "Mobile app access",
      ],
    },
    {
      name: "Elite",
      price: "197",
      period: "/mo",
      desc: "For traders serious about scaling up.",
      color: "#00FF85",
      popular: true,
      cta: "Get Elite Access",
      features: [
        "Everything in Greenprint",
        "Options flow scanner",
        "Priority alert notifications",
        "Monthly group Q&A call",
        "Advanced setups + watchlists",
        "Performance tracker",
        "Early access to new tools",
      ],
    },
    {
      name: "Inner Circle",
      price: "497",
      period: "/mo",
      desc: "Direct access to Jacob. For the top 1%.",
      color: "#C9A84C",
      popular: false,
      cta: "Apply Now",
      features: [
        "Everything in Elite",
        "Monthly 1-on-1 with Jacob",
        "Portfolio review sessions",
        "VIP Discord channel",
        "Custom trade plan",
        "First access to special plays",
        "Priority support",
      ],
    },
  ];

  return (
    <section id="pricing" className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-[#00FF85] text-sm font-semibold tracking-widest uppercase">Programs</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3">Choose Your Level</h2>
          <p className="text-white/40 mt-4 max-w-lg mx-auto">
            Every tier gives you real signals, real education, and a real community.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 0.12}>
              <div
                className={`relative rounded-2xl p-7 h-full flex flex-col ${
                  plan.popular
                    ? "border-2 border-[#00FF85]/50 bg-[#00FF85]/5"
                    : plan.color === "#C9A84C"
                    ? "border border-[#C9A84C]/20 bg-white/2"
                    : "border border-white/8 bg-white/2"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00FF85] text-black text-xs font-black px-4 py-1.5 rounded-full tracking-wide whitespace-nowrap">
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-6">
                  <div className="text-sm font-bold mb-1" style={{ color: plan.color }}>
                    {plan.name}
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-white/30 text-xl">$</span>
                    <span className="text-5xl font-black text-white">{plan.price}</span>
                    <span className="text-white/30 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-white/40 text-sm">{plan.desc}</p>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-white/65 text-sm">
                      <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" fill={plan.color} fillOpacity="0.12" />
                        <path
                          d="M5 8l2 2 4-4"
                          stroke={plan.color}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={WHOP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center font-bold py-3.5 rounded-xl transition-all duration-200 text-sm block"
                  style={
                    plan.popular
                      ? { background: "#00FF85", color: "#080808", boxShadow: "0 0 24px rgba(0,255,133,0.3)" }
                      : plan.color === "#C9A84C"
                      ? { background: "rgba(201,168,76,0.12)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }
                      : { background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.3} className="mt-8 text-center">
          <p className="text-white/30 text-sm">
            Not sure which plan fits?{" "}
            <Link
              href={CALENDLY}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00FF85] hover:underline"
            >
              Book a free 15-min call
            </Link>{" "}
            and we&apos;ll help you decide.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Testimonials ───────────────────────────────────────────── */
function Testimonials() {
  const testimonials = [
    {
      name: "Marcus T.",
      handle: "@marcust_trades",
      text: "Jacob's alerts are the real deal. I was down bad when I joined. Two months later I'm up 34% and finally understand what I'm doing.",
      gain: "+34%",
    },
    {
      name: "Aaliyah R.",
      handle: "@aaliyah_fx",
      text: "The live streams are worth every penny. Watching Jacob actually trade and explain his reasoning is something no YouTube video could teach me.",
      gain: "+$8,200",
    },
    {
      name: "Chris M.",
      handle: "@chrismoneymakerr",
      text: "I've been in 3 other Discord groups. The Greenprint is the only one where the alerts actually print. Jacob doesn't just talk — he delivers.",
      gain: "+61%",
    },
    {
      name: "Destiny W.",
      handle: "@destinywtrades",
      text: "Went from barely understanding options to making consistent gains every single week. The community alone is worth the price.",
      gain: "+$5,400",
    },
    {
      name: "Jordan P.",
      handle: "@jordanptrades",
      text: "The Inner Circle 1-on-1 calls with Jacob literally transformed how I approach every trade. Best investment I've made in myself.",
      gain: "+127%",
    },
    {
      name: "Tiana B.",
      handle: "@tianabinvests",
      text: "The scanner + alerts combo is scary good. I was late on so many plays before. Now I'm in before everyone else even hears about it.",
      gain: "+$11k",
    },
  ];

  return (
    <section id="results" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#C9A84C]/2 to-transparent pointer-events-none" />
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-[#C9A84C] text-sm font-semibold tracking-widest uppercase">Real Results</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3">Members Are Winning</h2>
          <p className="text-white/40 mt-4">Don&apos;t take our word for it — hear it from the community.</p>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <FadeIn key={t.handle} delay={i * 0.07}>
              <div className="p-6 rounded-2xl border border-white/8 bg-white/3 hover:border-white/15 transition-all duration-300 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-white font-bold text-sm">{t.name}</div>
                    <div className="text-white/30 text-xs">{t.handle}</div>
                  </div>
                  <div
                    className="font-black text-sm px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(0,255,133,0.1)", color: "#00FF85" }}
                  >
                    {t.gain}
                  </div>
                </div>
                <p className="text-white/50 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div className="flex gap-0.5 mt-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="#C9A84C">
                      <path d="M6 1l1.39 2.82 3.11.45-2.25 2.19.53 3.09L6 8.06 3.22 9.55l.53-3.09L1.5 4.27l3.11-.45z" />
                    </svg>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Book a Call ────────────────────────────────────────────── */
function BookACall() {
  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-6">
        <FadeIn>
          <div
            className="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(0,255,133,0.07) 0%, rgba(201,168,76,0.05) 100%)",
              border: "1px solid rgba(0,255,133,0.2)",
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#00FF85]/8 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-[#00FF85]/10 border border-[#00FF85]/20 rounded-full px-4 py-2 mb-6">
                <svg className="w-4 h-4 text-[#00FF85]" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-[#00FF85] text-sm font-medium">Free Strategy Call</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                Not Sure Where to Start?
                <br />
                <span className="text-[#00FF85]">Let&apos;s Talk.</span>
              </h2>
              <p className="text-white/45 text-lg mb-10 max-w-xl mx-auto">
                Book a free 15-minute call with Jacob. No pressure, no pitch — just an honest conversation about where you are and how The Greenprint can help.
              </p>
              <Link
                href={CALENDLY}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#00FF85] text-black font-black text-lg px-10 py-5 rounded-full hover:bg-[#00e676] transition-all duration-200"
                style={{ boxShadow: "0 0 50px rgba(0,255,133,0.4)" }}
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M7 2v3M13 2v3M3 8h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Book Your Free Call
              </Link>
              <p className="text-white/20 text-xs mt-5">No commitment. Spots fill fast.</p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-white/5 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#00FF85] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 12L6 7L9 10L13 4" stroke="#080808" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg">
                The <span className="text-[#00FF85]">Greenprint</span>
              </span>
            </div>
            <p className="text-white/30 text-sm leading-relaxed max-w-xs">
              The #1 trading community for real alerts, live streams, and consistent results.
            </p>
          </div>

          <div>
            <div className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-4">Platform</div>
            <ul className="space-y-2.5">
              {[
                { label: "Live Stream", href: "/stream" },
                { label: "Dashboard", href: "/dashboard" },
                { label: "Scanner", href: "/scanner" },
                { label: "Alerts", href: "/alerts" },
              ].map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-white/30 hover:text-white text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-4">Company</div>
            <ul className="space-y-2.5">
              {[
                { label: "Programs", href: "#pricing", ext: false },
                { label: "Book a Call", href: CALENDLY, ext: true },
                { label: "Join Now", href: WHOP_URL, ext: true },
                { label: "Login", href: "/login", ext: false },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    target={l.ext ? "_blank" : undefined}
                    rel={l.ext ? "noopener noreferrer" : undefined}
                    className="text-white/30 hover:text-white text-sm transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8">
          <p className="text-white/15 text-xs font-semibold mb-2 uppercase tracking-wide">Disclaimer</p>
          <p className="text-white/12 text-xs leading-relaxed mb-6">
            The Greenprint and its operators are not registered investment advisors. All content, alerts, and educational material are for informational purposes only and do not constitute financial advice. Trading stocks, options, and other securities involves substantial risk of loss and is not suitable for every investor. Past performance is not indicative of future results. You are solely responsible for your investment decisions. Never trade with money you cannot afford to lose. Always consult a qualified financial professional before making investment decisions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/15 text-xs">© {new Date().getFullYear()} The Greenprint. All rights reserved.</p>
            <div className="flex gap-6">
              {["Privacy Policy", "Terms of Service"].map((l) => (
                <Link key={l} href="#" className="text-white/15 hover:text-white/30 text-xs transition-colors">
                  {l}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Root ───────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <Nav />
      <Hero />
      <Ticker />
      <Stats />
      <HowItWorks />
      <Features />
      <LiveCallout />
      <Pricing />
      <Testimonials />
      <BookACall />
      <Footer />
    </main>
  );
}
