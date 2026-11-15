"use client";

/* ──────────────────────────────────────────────────────────────────────────
   THE GREENPRINT — INITIATION
   A standalone, game-style onboarding quest. Purely additive: this route does
   not touch or import any existing app code. It reuses the app's own endpoints
   (/api/chat?kind=push for alerts, /api/chat to post in the room) exactly as
   the app does, then drops the recruit into /app.
   ────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject } from "react";

const GREEN = "#00ff87";
const GREEN_DIM = "#00c86a";
const INK = "#05080b";

function urlB64ToUint8(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type MStatus = "locked" | "active" | "done";

const MAX_XP = 100;

export default function Initiation() {
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [xp, setXp] = useState(0);
  const [xpShown, setXpShown] = useState(0);
  const [level, setLevel] = useState(1);
  const [floats, setFloats] = useState<{ id: number; text: string }[]>([]);

  // Mission state
  const [m1, setM1] = useState<MStatus>("active");
  const [m1err, setM1err] = useState("");
  const [m1busy, setM1busy] = useState(false);
  const [m2, setM2] = useState<MStatus>("locked");
  const [m2busy, setM2busy] = useState(false);
  const [roomMsgs, setRoomMsgs] = useState<{ id: number; user: string; text: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [finale, setFinale] = useState(false);

  const audioRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const partsRef = useRef<any[]>([]);
  const rafRef = useRef<number | null>(null);
  const m1Ref = useRef<HTMLDivElement | null>(null);
  const m2Ref = useRef<HTMLDivElement | null>(null);
  const finRef = useRef<HTMLDivElement | null>(null);

  /* ── sound ─────────────────────────────────────────────────────────────── */
  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) audioRef.current = new AC();
    } catch (e) {}
    return audioRef.current;
  }, []);

  const tone = useCallback(
    (freq: number, dur: number, when = 0, type: OscillatorType = "triangle", gain = 0.05) => {
      if (muted) return;
      const ac = ensureAudio();
      if (!ac) return;
      try {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = type;
        o.frequency.value = freq;
        const t0 = ac.currentTime + when;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g);
        g.connect(ac.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.02);
      } catch (e) {}
    },
    [muted, ensureAudio]
  );

  const tap = useCallback(() => { tone(420, 0.08, 0, "square", 0.035); if (navigator.vibrate) navigator.vibrate(8); }, [tone]);
  const chime = useCallback(() => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.22, i * 0.07, "triangle", 0.05));
    if (navigator.vibrate) navigator.vibrate([12, 40, 18]);
  }, [tone]);
  const fanfare = useCallback(() => {
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, 0.4, i * 0.08, "triangle", 0.06));
    if (navigator.vibrate) navigator.vibrate([20, 50, 30, 50, 60]);
  }, [tone]);

  /* ── confetti ──────────────────────────────────────────────────────────── */
  const resizeCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  }, []);

  const tick = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const parts = partsRef.current;
    for (const p of parts) {
      p.vy += 0.16;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 36));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    }
    partsRef.current = parts.filter((p) => p.life > 0 && p.y < c.height + 40);
    if (partsRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(tick);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      ctx.clearRect(0, 0, c.width, c.height);
    }
  }, []);

  const burst = useCallback(
    (x: number, y: number, n = 90) => {
      const colors = [GREEN, "#9affce", "#ffffff", "#00c86a", "#d7fff0"];
      const parts = partsRef.current;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 4 + Math.random() * 11;
        parts.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 6,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.4,
          s: 5 + Math.random() * 7,
          color: colors[(Math.random() * colors.length) | 0],
          life: 44 + Math.random() * 26,
        });
      }
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    },
    [tick]
  );

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [resizeCanvas]);

  /* ── xp animation + floating reward text ──────────────────────────────── */
  useEffect(() => {
    let raf = 0;
    const from = xpShown;
    const to = xp;
    const start = performance.now();
    const dur = 650;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setXpShown(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xp]);

  const addXp = useCallback((amount: number, label: string) => {
    setXp((x) => Math.min(MAX_XP, x + amount));
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, text: label }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1300);
  }, []);

  const pct = Math.min(100, (xpShown / MAX_XP) * 100);

  const scrollTo = (r: MutableRefObject<HTMLDivElement | null>) => {
    setTimeout(() => r.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
  };

  /* ── the room preview (read-only, shows it's real + alive) ─────────────── */
  const loadRoom = useCallback(() => {
    fetch("/api/chat?t=" + Date.now())
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.messages)) setRoomMsgs(d.messages.slice(-6)); })
      .catch(() => {});
  }, []);

  /* ── MISSION 1 — arm alerts (reuses the app's exact push flow) ──────────── */
  const armAlerts = async () => {
    tap();
    setM1err("");
    if (typeof window === "undefined") return;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) {
      setM1err("Your browser can't arm alerts here. On iPhone, add this to your Home Screen first — or just continue and turn them on inside the app.");
      return;
    }
    setM1busy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setM1busy(false);
        setM1err(perm === "denied"
          ? "Alerts are blocked in your settings. You can enable them later in the app — continue for now."
          : "No problem — you can arm alerts later inside the app.");
        return;
      }
      try {
        const d = await fetch("/api/chat?kind=push").then((r) => r.json());
        if (d && d.key) {
          await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(d.key) });
          await fetch("/api/chat?kind=push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "subscribe", subscription: sub }) });
        }
      } catch (e) {}
      completeM1();
    } catch (e) {
      setM1busy(false);
      setM1err("Something hiccuped. Try again — or continue and arm alerts in the app.");
    }
  };

  const completeM1 = () => {
    setM1busy(false);
    setM1("done");
    setM2("active");
    addXp(45, "+45 XP · ALERTS ARMED");
    chime();
    const r = m1Ref.current?.getBoundingClientRect();
    burst(r ? r.left + r.width / 2 : window.innerWidth / 2, r ? r.top + 40 : 160);
    loadRoom();
    scrollTo(m2Ref);
  };

  const skipM1 = () => {
    tap();
    setM1("done");
    setM2("active");
    addXp(20, "+20 XP");
    loadRoom();
    scrollTo(m2Ref);
  };

  /* ── MISSION 2 — meet the room (reuses the app's exact /api/chat POST) ──── */
  useEffect(() => { if (m2 === "active") loadRoom(); }, [m2, loadRoom]);

  const getHandle = () => {
    let h = "";
    try { h = localStorage.getItem("gp_handle") || ""; } catch (e) {}
    if (!h) {
      h = "Trader" + Math.floor(100 + Math.random() * 900);
      try { localStorage.setItem("gp_handle", h); } catch (e) {}
    }
    return h;
  };

  const sayHi = async () => {
    const text = (draft || "hey — just pulled up 🔥").trim();
    if (!text) return;
    tap();
    setM2busy(true);
    const handle = getHandle();
    let token = "";
    try { token = localStorage.getItem("gp_token") || ""; } catch (e) {}
    try {
      await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: handle, text, token }) });
    } catch (e) {}
    setRoomMsgs((m) => [...m, { id: Date.now(), user: handle, text }].slice(-6));
    setDraft("");
    setM2busy(false);
    setM2("done");
    addXp(45, "+45 XP · YOU'RE IN THE ROOM");
    chime();
    const r = m2Ref.current?.getBoundingClientRect();
    burst(r ? r.left + r.width / 2 : window.innerWidth / 2, r ? r.top + 40 : 220);
    triggerFinale();
  };

  const triggerFinale = () => {
    setTimeout(() => {
      addXp(10, "+10 XP");
      setLevel(2);
      setFinale(true);
      fanfare();
      setTimeout(() => burst(window.innerWidth / 2, window.innerHeight * 0.42, 150), 120);
      scrollTo(finRef);
    }, 650);
  };

  const enterApp = () => {
    tap();
    try { localStorage.setItem("gp_initiated", "1"); } catch (e) {}
    window.location.href = "/app";
  };

  /* ── start gate (primes audio on the first gesture) ────────────────────── */
  const begin = () => {
    ensureAudio();
    if (audioRef.current && audioRef.current.state === "suspended") audioRef.current.resume().catch(() => {});
    tone(330, 0.12, 0, "triangle", 0.05);
    tone(494, 0.18, 0.08, "triangle", 0.05);
    setStarted(true);
  };

  const levelName = level >= 2 ? "MEMBER" : "RECRUIT";

  /* ── styles ────────────────────────────────────────────────────────────── */
  const shell: CSSProperties = {
    position: "fixed", inset: 0, overflowY: "auto", WebkitOverflowScrolling: "touch",
    background: `radial-gradient(130% 70% at 50% -10%, rgba(0,255,135,.12), transparent 55%), ${INK}`,
    color: "#fff", fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
  };

  return (
    <div style={shell}>
      <style dangerouslySetInnerHTML={{ __html: KF }} />
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60 }} />

      {/* aurora */}
      <div style={{ position: "fixed", width: 520, height: 520, top: "-18%", left: "-22%", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,135,.28), transparent 62%)", filter: "blur(40px)", animation: "gpA1 15s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "fixed", width: 560, height: 560, bottom: "-24%", right: "-24%", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,180,255,.14), transparent 62%)", filter: "blur(46px)", animation: "gpA2 19s ease-in-out infinite", pointerEvents: "none" }} />

      {/* HUD */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, padding: "calc(10px + env(safe-area-inset-top)) 16px 10px", background: "linear-gradient(180deg, rgba(5,8,11,.92), rgba(5,8,11,.72) 70%, transparent)", backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 460, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
            <div style={{ position: "relative", width: 34, height: 34, borderRadius: 10, background: "radial-gradient(circle at 50% 35%, #0c241b, #05080b)", border: "1px solid rgba(0,255,135,.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(0,255,135,.3)" }}>
              <span style={{ fontWeight: 900, fontSize: 18, color: GREEN }}>{level}</span>
            </div>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontSize: 9.5, letterSpacing: ".18em", color: "rgba(255,255,255,.45)", fontWeight: 700 }}>LEVEL {level}</div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", marginTop: 2 }}>{levelName}</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ position: "relative", height: 12, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ position: "absolute", inset: 0, width: pct + "%", borderRadius: 999, background: `linear-gradient(90deg, ${GREEN_DIM}, ${GREEN})`, boxShadow: "0 0 14px rgba(0,255,135,.6)", transition: "width .25s ease" }} />
              <div style={{ position: "absolute", inset: 0, width: pct + "%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent)", backgroundSize: "200% 100%", animation: "gpShine 1.6s linear infinite", borderRadius: 999 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)", fontWeight: 600 }}>{xpShown} / {MAX_XP} XP</span>
              <span style={{ fontSize: 10, color: GREEN, fontWeight: 700 }}>{m1 === "done" ? (m2 === "done" ? "2" : "1") : "0"}/2 quests</span>
            </div>
          </div>
          <button onClick={() => { setMuted((v) => !v); if (navigator.vibrate) navigator.vibrate(6); }} aria-label="sound"
            style={{ flex: "0 0 auto", width: 32, height: 32, borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.04)", color: "#fff", cursor: "pointer", fontSize: 14 }}>
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
        {/* floating rewards */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 54, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          {floats.map((f) => (
            <div key={f.id} style={{ position: "absolute", fontWeight: 900, fontSize: 14, color: GREEN, textShadow: "0 0 12px rgba(0,255,135,.7)", animation: "gpFloat 1.3s ease-out forwards", whiteSpace: "nowrap" }}>{f.text}</div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 460, margin: "0 auto", padding: "8px 16px 120px", position: "relative", zIndex: 10 }}>
        {/* INTRO */}
        <div style={{ textAlign: "center", padding: "22px 6px 10px", animation: "gpRise .6s ease both" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".34em", color: GREEN, fontWeight: 800, marginBottom: 10 }}>INITIATION SEQUENCE</div>
          <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.05, fontWeight: 900, letterSpacing: "-.5px", background: "linear-gradient(90deg,#fff,#9affce,#fff)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "gpShine 6s linear infinite" }}>
            Welcome to<br />THE GREENPRINT
          </h1>
          <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14.5, lineHeight: 1.5, margin: "12px auto 0", maxWidth: 340 }}>
            Two quick quests and you&apos;re locked in. Clear them both to unlock the floor. Let&apos;s run it.
          </p>
        </div>

        {!started ? (
          <div style={{ textAlign: "center", marginTop: 22, animation: "gpRise .7s .1s ease both" }}>
            <button onClick={begin} style={bigBtn}>
              <span style={{ position: "relative", zIndex: 1 }}>▶  START INITIATION</span>
              <span style={shineOverlay} />
            </button>
            <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12, marginTop: 14 }}>Takes about 30 seconds</div>
          </div>
        ) : (
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* MISSION 1 */}
            <div ref={m1Ref}>
              <QuestCard
                n={1} status={m1} reward="+45 XP" title="Arm your alerts" tag="MISSION 1"
                blurb="Every Lock of the Day and trade call hits your phone the second it drops. Turn them on so you never miss a move."
              >
                {m1 !== "done" && (
                  <>
                    <button onClick={armAlerts} disabled={m1busy} style={{ ...ctaBtn, opacity: m1busy ? 0.7 : 1 }}>
                      {m1busy ? "Arming…" : "🔔  ARM ALERTS"}
                    </button>
                    {m1err && <div style={{ color: "#ffd27a", fontSize: 12.5, marginTop: 10, lineHeight: 1.45 }}>{m1err}</div>}
                    {m1err && <button onClick={skipM1} style={skipBtn}>Continue anyway →</button>}
                  </>
                )}
              </QuestCard>
            </div>

            {/* MISSION 2 */}
            <div ref={m2Ref}>
              <QuestCard
                n={2} status={m2} reward="+45 XP" title="Meet the room" tag="MISSION 2"
                blurb="The floor is live right now. Drop your first message — say what you trade, or just say hey. The room talks back."
              >
                {m2 === "active" && (
                  <>
                    <div style={roomBox}>
                      {roomMsgs.length === 0 ? (
                        <div style={{ color: "rgba(255,255,255,.35)", fontSize: 12.5, padding: "4px 2px" }}>Loading the floor…</div>
                      ) : roomMsgs.map((mm) => (
                        <div key={mm.id} style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 4 }}>
                          <span style={{ color: GREEN, fontWeight: 700 }}>{mm.user}</span>
                          <span style={{ color: "rgba(255,255,255,.8)" }}>  {mm.text}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") sayHi(); }}
                        placeholder="hey — just pulled up 🔥"
                        maxLength={160}
                        style={roomInput}
                      />
                      <button onClick={sayHi} disabled={m2busy} style={{ ...sendBtn, opacity: m2busy ? 0.7 : 1 }}>{m2busy ? "…" : "SEND"}</button>
                    </div>
                  </>
                )}
              </QuestCard>
            </div>

            {/* FINALE */}
            <div ref={finRef}>
              {finale ? (
                <div style={{ ...finaleCard, animation: "gpPop .7s cubic-bezier(.2,.9,.3,1.3) both" }}>
                  <div style={{ fontSize: 42, lineHeight: 1 }}>🏆</div>
                  <div style={{ fontSize: 11, letterSpacing: ".3em", color: GREEN, fontWeight: 800, marginTop: 12 }}>LEVEL UP · YOU&apos;RE IN</div>
                  <h2 style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 900, letterSpacing: "-.3px" }}>Initiation complete.</h2>
                  <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, lineHeight: 1.5, margin: "10px auto 0", maxWidth: 320 }}>
                    Alerts armed. You&apos;ve met the room. The floor&apos;s open — picks, trades, and the live board are waiting.
                  </p>
                  <button onClick={enterApp} style={{ ...bigBtn, marginTop: 20 }}>
                    <span style={{ position: "relative", zIndex: 1 }}>ENTER THE GREENPRINT  →</span>
                    <span style={shineOverlay} />
                  </button>
                </div>
              ) : (
                <div style={{ ...finaleCard, opacity: 0.5 }}>
                  <div style={{ fontSize: 30, filter: "grayscale(1)", opacity: 0.6 }}>🔒</div>
                  <div style={{ fontSize: 11, letterSpacing: ".3em", color: "rgba(255,255,255,.4)", fontWeight: 800, marginTop: 10 }}>THE FLOOR</div>
                  <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13, margin: "8px 0 0" }}>Clear both quests to unlock.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── quest card ──────────────────────────────────────────────────────── */
function QuestCard({ n, status, reward, title, tag, blurb, children }: {
  n: number; status: MStatus; reward: string; title: string; tag: string; blurb: string; children?: any;
}) {
  const done = status === "done";
  const locked = status === "locked";
  return (
    <div style={{
      position: "relative", borderRadius: 20, padding: 18,
      background: done ? "linear-gradient(180deg, rgba(0,255,135,.08), rgba(0,255,135,.02))" : "rgba(255,255,255,.04)",
      border: "1px solid " + (done ? "rgba(0,255,135,.4)" : locked ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.12)"),
      boxShadow: status === "active" ? "0 0 0 1px rgba(0,255,135,.25), 0 18px 50px rgba(0,0,0,.45)" : "0 10px 30px rgba(0,0,0,.3)",
      opacity: locked ? 0.55 : 1, transition: "opacity .3s, border-color .3s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          flex: "0 0 auto", width: 42, height: 42, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 900, fontSize: 18,
          background: done ? "linear-gradient(135deg,#00ff87,#00c86a)" : "rgba(255,255,255,.06)",
          color: done ? "#06110c" : "#fff",
          border: done ? "none" : "1px solid rgba(255,255,255,.14)",
          boxShadow: done ? "0 6px 18px rgba(0,255,135,.4)" : "none",
        }}>{done ? "✓" : locked ? "🔒" : n}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9.5, letterSpacing: ".2em", color: done ? GREEN : "rgba(255,255,255,.45)", fontWeight: 800 }}>{tag}</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: done ? GREEN : "#9affce", background: "rgba(0,255,135,.1)", borderRadius: 999, padding: "2px 8px" }}>{reward}</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 3, color: done ? GREEN : "#fff" }}>{title}</div>
        </div>
      </div>
      {!done && !locked && (
        <>
          <p style={{ color: "rgba(255,255,255,.62)", fontSize: 13.5, lineHeight: 1.5, margin: "12px 0 14px" }}>{blurb}</p>
          {children}
        </>
      )}
      {done && <div style={{ color: GREEN, fontSize: 13, fontWeight: 700, marginTop: 10 }}>Complete — nice work.</div>}
    </div>
  );
}

/* ── shared style objects ──────────────────────────────────────────────────── */
const bigBtn: CSSProperties = {
  position: "relative", overflow: "hidden", width: "100%", padding: "17px 0", borderRadius: 16, border: "none",
  cursor: "pointer", fontWeight: 900, fontSize: 16, letterSpacing: ".02em", color: "#06110c",
  background: "linear-gradient(135deg,#00ff87,#00d774)", boxShadow: "0 14px 38px rgba(0,255,135,.4)",
};
const ctaBtn: CSSProperties = {
  width: "100%", padding: "15px 0", borderRadius: 14, border: "none", cursor: "pointer",
  fontWeight: 900, fontSize: 15, color: "#06110c", background: "linear-gradient(135deg,#00ff87,#00d774)",
  boxShadow: "0 10px 28px rgba(0,255,135,.35)",
};
const sendBtn: CSSProperties = {
  flex: "0 0 auto", padding: "0 18px", borderRadius: 12, border: "none", cursor: "pointer",
  fontWeight: 900, fontSize: 13, color: "#06110c", background: "linear-gradient(135deg,#00ff87,#00d774)",
};
const skipBtn: CSSProperties = {
  background: "none", border: "none", color: "rgba(255,255,255,.55)", fontSize: 13, fontWeight: 700,
  cursor: "pointer", marginTop: 12, textDecoration: "underline", padding: 0,
};
const roomBox: CSSProperties = {
  marginTop: 2, borderRadius: 12, background: "rgba(0,0,0,.28)", border: "1px solid rgba(255,255,255,.07)",
  padding: 12, minHeight: 92, maxHeight: 140, overflowY: "auto",
};
const roomInput: CSSProperties = {
  flex: 1, minWidth: 0, boxSizing: "border-box", padding: "12px 14px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "#fff",
  fontSize: 15, outline: "none",
};
const finaleCard: CSSProperties = {
  textAlign: "center", borderRadius: 22, padding: "26px 20px",
  background: "radial-gradient(120% 90% at 50% 0%, rgba(0,255,135,.12), rgba(255,255,255,.03))",
  border: "1px solid rgba(0,255,135,.3)", boxShadow: "0 20px 60px rgba(0,0,0,.5)",
};
const shineOverlay: CSSProperties = {
  position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)",
  backgroundSize: "200% 100%", animation: "gpShine 2.4s linear infinite", pointerEvents: "none",
};

const KF = `
@keyframes gpA1{0%{transform:translate(-8%,-5%) scale(1)}50%{transform:translate(10%,8%) scale(1.22)}100%{transform:translate(-8%,-5%) scale(1)}}
@keyframes gpA2{0%{transform:translate(8%,5%) scale(1.1)}50%{transform:translate(-10%,-8%) scale(1.3)}100%{transform:translate(8%,5%) scale(1.1)}}
@keyframes gpShine{0%{background-position:0% 50%}100%{background-position:200% 50%}}
@keyframes gpRise{0%{opacity:0;transform:translateY(18px)}100%{opacity:1;transform:translateY(0)}}
@keyframes gpPop{0%{opacity:0;transform:scale(.72)}60%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
@keyframes gpFloat{0%{opacity:0;transform:translateY(6px) scale(.9)}20%{opacity:1;transform:translateY(-2px) scale(1.05)}100%{opacity:0;transform:translateY(-34px) scale(1)}}
`;
