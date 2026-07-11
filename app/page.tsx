"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ─── Constants ─────────────────────────────────────────────────── */
const CALENDLY = "https://calendly.com/waltonjacob300/one-on-one-with-jacob";
const WHOP_URL = "https://buy.stripe.com/6oUaEX2GtaRAgQ07P14gg00";

/* ─── Cinematic Layer (visual only — no functionality) ─────────── */
function Cinematic() {
  const glowRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = glowRef.current;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let raf = 0;
    const move = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (el) el.style.transform = `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`;
      });
    };
    if (el && !coarse) window.addEventListener("mousemove", move);

    // scroll progress beam
    const bar = progressRef.current;
    let sraf = 0;
    const onScroll = () => {
      cancelAnimationFrame(sraf);
      sraf = requestAnimationFrame(() => {
        if (!bar) return;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // 3D tilt on .gp-card (desktop only)
    let tiltEl: HTMLElement | null = null;
    const tiltMove = (e: MouseEvent) => {
      const card = (e.target as HTMLElement)?.closest?.(".gp-card") as HTMLElement | null;
      if (tiltEl && tiltEl !== card) { tiltEl.style.transform = ""; tiltEl = null; }
      if (!card) return;
      tiltEl = card;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) translateY(-6px) scale(1.02)`;
    };
    const tiltLeave = () => { if (tiltEl) { tiltEl.style.transform = ""; tiltEl = null; } };
    if (!coarse) {
      document.addEventListener("mousemove", tiltMove, { passive: true });
      document.addEventListener("mouseleave", tiltLeave);
    }

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousemove", tiltMove);
      document.removeEventListener("mouseleave", tiltLeave);
      cancelAnimationFrame(raf); cancelAnimationFrame(sraf);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes gp-aurora { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-40px) scale(1.15)} 66%{transform:translate(-50px,30px) scale(0.92)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes gp-aurora2 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-70px,50px) scale(1.2)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes gp-gridpan { from{background-position:0 0} to{background-position:64px 64px} }
        @keyframes gp-rise { from{opacity:0; transform:translateY(28px); filter:blur(10px)} to{opacity:1; transform:translateY(0); filter:blur(0)} }
        @keyframes gp-shimmer { from{background-position:200% center} to{background-position:-200% center} }
        @keyframes gp-breathe { 0%,100%{box-shadow:0 0 28px rgba(0,255,133,0.30)} 50%{box-shadow:0 0 52px rgba(0,255,133,0.60), 0 0 90px rgba(0,255,133,0.18)} }
        @keyframes gp-floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes gp-scan { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }
        .gp-card { transition: transform .35s cubic-bezier(.2,.8,.3,1), box-shadow .35s ease, border-color .3s ease !important; will-change: transform; }
        .gp-card:hover { transform: translateY(-6px) scale(1.015); box-shadow: 0 18px 50px rgba(0,0,0,.5), 0 0 32px rgba(0,255,133,.10); }
        .gp-in { opacity:0; animation: gp-rise .9s cubic-bezier(.16,.8,.3,1) forwards; }
        .gp-shimmer-text {
          background: linear-gradient(110deg, #00FF85 35%, #d8ffe9 50%, #00FF85 65%);
          background-size: 250% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          animation: gp-shimmer 4.5s linear infinite;
        }
        .gp-breathe { animation: gp-breathe 3.2s ease-in-out infinite; }
        .gp-floaty { animation: gp-floaty 5s ease-in-out infinite; }
        .gp-in.gp-floaty { animation: gp-rise .9s cubic-bezier(.16,.8,.3,1) forwards, gp-floaty 5s ease-in-out 1.1s infinite; }
        .gp-in.gp-shimmer-text { animation: gp-rise .9s cubic-bezier(.16,.8,.3,1) forwards, gp-shimmer 4.5s linear 1.1s infinite; }
        .gp-tickertrack:hover { animation-play-state: paused !important; }
        .gp-input-glow:focus { border-color: rgba(0,255,133,.5) !important; box-shadow: 0 0 0 3px rgba(0,255,133,.12), 0 0 24px rgba(0,255,133,.15); }
        @keyframes gp-rotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .gp-conic { position: relative; }
        .gp-conic::before { content:""; position:absolute; inset:-60%; z-index:0; pointer-events:none;
          background: conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(0,255,133,.28) 330deg, transparent 360deg);
          animation: gp-rotate 7s linear infinite; }
        @media (max-width: 640px) { .gp-conic::before { display:none; } }
        @media (max-width: 640px) {
          .gp-in { animation-delay: 0s !important; animation-duration: .45s !important; }
          .gp-in.gp-floaty, .gp-in.gp-shimmer-text { animation-delay: 0s !important; }
          .gp-card:hover { transform: none; box-shadow: none; }
          [data-fadein] { opacity: 1 !important; transform: none !important; filter: none !important; transition: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gp-in, .gp-shimmer-text, .gp-breathe, .gp-floaty { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
      {/* fixed living background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} aria-hidden>
        <div className="hidden sm:block" style={{
          position: "absolute", top: "-15%", left: "-10%", width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,133,0.055) 0%, transparent 65%)",
          filter: "blur(50px)", animation: "gp-aurora 26s ease-in-out infinite",
        }}/>
        <div className="hidden sm:block" style={{
          position: "absolute", bottom: "-20%", right: "-12%", width: 800, height: 800, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 65%)",
          filter: "blur(60px)", animation: "gp-aurora2 32s ease-in-out infinite",
        }}/>
        <div className="hidden sm:block" style={{
          position: "absolute", top: "35%", right: "20%", width: 420, height: 420, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,133,0.035) 0%, transparent 65%)",
          filter: "blur(45px)", animation: "gp-aurora 22s ease-in-out infinite reverse",
        }}/>
        <div className="hidden md:block" style={{
          position: "absolute", inset: 0, opacity: 0.02,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "64px 64px", animation: "gp-gridpan 6s linear infinite",
        }}/>
      </div>
      {/* mouse spotlight (desktop) */}
      <div ref={glowRef} className="hidden lg:block fixed pointer-events-none" style={{
        zIndex: 0, top: 0, left: 0, width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,255,133,0.05) 0%, transparent 60%)",
        transition: "transform 0.18s ease-out",
      }} aria-hidden/>
      {/* scroll progress beam */}
      <div className="fixed top-0 left-0 right-0 pointer-events-none" style={{ zIndex: 60, height: 2 }} aria-hidden>
        <div ref={progressRef} style={{ height: "100%", width: "0%", background: "linear-gradient(90deg, #00cc6a, #00FF85)", boxShadow: "0 0 10px rgba(0,255,133,0.8), 0 0 24px rgba(0,255,133,0.35)", transition: "width 0.1s linear" }}/>
      </div>
    </>
  );
}

/* ─── Hero Canvas: live market constellation (visual only) ─────── */
function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const lite = w < 640;
    const P = Math.max(14, Math.min(lite ? 26 : 70, Math.floor(w / 18)));
    const pts = Array.from({ length: P }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.6,
    }));

    const CW = 26;
    const count = Math.ceil(w / CW) + 2;
    let price = h * 0.62;
    const newCandle = () => {
      const o = price;
      let c = o + (Math.random() - 0.42) * 34;
      c = Math.max(h * 0.35, Math.min(h * 0.88, c));
      price = c;
      return { o, c, hi: Math.max(o, c) + Math.random() * 16, lo: Math.min(o, c) - Math.random() * 16 };
    };
    const candles = Array.from({ length: count }, newCandle);
    let off = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const d = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
          if (d < 16900) {
            ctx.strokeStyle = `rgba(0,255,133,${(1 - d / 16900) * 0.10})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = "rgba(0,255,133,0.35)";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      }
      off -= 0.4;
      if (off <= -CW) { off += CW; candles.shift(); candles.push(newCandle()); }
      ctx.save();
      ctx.shadowBlur = lite ? 0 : 12;
      candles.forEach((cd, i) => {
        const x = i * CW + off;
        const up = cd.c <= cd.o;
        const col = up ? "#00FF85" : "#1f6f4a";
        ctx.shadowColor = col; ctx.strokeStyle = col; ctx.fillStyle = col;
        ctx.globalAlpha = 0.45;
        ctx.beginPath(); ctx.moveTo(x + CW / 2, cd.lo); ctx.lineTo(x + CW / 2, cd.hi); ctx.stroke();
        const top = Math.min(cd.o, cd.c);
        const hgt = Math.max(3, Math.abs(cd.o - cd.c));
        ctx.globalAlpha = up ? 0.4 : 0.28;
        ctx.fillRect(x + 5, top, CW - 10, hgt);
      });
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.5 }} aria-hidden />;
}

/* ─── Helpers ───────────────────────────────────────────────────── */
function FadeIn({
  children,
  delay = 0,
  className = "",
  y = 15,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { rootMargin: "-60px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      data-fadein=""
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "none" : `translateY(${y + 10}px) scale(0.985)`,
        filter: vis ? "blur(0)" : "blur(8px)",
        transition: `opacity 0.8s cubic-bezier(.16,.8,.3,1) ${delay}s, transform 0.8s cubic-bezier(.16,.8,.3,1) ${delay}s, filter 0.8s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: "0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!inView) return;
    let n = 0;
    const step = target / (1800 / 16);
    const t = setInterval(() => {
      n += step;
      if (n >= target) { setCount(target); clearInterval(t); }
      else setCount(Math.floor(n));
    }, 16);
    return () => clearInterval(t);
  }, [inView, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── Ticker ────────────────────────────────────────────────────── */
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
      <style>{`@keyframes gp-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div
        className="gp-tickertrack flex gap-12 whitespace-nowrap"
        style={{ animation: "gp-ticker 30s linear infinite", display: "flex" }}
      >
        {items.map((t, i) => (
          <span key={i} className="text-xs font-mono text-white/40 shrink-0">
            <span className="text-white/70 font-bold mr-1">{t.sym}</span>
            {t.price}
            <span className={t.chg.startsWith("+") ? "text-emerald-400 ml-1" : "text-red-400 ml-1"}>{t.chg}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Nav ───────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#080808]/90 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
      }`}
      style={{ animation: "gp-slideDown 0.6s cubic-bezier(0.22,1,0.36,1) forwards" }}
    >
      <style>{`@keyframes gp-slideDown{from{transform:translateY(-80px)}to{transform:translateY(0)}}`}</style>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00FF85] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 12L6 7L9 10L13 4" stroke="#080808" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            The <span className="text-[#00FF85]">Greenprint</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "How It Works", href: "#how-it-works" },
            { label: "Programs", href: "#pricing" },
            { label: "Watch Live", href: "/stream" },
            { label: "Results", href: "#results" },
          ].map(l => (
            <Link key={l.label} href={l.href}
              className="text-white/60 hover:text-white text-sm transition-colors duration-200">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href={CALENDLY} target="_blank" rel="noopener noreferrer"
            className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2">
            Book a Call
          </Link>
          <Link href="/join" target="_blank" rel="noopener noreferrer"
            className="text-sm bg-[#00FF85] text-black font-bold px-5 py-2.5 rounded-full hover:bg-[#00e676] transition-all"
            style={{ boxShadow: "0 0 20px rgba(0,255,133,0.3)" }}>
            Join Now
          </Link>
        </div>

        <button className="md:hidden text-white p-2" onClick={() => setOpen(!open)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M18 6L6 18M6 6l12 12"/> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#0d0d0d] border-t border-white/5 px-6 pb-6">
          <div className="flex flex-col gap-4 pt-4">
            {[
              { label: "How It Works", href: "#how-it-works" },
              { label: "Programs", href: "#pricing" },
              { label: "Watch Live", href: "/stream" },
              { label: "Results", href: "#results" },
            ].map(l => (
              <Link key={l.label} href={l.href} onClick={() => setOpen(false)}
                className="text-white/60 text-sm hover:text-white">
                {l.label}
              </Link>
            ))}
            <Link href={CALENDLY} target="_blank" rel="noopener noreferrer"
              className="text-[#00FF85] text-sm font-semibold">Book a Call</Link>
            
        </div>
          </div>
        )}
      </nav>
    );
  }

/* ─── Hero ──────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-[75vh] sm:min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 pb-10 sm:pb-16">
      {/* Background hidden on mobile for performance */}
      <div className="absolute inset-0 pointer-events-none hidden sm:block">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-[#00FF85]/4 blur-[140px]"/>
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-[#00FF85]/3 blur-[100px]"/>
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>
      <div className="absolute inset-0 pointer-events-none sm:hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-[#00FF85]/5 blur-[80px]"/>
      </div>
      <HeroCanvas />

      <div className="gp-in gp-floaty mb-5 sm:mb-8 flex items-center gap-2 bg-[#00FF85]/10 border border-[#00FF85]/20 rounded-full px-3 py-1.5 sm:px-4 sm:py-2" style={{ animationDelay: "0.1s, 1s" }}>
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#00FF85] animate-pulse"/>
        <span className="text-[#00FF85] text-xs sm:text-sm font-medium">Live Trading Community &middot; 2,400+ Members</span>
      </div>

      <h1
        className="text-center font-black leading-[0.88] tracking-tight px-4"
        style={{ fontSize: "clamp(44px, 9vw, 130px)" }}
      >
        <span className="gp-in block text-white" style={{ animationDelay: "0.2s" }}>TRADE</span>
        <span className="gp-in gp-shimmer-text block" style={{ animationDelay: "0.38s", textShadow: "none", filter: "drop-shadow(0 0 40px rgba(0,255,133,0.45))" }}>
          SMARTER.
        </span>
        <span className="gp-in block text-white" style={{ animationDelay: "0.56s" }}>WIN BIGGER.</span>
      </h1>

      <p className="gp-in mt-5 sm:mt-8 text-white/45 text-center max-w-sm sm:max-w-xl px-6 text-sm sm:text-lg leading-relaxed" style={{ animationDelay: "0.75s" }}>
        Real-time trade alerts, live sessions, and a proven system &ndash; built to help you level up.
      </p>

      <div className="gp-in mt-7 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto" style={{ animationDelay: "0.9s" }}>
        <Link href="/join"
          className="gp-breathe group inline-flex items-center gap-2 bg-[#00FF85] text-black font-bold text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 rounded-full hover:bg-[#00e676] transition-all w-full sm:w-auto justify-center"
          style={{ boxShadow: "0 0 32px rgba(0,255,133,0.35)" }}>
          Get Access
          <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
<Link href="/stream"
          className="inline-flex items-center gap-1.5 border border-white/15 text-white font-semibold text-sm sm:text-base px-5 sm:px-8 py-3 sm:py-4 rounded-full hover:border-white/30 hover:bg-white/5 transition-all w-full sm:w-auto justify-center">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <polygon points="6.5,5.5 11,8 6.5,10.5" fill="currentColor"/>
          </svg>
          Watch Free
        </Link>
      </div>

      <div className="gp-in mt-10 sm:mt-16 flex flex-wrap justify-center gap-2 sm:gap-3 px-4" style={{ animationDelay: "1.05s" }}>
        {[
          { label: "Active Members", value: "2,400+", color: "#00FF85" },
          { label: "Live Sessions/Mo", value: "20+", color: "#C9A84C" },
          { label: "Years Experience", value: "4+", color: "#00FF85", hideOnMobile: true },
        ].map((stat) => (
          <div key={stat.label}
            className={`bg-white/5 border border-white/8 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3${stat.hideOnMobile ? " hidden sm:flex" : ""}`}>
            <span className="font-black text-lg sm:text-2xl" style={{ color: stat.color }}>{stat.value}</span>
            <span className="text-white/40 text-xs">{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Stats ─────────────────────────────────────────────────────── */
function Stats() {
  return (
    <section className="py-20 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { value: 2400, suffix: "+", label: "Members" },
          { value: 20, suffix: "+", label: "Live Sessions/Mo" },
          { value: 1200, suffix: "+", label: "Trade Alerts Sent" },
          { value: 4, suffix: "yrs", label: "Market Experience" },
        ].map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.1} className="text-center">
            <div className="text-5xl font-black mb-2"
              style={{ color: i % 2 === 0 ? "#00FF85" : "#C9A84C" }}>
              <Counter target={s.value} suffix={s.suffix}/>
            </div>
            <div className="text-white/35 text-sm">{s.label}</div>
          </FadeIn>
        ))}
      </div>
      <FadeIn className="mt-4 text-center">
        <p className="text-white/20 text-xs max-w-lg mx-auto px-4">
          For educational purposes only. Past results are not indicative of future performance. Trading involves substantial risk of loss.
        </p>
      </FadeIn>
    </section>
  );
}

/* ─── How It Works ──────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { num: "01", title: "Join The Community", icon: "\u{1F4F1}",
      desc: "Get instant access to the private Discord, live sessions, and the full Greenprint educational system." },
    { num: "02", title: "Learn The System", icon: "\u{1F4C8}",
      desc: "Study The Greenprint's approach – entry signals, risk management, and setups that have stood the test of time." },
    { num: "03", title: "Receive Real-Time Alerts", icon: "⚡",
      desc: "Get notified the second a setup is spotted. Follow along with live commentary and rationale for every alert." },
    { num: "04", title: "Apply What You Learn", icon: "\u{1F4B0}",
      desc: "Take what you've learned and execute with a plan. Track your growth and refine your strategy over time." },
  ];

  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00FF85]/2 to-transparent pointer-events-none"/>
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-[#00FF85] text-sm font-semibold tracking-widest uppercase">The Process</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3">How The Greenprint Works</h2>
          <p className="text-white/40 mt-4 max-w-lg mx-auto">
            A structured educational system designed to help you develop real trading skills.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, i) => (
            <FadeIn key={step.num} delay={i * 0.1}>
              <div className="gp-card group p-6 rounded-2xl border border-white/8 bg-white/3 hover:border-[#00FF85]/30 hover:bg-[#00FF85]/3 transition-all duration-300 h-full">
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

/* ─── Features ──────────────────────────────────────────────────── */
function Features() {
  const features = [
    { icon: "⚡", title: "Real-Time Alerts", badge: "Live", badgeColor: "#00FF85",
      desc: "Push alerts the moment a setup is identified, with full context on the reasoning behind it." },
    { icon: "\u{1F3A5}", title: "Live Stream Sessions", badge: null, badgeColor: "#00FF85",
      desc: "Watch The Greenprint trade in real time – entry, thesis, and exit streamed directly to you." },
    { icon: "\u{1F4CA}", title: "Options Scanner", badge: "Pro", badgeColor: "#00FF85",
      desc: "Scan for unusual options flow and spot potential moves before they develop." },
    { icon: "\u{1F525}", title: "Private Community", badge: null, badgeColor: "#00FF85",
      desc: "A members-only Discord focused on education, setups, and accountability – no noise." },
    { icon: "\u{1F4DA}", title: "Trading Playbook", badge: null, badgeColor: "#C9A84C",
      desc: "The exact frameworks, chart setups, and decision rules used in The Greenprint system." },
    { icon: "\u{1F6E1}️", title: "1-on-1 Coaching", badge: "Elite", badgeColor: "#C9A84C",
      desc: "Elite members get direct coaching sessions tailored to their personal trading goals." },
  ];

  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-[#00FF85] text-sm font-semibold tracking-widest uppercase">Everything You Need</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3">Built for Serious Traders</h2>
        </FadeIn>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.08}>
              <div className="gp-card group p-6 rounded-2xl border border-white/8 bg-white/3 hover:border-white/15 transition-all duration-300 h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-3xl">{f.icon}</div>
                    {f.badge && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: `${f.badgeColor}18`, color: f.badgeColor, border: `1px solid ${f.badgeColor}30` }}>
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

/* ─── Live Stream Callout ───────────────────────────────────────── */
function LiveCallout() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#00FF85]/5 via-transparent to-[#C9A84C]/5 pointer-events-none"/>
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="rounded-3xl p-10 md:p-16 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(0,255,133,0.06) 0%, rgba(0,0,0,0) 60%)", border: "1px solid rgba(0,255,133,0.2)" }}>
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#00FF85]/5 rounded-full blur-[80px] pointer-events-none"/>
            <div className="relative grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-red-500/15 border border-red-500/25 rounded-full px-3 py-1.5 mb-6">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
                  <span className="text-red-400 text-xs font-bold tracking-wide">LIVE SESSIONS</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
                  Watch The Greenprint Trade{" "}
                  <span className="text-[#00FF85]">In Real Time</span>
                </h2>
                <p className="text-white/45 text-lg leading-relaxed mb-8">
                  Subscribe free and get a front-row seat to live sessions &ndash; entry, thesis, and exit streamed directly to members on the web and mobile app.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/stream"
                    className="inline-flex items-center justify-center gap-2 bg-[#00FF85] text-black font-bold px-7 py-3.5 rounded-full hover:bg-[#00e676] transition-all"
                    style={{ boxShadow: "0 0 30px rgba(0,255,133,0.3)" }}>
                    Watch Now &ndash; Free
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                  <Link href="/join" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 border border-white/15 text-white font-semibold px-7 py-3.5 rounded-full hover:bg-white/5 transition-all">
                    Join the Community
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] overflow-hidden">
                  <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"/>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"/>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"/>
                    <span className="ml-2 text-white/20 text-xs">thegreenprint.trade/stream</span>
                  </div>
                  <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
                    <div className="w-16 h-16 rounded-2xl bg-[#00FF85]/10 border border-[#00FF85]/20 flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <polygon points="5,3 19,12 5,21" fill="#00FF85"/>
                      </svg>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
                        <span className="text-white/60 text-sm font-semibold">Stream Active</span>
                      </div>
                      <p className="text-white/25 text-xs">Broadcasts live to web + mobile app</p>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {["NVDA", "TSLA", "SPY"].map(sym => (
                        <span key={sym} className="bg-[#00FF85]/10 border border-[#00FF85]/20 text-[#00FF85] text-xs font-bold px-2.5 py-1 rounded-lg">
                          {sym}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute -inset-4 bg-[#00FF85]/5 rounded-3xl blur-2xl -z-10"/>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Pricing ───────────────────────────────────────────────────── */
const WHOP_CHECKOUT = "https://buy.stripe.com/6oUaEX2GtaRAgQ07P14gg00";
const ONEHOUSE_REF = "https://subscribe.1houseglobal.com/jay";

function Check({ color }: { color: string }) {
  return (
    <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill={color} fillOpacity="0.12"/>
      <path d="M5 8l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-[#00FF85] text-sm font-semibold tracking-widest uppercase">Programs</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3">Choose Your Level</h2>
          <p className="text-white/40 mt-4 max-w-lg mx-auto">
            Start with The Greenprint or level up with our partner platform 1House Global &ndash; everything you need is right here.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-5 items-start">

                    <FadeIn delay={0.08}>
            <div className="relative flex flex-col rounded-2xl p-7 border transition-all"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                filter: "blur(6px)",
                pointerEvents: "none",
                userSelect: "none",
              }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10" style={{filter:"none"}}>
                <span className="text-[10px] font-black px-3 py-1 rounded font-mono tracking-widest uppercase"
                  style={{background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.15)"}}>
                  Coming Soon
                </span>
              </div>
              <div className="mb-5">
                <p className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{color:"rgba(255,255,255,0.3)"}}>???</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-white/30 text-xl">$</span>
                  <span className="text-6xl font-black text-white">???</span>
                  <span className="text-white/30 text-sm">/month</span>
                </div>
                <p className="text-sm mb-6" style={{color:"rgba(255,255,255,0.3)"}}>??? ??? ??? ??? ???</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {["???","???","???","???","???"].map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <span className="text-white/20 text-xs mt-1">—</span>
                    <span className="text-xs" style={{color:"rgba(255,255,255,0.2)"}}>???</span>
                  </li>
                ))}
              </ul>
              <button disabled className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide"
                style={{background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.08)",cursor:"not-allowed"}}>
                🔒 Coming Soon
              </button>
            </div>
          </FadeIn>
<FadeIn delay={0.12}>
            <div className="gp-card relative rounded-2xl p-7 flex flex-col border border-white/10 bg-white/3">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/30 border border-white/10 px-2 py-0.5 rounded-full">
                  Affiliate Partner
                </span>
              </div>

              <div className="text-white/70 text-sm font-bold mb-1">1House Global &ndash; Stream</div>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-white/30 text-xl">$</span>
                <span className="text-6xl font-black text-white">99</span>
                <span className="text-white/30 text-sm">/mo</span>
              </div>
              <p className="text-white/40 text-sm mb-6">
                Unlimited access to 100+ expert creators across stocks, crypto, real estate, business, AI, and more &ndash; all on one platform.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited live stream access",
                  "100+ expert creators",
                  "Stocks, Crypto, Real Estate & more",
                  "Day Trading & Options education",
                  "E-commerce, AI & Business content",
                  "On-demand replay library",
                  "1House mobile app included",
                  "Live stream alerts & notifications",
                  "Inner Circle creator access",
                  "3-day money-back guarantee",
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-white/60 text-sm">
                    <Check color="#6366f1"/>
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={ONEHOUSE_REF} target="_blank" rel="noopener noreferrer"
                className="w-full text-center font-bold py-4 rounded-xl text-sm block transition-all hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.12)" }}>
                Subscribe via 1House &ndash; $99/mo
              </Link>
              <p className="text-white/20 text-xs text-center mt-3">
                Via our affiliate link at 1House Global.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.24}>
            <div className="gp-card relative rounded-2xl p-7 flex flex-col border border-[#C9A84C]/25 bg-[#C9A84C]/3">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/30 border border-white/10 px-2 py-0.5 rounded-full">
                  Affiliate Partner
                </span>
              </div>

              <div className="text-[#C9A84C] text-sm font-bold mb-1">1House Global &ndash; Startup</div>

              <div className="mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-white/30 text-lg">$</span>
                  <span className="text-5xl font-black text-white">200</span>
                  <span className="text-white/40 text-sm ml-1">startup fee</span>
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-[#C9A84C] font-bold text-lg">+</span>
                  <span className="text-[#C9A84C] font-black text-2xl">$165</span>
                  <span className="text-white/30 text-sm">/mo after</span>
                </div>
              </div>

              <p className="text-white/40 text-sm mb-6 mt-3">
                Everything in Stream, plus the ability to host your own content, build a subscriber base, and earn on the 1House platform.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  "Everything in 1House Stream",
                  "Launch your own channel on 1House",
                  "Monetize your content & community",
                  "Creator dashboard & analytics",
                  "Host live streams to 1House members",
                  "Build your subscriber base",
                  "Access to creator support team",
                  "Business & marketing education",
                  "1House Startup community access",
                  "3-day money-back guarantee",
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-white/60 text-sm">
                    <Check color="#C9A84C"/>
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={ONEHOUSE_REF} target="_blank" rel="noopener noreferrer"
                className="w-full text-center font-bold py-4 rounded-xl text-sm block transition-all hover:bg-[#C9A84C]/20"
                style={{ background: "rgba(201,168,76,0.10)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}>
                Get 1House Startup
              </Link>
              <p className="text-white/20 text-xs text-center mt-3">
                Via our affiliate link at 1House Global.
              </p>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.3} className="mt-10 text-center">
          <p className="text-white/25 text-xs max-w-xl mx-auto">
            The 1House Global plans are offered through our affiliate partnership. Clicking those links may earn The Greenprint a referral commission at no extra cost to you. 1House plan details and pricing are set by 1House Global.
          </p>
          <p className="text-white/30 text-sm mt-4">
            Not sure which plan is right for you?{" "}
            <Link href={CALENDLY} target="_blank" rel="noopener noreferrer" className="text-[#00FF85] hover:underline">
              Book a free call
            </Link>{" "}
            and we&apos;ll help you decide.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Testimonials ──────────────────────────────────────────────── */
function Testimonials() {
  const testimonials = [
    { name: "Marcus T.", handle: "@marcust_trades", gain: "+34%",
      text: "The Greenprint alerts are the real deal. I was down bad when I joined. Two months later I'm up and finally understand what I'm doing in the market." },
    { name: "Aaliyah R.", handle: "@aaliyah_fx", gain: "+$8,200",
      text: "The live streams are worth every penny. Watching the trades happen in real time and hearing the reasoning is something no YouTube video could teach me." },
    { name: "Chris M.", handle: "@chrismoneymakerr", gain: "+61%",
      text: "I've been in 3 other Discord trading groups. The Greenprint is the only one where the content actually makes sense and the community is engaged." },
    { name: "Destiny W.", handle: "@destinywtrades", gain: "+$5,400",
      text: "Went from barely understanding options to actually having a process every single week. The community alone is worth the price." },
    { name: "Jordan P.", handle: "@jordanptrades", gain: "+127%",
      text: "The Inner Circle coaching sessions literally transformed how I approach every trade. Best investment I've made in my trading education." },
    { name: "Tiana B.", handle: "@tianabinvests", gain: "+$11k",
      text: "The scanner + alerts combo is incredible. I understand the setups now instead of just copying blindly. That made all the difference." },
  ];

  return (
    <section id="results" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#C9A84C]/2 to-transparent pointer-events-none"/>
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-[#C9A84C] text-sm font-semibold tracking-widest uppercase">Member Experiences</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3">The Community Is Growing</h2>
          <p className="text-white/40 mt-4">Real feedback from The Greenprint community.</p>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <FadeIn key={t.handle} delay={i * 0.07}>
              <div className="gp-card p-6 rounded-2xl border border-white/8 bg-white/3 hover:border-white/15 transition-all duration-300 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-white font-bold text-sm">{t.name}</div>
                    <div className="text-white/30 text-xs">{t.handle}</div>
                  </div>
                  <div className="font-black text-sm px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(0,255,133,0.1)", color: "#00FF85" }}>
                    {t.gain}
                  </div>
                </div>
                <p className="text-white/50 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div className="flex gap-0.5 mt-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="#C9A84C">
                      <path d="M6 1l1.39 2.82 3.11.45-2.25 2.19.53 3.09L6 8.06 3.22 9.55l.53-3.09L1.5 4.27l3.11-.45z"/>
                    </svg>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.2} className="mt-8 text-center">
          <p className="text-white/20 text-xs max-w-2xl mx-auto px-4">
            * Results shown are self-reported by community members and are not typical. Individual results vary significantly based on experience, capital, market conditions, and risk management. These testimonials are for educational illustration only and do not constitute a promise or guarantee of similar results.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Book a Call ───────────────────────────────────────────────── */
function MemberAccess() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  function handleSubmit(e: any) {
    e.preventDefault();
    if (pw === 'legacy') {
      window.location.href = '/onboard';
    } else {
      setErr(true);
      setTimeout(() => setErr(false), 2000);
    }
  }
  return (
    <section id="member-access" className="py-24 px-6 border-t border-white/5">
      <div className="max-w-md mx-auto text-center">
        <span className="text-[#00FF85] text-sm font-semibold tracking-widest uppercase">Member Access</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4">Already Enrolled?</h2>
        <p className="text-white/50 mb-10">Enter your access code to begin your onboarding.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setErr(false); }}
            placeholder="Enter access code"
            className="gp-input-glow w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none text-center text-lg tracking-widest transition-all duration-300"
          />
          {err && <p className="text-red-400 text-sm mt-1">Incorrect access code.</p>}
          <button type="submit" className="gp-breathe w-full py-4 rounded-xl bg-[#00FF85] text-black font-bold text-base hover:bg-[#00e676] transition-colors">
            Get Started →
          </button>
        </form>
      </div>
    </section>
  );
}
function BookACall() {
  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-6">
        <FadeIn>
          <div className="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(0,255,133,0.07) 0%, rgba(201,168,76,0.05) 100%)", border: "1px solid rgba(0,255,133,0.2)" }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#00FF85]/8 rounded-full blur-[80px] pointer-events-none"/>
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-[#00FF85]/10 border border-[#00FF85]/20 rounded-full px-4 py-2 mb-6">
                <svg className="w-4 h-4 text-[#00FF85]" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="text-[#00FF85] text-sm font-medium">Free Strategy Call</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                Not Sure Where to Start?
                <br/><span className="text-[#00FF85]">Let&apos;s Talk.</span>
              </h2>
              <p className="text-white/45 text-lg mb-10 max-w-xl mx-auto">
                Book a free 15-minute call with The Greenprint team. No pressure, no pitch &ndash; just an honest conversation about where you are and how we can help.
              </p>
              <Link href={CALENDLY} target="_blank" rel="noopener noreferrer"
                className="gp-breathe inline-flex items-center gap-3 bg-[#00FF85] text-black font-black text-lg px-10 py-5 rounded-full hover:bg-[#00e676] transition-all"
                style={{ boxShadow: "0 0 50px rgba(0,255,133,0.4)" }}>
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M7 2v3M13 2v3M3 8h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
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

/* ─── Footer ────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-white/5 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#00FF85] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 12L6 7L9 10L13 4" stroke="#080808" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-white font-bold text-lg">
                The <span className="text-[#00FF85]">Greenprint</span>
              </span>
            </div>
            <p className="text-white/30 text-sm leading-relaxed max-w-xs">
              A trading education community built around real-time sessions, alerts, and a proven learning system.
            </p>
          </div>

          <div>
            <div className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-4">Platform</div>
            <ul className="space-y-2.5">
              {[
                { label: "Watch Live", href: "/stream" },
                { label: "Dashboard", href: "/dashboard" },
                { label: "Scanner", href: "/scanner" },
                { label: "Alerts", href: "/alerts" },
              ].map(l => (
                <li key={l.label}>
                  <Link href={l.href} className="text-white/30 hover:text-white text-sm transition-colors">{l.label}</Link>
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
                { label: "Join Now", href: "/join", ext: true },
                { label: "Login", href: "/login", ext: false },
              ].map(l => (
                <li key={l.label}>
                  <Link href={l.href} target={l.ext ? "_blank" : undefined}
                    rel={l.ext ? "noopener noreferrer" : undefined}
                    className="text-white/30 hover:text-white text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8">
          <p className="text-white/20 text-xs font-semibold mb-2 uppercase tracking-wide">Important Disclaimer</p>
          <p className="text-white/15 text-xs leading-relaxed mb-6">
            The Greenprint is an educational trading community. We are not registered investment advisors. All content, trade alerts, live sessions, and educational material are provided for informational and educational purposes only and do not constitute financial, investment, or trading advice. Trading stocks, options, futures, and other financial instruments involves substantial risk of loss and is not suitable for all investors. Past performance of any strategy, alert, or trade discussed is not indicative of future results. You should not trade with money you cannot afford to lose. Always conduct your own research and consult a licensed financial professional before making any investment decisions. The Greenprint and its operators are not liable for any trading losses incurred by members.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/15 text-xs">&copy; {new Date().getFullYear()} The Greenprint. All rights reserved.</p>
            <div className="flex gap-6">
              {["Privacy Policy", "Terms of Service"].map(l => (
                <Link key={l} href="#" className="text-white/15 hover:text-white/30 text-xs transition-colors">{l}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Win Toasts ────────────────────────────────────────────────── */
type Win = { text: string; result: string; when: string };

function WinToasts() {
  const [wins, setWins] = useState<Win[]>([]);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/wins.json")
      .then(r => (r.ok ? r.json() : []))
      .then((data: Win[]) => { if (Array.isArray(data) && data.length) setWins(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!wins.length || dismissed) return;
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;
    const cycle = (first: boolean) => {
      showTimer = setTimeout(() => {
        setVisible(true);
        hideTimer = setTimeout(() => {
          setVisible(false);
          setIdx(i => (i + 1) % wins.length);
          cycle(false);
        }, 6000);
      }, first ? 3500 : 9000);
    };
    cycle(true);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [wins, dismissed]);

  if (!wins.length || dismissed) return null;
  const w = wins[idx % wins.length];

  return (
    <div
      style={{
        position: "fixed", left: 16, bottom: 76, zIndex: 60, maxWidth: 320,
        transform: visible ? "translateX(0)" : "translateX(-120%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.45s cubic-bezier(.2,.9,.3,1.2), opacity 0.4s",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
        background: "rgba(10,16,12,0.95)", border: "1px solid rgba(0,255,133,0.35)",
        borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.55), 0 0 18px rgba(0,255,133,0.12)",
        backdropFilter: "blur(8px)",
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          background: "rgba(0,255,133,0.12)", border: "1px solid rgba(0,255,133,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
        }}>🟢</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: "white", fontWeight: 700, fontSize: 13, lineHeight: 1.35 }}>
            {w.text} <span style={{ color: "#00FF85" }}>{w.result}</span>
          </p>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 }}>
            Signal closed · {w.when}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            background: "transparent", border: "none", color: "rgba(255,255,255,0.35)",
            cursor: "pointer", fontSize: 14, padding: 4, lineHeight: 1, flexShrink: 0,
          }}
        >✕</button>
      </div>
    </div>
  );
}

/* ─── Root ──────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#080808] text-white relative">
      <Cinematic />
      <Nav />
      <Hero />
      <Ticker />
      <Stats />
      <HowItWorks />
      <Features />
      <LiveCallout />
      <Pricing />
      <Testimonials />
      <MemberAccess />
      <BookACall />
      <Footer />
      <WinToasts />
    </main>
  );
}
