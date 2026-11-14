"use client";

import { useEffect, useRef } from "react";

// Cinematic ambient layer: a slow drifting light field (green + gold motes),
// a breathing horizon glow, and an occasional light sweep. Pure canvas + CSS,
// pauses when the tab is hidden, honours reduced motion.
export function Ambient({ intensity = 1 }: { intensity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, raf = 0, running = true;
    type P = { x: number; y: number; r: number; vy: number; vx: number; a: number; tw: number; gold: boolean };
    let ps: P[] = [];
    const seed = () => {
      const n = Math.round(Math.min(90, (w * h) / 16000) * intensity);
      ps = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.4 + 0.35,
        vy: -(Math.random() * 0.14 + 0.03), vx: (Math.random() - 0.5) * 0.05,
        a: Math.random() * 0.5 + 0.15, tw: Math.random() * Math.PI * 2,
        gold: Math.random() < 0.22,
      }));
    };
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        if (!reduce) { p.y += p.vy; p.x += p.vx; }
        if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
        if (p.x < -4) p.x = w + 4; else if (p.x > w + 4) p.x = -4;
        const tw = 0.6 + 0.4 * Math.sin(t / 1100 + p.tw);
        const alpha = p.a * tw;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold ? `rgba(240,208,137,${alpha})` : `rgba(80,255,170,${alpha})`;
        ctx.shadowBlur = p.r * 6;
        ctx.shadowColor = p.gold ? "rgba(240,208,137,0.8)" : "rgba(0,255,133,0.8)";
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (running && !reduce) raf = requestAnimationFrame(draw);
    };
    const onVis = () => {
      running = !document.hidden;
      cancelAnimationFrame(raf);
      if (running) raf = requestAnimationFrame(draw);
    };
    size();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", size);
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", size); document.removeEventListener("visibilitychange", onVis); };
  }, [intensity]);

  return (
    <>
      <canvas ref={ref} className="gp-motes" aria-hidden />
      <div className="gp-horizon" aria-hidden />
      <div className="gp-sweep" aria-hidden />
      <div className="gp-grain" aria-hidden />
    </>
  );
}
