"use client";

/* 1HOUSE x THE GREENPRINT : FIRST DOLLAR SYSTEM
   Standalone route. Imports nothing from the app. Progress saves on the device.
   Reads the Trading Sim save (/play) so sim levels auto complete. */

import { useEffect, useMemo, useRef, useState } from "react";

const G = "#00ff87";
const RED = "#ff5a6e";
const GOLD = "#ffd27a";
const INK = "#05080b";
const KEY = "gp_app_v1";
const LIVV = "https://members.livvfxtrading.com/client/register/6a65379bb16ad";
const CHAT = "https://t.me/TheGreenprintt";
const H1 = "https://1house.tv";
const OH = "https://www.1house.tv/educators/";
const V = "https://i.vimeocdn.com/video/";

type Step = { id: string; t: string; how: string; xp: number; kind?: string; links?: any[]; note?: string[]; done?: string; quiz?: any[]; lvl?: number; need?: any };
type Phase = { id: string; name: string; when: string; goal: string; icon: string; steps: Step[] };

const VIDS = [
  { slot: "First 48", title: "First 48: What to do your first 48 hours", by: "Marquel Ingram", img: V + "2204911244-ea93ef455ad533c2ed82806197c52f1e1b8d81f3e88117a5e42e2194f18e3893-d_640x360", href: OH + "marquel-ingram" },
  { slot: "Back to Basics", title: "Trading Basics: Brand New Subscriber", by: "Marquel Ingram", img: V + "2205299547-76b72f8b86ca9d6d92efa080a7dbd6d15beb0338d67c9cd0f9bccee38fa84575-d_640x360", href: OH + "marquel-ingram" },
  { slot: "The Candlestick Bible", title: "The Study Sesh: How to Read Candlesticks", by: "Marquel Ingram", img: V + "2203915730-8a3951198c3fa90591c36ad7820ba2051927e7b4ff49e64eea9223efc9b3214e-d_640x360", href: OH + "marquel-ingram" },
  { slot: "Forex Playbook", title: "Forex Playbook Series: Chapters 1 to 4", by: "Marquel Ingram", img: V + "2205614621-81ad54335dbc4f711de0ead37a51ecc3af0a65ebb4c02ce29d5e42af17b249e0-d_640x360", href: OH + "marquel-ingram" },
  { slot: "New Trader Start Here", title: "New Trader Start Here", by: "Arin Long", img: V + "2215147371-b3e77e2dcf94fb289b07af055e80e12173b2e354f1c90a67d20b36b786b5fe2f-d_640x360", href: OH + "arin-long" },
  { slot: "Partner Program Breakdown", title: "Partner Program Breakdown", by: "Imran Ritchie", img: V + "2196678830-08f1c58ee7a148adaa8520a3eb62ddae68fb85482be598be2e28292d8e001f8a-d_640x360", href: OH + "imran-ritchie" },
  { slot: "The Truth You Need to Be Rich", title: "The Truth About Success", by: "Dante Robinson", img: V + "2201618626-b77adc67816b121aa8c29c6f076add15de3f1e64533af9d3d875ed0afd08cbb6-d_640x360", href: OH + "dante-robinson" },
  { slot: "State of the Partnership", title: "Understanding the Partner Program", by: "Bryce Thompson", img: V + "2184902021-7ce8fa21ee8228325da02b03556781cb193a8c06a17cf7d7c866869b1730961f-d_640x360", href: OH + "bryce-thompson" },
];

const Q_MIND = [
  { q: "Whatever skill you learn, it takes...", a: ["90% skillset, 10% mindset", "90% mindset, 10% skillset", "50% luck, 50% timing"], c: 1, why: "90% mindset, 10% skillset. Trading is mostly psychology." },
  { q: "What does S.Y.S.T.E.M stand for?", a: ["Save Yourself Time, Energy and Money", "Study Your Setups Then Enter Markets", "Stack Your Savings To Earn More"], c: 0, why: "A system removes the guesswork and keeps you consistent." },
  { q: "Top down order for reading a chart?", a: ["5m, 1H, Daily, Weekly", "Weekly, Daily, 1H, then 5m to execute", "Daily, 5m, Weekly, 1H"], c: 1, why: "Big picture first, then drop to the 5m to execute." },
];
const Q_RISK = [
  { q: "When do you set your stop loss?", a: ["After the trade moves against me", "Before I enter, every time", "Only on big trades"], c: 1, why: "Your stop loss is set and known before you enter." },
  { q: "$300 account, 1% risk. What lot size does the guide give you?", a: ["0.01", "0.10", "1.0"], c: 0, why: "$100 to $500 at 1% risk is a 0.01 lot." },
  { q: "Price reaches TP1. What is the move?", a: ["Add more size", "Move my stop loss to breakeven or trail it", "Remove my stop loss"], c: 1, why: "Breakeven or trail at TP1. Win win." },
  { q: "You just took a loss and want it back now. What do you do?", a: ["Double my lot size", "Jump straight back in", "Step away. No revenge trading"], c: 2, why: "No revenge trading, no overtrading, no emotion." },
];

const PHASES: Phase[] = [
  { id: "p1", name: "Set Up", when: "Day 1", icon: "🎒", goal: "Get your tools and get in the room.", steps: [
    { id: "tg", t: "Download Telegram", xp: 20, how: "This is where the Greenprint chat and the free signals live. Download it and create your account.", links: [{ l: "Get Telegram", h: "https://telegram.org/apps", ios: "https://apps.apple.com/us/app/telegram-messenger/id686449807" }] },
    { id: "1h", t: "Download the 1House app", xp: 20, how: "Your streaming home. The educators go live here every day.", links: [{ l: "Get 1House", h: H1, ios: "https://apps.apple.com/us/app/1house/id6754260060" }] },
    { id: "tv", t: "Download TradingView", xp: 20, how: "Where you read and mark up charts. The free account is all you need.", links: [{ l: "Get TradingView", h: "https://www.tradingview.com", ios: "https://apps.apple.com/us/app/tradingview-track-all-markets/id1205990992" }] },
    { id: "tl", t: "Download TradeLocker", xp: 20, how: "The platform that connects to your broker so you can place trades.", links: [{ l: "Get TradeLocker", h: "https://tradelocker.com" }] },
    { id: "chat", t: "Join the Greenprint chat", xp: 25, how: "Questions, updates, the team, and the free signals all run through here.", links: [{ l: "Join the chat", h: CHAT }] },
    { id: "intro", t: "Introduce yourself in the chat", xp: 20, how: "Your name, where you are from, and what you want out of this. The people who talk get the most out of it.", links: [{ l: "Open the chat", h: CHAT }], done: "I introduced myself" },
    { id: "home", t: "Add this app to your Home Screen", xp: 25, kind: "home", how: "So it opens like a real app every day. iPhone: tap Share, then Add to Home Screen. Android: tap the menu, then Install app.", done: "I added it" },
    { id: "alerts", t: "Turn on alerts", xp: 25, kind: "alerts", how: "Calls and updates reach your phone the second they drop." },
    { id: "alarms", t: "Set alarms for 2 live sessions", xp: 20, how: "Watching profitable traders live is how you learn fastest. Set two alarms on your phone now. All times EST.", note: ["Mon to Fri 9:00 AM · The Heist", "Sun and Mon 10:00 PM · Basics with Naomi Brown", "Tue 7:00 PM · Basics with Arin Long", "Tue and Thu 11:00 PM · Live with Richard Hall"], done: "My alarms are set" },
  ] },
  { id: "p2", name: "Learn", when: "Days 1 to 3", icon: "🧠", goal: "Understand the game before you play it.", steps: [
    { id: "g8", t: "Watch the Great 8", xp: 80, kind: "videos", how: "The 8 videos to watch first, all on 1House. Tap a thumbnail to watch, then mark it watched." },
    { id: "qm", t: "Pass the Mindset Check", xp: 40, kind: "quiz", quiz: Q_MIND, how: "Three questions. Get them all right." },
    { id: "s1", t: "Pass Sim Level 1: Ride the Trend", xp: 40, kind: "sim", lvl: 1, how: "Practice money. Read the trend, set your stop loss below structure, take the trade." },
    { id: "s2", t: "Pass Sim Level 2: Leverage Correctly", xp: 40, kind: "sim", lvl: 2, how: "Use leverage so you only risk 1% to 3%. Over leverage and you fail, even if you win." },
    { id: "s3", t: "Pass Sim Level 3: Secure TP1", xp: 40, kind: "sim", lvl: 3, how: "At TP1, secure it and move your stop loss to breakeven." },
    { id: "mbs", t: "Learn the Market Bully Strategy", xp: 40, how: "Watch Arin Long break down the Market Bully Strategy in 4 steps, then catch one Richard Hall live session and watch it applied.", links: [{ l: "Arin Long", h: OH + "arin-long" }, { l: "Richard Hall", h: OH + "richard-hall" }], done: "I watched both" },
  ] },
  { id: "p3", name: "Practice", when: "Days 3 to 7", icon: "🎯", goal: "Prove it on demo before real money.", steps: [
    { id: "broker", t: "Open your LivvFX account", xp: 40, how: "Create your broker account under this link. You need it for demo and live.", links: [{ l: "Open LivvFX", h: LIVV }], done: "My account is open" },
    { id: "connect", t: "Connect TradeLocker to your demo", xp: 30, how: "Link your demo account in TradeLocker. Stuck? Ask in the chat.", links: [{ l: "TradeLocker", h: "https://tradelocker.com" }, { l: "Ask the chat", h: CHAT }], done: "I am connected" },
    { id: "qr", t: "Pass the Risk Check", xp: 40, kind: "quiz", quiz: Q_RISK, how: "Four questions. Protect the account first." },
    { id: "d3", t: "Log 3 demo trades with the rules", xp: 90, kind: "journal", need: { acct: "demo", n: 3 }, how: "Take 3 demo trades. Stop loss before entry, 1% to 3% risk, breakeven at TP1. Log each one in your Journal." },
  ] },
  { id: "p4", name: "Go Live", when: "Week 2", icon: "🔥", goal: "Your first real trade, done right.", steps: [
    { id: "btc", t: "Set up Bitcoin verification", xp: 30, how: "The simplest way to move money to and from your broker. Cash App or Coinbase. If neither works, message Jay.", links: [{ l: "Cash App", h: "https://cash.app", ios: "https://apps.apple.com/us/app/cash-app/id711923939" }, { l: "Coinbase", h: "https://www.coinbase.com", ios: "https://apps.apple.com/us/app/coinbase/id886427730" }], done: "I am verified" },
    { id: "fund", t: "Fund your live account", xp: 40, how: "Card or crypto. Only fund with money you can afford to lose. Start small.", done: "My account is funded" },
    { id: "l1", t: "Place your first live trade with a plan", xp: 100, kind: "journal", need: { acct: "live", n: 1 }, how: "Small size. Stop loss before entry. 1% risk. Log it in your Journal, win or lose." },
    { id: "proof", t: "Post your proof in the chat", xp: 30, how: "Drop a screenshot of your dashboard in the chat. That is your key to the free signals.", links: [{ l: "Post in the chat", h: CHAT }], done: "I posted it" },
  ] },
  { id: "p5", name: "First Dollar", when: "Week 2 onward", icon: "💵", goal: "Two roads. Whichever pays first unlocks the trophy.", steps: [
    { id: "green", t: "Road A: Close a green live trade", xp: 150, kind: "journal", need: { acct: "live", green: 1 }, how: "Keep running the plan on small size. Log every trade. Your first green one completes this road." },
    { id: "link", t: "Road B: Find your subscriber link", xp: 30, how: "It lives in your 1House dashboard. Know where it is.", links: [{ l: "Open 1House", h: H1 }], done: "I found my link" },
    { id: "list", t: "Road B: Write your list of 20", xp: 40, how: "Twenty names of people who would want this. Do not prejudge anyone.", done: "My list is written" },
    { id: "story", t: "Road B: Share your journey", xp: 40, how: "Post your setup, your sim score, or your demo results. Count eyes, not subs. Show the work.", done: "I posted it" },
    { id: "enroll", t: "Road B: Help your first person get started", xp: 150, how: "Invite one person from your list. Lead with impact, not a pitch. When they enroll through your link, you earn your first commission. Check your dashboard for current rates.", done: "My first person enrolled" },
  ] },
];

const SCHED = [
  { d: [1, 2, 3, 4, 5], h: 9, m: 0, n: "The Heist" },
  { d: [0, 1], h: 22, m: 0, n: "Basics with Naomi Brown" },
  { d: [2], h: 19, m: 0, n: "Basics with Arin Long" },
  { d: [2, 4], h: 23, m: 0, n: "Live with Richard Hall" },
  { d: [3], h: 13, m: 0, n: "Live with Richard Hall" },
  { d: [1, 3], h: 18, m: 45, n: "Sydney Hoop Session" },
];
const SIM_NAMES = ["Ride the Trend", "Leverage Correctly", "Secure TP1"];
const RANKS = ["Recruit", "Set Up", "Student", "Practicing Trader", "Live Trader", "Earner"];
const EMPTY: any = { hero: null, start: "", done: {}, vids: [], check: { date: "", a: {} }, days: {}, journal: [] };

const dayKey = (d = new Date()) => d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
const etNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
const fmt = (n: number) => (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2);
function urlB64(str: string) { const pad = "=".repeat((4 - (str.length % 4)) % 4); const raw = atob((str + pad).replace(/-/g, "+").replace(/_/g, "/")); const a = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i); return a; }

export default function FirstDollar() {
  const [s, setS] = useState<any>(EMPTY);
  const [sim, setSim] = useState<any>({ stars: {}, bal: 500 });
  const [env, setEnv] = useState<any>({ ios: false, standalone: false, perm: "default" });
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("today");
  const [open, setOpen] = useState<any>(null);
  const [logOpen, setLogOpen] = useState<any>(null);
  const [openPhase, setOpenPhase] = useState("");
  const [toast, setToast] = useState<any>(null);
  const [tick, setTick] = useState(0);
  const [qz, setQz] = useState<any>({ i: 0, pick: null });
  const [msg, setMsg] = useState("");
  const [nm, setNm] = useState("");
  const [why, setWhy] = useState(-1);
  const audio = useRef<any>(null);
  const canvas = useRef<any>(null);

  useEffect(() => {
    let v: any = EMPTY;
    try { const raw = localStorage.getItem(KEY); if (raw) v = { ...EMPTY, ...JSON.parse(raw) }; } catch (e) {}
    if (v.check.date !== dayKey()) v = { ...v, check: { date: dayKey(), a: {} } };
    setS(v);
    try { const sr = localStorage.getItem("gp_sim_v1"); if (sr) setSim(JSON.parse(sr)); } catch (e) {}
    setEnv({ ios: /iPhone|iPad|iPod/i.test(navigator.userAgent), standalone: (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || (navigator as any).standalone === true, perm: "Notification" in window ? Notification.permission : "na" });
    setLoaded(true);
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    const hidden: any[] = [];
    const hide = () => document.querySelectorAll("body *").forEach((el: any) => { const cs = getComputedStyle(el); if ((cs.position === "fixed" || cs.position === "sticky") && el.childElementCount < 6 && /educational purposes only/i.test(el.textContent || "") && !hidden.includes(el)) { hidden.push(el); el.style.display = "none"; } });
    hide(); const t = setTimeout(hide, 800);
    return () => { clearInterval(id); clearTimeout(t); hidden.forEach((el: any) => { el.style.display = ""; }); };
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} } }, [s, loaded]);

  /* sound + confetti */
  const tone = (f: number, d: number, w = 0, type: any = "triangle", g = 0.05) => { try { if (!audio.current) { const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (AC) audio.current = new AC(); } const ac = audio.current; if (!ac) return; if (ac.state === "suspended") ac.resume(); const o = ac.createOscillator(); const gn = ac.createGain(); const t0 = ac.currentTime + w; o.type = type; o.frequency.value = f; gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(g, t0 + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(gn); gn.connect(ac.destination); o.start(t0); o.stop(t0 + d + 0.02); } catch (e) {} };
  const buzz = (p: any) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
  const tap = () => { tone(420, 0.06, 0, "square", 0.03); buzz(8); };
  const burst = (n: number) => { const c = canvas.current; if (!c) return; c.width = innerWidth; c.height = innerHeight; const ctx = c.getContext("2d"); const ps = Array.from({ length: n }, () => { const a = Math.random() * 6.28; const sp = 4 + Math.random() * 10; return { x: c.width / 2, y: c.height * 0.35, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, l: 55 + Math.random() * 25, col: [G, GOLD, "#fff", "#9affce"][(Math.random() * 4) | 0] }; }); const f = () => { ctx.clearRect(0, 0, c.width, c.height); let alive = 0; ps.forEach((p) => { if (p.l <= 0) return; alive++; p.vy += 0.17; p.x += p.vx; p.y += p.vy; p.l--; ctx.globalAlpha = Math.min(1, p.l / 30); ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, 7, 4); }); if (alive) requestAnimationFrame(f); else ctx.clearRect(0, 0, c.width, c.height); }; f(); };
  const win = (bigOne?: boolean) => { (bigOne ? [392, 523, 659, 784, 1047, 1319] : [523, 659, 784, 1047]).forEach((f, i) => tone(f, bigOne ? 0.35 : 0.2, i * 0.07)); buzz(bigOne ? [20, 50, 30, 50, 60] : [12, 40, 18]); burst(bigOne ? 180 : 80); };
  const pop = (b: string, sm: string, ms = 1800) => { setToast({ big: b, small: sm, k: Date.now() }); setTimeout(() => setToast(null), ms); };

  /* progress engine */
  const J: any[] = s.journal || [];
  const isDone = (st: Step): boolean => {
    if (st.kind === "sim") return (sim.stars && (sim.stars[(st.lvl || 1) - 1] || 0) > 0) || !!s.done[st.id];
    if (st.kind === "journal") { const n = st.need; const list = J.filter((x) => x.acct === n.acct); return n.green ? list.some((x) => x.pnl > 0) : list.length >= n.n; }
    if (st.kind === "home") return !!s.done[st.id] || env.standalone;
    if (st.kind === "alerts") return !!s.done[st.id] || env.perm === "granted";
    if (st.kind === "videos") return (s.vids || []).length >= VIDS.length || !!s.done[st.id];
    return !!s.done[st.id];
  };
  const phaseDone = (p: Phase) => (p.id === "p5" ? isDone(p.steps[0]) || isDone(p.steps[4]) : p.steps.every(isDone));
  const curP = PHASES.findIndex((p) => !phaseDone(p));
  const allDone = curP === -1;
  const firstDollar = isDone(PHASES[4].steps[0]) || isDone(PHASES[4].steps[4]);
  const nextStep: any = allDone ? null : PHASES[curP].steps.find((st) => !isDone(st));
  const xp = useMemo(() => {
    let t = 0; PHASES.forEach((p) => p.steps.forEach((st) => { if (isDone(st)) t += st.xp; }));
    return t + Object.keys(s.days || {}).length * 10 + J.length * 15;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, sim, env]);
  const rank = allDone ? 5 : curP;
  const streak = (() => { let n = 0; const d = new Date(); if (!s.days[dayKey(d)]) d.setDate(d.getDate() - 1); while (s.days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); } return n; })();
  const dayN = s.start ? Math.max(1, Math.floor((Date.now() - new Date(s.start).getTime()) / 86400000) + 1) : 1;

  /* live sessions (EST) */
  const live = useMemo(() => {
    const now = etNow(); const out: any[] = [];
    for (let k = 0; k < 8; k++) { const day = new Date(now); day.setDate(now.getDate() + k); SCHED.forEach((x) => { if (x.d.includes(day.getDay())) { const t = new Date(day); t.setHours(x.h, x.m, 0, 0); const diff = t.getTime() - now.getTime(); if (diff > -90 * 60000) out.push({ n: x.n, t, diff }); } }); }
    out.sort((a, b) => a.diff - b.diff); return out[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
  const liveLabel = !live ? "" : live.diff <= 0 ? "LIVE NOW" : live.diff < 3600000 ? "Starts in " + Math.ceil(live.diff / 60000) + " min" : live.t.toLocaleDateString("en-US", { weekday: "short" }) + " " + live.t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + " EST";

  /* actions */
  const mark = (st: Step) => {
    if (s.done[st.id]) { setOpen(null); return; }
    const p = PHASES.find((x) => x.steps.some((y) => y.id === st.id)) as Phase;
    const willClear = p.id === "p5" ? st.id === "enroll" : p.steps.every((y) => y.id === st.id || isDone(y));
    setS((v: any) => ({ ...v, done: { ...v.done, [st.id]: true } }));
    setOpen(null); setQz({ i: 0, pick: null }); setMsg("");
    if (willClear) { win(true); pop(p.id === "p5" ? "FIRST DOLLAR" : p.name.toUpperCase() + " COMPLETE", p.id === "p5" ? "You did it the right way." : "Next phase unlocked.", 2800); }
    else { win(); pop("+" + st.xp + " XP", st.t, 1400); }
  };
  const link = (l: any) => { tap(); window.open(env.ios && l.ios ? l.ios : l.h, "_blank", "noopener"); };
  const arm = async (st: Step) => {
    tap(); setMsg("");
    if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window)) { setMsg("This browser cannot turn on alerts here. On iPhone, add this app to your Home Screen first, then try again."); return; }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js"); const perm = await Notification.requestPermission();
      if (perm !== "granted") { setMsg("Alerts are off. You can turn them on in your phone settings anytime."); return; }
      try { const d = await fetch("/api/chat?kind=push").then((r) => r.json()); if (d && d.key) { await navigator.serviceWorker.ready; const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(d.key) }); await fetch("/api/chat?kind=push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "subscribe", subscription: sub }) }); } } catch (e) {}
      setEnv((x: any) => ({ ...x, perm: "granted" })); mark(st);
    } catch (e) { setMsg("Something hiccuped. Try again."); }
  };
  const toggleVid = (i: number) => {
    const have: number[] = s.vids || []; const next = have.includes(i) ? have.filter((x) => x !== i) : have.concat(i);
    setS((v: any) => ({ ...v, vids: next }));
    if (!have.includes(i)) { tone(660, 0.1); tone(990, 0.14, 0.06); if (next.length === VIDS.length) { win(); pop("GREAT 8 COMPLETE", "+80 XP", 1600); } }
  };
  const answer = (quiz: any[], i: number) => {
    if (qz.pick !== null) return; const ok = i === quiz[qz.i].c; setQz({ ...qz, pick: i });
    if (ok) { tone(660, 0.1); tone(880, 0.14, 0.07); } else { tone(150, 0.25, 0, "sawtooth", 0.04); buzz(60); }
  };
  const nextQ = (quiz: any[], st: Step) => { const ok = qz.pick === quiz[qz.i].c; if (!ok) { setQz({ ...qz, pick: null }); return; } if (qz.i + 1 >= quiz.length) mark(st); else setQz({ i: qz.i + 1, pick: null }); };
  const blankTrade = (acct: string, sign = 1) => ({ acct, sym: "XAUUSD", dir: "buy", pnl: "", sign, sl: true, risk: true, be: false, plan: true, note: "" });

  const setCheck = (k: string, val: any) => {
    const a = { ...s.check.a, [k]: val }; const need = ["live", "chart", "trade"].concat(isDone(PHASES[4].steps[2]) ? ["reach"] : []);
    const complete = need.every((x) => a[x] !== undefined);
    const wasDone = !!s.days[dayKey()];
    setS((v: any) => ({ ...v, check: { date: dayKey(), a }, days: complete ? { ...v.days, [dayKey()]: true } : v.days }));
    tap();
    if (k === "trade" && (val === "green" || val === "red")) setLogOpen(blankTrade(isDone(PHASES[3].steps[1]) ? "live" : "demo", val === "green" ? 1 : -1));
    if (complete && !wasDone) setTimeout(() => { win(); pop("DAY LOCKED IN", "Streak: " + (streak + 1) + (streak + 1 === 1 ? " day" : " days"), 2200); }, 250);
  };
  const saveTrade = () => {
    const amt = Math.abs(parseFloat(logOpen.pnl || "0")) * logOpen.sign;
    if (isNaN(amt)) return;
    const e = { id: Date.now(), ts: Date.now(), acct: logOpen.acct, sym: logOpen.sym, dir: logOpen.dir, pnl: Math.round(amt * 100) / 100, sl: logOpen.sl, risk: logOpen.risk, be: logOpen.be, plan: logOpen.plan, note: logOpen.note };
    const firstGreen = e.acct === "live" && e.pnl > 0 && !J.some((x) => x.acct === "live" && x.pnl > 0);
    setS((v: any) => ({ ...v, journal: [e].concat(v.journal || []) }));
    setLogOpen(null);
    if (firstGreen) { win(true); pop("FIRST GREEN LIVE TRADE", "Done the right way. Road A complete.", 3000); }
    else { win(); pop("TRADE LOGGED", "+15 XP", 1300); }
  };

  const stats = (() => { const n = J.length; const w = J.filter((x) => x.pnl > 0).length; const net = J.reduce((a, x) => a + x.pnl, 0); const rules = n ? Math.round((J.filter((x) => x.sl && x.risk && x.plan).length / n) * 100) : 0; return { n, wr: n ? Math.round((w / n) * 100) : 0, net, rules }; })();

  const create = () => { const nmv = (nm.trim() || "Trader").slice(0, 18); setS((v: any) => ({ ...v, hero: { name: nmv, why }, start: v.start || new Date().toISOString() })); win(true); pop("WELCOME, " + nmv.toUpperCase(), "Your First Dollar System is live.", 2400); };
  const reset = () => { if (window.confirm("Reset all progress on this device?")) { setS({ ...EMPTY, check: { date: dayKey(), a: {} } }); } };
  const name = (s.hero && s.hero.name) || "Trader";
  const guide = allDone ? name + ", you made your first dollar the right way. Now it is about consistency. Check in every day, journal every trade, and keep helping people start."
    : "Day " + dayN + ", " + name + ". You are in Phase " + (curP + 1) + ": " + PHASES[curP].name + ". " + PHASES[curP].goal + " Your next move is below.";

  if (!loaded) return <div style={{ position: "fixed", inset: 0, background: INK }} />;

  if (!s.hero) return (
    <div style={shell}><style dangerouslySetInnerHTML={{ __html: KF }} /><canvas ref={canvas} style={cv} />
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "calc(40px + env(safe-area-inset-top)) 20px 60px", textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: ".32em", color: G, fontWeight: 800 }}>{"1HOUSE × THE GREENPRINT"}</div>
        <div style={{ fontSize: 64, margin: "14px 0 0", animation: "fdBob 3s ease-in-out infinite" }}>{"💵"}</div>
        <h1 style={{ ...shine, margin: "8px 0 0", fontSize: 40, fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1.02 }}>{"THE FIRST DOLLAR SYSTEM"}</h1>
        <p style={{ color: "rgba(255,255,255,.65)", fontSize: 15, lineHeight: 1.55, margin: "14px auto 0" }}>{"Five phases, in order. Get set up, learn the game, prove it on demo, go live, then earn your first dollar in 1House the right way. Check in every day and it keeps you on track."}</p>
        <div style={{ ...card, marginTop: 22, textAlign: "left" }}>
          <div style={lab}>{"YOUR NAME"}</div>
          <input value={nm} onChange={(e: any) => setNm(e.target.value)} maxLength={18} placeholder="What should we call you?" style={inp} />
          <div style={{ ...lab, marginTop: 16 }}>{"WHAT IS YOUR FIRST DOLLAR FOR?"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            {["Replace my 9 to 5", "Grow my account", "Build a business", "Take care of family"].map((w, i) => (<button key={w} onClick={() => { tap(); setWhy(i); }} style={{ ...ghost, borderColor: why === i ? G : "rgba(255,255,255,.12)", background: why === i ? "rgba(0,255,135,.12)" : "rgba(255,255,255,.03)" }}>{w}</button>))}
          </div>
        </div>
        <button disabled={why < 0} onClick={create} style={{ ...big, marginTop: 16, opacity: why < 0 ? 0.45 : 1 }}>{why < 0 ? "PICK YOUR WHY" : "START MY SYSTEM  →"}</button>
      </div>
      {toast && <Toast t={toast} />}
    </div>
  );

  const stepRow = (st: Step, active: boolean) => { const d = isDone(st); const nx = !d && st === nextStep; return (
    <button key={st.id} onClick={() => { if (!active && !d) { tone(150, 0.15, 0, "sawtooth", 0.03); pop("LOCKED", "Finish the phase before this one", 1100); return; } tap(); setQz({ i: 0, pick: null }); setMsg(""); setOpen(st); }} style={{ ...row, borderColor: nx ? "rgba(0,255,135,.45)" : "rgba(255,255,255,.07)", background: nx ? "rgba(0,255,135,.07)" : "rgba(255,255,255,.025)", opacity: active || d ? 1 : 0.45 }}>
      <span style={{ ...tk, background: d ? G : "transparent", borderColor: d || nx ? G : "rgba(255,255,255,.22)" }}>{d ? "✓" : ""}</span>
      <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 700, color: d ? "rgba(255,255,255,.55)" : "#fff" }}>{st.t}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: d ? "rgba(255,255,255,.35)" : "#9affce" }}>{d ? "done" : "+" + st.xp}</span>
    </button>); };

  const yesNo = (k: string, q: string, opts: any[]) => (
    <div style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{q}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>{opts.map((o: any) => { const on = s.check.a[k] === o[0]; return (<button key={o[0]} onClick={() => setCheck(k, o[0])} style={{ flex: 1, padding: "10px 4px", borderRadius: 11, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", border: "1px solid " + (on ? o[2] : "rgba(255,255,255,.12)"), background: on ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)", color: on ? o[2] : "#fff" }}>{o[1]}</button>); })}</div>
    </div>);

  return (
    <div style={shell}>
      <style dangerouslySetInnerHTML={{ __html: KF }} /><canvas ref={canvas} style={cv} />
      <div style={hud}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            <div style={{ fontSize: 11, color: G, fontWeight: 800, letterSpacing: ".08em" }}>{RANKS[rank].toUpperCase() + " · " + xp + " XP"}</div>
          </div>
          <div style={{ ...pill, color: GOLD }}>{"🔥 " + streak}</div>
          <div style={{ ...pill, color: firstDollar ? G : "rgba(255,255,255,.5)" }}>{firstDollar ? "💵 Earned" : "💵 " + (allDone ? 5 : curP) + "/5"}</div>
        </div>
        <div style={{ maxWidth: 480, margin: "10px auto 0", display: "flex", gap: 4 }}>{PHASES.map((p, i) => (<div key={p.id} style={{ flex: 1, height: 6, borderRadius: 6, background: phaseDone(p) ? G : i === curP ? "rgba(0,255,135,.35)" : "rgba(255,255,255,.08)" }} />))}</div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "10px 14px calc(110px + env(safe-area-inset-bottom))" }}>
        {tab === "today" && (<div style={{ animation: "fdRise .35s ease both" }}>
          <div style={card}><Guide text={guide} /></div>
          {nextStep && (<button onClick={() => { tap(); setQz({ i: 0, pick: null }); setMsg(""); setOpen(nextStep); }} style={{ ...card, width: "100%", marginTop: 12, textAlign: "left", cursor: "pointer", color: "#fff", fontFamily: "inherit", borderColor: "rgba(0,255,135,.45)", background: "linear-gradient(160deg, rgba(0,255,135,.12), rgba(255,255,255,.03))" }}>
            <div style={{ ...lab, color: G }}>{"YOUR NEXT MOVE · PHASE " + (curP + 1) + " · " + PHASES[curP].when.toUpperCase()}</div>
            <div style={{ fontSize: 19, fontWeight: 900, marginTop: 6 }}>{nextStep.t}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}><span style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)" }}>{PHASES[curP].steps.filter(isDone).length + " of " + PHASES[curP].steps.length + " done in " + PHASES[curP].name}</span><span style={{ fontSize: 13, fontWeight: 900, color: "#06110c", background: G, borderRadius: 10, padding: "7px 12px" }}>{"GO  →"}</span></div>
          </button>)}
          {live && (<div style={{ ...card, marginTop: 12, display: "flex", alignItems: "center", gap: 12, borderColor: live.diff <= 0 ? "rgba(255,90,110,.5)" : "rgba(255,255,255,.1)" }}>
            <div style={{ fontSize: 26 }}>{live.diff <= 0 ? "🔴" : "📺"}</div>
            <div style={{ flex: 1 }}><div style={{ ...lab, color: live.diff <= 0 ? RED : GOLD }}>{live.diff <= 0 ? "LIVE NOW ON 1HOUSE" : "NEXT LIVE SESSION"}</div><div style={{ fontSize: 15, fontWeight: 800, marginTop: 3 }}>{live.n}</div><div style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>{liveLabel}</div></div>
            <button onClick={() => link({ h: H1 })} style={{ ...ghost, flex: "0 0 auto", padding: "10px 12px" }}>{"Watch"}</button>
          </div>)}
          <div style={{ ...card, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ ...lab, color: GOLD }}>{"DAILY CHECK-IN"}</div><div style={{ fontSize: 11, fontWeight: 800, color: s.days[dayKey()] ? G : "rgba(255,255,255,.45)" }}>{s.days[dayKey()] ? "✓ DAY LOCKED IN" : "RESETS AT MIDNIGHT"}</div></div>
            {yesNo("live", "Did you plug into a live session today?", [["yes", "Yes", G], ["no", "Not yet", "#fff"]])}
            {yesNo("chart", "Did you mark up a chart today?", [["yes", "Yes", G], ["no", "Not yet", "#fff"]])}
            {yesNo("trade", "Did you trade today?", [["green", "Green", G], ["red", "Red", RED], ["none", "No trade", "#fff"]])}
            {isDone(PHASES[4].steps[2]) && yesNo("reach", "Did you reach out to someone on your list?", [["yes", "Yes", G], ["no", "Not yet", "#fff"]])}
            <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "center" }}>{Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const on = !!s.days[dayKey(d)]; return (<div key={i} style={{ textAlign: "center" }}><div style={{ width: 26, height: 26, borderRadius: 9, background: on ? G : "rgba(255,255,255,.06)", border: "1px solid " + (on ? G : "rgba(255,255,255,.1)"), color: "#06110c", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{on ? "✓" : ""}</div><div style={{ fontSize: 9, color: "rgba(255,255,255,.4)", marginTop: 3 }}>{"SMTWTFS"[d.getDay()]}</div></div>); })}</div>
          </div>
        </div>)}

        {tab === "path" && (<div style={{ animation: "fdRise .35s ease both" }}>
          <div style={{ ...card, textAlign: "center", borderColor: firstDollar ? "rgba(0,255,135,.5)" : "rgba(255,210,122,.3)" }}>
            <div style={{ fontSize: 34, filter: firstDollar ? "none" : "grayscale(1) opacity(.5)" }}>{"🏆"}</div>
            <div style={{ fontSize: 16, fontWeight: 900, marginTop: 4 }}>{firstDollar ? "First Dollar earned" : "The First Dollar Trophy"}</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)", marginTop: 4 }}>{"Complete the phases in order. Phase 5 unlocks it."}</div>
          </div>
          {PHASES.map((p, i) => { const unlocked = i <= (allDone ? 4 : curP); const pd = phaseDone(p); const expanded = openPhase ? openPhase === p.id : i === curP; const n = p.steps.filter(isDone).length; return (
            <div key={p.id} style={{ ...card, marginTop: 12, opacity: unlocked ? 1 : 0.5, borderColor: i === curP ? "rgba(0,255,135,.4)" : pd ? "rgba(0,255,135,.25)" : "rgba(255,255,255,.1)" }}>
              <button onClick={() => { tap(); setOpenPhase(expanded ? "none" : p.id); }} style={{ display: "flex", width: "100%", alignItems: "center", gap: 12, background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, fontFamily: "inherit", textAlign: "left" }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: pd ? "linear-gradient(135deg,#00ff87,#00c86a)" : "rgba(255,255,255,.05)", border: "1px solid " + (pd ? G : "rgba(255,255,255,.12)") }}>{pd ? "✓" : unlocked ? p.icon : "🔒"}</div>
                <div style={{ flex: 1 }}><div style={{ ...lab, color: pd ? G : "rgba(255,255,255,.5)" }}>{"PHASE " + (i + 1) + " · " + p.when.toUpperCase()}</div><div style={{ fontSize: 17, fontWeight: 900, marginTop: 2 }}>{p.name}</div></div>
                <div style={{ fontSize: 12, fontWeight: 800, color: pd ? G : "rgba(255,255,255,.55)" }}>{n + "/" + p.steps.length}</div>
              </button>
              {expanded && (<div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", marginBottom: 2 }}>{unlocked ? p.goal : "Finish Phase " + i + " to unlock."}</div>
                {p.steps.map((st) => stepRow(st, unlocked))}
              </div>)}
            </div>); })}
        </div>)}

        {tab === "sim" && (<div style={{ animation: "fdRise .35s ease both" }}>
          <div style={card}>
            <div style={{ ...lab, color: G }}>{"TRADING SIM · PRACTICE MONEY"}</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, color: (sim.bal || 500) >= 500 ? G : RED }}>{fmt(sim.bal || 500)}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", marginTop: 4, lineHeight: 1.5 }}>{"Practice every rule before you risk a real dollar. Set your stop loss and take profit, then watch the candles play out live."}</div>
            {SIM_NAMES.map((n, i) => { const st = (sim.stars && sim.stars[i]) || 0; const opened = i < (sim.unlocked || 1); return (
              <div key={n} style={{ ...row, cursor: "default" }}><span style={{ fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,.45)", width: 52 }}>{"LEVEL " + (i + 1)}</span><span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 700, opacity: opened ? 1 : 0.45 }}>{opened ? n : "🔒 " + n}</span><span style={{ color: GOLD, fontSize: 13 }}>{[0, 1, 2].map((k) => (k < st ? "★" : "☆")).join("")}</span></div>); })}
            <a href="/play" style={{ ...big, display: "block", textAlign: "center", textDecoration: "none", marginTop: 14, boxSizing: "border-box" }}>{"▶  PLAY THE SIM"}</a>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", textAlign: "center", marginTop: 10 }}>{"Market Bully Strategy levels are coming next."}</div>
          </div>
        </div>)}

        {tab === "journal" && (<div style={{ animation: "fdRise .35s ease both" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["TRADES", String(stats.n), "#fff"], ["WIN RATE", stats.wr + "%", "#fff"], ["NET P&L", fmt(stats.net), stats.net >= 0 ? G : RED], ["RULES FOLLOWED", stats.rules + "%", stats.rules >= 80 ? G : GOLD]].map((x) => (<div key={x[0]} style={{ ...card, padding: 14 }}><div style={lab}>{x[0]}</div><div style={{ fontSize: 22, fontWeight: 900, marginTop: 4, color: x[2] }}>{x[1]}</div></div>))}
          </div>
          <button onClick={() => { tap(); setLogOpen(blankTrade(isDone(PHASES[3].steps[1]) ? "live" : "demo")); }} style={{ ...big, marginTop: 12 }}>{"+  LOG A TRADE"}</button>
          {J.length === 0 && <div style={{ textAlign: "center", color: "rgba(255,255,255,.45)", fontSize: 13.5, marginTop: 18, lineHeight: 1.5 }}>{"No trades yet. Every demo and live trade goes here, win or lose. That is how you track real progress."}</div>}
          {J.map((x) => (<div key={x.id} style={{ ...card, marginTop: 10, padding: 13, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 800 }}>{x.sym + " · " + (x.dir === "buy" ? "Buy" : "Sell")}<span style={{ fontSize: 10, fontWeight: 900, marginLeft: 8, padding: "2px 6px", borderRadius: 6, background: x.acct === "live" ? "rgba(255,90,110,.18)" : "rgba(255,255,255,.08)", color: x.acct === "live" ? "#ff9aa6" : "rgba(255,255,255,.6)" }}>{x.acct.toUpperCase()}</span></div><div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)", marginTop: 3 }}>{new Date(x.ts).toLocaleDateString() + " · " + [x.sl ? "SL set" : "no SL", x.risk ? "1-3% risk" : "over leveraged", x.plan ? "followed plan" : "off plan"].join(" · ")}</div></div>
            <div style={{ fontSize: 16, fontWeight: 900, color: x.pnl >= 0 ? G : RED }}>{(x.pnl >= 0 ? "+" : "") + fmt(x.pnl)}</div>
            <button onClick={() => { if (window.confirm("Delete this trade?")) setS((v: any) => ({ ...v, journal: v.journal.filter((y: any) => y.id !== x.id) })); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,.3)", fontSize: 16, cursor: "pointer" }}>{"×"}</button>
          </div>))}
          <div style={{ textAlign: "center", marginTop: 20 }}><button onClick={reset} style={{ background: "none", border: "none", color: "rgba(255,255,255,.3)", fontSize: 11.5, textDecoration: "underline", cursor: "pointer" }}>{"reset all progress"}</button></div>
        </div>)}
      </div>

      <div style={nav}>
        {[["today", "⚡", "Today"], ["path", "🗺️", "Path"], ["sim", "📈", "Sim"], ["journal", "📓", "Journal"]].map((t) => (<button key={t[0]} onClick={() => { tap(); setTab(t[0]); setOpenPhase(""); }} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", color: tab === t[0] ? G : "rgba(255,255,255,.5)", fontFamily: "inherit", padding: "6px 0" }}><div style={{ fontSize: 20, filter: tab === t[0] ? "none" : "grayscale(1)" }}>{t[1]}</div><div style={{ fontSize: 10.5, fontWeight: 800, marginTop: 2 }}>{t[2]}</div></button>))}
      </div>

      {open && (<div onClick={() => setOpen(null)} style={ov}><div onClick={(e: any) => e.stopPropagation()} style={sheet}>
        <div style={grab} />
        <div style={lab}>{"PHASE " + (PHASES.findIndex((p) => p.steps.includes(open)) + 1) + " · +" + open.xp + " XP"}</div>
        <div style={{ fontSize: 21, fontWeight: 900, marginTop: 4 }}>{open.t}</div>
        <div style={{ marginTop: 10 }}><Guide text={open.how} /></div>
        {open.note && <div style={{ ...card, marginTop: 10, padding: 12 }}>{open.note.map((x: string) => (<div key={x} style={{ fontSize: 13.5, lineHeight: 1.85 }}><span style={{ color: G, fontWeight: 900 }}>{"› "}</span>{x}</div>))}</div>}
        {open.links && <div style={{ display: "flex", gap: 8, marginTop: 10 }}>{open.links.map((l: any) => (<button key={l.l} onClick={() => link(l)} style={ghost}>{l.l + " ↗"}</button>))}</div>}
        {open.kind === "videos" && (<>
          <div style={{ ...lab, marginTop: 14, color: GOLD }}>{(s.vids || []).length + " OF 8 WATCHED"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>{VIDS.map((v, i) => { const on = (s.vids || []).includes(i); return (
            <div key={v.slot} style={{ borderRadius: 14, overflow: "hidden", border: "2px solid " + (on ? G : "rgba(255,255,255,.1)"), background: "rgba(255,255,255,.03)" }}>
              <button onClick={() => link({ h: v.href })} aria-label={"Watch " + v.slot} style={{ position: "relative", display: "block", width: "100%", aspectRatio: "16 / 9", border: "none", padding: 0, cursor: "pointer", background: "#000 center/cover no-repeat url(" + v.img + ")" }}><span style={{ position: "absolute", left: 6, top: 5, fontSize: 10, fontWeight: 900, color: "#fff", background: "rgba(0,0,0,.6)", borderRadius: 6, padding: "1px 5px" }}>{"#" + (i + 1)}</span><span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 28, height: 28, borderRadius: 99, background: "rgba(0,0,0,.6)", border: "1px solid rgba(255,255,255,.6)", color: "#fff", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{"▶"}</span></span></button>
              <div style={{ padding: "7px 8px 8px" }}><div style={{ fontSize: 12.5, fontWeight: 900 }}>{v.slot}</div><div style={{ fontSize: 10.5, color: "rgba(255,255,255,.5)", marginTop: 2, minHeight: 26, lineHeight: 1.25 }}>{v.title}</div><div style={{ fontSize: 11, color: "#9affce", fontWeight: 700, marginTop: 2 }}>{v.by}</div>
                <button onClick={() => toggleVid(i)} style={{ marginTop: 6, width: "100%", padding: "7px 0", borderRadius: 9, border: "1px solid " + (on ? G : "rgba(255,255,255,.18)"), background: on ? "rgba(0,255,135,.15)" : "transparent", color: on ? G : "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{on ? "✓ Watched" : "Mark watched"}</button></div>
            </div>); })}</div>
        </>)}
        {open.kind === "quiz" && !isDone(open) && (() => { const quiz = open.quiz; const q = quiz[qz.i]; const ok = qz.pick !== null && qz.pick === q.c; return (<div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>{quiz.map((_: any, i: number) => (<div key={i} style={{ flex: 1, height: 5, borderRadius: 5, background: i < qz.i ? G : i === qz.i ? "rgba(0,255,135,.4)" : "rgba(255,255,255,.1)" }} />))}</div>
          <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.4 }}>{q.q}</div>
          {q.a.map((a: string, i: number) => { const ch = qz.pick === i; return (<button key={a} onClick={() => answer(quiz, i)} style={{ ...row, borderColor: ch ? (i === q.c ? G : RED) : "rgba(255,255,255,.12)", background: ch ? (i === q.c ? "rgba(0,255,135,.12)" : "rgba(255,90,110,.12)") : "rgba(255,255,255,.03)", animation: ch && i !== q.c ? "fdShake .35s ease" : "none" }}><span style={{ flex: 1, textAlign: "left", fontSize: 14.5, fontWeight: 700 }}>{a}</span></button>); })}
          {qz.pick !== null && (<><div style={{ fontSize: 13.5, marginTop: 10, color: ok ? "#9affce" : GOLD }}>{ok ? "Correct. " + q.why : "Not quite. Think it through and try again."}</div><button onClick={() => nextQ(quiz, open)} style={{ ...big, marginTop: 10 }}>{ok ? (qz.i + 1 >= quiz.length ? "FINISH  →" : "NEXT  →") : "TRY AGAIN"}</button></>)}
        </div>); })()}
        {open.kind === "sim" && !isDone(open) && <a href="/play" style={{ ...big, display: "block", textAlign: "center", textDecoration: "none", marginTop: 14, boxSizing: "border-box" }}>{"▶  PLAY LEVEL " + open.lvl}</a>}
        {open.kind === "journal" && !isDone(open) && (<><div style={{ fontSize: 13, color: GOLD, fontWeight: 800, marginTop: 12 }}>{open.need.green ? "Waiting on your first green live trade in the Journal." : J.filter((x) => x.acct === open.need.acct).length + " of " + open.need.n + " " + open.need.acct + " trades logged"}</div><button onClick={() => { const a = open.need.acct; setOpen(null); setLogOpen(blankTrade(a)); }} style={{ ...big, marginTop: 10 }}>{"+  LOG A TRADE"}</button></>)}
        {open.kind === "alerts" && !isDone(open) && (<><button onClick={() => arm(open)} style={{ ...big, marginTop: 14 }}>{"🔔  TURN ON ALERTS"}</button>{msg && <div style={{ color: GOLD, fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{msg}</div>}{msg && <button onClick={() => mark(open)} style={{ ...ghost, width: "100%", marginTop: 8 }}>{"Continue anyway"}</button>}</>)}
        {(!open.kind || open.kind === "home") && !isDone(open) && <button onClick={() => mark(open)} style={{ ...big, marginTop: 14 }}>{"✓  " + (open.done || "I did it")}</button>}
        {isDone(open) && <div style={{ color: G, fontWeight: 900, textAlign: "center", marginTop: 14 }}>{"✓ Complete"}</div>}
      </div></div>)}

      {logOpen && (<div onClick={() => setLogOpen(null)} style={ov}><div onClick={(e: any) => e.stopPropagation()} style={sheet}>
        <div style={grab} />
        <div style={{ fontSize: 21, fontWeight: 900 }}>{"Log a trade"}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>{["demo", "live"].map((a) => (<button key={a} onClick={() => setLogOpen({ ...logOpen, acct: a })} style={{ ...seg, borderColor: logOpen.acct === a ? G : "rgba(255,255,255,.12)", color: logOpen.acct === a ? G : "#fff" }}>{a === "demo" ? "Demo" : "Live"}</button>))}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>{["XAUUSD", "NAS100", "US30", "Other"].map((a) => (<button key={a} onClick={() => setLogOpen({ ...logOpen, sym: a })} style={{ ...seg, fontSize: 12, borderColor: logOpen.sym === a ? G : "rgba(255,255,255,.12)", color: logOpen.sym === a ? G : "#fff" }}>{a}</button>))}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>{[["buy", "▲ Buy"], ["sell", "▼ Sell"]].map((a) => (<button key={a[0]} onClick={() => setLogOpen({ ...logOpen, dir: a[0] })} style={{ ...seg, borderColor: logOpen.dir === a[0] ? G : "rgba(255,255,255,.12)", color: logOpen.dir === a[0] ? G : "#fff" }}>{a[1]}</button>))}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {[[1, "Win", G], [-1, "Loss", RED]].map((a: any) => (<button key={a[1]} onClick={() => setLogOpen({ ...logOpen, sign: a[0] })} style={{ ...seg, flex: "0 0 74px", borderColor: logOpen.sign === a[0] ? a[2] : "rgba(255,255,255,.12)", color: logOpen.sign === a[0] ? a[2] : "#fff" }}>{a[1]}</button>))}
          <input inputMode="decimal" value={logOpen.pnl} onChange={(e: any) => setLogOpen({ ...logOpen, pnl: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="Amount in $" style={{ ...inp, marginTop: 0, flex: 1 }} />
        </div>
        <div style={{ ...lab, marginTop: 14 }}>{"DID YOU FOLLOW THE RULES?"}</div>
        {[["sl", "Stop loss set before entry"], ["risk", "Risk kept at 1% to 3%"], ["be", "Moved to breakeven at TP1"], ["plan", "Followed my plan, no emotion"]].map((r) => (<button key={r[0]} onClick={() => setLogOpen({ ...logOpen, [r[0]]: !logOpen[r[0]] })} style={{ ...row, padding: "11px 12px" }}><span style={{ ...tk, background: logOpen[r[0]] ? G : "transparent", borderColor: logOpen[r[0]] ? G : "rgba(255,255,255,.25)" }}>{logOpen[r[0]] ? "✓" : ""}</span><span style={{ flex: 1, textAlign: "left", fontSize: 13.5, fontWeight: 700 }}>{r[1]}</span></button>))}
        <input value={logOpen.note} onChange={(e: any) => setLogOpen({ ...logOpen, note: e.target.value })} placeholder="What did you learn? (optional)" style={inp} />
        <button disabled={!logOpen.pnl} onClick={saveTrade} style={{ ...big, marginTop: 14, opacity: logOpen.pnl ? 1 : 0.45 }}>{"SAVE TRADE"}</button>
      </div></div>)}

      {toast && <Toast t={toast} />}
    </div>
  );
}

function Guide({ text }: { text: string }) {
  const [k, setK] = useState(0);
  useEffect(() => { setK(0); const id = setInterval(() => setK((v: number) => { if (v >= text.length) { clearInterval(id); return v; } return v + 2; }), 16); return () => clearInterval(id); }, [text]);
  return (<div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
    <div style={{ flex: "0 0 auto", width: 36, height: 36, borderRadius: 12, background: "radial-gradient(circle at 50% 30%, #12382a, #05080b)", border: "1px solid rgba(0,255,135,.5)", boxShadow: "0 0 16px rgba(0,255,135,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: G, fontSize: 17 }}>{"G"}</div>
    <div onClick={() => setK(text.length)} style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,.88)", cursor: "pointer", minHeight: 21 }}>{text.slice(0, k)}</div>
  </div>);
}
function Toast({ t }: { t: any }) {
  return (<div style={{ position: "fixed", inset: 0, zIndex: 95, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}><div key={t.k} style={{ textAlign: "center", animation: "fdPop .45s cubic-bezier(.2,.9,.3,1.4) both", padding: "0 20px" }}><div style={{ ...shine, fontSize: 36, fontWeight: 900, letterSpacing: "-1px" }}>{t.big}</div><div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,.88)", marginTop: 6, textShadow: "0 2px 10px #000" }}>{t.small}</div></div></div>);
}

const shell: any = { position: "fixed", inset: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", background: "radial-gradient(130% 70% at 50% -10%, rgba(0,255,135,.11), transparent 55%), " + INK, color: "#fff", fontFamily: "var(--font-inter), Inter, system-ui, sans-serif" };
const cv: any = { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 90 };
const hud: any = { position: "sticky", top: 0, zIndex: 40, padding: "calc(10px + env(safe-area-inset-top)) 14px 10px", background: "linear-gradient(180deg, rgba(5,8,11,.97), rgba(5,8,11,.88) 80%, transparent)", backdropFilter: "blur(10px)" };
const nav: any = { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, display: "flex", maxWidth: 480, margin: "0 auto", padding: "6px 8px calc(8px + env(safe-area-inset-bottom))", background: "rgba(7,11,14,.94)", borderTop: "1px solid rgba(255,255,255,.08)", backdropFilter: "blur(12px)" };
const pill: any = { flex: "0 0 auto", fontSize: 12.5, fontWeight: 800, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.04)" };
const card: any = { borderRadius: 18, padding: 16, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", boxSizing: "border-box" };
const lab: any = { fontSize: 10, letterSpacing: ".18em", color: "rgba(255,255,255,.5)", fontWeight: 800 };
const inp: any = { width: "100%", boxSizing: "border-box", marginTop: 8, padding: "13px 14px", borderRadius: 13, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 16, outline: "none", fontFamily: "inherit" };
const row: any = { width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", marginTop: 8, borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", color: "#fff", cursor: "pointer", fontFamily: "inherit", boxSizing: "border-box" };
const tk: any = { flex: "0 0 auto", width: 22, height: 22, borderRadius: 7, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#06110c" };
const big: any = { width: "100%", padding: "16px 0", borderRadius: 15, border: "none", cursor: "pointer", fontWeight: 900, fontSize: 15.5, color: "#06110c", background: "linear-gradient(135deg,#00ff87,#00d774)", boxShadow: "0 12px 34px rgba(0,255,135,.32)", fontFamily: "inherit" };
const ghost: any = { flex: 1, padding: "12px 10px", borderRadius: 12, border: "1px solid rgba(0,255,135,.4)", background: "rgba(0,255,135,.07)", color: "#fff", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" };
const seg: any = { flex: 1, padding: "11px 4px", borderRadius: 11, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" };
const ov: any = { position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center" };
const sheet: any = { width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxSizing: "border-box", borderRadius: "24px 24px 0 0", padding: "12px 18px calc(26px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg,#0d1512,#070b0e)", border: "1px solid rgba(0,255,135,.25)", borderBottom: "none", animation: "fdSheet .3s cubic-bezier(.2,.9,.3,1) both" };
const grab: any = { width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,.2)", margin: "0 auto 14px" };
const shine: any = { background: "linear-gradient(90deg,#fff,#9affce,#fff)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "fdShine 5s linear infinite" };
const KF = "@keyframes fdShine{0%{background-position:0% 50%}100%{background-position:200% 50%}}@keyframes fdRise{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}@keyframes fdPop{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}@keyframes fdBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes fdShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}@keyframes fdSheet{0%{transform:translateY(100%)}100%{transform:translateY(0)}}";
