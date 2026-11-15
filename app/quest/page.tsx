"use client";

/* 1HOUSE x THE GREENPRINT : THE CLIMB
   A standalone onboarding game. Additive only: imports nothing from the app.
   Progress saves on the device. Reuses /api/chat?kind=push for alerts. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

const GREEN = "#00ff87";
const INK = "#05080b";
const GOLD = "#ffd27a";
const SAVE_KEY = "gp_quest_v2";

type Quiz = { q: string; a: string[]; correct: number; why: string };
type LinkBtn = { label: string; href: string; ios?: string };
type Step = {
  id: string; title: string; blurb: string; xp: number;
  kind: "task" | "alerts" | "choice" | "list" | "quiz";
  links?: LinkBtn[]; note?: string[]; options?: string[]; items?: string[]; quiz?: Quiz[]; done?: string;
};
type World = { id: string; name: string; tag: string; icon: string; intro: string; steps: Step[] };

const LIVV = "https://members.livvfxtrading.com/client/register/6a65379bb16ad";
const CHAT = "https://t.me/TheGreenprintt";

const WORLDS: World[] = [
  {
    id: "w1", name: "Gear Up", tag: "WORLD 1", icon: "🎒",
    intro: "Every trader needs their tools. Download each app and create your account.",
    steps: [
      { id: "tg", kind: "task", xp: 25, title: "Download Telegram", blurb: "This is where the community chat and free signals live. Download it and create your account.", links: [{ label: "Get Telegram", href: "https://telegram.org/apps", ios: "https://apps.apple.com/us/app/telegram-messenger/id686449807" }] },
      { id: "1h", kind: "task", xp: 25, title: "Download the 1House app", blurb: "Your streaming home. This is where you watch the educators live and follow your streamers.", links: [{ label: "Get 1House", href: "https://1house.tv", ios: "https://apps.apple.com/us/app/1house/id6754260060" }] },
      { id: "tv", kind: "task", xp: 25, title: "Download TradingView", blurb: "Where you read and mark up the charts. Create a free account.", links: [{ label: "Get TradingView", href: "https://www.tradingview.com", ios: "https://apps.apple.com/us/app/tradingview-track-all-markets/id1205990992" }] },
      { id: "tl", kind: "task", xp: 25, title: "Get TradeLocker", blurb: "The platform that connects to your broker so you can place trades. Works on app or desktop.", links: [{ label: "Get TradeLocker", href: "https://tradelocker.com" }] },
    ],
  },
  {
    id: "w2", name: "Plug In", tag: "WORLD 2", icon: "🔌",
    intro: "Tools mean nothing alone. Get in the rooms where the work happens.",
    steps: [
      { id: "chat", kind: "task", xp: 30, title: "Join the Greenprint chat", blurb: "The main community chat. Questions, updates, the team, and the free signals all run through here.", links: [{ label: "Join the chat", href: CHAT }] },
      { id: "intro", kind: "task", xp: 20, title: "Introduce yourself", blurb: "Drop a message in the chat. Your name, where you are from, and what you want out of this. The people who talk get the most out of it.", links: [{ label: "Open the chat", href: CHAT }], done: "I introduced myself" },
      { id: "streams", kind: "task", xp: 30, title: "Follow your streamers", blurb: "Open 1House and follow the stream channels so you never miss a live session.", links: [{ label: "Open 1House", href: "https://1house.tv" }], done: "I followed the streams" },
      { id: "alerts", kind: "alerts", xp: 30, title: "Arm your alerts", blurb: "Turn on notifications so calls and updates reach your phone the second they drop." },
      { id: "alarms", kind: "task", xp: 20, title: "Set two alarms", blurb: "Watching profitable traders live is how you learn fastest. Pick two sessions and set alarms on your phone right now. All times EST.", note: ["Mon to Fri 9:00 AM · The Heist", "Sun and Mon 10:00 PM · Basics with Naomi Brown", "Tue 7:00 PM · Basics with Arin Long", "Tue and Thu 11:00 PM · Live with Richard Hall", "Wed 1:00 PM · Live with Richard Hall"], done: "My alarms are set" },
    ],
  },
  {
    id: "w3", name: "Boot Camp", tag: "WORLD 3", icon: "🧠",
    intro: "Your first 72 hours. Watch the Great 8 inside 1House, then prove you were paying attention.",
    steps: [
      { id: "great8", kind: "list", xp: 80, title: "The Great 8", blurb: "The eight clips to watch first. Tap each one off as you finish it.", links: [{ label: "Open 1House", href: "https://1house.tv" }], items: ["First 48", "Back to Basics", "The Candlestick Bible", "Forex Playbook", "New Trader Start Here", "Partner Program Breakdown", "The Truth You Need to Be Rich", "State of the Partnership"] },
      { id: "boss1", kind: "quiz", xp: 60, title: "Boss: The Mindset Check", blurb: "Three questions. Get them all right to clear the world.", quiz: [
        { q: "Whatever skill you learn, it takes...", a: ["90% skillset, 10% mindset", "90% mindset, 10% skillset", "50% luck, 50% timing"], correct: 1, why: "90% mindset, 10% skillset. Trading is mostly psychology." },
        { q: "What does S.Y.S.T.E.M stand for?", a: ["Save Yourself Time, Energy and Money", "Study Your Setups Then Enter Markets", "Stack Your Savings To Earn More"], correct: 0, why: "A system removes the guesswork and keeps you consistent." },
        { q: "What is the top down order for reading a chart?", a: ["5m, 1H, Daily, Weekly", "Daily, 5m, Weekly, 1H", "Weekly, Daily, 1H, then 5m to execute"], correct: 2, why: "Start with the big picture, then drop down to the 5m to execute." },
      ] },
    ],
  },
  {
    id: "w4", name: "The Vault", tag: "WORLD 4", icon: "🏦",
    intro: "Time to set up your trading account. Demo or live, this is the same setup.",
    steps: [
      { id: "broker", kind: "task", xp: 40, title: "Open your broker account", blurb: "Create your LivvFX account. You need this to trade live or on demo.", links: [{ label: "Open LivvFX account", href: LIVV }], done: "My account is open" },
      { id: "btc", kind: "task", xp: 30, title: "Set up Bitcoin verification", blurb: "The simplest way to move money to and from your broker. Verify Bitcoin on Cash App, or use Coinbase. If neither works for you, message Jay directly.", links: [{ label: "Cash App", href: "https://cash.app", ios: "https://apps.apple.com/us/app/cash-app/id711923939" }, { label: "Coinbase", href: "https://www.coinbase.com", ios: "https://apps.apple.com/us/app/coinbase/id886427730" }], done: "I am verified" },
      { id: "fund", kind: "choice", xp: 50, title: "Choose your path", blurb: "Go live with card or crypto, or start on demo and practice first. Both paths count the same here. Only ever fund with money you can afford to lose.", options: ["I funded my live account", "I am starting on demo"] },
      { id: "connect", kind: "task", xp: 40, title: "Connect TradeLocker", blurb: "Link your live or demo account to TradeLocker so you can place a trade. If you get stuck, ask in the chat and someone will walk you through it.", links: [{ label: "Open TradeLocker", href: "https://tradelocker.com" }, { label: "Ask in the chat", href: CHAT }], done: "I am connected" },
    ],
  },
  {
    id: "w5", name: "Live Fire", tag: "WORLD 5", icon: "🎯",
    intro: "This is where it gets real. Pass the risk check before you touch the market.",
    steps: [
      { id: "boss2", kind: "quiz", xp: 80, title: "Boss: The Risk Check", blurb: "Four questions. Protect the account first.", quiz: [
        { q: "When do you set your stop loss?", a: ["After the trade moves against me", "Before I enter, every time", "Only on big trades"], correct: 1, why: "Your stop loss is set and known before you enter." },
        { q: "You have a $300 account and want to risk 1%. What lot size does the guide give you?", a: ["0.01", "0.10", "1.0"], correct: 0, why: "$100 to $500 at 1% risk is a 0.01 lot. Size every trade to your balance." },
        { q: "Price reaches TP1. What is the move?", a: ["Add more size", "Move my stop loss to breakeven or trail it", "Remove my stop loss"], correct: 1, why: "Breakeven or trail at TP1. From there the trade is a win either way." },
        { q: "You just took a loss and want it back right now. What do you do?", a: ["Double my lot size", "Jump straight back in", "Step away. No revenge trading"], correct: 2, why: "No revenge trading, no overtrading, no emotion. Blow an account in a day and that is gambling, not trading." },
      ] },
      { id: "trade", kind: "task", xp: 100, title: "Place your first trade", blurb: "Demo or live. Stop loss set before you enter. Lot size matched to your account. That is the whole assignment.", note: ["Stop loss set before entry", "Lot size from the guide (1% to 3% risk)", "At TP1, move to breakeven or trail"], done: "I placed my first trade" },
      { id: "proof", kind: "task", xp: 50, title: "Post your proof", blurb: "Drop a screenshot of your dashboard in the chat. That is the gate to the free signals.", links: [{ label: "Post in the chat", href: CHAT }], done: "I posted it" },
    ],
  },
  {
    id: "w6", name: "The Climb", tag: "WORLD 6", icon: "🏔️",
    intro: "You are set up. Now build the habits that keep you here.",
    steps: [
      { id: "journal", kind: "task", xp: 30, title: "Start your journal", blurb: "Track every trade. Entry, stop loss, result, and what you learned. Notes, a notebook, anything. Just start it today.", done: "My journal is started" },
      { id: "link", kind: "task", xp: 30, title: "Find your subscriber link", blurb: "Your personal link lives in your 1House dashboard. Know where it is so you are ready when someone asks how you got started.", links: [{ label: "Open 1House", href: "https://1house.tv" }], done: "I found my link" },
      { id: "list", kind: "task", xp: 30, title: "Write your list", blurb: "Pen up. Write 20 names of people who would want this. Do not prejudge anyone. You help someone else get a result before you get yours.", done: "My list is written" },
    ],
  },
];

const RANKS: [number, string][] = [[0, "Recruit"], [100, "Rookie"], [230, "Plugged In"], [370, "Student of the Game"], [530, "Operator"], [760, "Trader"], [850, "Greenprint Certified"]];
const DAILY = ["Plug into a live stream", "Mark up one chart on TradingView", "Check in with the chat"];

type Save = { done: Record<string, boolean>; lists: Record<string, number[]>; picks: Record<string, number>; bonus: number; streak: { last: string; count: number }; daily: { date: string; done: number[] }; started: boolean };
const EMPTY: Save = { done: {}, lists: {}, picks: {}, bonus: 0, streak: { last: "", count: 0 }, daily: { date: "", done: [] }, started: false };

const dayKey = (d = new Date()) => d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
function urlB64ToUint8(s: string) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function QuestGame() {
  const [save, setSave] = useState<Save>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [muted, setMuted] = useState(false);
  const [open, setOpen] = useState<Step | null>(null);
  const [toast, setToast] = useState<{ big: string; small: string } | null>(null);
  const [qi, setQi] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [alertMsg, setAlertMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [xpShown, setXpShown] = useState(0);

  const audioRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const partsRef = useRef<any[]>([]);
  const rafRef = useRef<number | null>(null);

  /* load + save + daily streak */
  useEffect(() => {
    let s: Save = EMPTY;
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) s = { ...EMPTY, ...JSON.parse(raw) }; } catch (e) {}
    const today = dayKey();
    if (s.started && s.streak.last !== today) {
      const y = dayKey(new Date(Date.now() - 86400000));
      s = { ...s, streak: { last: today, count: s.streak.last === y ? s.streak.count + 1 : 1 } };
    }
    if (s.daily.date !== today) s = { ...s, daily: { date: today, done: [] } };
    setSave(s);
    setLoaded(true);
    setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} } }, [save, loaded]);

  /* derived progress */
  const stepDone = useCallback((st: Step) => !!save.done[st.id], [save.done]);
  const xp = useMemo(() => {
    let t = save.bonus;
    for (const w of WORLDS) for (const st of w.steps) {
      if (save.done[st.id]) t += st.xp;
      else if (st.kind === "list" && st.items) t += Math.round(((save.lists[st.id] || []).length / st.items.length) * st.xp);
    }
    return t;
  }, [save]);
  const allSteps = useMemo(() => WORLDS.reduce((a: Step[], w) => a.concat(w.steps), []), []);
  const doneCount = allSteps.filter(stepDone).length;
  const worldClear = (w: World) => w.steps.every(stepDone);
  const curWorld = WORLDS.findIndex((w) => !worldClear(w));
  const finished = curWorld === -1;
  let rankIdx = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i][0]) rankIdx = i;
  const nextAt = rankIdx < RANKS.length - 1 ? RANKS[rankIdx + 1][0] : RANKS[rankIdx][0];
  const prevAt = RANKS[rankIdx][0];
  const pct = nextAt === prevAt ? 100 : Math.min(100, ((xpShown - prevAt) / (nextAt - prevAt)) * 100);

  useEffect(() => {
    let raf = 0; const from = xpShown; const t0 = performance.now();
    const step = (now: number) => { const t = Math.min(1, (now - t0) / 600); setXpShown(Math.round(from + (xp - from) * (1 - Math.pow(1 - t, 3)))); if (t < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xp]);

  /* sound + haptics */
  const tone = useCallback((f: number, d: number, when = 0, type: OscillatorType = "triangle", g = 0.05) => {
    if (muted) return;
    try {
      if (!audioRef.current) { const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (AC) audioRef.current = new AC(); }
      const ac = audioRef.current; if (!ac) return;
      if (ac.state === "suspended") ac.resume().catch(() => {});
      const o = ac.createOscillator(); const gn = ac.createGain(); const t0 = ac.currentTime + when;
      o.type = type; o.frequency.value = f;
      gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(g, t0 + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(gn); gn.connect(ac.destination); o.start(t0); o.stop(t0 + d + 0.02);
    } catch (e) {}
  }, [muted]);
  const buzz = (p: number | number[]) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
  const sTap = () => { tone(420, 0.07, 0, "square", 0.03); buzz(8); };
  const sWin = () => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.22, i * 0.07)); buzz([12, 40, 18]); };
  const sBig = () => { [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, 0.4, i * 0.08, "triangle", 0.06)); buzz([20, 50, 30, 50, 60]); };
  const sBad = () => { tone(160, 0.18, 0, "sawtooth", 0.04); buzz(40); };

  /* confetti */
  const tick = useCallback(() => {
    const c = canvasRef.current; const ctx = c ? c.getContext("2d") : null;
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of partsRef.current) {
      p.vy += 0.16; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 36));
      ctx.fillStyle = p.color; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
    }
    partsRef.current = partsRef.current.filter((p) => p.life > 0 && p.y < c.height + 40);
    if (partsRef.current.length) rafRef.current = requestAnimationFrame(tick);
    else { rafRef.current = null; ctx.clearRect(0, 0, c.width, c.height); }
  }, []);
  const burst = useCallback((n = 90) => {
    const c = canvasRef.current; if (!c) return;
    c.width = window.innerWidth; c.height = window.innerHeight;
    const colors = [GREEN, "#9affce", "#ffffff", "#00c86a", GOLD];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2; const sp = 4 + Math.random() * 11;
      partsRef.current.push({ x: c.width / 2, y: c.height * 0.38, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, rot: Math.random() * 3, vr: (Math.random() - 0.5) * 0.4, s: 5 + Math.random() * 7, color: colors[(Math.random() * colors.length) | 0], life: 44 + Math.random() * 26 });
    }
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const flash = (big: string, small: string, ms = 2200) => { setToast({ big, small }); setTimeout(() => setToast(null), ms); };

  /* completing a step */
  const complete = (st: Step, extra?: Partial<Save>) => {
    if (save.done[st.id]) { setOpen(null); return; }
    const w = WORLDS.find((x) => x.steps.some((y) => y.id === st.id)) as World;
    const clears = w.steps.every((y) => y.id === st.id || save.done[y.id]);
    const newXp = xp + st.xp - (st.kind === "list" ? Math.round((((save.lists[st.id] || []).length) / (st.items ? st.items.length : 1)) * st.xp) : 0);
    let newRank = 0;
    for (let i = 0; i < RANKS.length; i++) if (newXp >= RANKS[i][0]) newRank = i;
    setSave((s) => ({ ...s, ...(extra || {}), done: { ...s.done, [st.id]: true } }));
    setOpen(null); setQi(0); setPick(null); setAlertMsg("");
    const last = clears && WORLDS[WORLDS.length - 1].id === w.id;
    if (last) { sBig(); burst(200); flash("YOU MADE THE CLIMB", "Onboarding complete. Now the real game starts.", 3600); }
    else if (clears) { sBig(); burst(150); flash(w.name.toUpperCase() + " CLEARED", "Next world unlocked", 2800); }
    else if (newRank > rankIdx) { sBig(); burst(120); flash("RANK UP", RANKS[newRank][1], 2600); }
    else { sWin(); burst(60); flash("+" + st.xp + " XP", st.title, 1500); }
  };

  const openLink = (l: LinkBtn) => { sTap(); window.open(isIOS && l.ios ? l.ios : l.href, "_blank", "noopener"); };

  const armAlerts = async (st: Step) => {
    sTap(); setAlertMsg("");
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!ok) { setAlertMsg("This browser cannot turn on alerts here. On iPhone, add this page to your Home Screen first, or continue and turn them on inside the app."); return; }
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setBusy(false); setAlertMsg("No problem. You can turn alerts on later inside the app."); return; }
      try {
        const d = await fetch("/api/chat?kind=push").then((r) => r.json());
        if (d && d.key) {
          await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(d.key) });
          await fetch("/api/chat?kind=push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "subscribe", subscription: sub }) });
        }
      } catch (e) {}
      setBusy(false); complete(st);
    } catch (e) { setBusy(false); setAlertMsg("Something hiccuped. Try again, or continue and do it in the app."); }
  };

  const toggleList = (st: Step, i: number) => {
    sTap();
    const cur = save.lists[st.id] || [];
    const next = cur.includes(i) ? cur.filter((x) => x !== i) : cur.concat(i);
    if (st.items && next.length === st.items.length) complete(st, { lists: { ...save.lists, [st.id]: next } });
    else setSave((s) => ({ ...s, lists: { ...s.lists, [st.id]: next } }));
  };

  const answer = (st: Step, i: number) => {
    if (!st.quiz || pick !== null) return;
    setPick(i);
    if (i === st.quiz[qi].correct) { tone(660, 0.12); tone(880, 0.16, 0.08); buzz(12); } else sBad();
  };
  const nextQ = (st: Step) => {
    if (!st.quiz) return;
    const right = pick === st.quiz[qi].correct;
    setPick(null);
    if (!right) return;
    if (qi + 1 >= st.quiz.length) complete(st); else setQi(qi + 1);
  };

  const toggleDaily = (i: number) => {
    if (save.daily.done.includes(i)) return;
    const nd = save.daily.done.concat(i);
    setSave((s) => ({ ...s, bonus: s.bonus + 10 + (nd.length === DAILY.length ? 20 : 0), daily: { ...s.daily, done: nd } }));
    if (nd.length === DAILY.length) { sBig(); burst(120); flash("PERFECT DAY", "Bonus +20 XP. See you tomorrow.", 2600); } else { sWin(); flash("+10 XP", DAILY[i], 1300); }
  };

  const begin = () => { sBig(); setSave((s) => ({ ...s, started: true, streak: { last: dayKey(), count: 1 } })); };
  const reset = () => { if (window.confirm("Reset all progress on this device?")) { setSave(EMPTY); setOpen(null); } };

  const dailyOpen = save.started && (finished || curWorld >= 2);
  const nextStep = finished ? null : WORLDS[curWorld].steps.find((s) => !stepDone(s)) || null;

  if (!loaded) return <div style={{ position: "fixed", inset: 0, background: INK }} />;

  return (
    <div style={shell}>
      <style dangerouslySetInnerHTML={{ __html: KF }} />
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 80 }} />
      <div style={{ ...orb, top: "-18%", left: "-22%", background: "radial-gradient(circle, rgba(0,255,135,.26), transparent 62%)", animation: "gqA 15s ease-in-out infinite" }} />
      <div style={{ ...orb, bottom: "-24%", right: "-24%", background: "radial-gradient(circle, rgba(0,180,255,.14), transparent 62%)", animation: "gqB 19s ease-in-out infinite" }} />

      {!save.started ? (
        <div style={{ position: "relative", zIndex: 10, minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "calc(30px + env(safe-area-inset-top)) 22px 60px", textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: ".34em", color: GREEN, fontWeight: 800, animation: "gqRise .6s ease both" }}>1HOUSE × THE GREENPRINT</div>
          <div style={{ fontSize: 76, margin: "18px 0 6px", animation: "gqBob 3s ease-in-out infinite" }}>🏔️</div>
          <h1 style={{ ...shine, margin: 0, fontSize: 46, lineHeight: 1, fontWeight: 900, letterSpacing: "-1.5px" }}>THE CLIMB</h1>
          <p style={{ color: "rgba(255,255,255,.62)", fontSize: 15, lineHeight: 1.55, margin: "16px auto 0", maxWidth: 330, animation: "gqRise .7s .1s ease both" }}>
            Six worlds. One mission. Go from brand new to placing your first trade, one quest at a time.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", margin: "22px 0 26px", maxWidth: 340 }}>
            {WORLDS.map((w) => (<div key={w.id} style={chip}>{w.icon} {w.name}</div>))}
          </div>
          <button onClick={begin} style={{ ...bigBtn, maxWidth: 340, animation: "gqPulse 1.8s ease-in-out infinite" }}>
            <span style={{ position: "relative", zIndex: 1 }}>▶  PRESS START</span><span style={sheen} />
          </button>
          <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12, marginTop: 14 }}>Your progress saves on this device</div>
        </div>
      ) : (
        <>
          {/* HUD */}
          <div style={hud}>
            <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={rankBadge}><span style={{ fontWeight: 900, fontSize: 17, color: GREEN }}>{rankIdx + 1}</span></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{RANKS[rankIdx][1]}</span>
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.5)", fontWeight: 600, whiteSpace: "nowrap" }}>{xpShown} XP{nextAt !== prevAt ? " / " + nextAt : ""}</span>
                </div>
                <div style={{ position: "relative", height: 10, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden", marginTop: 5 }}>
                  <div style={{ position: "absolute", inset: 0, width: pct + "%", borderRadius: 999, background: "linear-gradient(90deg,#00c86a,#00ff87)", boxShadow: "0 0 14px rgba(0,255,135,.6)", transition: "width .25s ease" }} />
                </div>
              </div>
              <div style={{ ...pill, color: GOLD, borderColor: "rgba(255,210,122,.35)" }}>🔥 {save.streak.count}</div>
              <button onClick={() => setMuted((v) => !v)} aria-label="sound" style={{ ...pill, cursor: "pointer", padding: "6px 9px" }}>{muted ? "🔇" : "🔊"}</button>
            </div>
          </div>

          <div style={{ maxWidth: 480, margin: "0 auto", padding: "10px 16px 130px", position: "relative", zIndex: 10 }}>
            {/* next up */}
            <div style={{ ...card, borderColor: "rgba(0,255,135,.35)", background: "linear-gradient(160deg, rgba(0,255,135,.10), rgba(255,255,255,.03))", animation: "gqRise .5s ease both" }}>
              <div style={{ fontSize: 10, letterSpacing: ".22em", color: GREEN, fontWeight: 800 }}>{finished ? "MISSION COMPLETE" : "NEXT UP · " + WORLDS[curWorld].tag}</div>
              <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>{finished ? "You made The Climb." : (nextStep ? nextStep.title : "")}</div>
              <div style={{ color: "rgba(255,255,255,.6)", fontSize: 13.5, lineHeight: 1.5, marginTop: 6 }}>
                {finished ? "Onboarding is done. Come back daily, hit your three missions, and keep the streak alive. Engagement has a direct correlation to your success." : doneCount + " of " + allSteps.length + " quests complete"}
              </div>
              {!finished && nextStep && (
                <button onClick={() => { sTap(); setQi(0); setPick(null); setAlertMsg(""); setOpen(nextStep); }} style={{ ...bigBtn, marginTop: 14, padding: "15px 0", fontSize: 15 }}>
                  <span style={{ position: "relative", zIndex: 1 }}>CONTINUE  →</span><span style={sheen} />
                </button>
              )}
              {finished && (<a href="/app" style={{ ...bigBtn, display: "block", textAlign: "center", textDecoration: "none", marginTop: 14, padding: "15px 0", fontSize: 15, boxSizing: "border-box" }}>ENTER THE GREENPRINT  →</a>)}
            </div>

            {/* daily missions */}
            {dailyOpen && (
              <div style={{ ...card, marginTop: 14, borderColor: "rgba(255,210,122,.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 10, letterSpacing: ".22em", color: GOLD, fontWeight: 800 }}>DAILY MISSIONS</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", fontWeight: 700 }}>{save.daily.done.length}/{DAILY.length} · resets at midnight</div>
                </div>
                {DAILY.map((d, i) => {
                  const on = save.daily.done.includes(i);
                  return (
                    <button key={i} onClick={() => toggleDaily(i)} style={{ ...row, opacity: on ? 0.6 : 1, cursor: on ? "default" : "pointer" }}>
                      <span style={{ ...tickBox, background: on ? GOLD : "transparent", borderColor: on ? GOLD : "rgba(255,255,255,.25)", color: "#1a1204" }}>{on ? "✓" : ""}</span>
                      <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 600, textDecoration: on ? "line-through" : "none" }}>{d}</span>
                      <span style={{ fontSize: 11, color: GOLD, fontWeight: 800 }}>+10</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* world map */}
            <div style={{ position: "relative", marginTop: 22 }}>
              <div style={{ position: "absolute", left: 27, top: 30, bottom: 30, width: 2, background: "linear-gradient(180deg, rgba(0,255,135,.6), rgba(255,255,255,.08))" }} />
              {WORLDS.map((w, wi) => {
                const clear = worldClear(w);
                const locked = !finished && wi > curWorld;
                const active = wi === curWorld;
                const n = w.steps.filter(stepDone).length;
                return (
                  <div key={w.id} style={{ position: "relative", paddingLeft: 68, marginBottom: 16, opacity: locked ? 0.45 : 1, animation: "gqRise .5s " + (wi * 0.06) + "s ease both" }}>
                    <div style={{ ...node, background: clear ? "linear-gradient(135deg,#00ff87,#00c86a)" : INK, borderColor: clear || active ? GREEN : "rgba(255,255,255,.16)", boxShadow: active ? "0 0 0 6px rgba(0,255,135,.12), 0 0 26px rgba(0,255,135,.5)" : "none", animation: active ? "gqPulse 2s ease-in-out infinite" : "none" }}>
                      <span style={{ fontSize: 24, filter: locked ? "grayscale(1)" : "none" }}>{locked ? "🔒" : clear ? "✓" : w.icon}</span>
                    </div>
                    <div style={{ ...card, padding: 16, borderColor: active ? "rgba(0,255,135,.3)" : "rgba(255,255,255,.08)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 9.5, letterSpacing: ".22em", color: clear ? GREEN : "rgba(255,255,255,.45)", fontWeight: 800 }}>{w.tag}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: clear ? GREEN : "rgba(255,255,255,.55)" }}>{clear ? "CLEARED" : n + "/" + w.steps.length}</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 3 }}>{w.name}</div>
                      {(active || clear) && <div style={{ color: "rgba(255,255,255,.55)", fontSize: 13, lineHeight: 1.45, marginTop: 5 }}>{w.intro}</div>}
                      {!locked && (
                        <div style={{ marginTop: 10 }}>
                          {w.steps.map((st, si) => {
                            const d = stepDone(st);
                            const avail = d || si === 0 || stepDone(w.steps[si - 1]);
                            const cur = avail && !d;
                            return (
                              <button key={st.id} disabled={!avail} onClick={() => { sTap(); setQi(0); setPick(null); setAlertMsg(""); setOpen(st); }}
                                style={{ ...row, opacity: avail ? 1 : 0.4, cursor: avail ? "pointer" : "default", borderColor: cur ? "rgba(0,255,135,.4)" : "rgba(255,255,255,.07)", background: cur ? "rgba(0,255,135,.07)" : "rgba(255,255,255,.025)" }}>
                                <span style={{ ...tickBox, background: d ? GREEN : "transparent", borderColor: d ? GREEN : cur ? GREEN : "rgba(255,255,255,.22)", color: "#06110c" }}>{d ? "✓" : !avail ? "" : ""}</span>
                                <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 700, color: d ? "rgba(255,255,255,.6)" : "#fff" }}>{st.title}</span>
                                <span style={{ fontSize: 11, color: d ? "rgba(255,255,255,.4)" : "#9affce", fontWeight: 800 }}>{d ? "done" : "+" + st.xp}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: "center", color: "rgba(255,255,255,.35)", fontSize: 11.5, lineHeight: 1.6, marginTop: 10 }}>
              Education only. Trading involves risk of loss and results are never guaranteed.<br />
              Need help? support@1houseglobal.com · <button onClick={reset} style={{ background: "none", border: "none", color: "rgba(255,255,255,.35)", fontSize: 11.5, textDecoration: "underline", cursor: "pointer", padding: 0 }}>reset progress</button>
            </div>
          </div>
        </>
      )}

      {/* quest sheet */}
      {open && (
        <div onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.66)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={sheet}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,.2)", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: ".22em", color: GREEN, fontWeight: 800 }}>{open.kind === "quiz" ? "BOSS FIGHT" : "QUEST"}</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: "#9affce", background: "rgba(0,255,135,.1)", borderRadius: 999, padding: "2px 8px" }}>+{open.xp} XP</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6, letterSpacing: "-.3px" }}>{open.title}</div>
            <p style={{ color: "rgba(255,255,255,.66)", fontSize: 14.5, lineHeight: 1.55, margin: "8px 0 14px" }}>{open.blurb}</p>

            {open.note && (
              <div style={{ borderRadius: 14, background: "rgba(0,0,0,.3)", border: "1px solid rgba(255,255,255,.07)", padding: "10px 14px", marginBottom: 14 }}>
                {open.note.map((n, i) => (<div key={i} style={{ fontSize: 13.5, lineHeight: 1.9, color: "rgba(255,255,255,.8)" }}><span style={{ color: GREEN, fontWeight: 900 }}>›</span> {n}</div>))}
              </div>
            )}

            {open.links && open.kind !== "quiz" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {open.links.map((l) => (<button key={l.label} onClick={() => openLink(l)} style={ghostBtn}>{l.label} ↗</button>))}
              </div>
            )}

            {stepDone(open) ? (
              <div style={{ color: GREEN, fontWeight: 800, fontSize: 14, textAlign: "center", padding: "10px 0" }}>✓ Quest complete</div>
            ) : open.kind === "task" ? (
              <button onClick={() => complete(open)} style={bigBtn}><span style={{ position: "relative", zIndex: 1 }}>✓  {open.done || "I did it"}</span><span style={sheen} /></button>
            ) : open.kind === "alerts" ? (
              <>
                <button onClick={() => armAlerts(open)} disabled={busy} style={{ ...bigBtn, opacity: busy ? 0.7 : 1 }}><span style={{ position: "relative", zIndex: 1 }}>{busy ? "Arming..." : "🔔  ARM ALERTS"}</span><span style={sheen} /></button>
                {alertMsg && <div style={{ color: GOLD, fontSize: 13, lineHeight: 1.5, marginTop: 10 }}>{alertMsg}</div>}
                {alertMsg && <button onClick={() => complete(open)} style={{ ...ghostBtn, marginTop: 10, width: "100%" }}>Continue anyway →</button>}
              </>
            ) : open.kind === "choice" && open.options ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {open.options.map((o, i) => (<button key={o} onClick={() => complete(open, { picks: { ...save.picks, [open.id]: i } })} style={{ ...ghostBtn, padding: "15px 14px", fontSize: 14.5 }}>{o}</button>))}
              </div>
            ) : open.kind === "list" && open.items ? (
              <div>
                {open.items.map((it, i) => {
                  const on = (save.lists[open.id] || []).includes(i);
                  return (
                    <button key={it} onClick={() => toggleList(open, i)} style={{ ...row, background: on ? "rgba(0,255,135,.08)" : "rgba(255,255,255,.025)", borderColor: on ? "rgba(0,255,135,.35)" : "rgba(255,255,255,.07)" }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,.4)", width: 20 }}>{String(i + 1).padStart(2, "0")}</span>
                      <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 700 }}>{it}</span>
                      <span style={{ ...tickBox, background: on ? GREEN : "transparent", borderColor: on ? GREEN : "rgba(255,255,255,.22)", color: "#06110c" }}>{on ? "✓" : ""}</span>
                    </button>
                  );
                })}
              </div>
            ) : open.kind === "quiz" && open.quiz ? (
              <div>
                <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
                  {open.quiz.map((_, i) => (<div key={i} style={{ flex: 1, height: 5, borderRadius: 5, background: i < qi ? GREEN : i === qi ? "rgba(0,255,135,.45)" : "rgba(255,255,255,.1)" }} />))}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.4, marginBottom: 12 }}>{open.quiz[qi].q}</div>
                {open.quiz[qi].a.map((a, i) => {
                  const right = i === open.quiz![qi].correct;
                  const chosen = pick === i;
                  const col = pick === null ? "rgba(255,255,255,.1)" : chosen ? (right ? GREEN : "#ff6b6b") : "rgba(255,255,255,.07)";
                  return (<button key={a} onClick={() => answer(open, i)} style={{ ...row, borderColor: col, background: chosen ? (right ? "rgba(0,255,135,.1)" : "rgba(255,107,107,.1)") : "rgba(255,255,255,.025)", animation: chosen && !right ? "gqShake .35s ease" : "none" }}><span style={{ flex: 1, textAlign: "left", fontSize: 14.5, fontWeight: 600 }}>{a}</span></button>);
                })}
                {pick !== null && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 13.5, lineHeight: 1.5, color: pick === open.quiz[qi].correct ? "#9affce" : GOLD }}>{pick === open.quiz[qi].correct ? "Correct. " + open.quiz[qi].why : "Not quite. Think it through and try again."}</div>
                    <button onClick={() => nextQ(open)} style={{ ...bigBtn, marginTop: 12, padding: "14px 0", fontSize: 15 }}><span style={{ position: "relative", zIndex: 1 }}>{pick === open.quiz[qi].correct ? (qi + 1 >= open.quiz.length ? "FINISH HIM  →" : "NEXT  →") : "TRY AGAIN"}</span></button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* reward toast */}
      {toast && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ textAlign: "center", animation: "gqPop .5s cubic-bezier(.2,.9,.3,1.4) both" }}>
            <div style={{ ...shine, fontSize: 40, fontWeight: 900, letterSpacing: "-1px", textShadow: "0 0 40px rgba(0,255,135,.5)" }}>{toast.big}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,.85)", marginTop: 6 }}>{toast.small}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const shell: CSSProperties = { position: "fixed", inset: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", background: `radial-gradient(130% 70% at 50% -10%, rgba(0,255,135,.12), transparent 55%), ${INK}`, color: "#fff", fontFamily: "var(--font-inter), Inter, system-ui, sans-serif" };
const orb: CSSProperties = { position: "fixed", width: 540, height: 540, borderRadius: "50%", filter: "blur(44px)", pointerEvents: "none" };
const shine: CSSProperties = { background: "linear-gradient(90deg,#fff,#9affce,#fff)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "gqShine 5s linear infinite" };
const hud: CSSProperties = { position: "sticky", top: 0, zIndex: 40, padding: "calc(10px + env(safe-area-inset-top)) 16px 12px", background: "linear-gradient(180deg, rgba(5,8,11,.94), rgba(5,8,11,.78) 70%, transparent)", backdropFilter: "blur(10px)" };
const rankBadge: CSSProperties = { flex: "0 0 auto", width: 36, height: 36, borderRadius: 11, background: "radial-gradient(circle at 50% 35%, #0c241b, #05080b)", border: "1px solid rgba(0,255,135,.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(0,255,135,.3)" };
const pill: CSSProperties = { flex: "0 0 auto", fontSize: 13, fontWeight: 800, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.04)", color: "#fff" };
const chip: CSSProperties = { fontSize: 12, fontWeight: 700, padding: "6px 11px", borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.75)" };
const card: CSSProperties = { borderRadius: 20, padding: 18, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 14px 40px rgba(0,0,0,.4)" };
const node: CSSProperties = { position: "absolute", left: 0, top: 6, width: 56, height: 56, borderRadius: 18, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#06110c", zIndex: 2 };
const row: CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", marginTop: 8, borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", color: "#fff", cursor: "pointer", fontFamily: "inherit", boxSizing: "border-box" };
const tickBox: CSSProperties = { flex: "0 0 auto", width: 22, height: 22, borderRadius: 7, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900 };
const bigBtn: CSSProperties = { position: "relative", overflow: "hidden", width: "100%", padding: "17px 0", borderRadius: 16, border: "none", cursor: "pointer", fontWeight: 900, fontSize: 16, letterSpacing: ".02em", color: "#06110c", background: "linear-gradient(135deg,#00ff87,#00d774)", boxShadow: "0 14px 38px rgba(0,255,135,.4)", fontFamily: "inherit" };
const ghostBtn: CSSProperties = { flex: 1, padding: "13px 12px", borderRadius: 13, border: "1px solid rgba(0,255,135,.4)", background: "rgba(0,255,135,.07)", color: "#fff", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" };
const sheen: CSSProperties = { position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)", backgroundSize: "200% 100%", animation: "gqShine 2.4s linear infinite", pointerEvents: "none" };
const sheet: CSSProperties = { width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", boxSizing: "border-box", borderRadius: "26px 26px 0 0", padding: "12px 20px calc(26px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg,#0d1512,#070b0e)", border: "1px solid rgba(0,255,135,.25)", borderBottom: "none", boxShadow: "0 -20px 60px rgba(0,0,0,.6)", animation: "gqSheet .32s cubic-bezier(.2,.9,.3,1) both" };

const KF = `
@keyframes gqA{0%,100%{transform:translate(-8%,-5%) scale(1)}50%{transform:translate(10%,8%) scale(1.22)}}
@keyframes gqB{0%,100%{transform:translate(8%,5%) scale(1.1)}50%{transform:translate(-10%,-8%) scale(1.3)}}
@keyframes gqShine{0%{background-position:0% 50%}100%{background-position:200% 50%}}
@keyframes gqRise{0%{opacity:0;transform:translateY(18px)}100%{opacity:1;transform:translateY(0)}}
@keyframes gqPop{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}
@keyframes gqBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes gqPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
@keyframes gqShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
@keyframes gqSheet{0%{transform:translateY(100%)}100%{transform:translateY(0)}}
`;
