"use client";

/* 1HOUSE x THE GREENPRINT : THE CLIMB
   A standalone onboarding game. Additive only: imports nothing from the app.
   Progress saves on the device. Alerts reuse the app's /api/chat?kind=push flow. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const G = "#00ff87";
const INK = "#05080b";
const GOLD = "#ffd27a";
const RED = "#ff5a6e";
const KEY = "gp_climb_v3";
const LIVV = "https://members.livvfxtrading.com/client/register/6a65379bb16ad";
const CHAT = "https://t.me/TheGreenprintt";
const V = "https://i.vimeocdn.com/video/";
const OH = "https://www.1house.tv/educators/";

type Q = { q: string; a: string[]; c: number; why: string };
type Vid = { slot: string; title: string; by: string; img: string; href: string };
type Step = {
  id: string; kind: "task" | "alerts" | "choice" | "cards" | "boss"; xp: number; icon: string; title: string; say: string;
  links?: { label: string; href: string; ios?: string }[]; note?: string[]; done?: string; options?: string[]; vids?: Vid[];
  boss?: { name: string; face: string; taunt: string; qs: Q[] };
};
type World = { id: string; name: string; badge: string; badgeIcon: string; steps: Step[] };

const VIDS: Vid[] = [
  { slot: "First 48", title: "First 48: What to do your first 48 hours", by: "Marquel Ingram", img: V + "2204911244-ea93ef455ad533c2ed82806197c52f1e1b8d81f3e88117a5e42e2194f18e3893-d_640x360", href: OH + "marquel-ingram" },
  { slot: "Back to Basics", title: "Trading Basics: Brand New Subscriber", by: "Marquel Ingram", img: V + "2205299547-76b72f8b86ca9d6d92efa080a7dbd6d15beb0338d67c9cd0f9bccee38fa84575-d_640x360", href: OH + "marquel-ingram" },
  { slot: "The Candlestick Bible", title: "The Study Sesh: How to Read Candlesticks", by: "Marquel Ingram", img: V + "2203915730-8a3951198c3fa90591c36ad7820ba2051927e7b4ff49e64eea9223efc9b3214e-d_640x360", href: OH + "marquel-ingram" },
  { slot: "Forex Playbook", title: "Forex Playbook Series: Chapters 1 to 4", by: "Marquel Ingram", img: V + "2205614621-81ad54335dbc4f711de0ead37a51ecc3af0a65ebb4c02ce29d5e42af17b249e0-d_640x360", href: OH + "marquel-ingram" },
  { slot: "New Trader Start Here", title: "New Trader Start Here", by: "Arin Long", img: V + "2215147371-b3e77e2dcf94fb289b07af055e80e12173b2e354f1c90a67d20b36b786b5fe2f-d_640x360", href: OH + "arin-long" },
  { slot: "Partner Program Breakdown", title: "Partner Program Breakdown", by: "Imran Ritchie", img: V + "2196678830-08f1c58ee7a148adaa8520a3eb62ddae68fb85482be598be2e28292d8e001f8a-d_640x360", href: OH + "imran-ritchie" },
  { slot: "The Truth You Need to Be Rich", title: "The Truth About Success", by: "Dante Robinson", img: V + "2201618626-b77adc67816b121aa8c29c6f076add15de3f1e64533af9d3d875ed0afd08cbb6-d_640x360", href: OH + "dante-robinson" },
  { slot: "State of the Partnership", title: "Understanding the Partner Program", by: "Bryce Thompson", img: V + "2184902021-7ce8fa21ee8228325da02b03556781cb193a8c06a17cf7d7c866869b1730961f-d_640x360", href: OH + "bryce-thompson" },
];

const WORLDS: World[] = [
  { id: "w1", name: "Gear Up", badge: "Geared Up", badgeIcon: "🎒", steps: [
    { id: "tg", kind: "task", xp: 25, icon: "💬", title: "Download Telegram", say: "Yo {n}, first move. Every trader needs their tools. Telegram is where the community chat and the free signals live. Download it and make your account.", links: [{ label: "Get Telegram", href: "https://telegram.org/apps", ios: "https://apps.apple.com/us/app/telegram-messenger/id686449807" }] },
    { id: "1h", kind: "task", xp: 25, icon: "📺", title: "Download the 1House app", say: "Next up, the 1House app. This is your streaming home, where the educators go live every single day.", links: [{ label: "Get 1House", href: "https://1house.tv", ios: "https://apps.apple.com/us/app/1house/id6754260060" }] },
    { id: "tv", kind: "task", xp: 25, icon: "📈", title: "Download TradingView", say: "TradingView is where you read and mark up the charts. A free account is all you need right now.", links: [{ label: "Get TradingView", href: "https://www.tradingview.com", ios: "https://apps.apple.com/us/app/tradingview-track-all-markets/id1205990992" }] },
    { id: "tl", kind: "task", xp: 25, icon: "⚡", title: "Get TradeLocker", say: "Last tool. TradeLocker connects to your broker so you can actually place trades. Works on the app or desktop.", links: [{ label: "Get TradeLocker", href: "https://tradelocker.com" }] },
  ] },
  { id: "w2", name: "Plug In", badge: "Plugged In", badgeIcon: "🔌", steps: [
    { id: "chat", kind: "task", xp: 30, icon: "👥", title: "Join the Greenprint chat", say: "Tools mean nothing alone, {n}. Get in the room. Questions, updates, the team, and the free signals all run through this chat.", links: [{ label: "Join the chat", href: CHAT }] },
    { id: "intro", kind: "task", xp: 20, icon: "👋", title: "Introduce yourself", say: "Drop a message in the chat. Your name, where you are from, and what you want out of this. The people who talk get the most out of it.", links: [{ label: "Open the chat", href: CHAT }], done: "I introduced myself" },
    { id: "streams", kind: "task", xp: 30, icon: "⭐", title: "Follow your streamers", say: "Open 1House and follow the stream channels so you never miss a live session.", links: [{ label: "Open 1House", href: "https://1house.tv" }], done: "I followed the streams" },
    { id: "alerts", kind: "alerts", xp: 30, icon: "🔔", title: "Arm your alerts", say: "Turn on alerts so calls and updates reach your phone the second they drop." },
    { id: "alarms", kind: "task", xp: 20, icon: "⏰", title: "Set two alarms", say: "Watching profitable traders live is how you learn fastest. Pick two sessions and set alarms on your phone right now. All times EST.", note: ["Mon to Fri 9:00 AM · The Heist", "Sun and Mon 10:00 PM · Basics with Naomi Brown", "Tue 7:00 PM · Basics with Arin Long", "Tue and Thu 11:00 PM · Live with Richard Hall", "Wed 1:00 PM · Live with Richard Hall"], done: "My alarms are set" },
  ] },
  { id: "w3", name: "Boot Camp", badge: "Scholar", badgeIcon: "🧠", steps: [
    { id: "great8", kind: "cards", xp: 80, icon: "🎬", title: "Collect the Great 8", say: "Your first 72 hours, {n}. Collect all 8 cards. Tap a card to watch it on 1House, then mark it collected when you finish.", vids: VIDS },
    { id: "boss1", kind: "boss", xp: 90, icon: "😈", title: "Boss: The Doubt", say: "Boss ahead. The Doubt tells everybody they cannot learn this. Prove it wrong.", boss: { name: "THE DOUBT", face: "😈", taunt: "You really think you can learn this?", qs: [
      { q: "Whatever skill you learn, it takes...", a: ["90% skillset, 10% mindset", "90% mindset, 10% skillset", "50% luck, 50% timing"], c: 1, why: "90% mindset, 10% skillset. Trading is mostly psychology." },
      { q: "What does S.Y.S.T.E.M stand for?", a: ["Save Yourself Time, Energy and Money", "Study Your Setups Then Enter Markets", "Stack Your Savings To Earn More"], c: 0, why: "A system removes the guesswork and keeps you consistent." },
      { q: "What is the top down order for reading a chart?", a: ["5m, 1H, Daily, Weekly", "Daily, 5m, Weekly, 1H", "Weekly, Daily, 1H, then 5m to execute"], c: 2, why: "Start with the big picture, then drop to the 5m to execute." },
    ] } },
  ] },
  { id: "w4", name: "The Vault", badge: "Vault Keeper", badgeIcon: "🏦", steps: [
    { id: "broker", kind: "task", xp: 40, icon: "🏦", title: "Open your broker account", say: "Time to build your vault. Create your LivvFX account. You need it to trade live or on demo.", links: [{ label: "Open LivvFX account", href: LIVV }], done: "My account is open" },
    { id: "btc", kind: "task", xp: 30, icon: "₿", title: "Set up Bitcoin verification", say: "The simplest way to move money to and from your broker. Verify Bitcoin on Cash App, or use Coinbase. If neither works for you, message Jay directly.", links: [{ label: "Cash App", href: "https://cash.app", ios: "https://apps.apple.com/us/app/cash-app/id711923939" }, { label: "Coinbase", href: "https://www.coinbase.com", ios: "https://apps.apple.com/us/app/coinbase/id886427730" }], done: "I am verified" },
    { id: "fund", kind: "choice", xp: 50, icon: "💵", title: "Choose your path", say: "Go live with card or crypto, or start on demo and practice first. Both paths count the same here. Only ever fund with money you can afford to lose.", options: ["I funded my live account", "I am starting on demo"] },
    { id: "connect", kind: "task", xp: 40, icon: "🔗", title: "Connect TradeLocker", say: "Link your live or demo account to TradeLocker so you can place a trade. Stuck? Ask in the chat and someone will walk you through it.", links: [{ label: "Open TradeLocker", href: "https://tradelocker.com" }, { label: "Ask in the chat", href: CHAT }], done: "I am connected" },
  ] },
  { id: "w5", name: "Live Fire", badge: "Sharpshooter", badgeIcon: "🎯", steps: [
    { id: "boss2", kind: "boss", xp: 100, icon: "👹", title: "Boss: The Revenge Trader", say: "Before you touch the market, you face The Revenge Trader. He has blown more accounts than anyone. Protect the account first.", boss: { name: "THE REVENGE TRADER", face: "👹", taunt: "Just took a loss? Double the lot and win it back.", qs: [
      { q: "When do you set your stop loss?", a: ["After the trade moves against me", "Before I enter, every time", "Only on big trades"], c: 1, why: "Your stop loss is set and known before you enter." },
      { q: "$300 account, 1% risk. What lot size does the guide give you?", a: ["0.01", "0.10", "1.0"], c: 0, why: "$100 to $500 at 1% risk is a 0.01 lot. Size every trade to your balance." },
      { q: "Price reaches TP1. What is the move?", a: ["Add more size", "Move my stop loss to breakeven or trail it", "Remove my stop loss"], c: 1, why: "Breakeven or trail at TP1. From there it is a win either way." },
      { q: "You just took a loss and want it back right now. What do you do?", a: ["Double my lot size", "Jump straight back in", "Step away. No revenge trading"], c: 2, why: "No revenge trading, no overtrading, no emotion. Blow an account in a day and that is gambling." },
    ] } },
    { id: "trade", kind: "task", xp: 100, icon: "🎯", title: "Place your first trade", say: "This is where it gets real, {n}. Demo or live. Stop loss set before you enter. Lot size matched to your account. That is the whole assignment.", note: ["Stop loss set before entry", "Lot size from the guide (1% to 3% risk)", "At TP1, move to breakeven or trail"], done: "I placed my first trade" },
    { id: "proof", kind: "task", xp: 50, icon: "📸", title: "Post your proof", say: "Drop a screenshot of your dashboard in the chat. That is your key to the free signals.", links: [{ label: "Post in the chat", href: CHAT }], done: "I posted it" },
  ] },
  { id: "w6", name: "The Summit", badge: "Climber", badgeIcon: "🏔️", steps: [
    { id: "journal", kind: "task", xp: 30, icon: "📓", title: "Start your journal", say: "Track every trade. Entry, stop loss, result, and what you learned. Notes app, notebook, anything. Just start it today.", done: "My journal is started" },
    { id: "link", kind: "task", xp: 30, icon: "🔑", title: "Find your subscriber link", say: "Your personal link lives in your 1House dashboard. Know where it is so you are ready when someone asks how you got started.", links: [{ label: "Open 1House", href: "https://1house.tv" }], done: "I found my link" },
    { id: "list", kind: "task", xp: 30, icon: "📝", title: "Write your list", say: "Pen up. Write 20 names of people who would want this. Do not prejudge anyone. You help someone else get a result before you get yours.", done: "My list is written" },
    { id: "boss3", kind: "boss", xp: 100, icon: "🛋️", title: "Final Boss: The Comfort Zone", say: "Last fight, {n}. The Comfort Zone keeps more people stuck than any market ever will.", boss: { name: "THE COMFORT ZONE", face: "🛋️", taunt: "Stay here. It is comfy. Why build anything?", qs: [
      { q: "Right now, what should you count?", a: ["Subs", "Eyes", "Likes"], c: 1, why: "Count eyes, not subs. Attention is the asset." },
      { q: "What comes first?", a: ["Income", "Impact", "Followers"], c: 1, why: "Impact first. Income follows." },
      { q: "How many names go on your list?", a: ["5", "20", "100"], c: 1, why: "20 names. Do not prejudge anyone." },
    ] } },
  ] },
];

const RANKS: [number, string][] = [[0, "Recruit"], [150, "Rookie"], [300, "Plugged In"], [480, "Student of the Game"], [660, "Operator"], [900, "Trader"], [1150, "Greenprint Certified"]];
const DAILY = ["Plug into a live stream", "Mark up one chart on TradingView", "Check in with the chat"];
const TIPS = ["Stop loss set before entry. Every time.", "At TP1, move to breakeven or trail. Win win.", "Trading is 90% psychology, 10% trading.", "Start low. 1% to 3% risk per trade.", "Top down: Weekly, Daily, 1H, then 5m to execute.", "No revenge trading. No overtrading. No emotion.", "Engagement has a direct correlation to your success.", "Count eyes, not subs.", "Impact first. Income follows.", "Watching profitable traders live is how you learn fastest.", "If you blow an account in one day, that is gambling, not trading."];
const AVATARS = ["🦁", "🐺", "🦅", "🐉", "🦈", "🐂", "🐆", "🦊"];
const WHYS = ["Replace my 9 to 5", "Grow my account", "Build a business", "Learn a real skill"];
const OFF = [0, 66, 98, 66, 0, -66, -98, -66];

const EMPTY: any = { hero: null, done: {}, lists: {}, picks: {}, chests: {}, bonus: 0, streak: { last: "", count: 0 }, daily: { date: "", done: [] }, dailyChest: "" };
const dayKey = (d = new Date()) => d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
const rankOf = (x: number) => { let r = 0; for (let i = 0; i < RANKS.length; i++) if (x >= RANKS[i][0]) r = i; return r; };
function urlB64ToUint8(str: string) {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const raw = atob((str + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function Type({ text }: { text: string }) {
  const [k, setK] = useState(0);
  useEffect(() => {
    setK(0);
    const id = setInterval(() => setK((v: number) => { if (v >= text.length) { clearInterval(id); return v; } return v + 1; }), 16);
    return () => clearInterval(id);
  }, [text]);
  return (<span onClick={() => setK(text.length)} style={{ cursor: "pointer" }}>{text.slice(0, k)}<span style={{ opacity: k < text.length ? 1 : 0, color: G }}>▍</span></span>);
}

function Guide({ text, small }: { text: string; small?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{ flex: "0 0 auto", width: small ? 36 : 44, height: small ? 36 : 44, borderRadius: 14, background: "radial-gradient(circle at 50% 30%, #12382a, #05080b)", border: "1px solid rgba(0,255,135,.5)", boxShadow: "0 0 18px rgba(0,255,135,.35)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: G, fontSize: small ? 17 : 20, animation: "gqBob 3s ease-in-out infinite" }}>G</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".2em", color: G, fontWeight: 800, marginBottom: 4 }}>{"G · YOUR GUIDE"}</div>
        <div style={{ position: "relative", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "4px 16px 16px 16px", padding: "10px 13px", fontSize: small ? 13.5 : 14.5, lineHeight: 1.5, color: "rgba(255,255,255,.9)", minHeight: 22 }}><Type text={text} /></div>
      </div>
    </div>
  );
}

export default function Climb() {
  const [s, setS] = useState<any>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState("title");
  const [ios, setIos] = useState(false);
  const [muted, setMuted] = useState(false);
  const [open, setOpen] = useState<any>(null);
  const [boss, setBoss] = useState<any>(null);
  const [chest, setChest] = useState<any>(null);
  const [toast, setToast] = useState<any>(null);
  const [drawer, setDrawer] = useState(false);
  const [shakeId, setShakeId] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [xpShown, setXpShown] = useState(0);
  const [cName, setCName] = useState("");
  const [cAv, setCAv] = useState(0);
  const [cWhy, setCWhy] = useState(-1);

  const audioRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const partsRef = useRef<any[]>([]);
  const rafRef = useRef<any>(null);
  const curRef = useRef<any>(null);

  /* load, save, streak */
  useEffect(() => {
    let v: any = EMPTY;
    try { const raw = localStorage.getItem(KEY); if (raw) v = { ...EMPTY, ...JSON.parse(raw) }; } catch (e) {}
    const t = dayKey();
    if (v.hero && v.streak.last !== t) { const y = dayKey(new Date(Date.now() - 86400000)); v = { ...v, streak: { last: t, count: v.streak.last === y ? v.streak.count + 1 : 1 } }; }
    if (v.daily.date !== t) v = { ...v, daily: { date: t, done: [] } };
    setS(v);
    if (v.hero) setScreen("map");
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} } }, [s, loaded]);
  useEffect(() => {
    const hidden: any[] = [];
    const hide = () => document.querySelectorAll("body *").forEach((el: any) => {
      const st = getComputedStyle(el);
      if ((st.position === "fixed" || st.position === "sticky") && el.childElementCount < 6 && /educational purposes only/i.test(el.textContent || "") && !hidden.includes(el)) { hidden.push(el); el.dataset.gpPrev = el.style.display; el.style.display = "none"; }
    });
    hide(); const t = setTimeout(hide, 800);
    return () => { clearTimeout(t); hidden.forEach((el: any) => { el.style.display = el.dataset.gpPrev || ""; }); };
  }, []);

  /* progress */
  const nodes = useMemo(() => {
    const out: any[] = [];
    WORLDS.forEach((w, wi) => { out.push({ t: "banner", w, wi, key: "b" + w.id }); w.steps.forEach((st) => out.push({ t: "step", st, w, wi, key: st.id })); out.push({ t: "chest", w, wi, key: "c" + w.id }); });
    return out;
  }, []);
  const isDone = (n: any) => (n.t === "step" ? !!s.done[n.st.id] : n.t === "chest" ? !!s.chests[n.w.id] : true);
  const playable = nodes.filter((n: any) => n.t !== "banner");
  const curIdx = playable.findIndex((n: any) => !isDone(n));
  const finished = curIdx === -1;
  const cur = finished ? null : playable[curIdx];

  const partial = (st: Step) => (st.kind === "cards" && st.vids && !s.done[st.id] ? Math.round(((s.lists[st.id] || []).length / st.vids.length) * st.xp * 0.5) : 0);
  const xp = useMemo(() => {
    let t = s.bonus;
    WORLDS.forEach((w) => w.steps.forEach((st) => { t += s.done[st.id] ? st.xp : partial(st); }));
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);
  const rank = rankOf(xp);
  const nextAt = rank < RANKS.length - 1 ? RANKS[rank + 1][0] : RANKS[rank][0];
  const prevAt = RANKS[rank][0];
  const pct = nextAt === prevAt ? 100 : Math.max(0, Math.min(100, ((xpShown - prevAt) / (nextAt - prevAt)) * 100));
  const badgeCount = WORLDS.filter((w) => s.chests[w.id]).length + WORLDS.reduce((a, w) => a + w.steps.filter((st) => st.kind === "boss" && s.done[st.id]).length, 0);

  useEffect(() => {
    let raf = 0; const from = xpShown; const t0 = performance.now();
    const step = (now: number) => { const t = Math.min(1, (now - t0) / 650); setXpShown(Math.round(from + (xp - from) * (1 - Math.pow(1 - t, 3)))); if (t < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xp]);

  useEffect(() => { if (screen === "map") setTimeout(() => { if (curRef.current) curRef.current.scrollIntoView({ behavior: "smooth", block: "center" }); }, 350); }, [screen, curIdx]);

  /* sound, haptics, confetti */
  const tone = useCallback((f: number, d: number, when = 0, type: any = "triangle", g = 0.05) => {
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
  const buzz = (p: any) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
  const sTap = () => { tone(420, 0.07, 0, "square", 0.03); buzz(8); };
  const sWin = () => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.22, i * 0.07)); buzz([12, 40, 18]); };
  const sBig = () => { [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, 0.4, i * 0.08, "triangle", 0.06)); buzz([20, 50, 30, 50, 60]); };
  const sBad = () => { tone(150, 0.22, 0, "sawtooth", 0.05); buzz(60); };
  const sHit = () => { tone(220, 0.08, 0, "square", 0.06); tone(880, 0.12, 0.05, "triangle", 0.05); buzz([10, 20, 30]); };

  const tick = useCallback(() => {
    const c = canvasRef.current; const ctx = c ? c.getContext("2d") : null;
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of partsRef.current) {
      p.vy += 0.16; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 36));
      ctx.fillStyle = p.color; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
    }
    partsRef.current = partsRef.current.filter((p: any) => p.life > 0 && p.y < c.height + 40);
    if (partsRef.current.length) rafRef.current = requestAnimationFrame(tick);
    else { rafRef.current = null; ctx.clearRect(0, 0, c.width, c.height); }
  }, []);
  const burst = useCallback((n = 90) => {
    const c = canvasRef.current; if (!c) return;
    c.width = window.innerWidth; c.height = window.innerHeight;
    const colors = [G, "#9affce", "#ffffff", "#00c86a", GOLD];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2; const sp = 4 + Math.random() * 11;
      partsRef.current.push({ x: c.width / 2, y: c.height * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, rot: Math.random() * 3, vr: (Math.random() - 0.5) * 0.4, s: 5 + Math.random() * 7, color: colors[(Math.random() * colors.length) | 0], life: 44 + Math.random() * 26 });
    }
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const pop = (big: string, small: string, ms = 2000) => { setToast({ big, small, k: Date.now() }); setTimeout(() => setToast(null), ms); };
  const name = (s.hero && s.hero.name) || "Trader";
  const say = (t: string) => t.replace(/\{n\}/g, name);

  /* actions */
  const create = () => {
    const nm = (cName.trim() || "Trader").slice(0, 18);
    setS((v: any) => ({ ...v, hero: { name: nm, av: AVATARS[cAv], why: cWhy }, bonus: v.bonus + 50, streak: { last: dayKey(), count: 1 } }));
    setScreen("map"); sBig(); burst(130); pop("+50 XP", "Character created. Your climb starts now.", 2400);
  };

  const completeStep = (st: Step, extra?: any) => {
    if (s.done[st.id]) { setOpen(null); return; }
    const before = rankOf(xp);
    const after = rankOf(xp + st.xp - partial(st));
    const w = WORLDS.find((x) => x.steps.some((y) => y.id === st.id)) as World;
    const clears = w.steps.every((y) => y.id === st.id || s.done[y.id]);
    setS((v: any) => ({ ...v, ...(extra || {}), done: { ...v.done, [st.id]: true } }));
    setOpen(null); setAlertMsg("");
    if (after > before) { sBig(); burst(150); pop("RANK UP", RANKS[after][1], 2600); }
    else if (clears) { sBig(); burst(130); pop(w.name.toUpperCase() + " CLEARED", "A chest just dropped on the map. Open it.", 2600); }
    else { sWin(); burst(70); pop("+" + st.xp + " XP", st.title, 1500); }
  };

  const openLink = (l: any) => { sTap(); window.open(ios && l.ios ? l.ios : l.href, "_blank", "noopener"); };

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
      setBusy(false); completeStep(st);
    } catch (e) { setBusy(false); setAlertMsg("Something hiccuped. Try again, or continue and do it in the app."); }
  };

  const toggleCard = (st: Step, i: number) => {
    const have = s.lists[st.id] || [];
    const next = have.includes(i) ? have.filter((x: number) => x !== i) : have.concat(i);
    if (st.vids && next.length === st.vids.length) { completeStep(st, { lists: { ...s.lists, [st.id]: next } }); return; }
    setS((v: any) => ({ ...v, lists: { ...v.lists, [st.id]: next } }));
    if (!have.includes(i)) { tone(660, 0.1); tone(990, 0.14, 0.06); buzz(14); pop("CARD COLLECTED", next.length + " of 8", 1100); } else sTap();
  };

  const startBoss = (st: Step) => { setOpen(null); setBoss({ st, qi: 0, hp: 100, hearts: 3, pick: null, phase: "intro", hit: 0 }); tone(110, 0.5, 0, "sawtooth", 0.05); tone(98, 0.6, 0.25, "sawtooth", 0.05); buzz([40, 60, 40]); };
  const bossAnswer = (i: number) => {
    if (!boss || boss.pick !== null) return;
    const qs = boss.st.boss.qs; const q = qs[boss.qi];
    if (i === q.c) { sHit(); setBoss({ ...boss, pick: i, hp: Math.max(0, boss.hp - Math.ceil(100 / qs.length)), hit: boss.hit + 1 }); }
    else { sBad(); setFlash(true); setTimeout(() => setFlash(false), 380); setBoss({ ...boss, pick: i, hearts: boss.hearts - 1 }); }
  };
  const bossNext = () => {
    const qs = boss.st.boss.qs; const right = boss.pick === qs[boss.qi].c;
    if (right) { if (boss.qi + 1 >= qs.length) { setBoss({ ...boss, phase: "win", pick: null }); sBig(); burst(220); } else setBoss({ ...boss, qi: boss.qi + 1, pick: null }); }
    else if (boss.hearts <= 0) setBoss({ ...boss, phase: "lose", pick: null });
    else setBoss({ ...boss, pick: null });
  };

  const openChest = (w: World | null) => setChest({ w, taps: 0, opened: false, xp: w ? 30 + Math.floor(Math.random() * 41) : 10 + Math.floor(Math.random() * 21), tip: TIPS[Math.floor(Math.random() * TIPS.length)] });
  const tapChest = () => {
    if (!chest || chest.opened) return;
    const t = chest.taps + 1;
    tone(260 + t * 140, 0.12, 0, "square", 0.045); buzz(12 * t);
    if (t >= 3) { setChest({ ...chest, taps: t, opened: true }); sBig(); burst(170); } else setChest({ ...chest, taps: t });
  };
  const claimChest = () => {
    const c = chest; setChest(null);
    if (c.w) {
      const last = c.w.id === WORLDS[WORLDS.length - 1].id;
      setS((v: any) => ({ ...v, bonus: v.bonus + c.xp, chests: { ...v.chests, [c.w.id]: true } }));
      if (last) setTimeout(() => { sBig(); burst(260); pop("SUMMIT REACHED", "Onboarding complete. You made The Climb.", 4200); }, 250);
      else { sWin(); pop("BADGE EARNED", c.w.badge, 1600); }
    } else { setS((v: any) => ({ ...v, bonus: v.bonus + c.xp, dailyChest: dayKey() })); sWin(); }
  };

  const toggleDaily = (i: number) => {
    if (s.daily.done.includes(i)) return;
    const nd = s.daily.done.concat(i);
    setS((v: any) => ({ ...v, bonus: v.bonus + 10 + (nd.length === DAILY.length ? 20 : 0), daily: { ...v.daily, done: nd } }));
    if (nd.length === DAILY.length) { sBig(); burst(120); pop("PERFECT DAY", "+20 bonus XP. See you tomorrow.", 2400); } else { sWin(); pop("+10 XP", DAILY[i], 1200); }
  };

  const clickNode = (n: any, idx: number) => {
    const done = isDone(n);
    if (!done && idx !== curIdx) { sBad(); setShakeId(n.key); setTimeout(() => setShakeId(""), 420); pop("LOCKED", "Clear the glowing node first", 1100); return; }
    if (n.t === "chest") { if (!done) { sTap(); openChest(n.w); } return; }
    sTap(); setAlertMsg("");
    if (n.st.kind === "boss" && !done) startBoss(n.st); else setOpen(n.st);
  };

  const reset = () => { if (window.confirm("Reset all progress on this device?")) { setS(EMPTY); setScreen("title"); setOpen(null); } };

  /* map layout */
  const layout = useMemo(() => {
    let y = 30; let k = 0;
    const pos: any[] = nodes.map((n: any): any => {
      if (n.t === "banner") { const p = { y: y + 18 }; y += 92; return p; }
      const big = n.t === "chest" || n.st.kind === "boss";
      const p = { x: 180 + OFF[k % 8], y: y + 42, big }; k++; y += big ? 122 : 106; return p;
    });
    return { pos, h: y + 40 };
  }, [nodes]);
  const pts = nodes.map((n: any, i: number) => ({ n, p: layout.pos[i] })).filter((o: any) => o.n.t !== "banner").map((o: any) => o.p);
  const pathD = (arr: any[]) => arr.map((p: any, i: number) => (i === 0 ? "M" + p.x + "," + p.y : "C" + arr[i - 1].x + "," + (arr[i - 1].y + p.y) / 2 + " " + p.x + "," + (arr[i - 1].y + p.y) / 2 + " " + p.x + "," + p.y)).join(" ");
  const fullD = pathD(pts);
  const doneD = pathD(pts.slice(0, finished ? pts.length : curIdx + 1));

  const guideLine = finished
    ? name + ", you made it to the summit. Come back every day, run your daily missions, and keep that streak alive. Engagement has a direct correlation to your success."
    : cur.t === "chest" ? "World cleared, " + name + ". A chest dropped. Tap it three times to crack it open."
    : cur.st.kind === "boss" ? "Boss ahead. " + cur.st.boss.name + " is waiting. You have 3 hearts. Let us run it."
    : "Next up: " + cur.st.title + ". Tap the glowing node.";

  if (!loaded) return <div style={{ position: "fixed", inset: 0, background: INK }} />;

  return (
    <div style={shell}>
      <style dangerouslySetInnerHTML={{ __html: KF }} />
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 90 }} />
      <div style={{ ...orb, top: "-18%", left: "-22%", background: "radial-gradient(circle, rgba(0,255,135,.24), transparent 62%)", animation: "gqA 15s ease-in-out infinite" }} />
      <div style={{ ...orb, bottom: "-24%", right: "-24%", background: "radial-gradient(circle, rgba(0,180,255,.13), transparent 62%)", animation: "gqB 19s ease-in-out infinite" }} />
      {flash && <div style={{ position: "fixed", inset: 0, zIndex: 85, background: "rgba(255,40,60,.28)", pointerEvents: "none", animation: "gqFade .38s ease both" }} />}

      {screen === "title" && (
        <div style={center}>
          <div style={{ fontSize: 11, letterSpacing: ".34em", color: G, fontWeight: 800, animation: "gqRise .6s ease both" }}>{"1HOUSE × THE GREENPRINT"}</div>
          <div style={{ fontSize: 84, margin: "18px 0 4px", animation: "gqBob 3s ease-in-out infinite", filter: "drop-shadow(0 0 30px rgba(0,255,135,.35))" }}>🏔️</div>
          <h1 style={{ ...shine, margin: 0, fontSize: 52, lineHeight: 1, fontWeight: 900, letterSpacing: "-2px" }}>THE CLIMB</h1>
          <p style={{ color: "rgba(255,255,255,.62)", fontSize: 15, lineHeight: 1.55, margin: "16px auto 0", maxWidth: 330 }}>{"Six worlds. Three bosses. One mission: go from brand new to your first trade, with a guide in your corner the whole way."}</p>
          <button onClick={() => { sBig(); setScreen("create"); }} style={{ ...bigBtn, maxWidth: 340, marginTop: 30, animation: "gqPulse 1.8s ease-in-out infinite" }}><span style={{ position: "relative", zIndex: 1 }}>{"▶  PRESS START"}</span><span style={sheen} /></button>
          <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12, marginTop: 14 }}>{"Progress saves on this device"}</div>
        </div>
      )}

      {screen === "create" && (
        <div style={{ ...center, justifyContent: "flex-start", paddingTop: "calc(40px + env(safe-area-inset-top))" }}>
          <div style={{ width: "100%", maxWidth: 420, textAlign: "left" }}>
            <Guide text="Welcome to The Climb. I am G, your guide. Before we move, build your character. Who is climbing today?" />
            <div style={{ ...card, marginTop: 18 }}>
              <div style={label}>{"YOUR NAME"}</div>
              <input value={cName} onChange={(e: any) => setCName(e.target.value)} maxLength={18} placeholder="What should I call you?" style={input} />
              <div style={{ ...label, marginTop: 18 }}>{"PICK YOUR AVATAR"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
                {AVATARS.map((a, i) => (<button key={a} onClick={() => { sTap(); setCAv(i); }} style={{ fontSize: 30, padding: "12px 0", borderRadius: 16, cursor: "pointer", border: "2px solid " + (cAv === i ? G : "rgba(255,255,255,.1)"), background: cAv === i ? "rgba(0,255,135,.12)" : "rgba(255,255,255,.03)", transform: cAv === i ? "scale(1.06)" : "scale(1)", transition: "all .18s", boxShadow: cAv === i ? "0 0 20px rgba(0,255,135,.35)" : "none" }}>{a}</button>))}
              </div>
              <div style={{ ...label, marginTop: 18 }}>{"WHY ARE YOU HERE?"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                {WHYS.map((w, i) => (<button key={w} onClick={() => { sTap(); setCWhy(i); }} style={{ ...ghostBtn, padding: "13px 8px", borderColor: cWhy === i ? G : "rgba(255,255,255,.12)", background: cWhy === i ? "rgba(0,255,135,.12)" : "rgba(255,255,255,.03)" }}>{w}</button>))}
              </div>
            </div>
            <button disabled={cWhy < 0} onClick={create} style={{ ...bigBtn, marginTop: 18, opacity: cWhy < 0 ? 0.45 : 1 }}><span style={{ position: "relative", zIndex: 1 }}>{cWhy < 0 ? "PICK YOUR WHY" : "BEGIN THE CLIMB  →"}</span><span style={sheen} /></button>
          </div>
        </div>
      )}

      {screen === "map" && (
        <>
          <div style={hud}>
            <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={avatarBox}>{(s.hero && s.hero.av) || "🦁"}<span style={lvlTag}>{rank + 1}</span></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name + " · " + RANKS[rank][1]}</span>
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.5)", fontWeight: 700, whiteSpace: "nowrap" }}>{xpShown + " XP"}</span>
                </div>
                <div style={{ position: "relative", height: 10, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden", marginTop: 5 }}>
                  <div style={{ position: "absolute", inset: 0, width: pct + "%", borderRadius: 999, background: "linear-gradient(90deg,#00c86a,#00ff87)", boxShadow: "0 0 14px rgba(0,255,135,.6)", transition: "width .25s ease" }} />
                </div>
              </div>
              <div style={{ ...pill, color: GOLD, borderColor: "rgba(255,210,122,.35)" }}>{"🔥 " + s.streak.count}</div>
              <button onClick={() => { sTap(); setDrawer(true); }} style={{ ...pill, cursor: "pointer" }}>{"🏅 " + badgeCount}</button>
              <button onClick={() => setMuted((v: boolean) => !v)} aria-label="sound" style={{ ...pill, cursor: "pointer", padding: "6px 8px" }}>{muted ? "🔇" : "🔊"}</button>
            </div>
          </div>

          <div style={{ maxWidth: 480, margin: "0 auto", padding: "8px 16px 140px", position: "relative", zIndex: 10 }}>
            <div style={{ ...card, borderColor: "rgba(0,255,135,.3)", background: "linear-gradient(160deg, rgba(0,255,135,.09), rgba(255,255,255,.03))" }}>
              <Guide small text={guideLine} />
              {finished && (<a href="/app" style={{ ...bigBtn, display: "block", textAlign: "center", textDecoration: "none", marginTop: 14, padding: "15px 0", fontSize: 15, boxSizing: "border-box" }}>{"ENTER THE GREENPRINT  →"}</a>)}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={() => { if (s.dailyChest === dayKey()) return; sTap(); openChest(null); }} style={{ ...card, flex: "0 0 auto", width: 110, padding: 12, cursor: s.dailyChest === dayKey() ? "default" : "pointer", textAlign: "center", borderColor: s.dailyChest === dayKey() ? "rgba(255,255,255,.08)" : "rgba(255,210,122,.45)", color: "#fff", fontFamily: "inherit" }}>
                <div style={{ fontSize: 30, animation: s.dailyChest === dayKey() ? "none" : "gqWiggle 2.4s ease-in-out infinite", filter: s.dailyChest === dayKey() ? "grayscale(1) opacity(.5)" : "none" }}>🎁</div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", color: s.dailyChest === dayKey() ? "rgba(255,255,255,.4)" : GOLD, marginTop: 4 }}>{s.dailyChest === dayKey() ? "BACK TOMORROW" : "DAILY DROP"}</div>
              </button>
              <div style={{ ...card, flex: 1, padding: "10px 12px" }}>
                <div style={{ fontSize: 9.5, letterSpacing: ".2em", color: GOLD, fontWeight: 800 }}>{"DAILY MISSIONS · " + s.daily.done.length + "/3"}</div>
                {DAILY.map((d, i) => { const on = s.daily.done.includes(i); return (
                  <button key={d} onClick={() => toggleDaily(i)} style={{ display: "flex", width: "100%", alignItems: "center", gap: 8, background: "none", border: "none", color: "#fff", padding: "5px 0", cursor: on ? "default" : "pointer", fontFamily: "inherit", opacity: on ? 0.55 : 1 }}>
                    <span style={{ ...tickBox, width: 17, height: 17, fontSize: 10, background: on ? GOLD : "transparent", borderColor: on ? GOLD : "rgba(255,255,255,.25)", color: "#1a1204" }}>{on ? "✓" : ""}</span>
                    <span style={{ flex: 1, textAlign: "left", fontSize: 12.5, fontWeight: 600, textDecoration: on ? "line-through" : "none" }}>{d}</span>
                  </button>); })}
              </div>
            </div>

            <div style={{ position: "relative", width: "100%", maxWidth: 360, height: layout.h, margin: "18px auto 0" }}>
              <svg width="100%" height={layout.h} viewBox={"0 0 360 " + layout.h} preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
                <path d={fullD} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={6} strokeLinecap="round" strokeDasharray="2 12" vectorEffect="non-scaling-stroke" />
                <path d={doneD} fill="none" stroke={G} strokeWidth={6} strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ filter: "drop-shadow(0 0 6px rgba(0,255,135,.7))" }} />
              </svg>
              {nodes.map((n: any, i: number) => {
                const p = layout.pos[i];
                if (n.t === "banner") {
                  const cleared = !!s.chests[n.w.id];
                  return (<div key={n.key} style={{ position: "absolute", left: 0, right: 0, top: p.y, transform: "translateY(-50%)", display: "flex", justifyContent: "center", zIndex: 3 }}>
                    <div style={{ padding: "8px 16px", borderRadius: 999, background: "rgba(5,8,11,.92)", border: "1px solid " + (cleared ? "rgba(0,255,135,.5)" : "rgba(255,255,255,.14)"), boxShadow: "0 8px 24px rgba(0,0,0,.5)", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, letterSpacing: ".2em", fontWeight: 800, color: cleared ? G : "rgba(255,255,255,.5)" }}>{"WORLD " + (n.wi + 1)}</span>
                      <span style={{ fontSize: 15, fontWeight: 900 }}>{n.w.name}</span>
                      <span style={{ fontSize: 15, filter: cleared ? "none" : "grayscale(1) opacity(.5)" }}>{n.w.badgeIcon}</span>
                    </div>
                  </div>);
                }
                const idx = playable.indexOf(n);
                const done = isDone(n);
                const isCur = idx === curIdx;
                const locked = !done && !isCur;
                const bossN = n.t === "step" && n.st.kind === "boss";
                const size = p.big ? 80 : 64;
                const icon = n.t === "chest" ? (done ? "✨" : "🎁") : done ? (bossN ? "👑" : "✓") : locked ? "🔒" : n.st.icon;
                const ring = bossN ? RED : n.t === "chest" ? GOLD : G;
                return (
                  <div key={n.key} ref={isCur ? curRef : undefined} style={{ position: "absolute", left: (p.x / 360) * 100 + "%", top: p.y, transform: "translate(-50%,-50%)", zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    {isCur && (<div style={{ position: "absolute", bottom: "100%", marginBottom: 6, display: "flex", flexDirection: "column", alignItems: "center", animation: "gqBob 1.6s ease-in-out infinite", pointerEvents: "none" }}>
                      <div style={{ fontSize: 34, filter: "drop-shadow(0 6px 10px rgba(0,0,0,.6))" }}>{(s.hero && s.hero.av) || "🦁"}</div>
                      <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: ".15em", color: "#06110c", background: G, borderRadius: 6, padding: "2px 6px", marginTop: -2 }}>{"YOU"}</div>
                    </div>)}
                    <button onClick={() => clickNode(n, idx)} aria-label={n.t === "chest" ? "Chest" : n.st.title}
                      style={{ width: size, height: size, borderRadius: "50%", cursor: "pointer", fontSize: done && !bossN && n.t !== "chest" ? 26 : p.big ? 36 : 28, fontWeight: 900, color: done ? "#06110c" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit",
                        background: done ? (n.t === "chest" ? "linear-gradient(135deg,#ffe3a3,#d9a441)" : bossN ? "linear-gradient(135deg,#ffd27a,#ff9f43)" : "linear-gradient(135deg,#00ff87,#00c86a)") : locked ? "#0b1014" : "radial-gradient(circle at 50% 30%, #173a2c, #070c0f)",
                        border: "3px solid " + (locked ? "rgba(255,255,255,.12)" : ring),
                        boxShadow: isCur ? "0 0 0 8px " + (bossN ? "rgba(255,90,110,.16)" : n.t === "chest" ? "rgba(255,210,122,.18)" : "rgba(0,255,135,.14)") + ", 0 0 34px " + (bossN ? "rgba(255,90,110,.6)" : n.t === "chest" ? "rgba(255,210,122,.6)" : "rgba(0,255,135,.55)") : done ? "0 8px 20px rgba(0,0,0,.45)" : "none",
                        opacity: locked ? 0.6 : 1, animation: shakeId === n.key ? "gqShake .4s ease" : isCur ? (n.t === "chest" ? "gqWiggle 1.6s ease-in-out infinite" : "gqPulse 1.6s ease-in-out infinite") : "none" }}>
                      {icon}
                    </button>
                    {(isCur || done || bossN) && n.t === "step" && (<div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: isCur ? "#fff" : bossN && !done ? "#ff9aa6" : "rgba(255,255,255,.5)", whiteSpace: "nowrap", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 2px 6px #000" }}>{n.st.title}</div>)}
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: "center", color: "rgba(255,255,255,.35)", fontSize: 11.5, lineHeight: 1.6, marginTop: 10 }}>
              {"Need help? support@1houseglobal.com · "}<button onClick={reset} style={{ background: "none", border: "none", color: "rgba(255,255,255,.35)", fontSize: 11.5, textDecoration: "underline", cursor: "pointer", padding: 0 }}>{"reset progress"}</button>
            </div>
          </div>
        </>
      )}

      {/* quest sheet */}
      {open && (
        <div onClick={() => setOpen(null)} style={overlay}>
          <div onClick={(e: any) => e.stopPropagation()} style={sheet}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,.2)", margin: "0 auto 14px" }} />
            <Guide small text={say(open.say)} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
              <span style={{ fontSize: 26 }}>{open.icon}</span>
              <span style={{ fontSize: 21, fontWeight: 900, letterSpacing: "-.3px", flex: 1 }}>{open.title}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#9affce", background: "rgba(0,255,135,.12)", borderRadius: 999, padding: "3px 9px" }}>{"+" + open.xp + " XP"}</span>
            </div>
            {open.note && (<div style={{ borderRadius: 14, background: "rgba(0,0,0,.3)", border: "1px solid rgba(255,255,255,.07)", padding: "10px 14px", marginTop: 12 }}>
              {open.note.map((t: string) => (<div key={t} style={{ fontSize: 13.5, lineHeight: 1.9, color: "rgba(255,255,255,.82)" }}><span style={{ color: G, fontWeight: 900 }}>{"› "}</span>{t}</div>))}
            </div>)}
            {open.links && (<div style={{ display: "flex", gap: 8, marginTop: 12 }}>{open.links.map((l: any) => (<button key={l.label} onClick={() => openLink(l)} style={ghostBtn}>{l.label + " ↗"}</button>))}</div>)}

            {open.kind === "cards" && open.vids && (<>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                <span style={{ fontSize: 10, letterSpacing: ".2em", color: G, fontWeight: 800 }}>{"COLLECTION"}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: GOLD }}>{(s.lists[open.id] || []).length + " / 8 collected"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                {open.vids.map((v: Vid, i: number) => { const on = (s.lists[open.id] || []).includes(i) || !!s.done[open.id]; return (
                  <div key={v.slot} style={{ borderRadius: 14, overflow: "hidden", border: "2px solid " + (on ? G : "rgba(255,255,255,.1)"), background: "rgba(255,255,255,.03)", boxShadow: on ? "0 0 18px rgba(0,255,135,.3)" : "none", transition: "all .2s", animation: "gqRise .4s " + i * 0.04 + "s ease both" }}>
                    <button onClick={() => openLink({ href: v.href })} aria-label={"Watch " + v.slot} style={{ position: "relative", display: "block", width: "100%", aspectRatio: "16 / 9", border: "none", padding: 0, cursor: "pointer", background: v.img ? "#000 center/cover no-repeat url(" + v.img + ")" : "linear-gradient(135deg,#12382a,#05080b)" }}>
                      {!v.img && <span style={{ fontSize: 22 }}>🎬</span>}
                      <span style={{ position: "absolute", inset: 0, background: on ? "rgba(0,255,135,.18)" : "rgba(0,0,0,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ width: 30, height: 30, borderRadius: 999, background: "rgba(0,0,0,.65)", border: "1px solid rgba(255,255,255,.6)", color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{"▶"}</span>
                      </span>
                      <span style={{ position: "absolute", left: 6, top: 5, fontSize: 10, fontWeight: 900, color: "#fff", background: "rgba(0,0,0,.6)", borderRadius: 6, padding: "1px 5px" }}>{"#" + (i + 1)}</span>
                      {on && <span style={{ position: "absolute", right: 6, top: 5, fontSize: 9, fontWeight: 900, color: "#06110c", background: G, borderRadius: 6, padding: "2px 5px", animation: "gqPop .35s ease both" }}>{"COLLECTED"}</span>}
                    </button>
                    <div style={{ padding: "8px 9px 9px" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 900, lineHeight: 1.2 }}>{v.slot}</div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.5)", lineHeight: 1.3, marginTop: 3, minHeight: 27 }}>{v.title}</div>
                      <div style={{ fontSize: 11, color: "#9affce", fontWeight: 700, marginTop: 3 }}>{v.by}</div>
                      {!s.done[open.id] && (<button onClick={() => toggleCard(open, i)} style={{ marginTop: 7, width: "100%", padding: "7px 0", borderRadius: 9, border: "1px solid " + (on ? G : "rgba(255,255,255,.18)"), background: on ? "rgba(0,255,135,.15)" : "transparent", color: on ? G : "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{on ? "✓ Collected" : "Collect"}</button>)}
                    </div>
                  </div>); })}
              </div>
            </>)}

            <div style={{ marginTop: 14 }}>
              {s.done[open.id] ? (
                <div style={{ color: G, fontWeight: 800, fontSize: 14, textAlign: "center", padding: "8px 0" }}>{open.kind === "boss" ? "👑 Boss defeated" : "✓ Quest complete"}</div>
              ) : open.kind === "task" ? (
                <button onClick={() => completeStep(open)} style={bigBtn}><span style={{ position: "relative", zIndex: 1 }}>{"✓  " + (open.done || "I did it")}</span><span style={sheen} /></button>
              ) : open.kind === "alerts" ? (<>
                <button onClick={() => armAlerts(open)} disabled={busy} style={{ ...bigBtn, opacity: busy ? 0.7 : 1 }}><span style={{ position: "relative", zIndex: 1 }}>{busy ? "Arming..." : "🔔  ARM ALERTS"}</span><span style={sheen} /></button>
                {alertMsg && <div style={{ color: GOLD, fontSize: 13, lineHeight: 1.5, marginTop: 10 }}>{alertMsg}</div>}
                {alertMsg && <button onClick={() => completeStep(open)} style={{ ...ghostBtn, marginTop: 10, width: "100%" }}>{"Continue anyway →"}</button>}
              </>) : open.kind === "choice" && open.options ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{open.options.map((o: string, i: number) => (<button key={o} onClick={() => completeStep(open, { picks: { ...s.picks, [open.id]: i } })} style={{ ...ghostBtn, padding: "15px 14px", fontSize: 14.5 }}>{o}</button>))}</div>
              ) : open.kind === "boss" ? (
                <button onClick={() => startBoss(open)} style={{ ...bigBtn, background: "linear-gradient(135deg,#ff5a6e,#ff9f43)", boxShadow: "0 14px 38px rgba(255,90,110,.4)" }}><span style={{ position: "relative", zIndex: 1 }}>{"⚔️  FIGHT"}</span></button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* boss fight */}
      {boss && (() => {
        const b = boss.st.boss; const q = b.qs[boss.qi]; const right = boss.pick !== null && boss.pick === q.c;
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "radial-gradient(120% 80% at 50% 0%, rgba(255,60,90,.22), rgba(5,8,11,.97) 60%)", backdropFilter: "blur(8px)", overflowY: "auto", padding: "calc(18px + env(safe-area-inset-top)) 18px calc(30px + env(safe-area-inset-bottom))", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 440, margin: "0 auto", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 18, letterSpacing: 2 }}>{[0, 1, 2].map((i) => (<span key={i} style={{ opacity: i < boss.hearts ? 1 : 0.18, filter: i < boss.hearts ? "none" : "grayscale(1)" }}>{"❤️"}</span>))}</div>
                <button onClick={() => setBoss(null)} style={{ ...pill, cursor: "pointer" }}>{"Retreat"}</button>
              </div>
              <div style={{ fontSize: 10.5, letterSpacing: ".3em", color: RED, fontWeight: 900, marginTop: 14 }}>{"BOSS FIGHT"}</div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.5px", marginTop: 4 }}>{b.name}</div>
              <div style={{ position: "relative", height: 14, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden", margin: "10px auto 0", maxWidth: 300, border: "1px solid rgba(255,90,110,.4)" }}>
                <div style={{ position: "absolute", inset: 0, width: boss.hp + "%", background: "linear-gradient(90deg,#ff2e4d,#ff8a5b)", transition: "width .45s cubic-bezier(.2,.9,.3,1)", boxShadow: "0 0 14px rgba(255,60,90,.7)" }} />
              </div>
              <div style={{ position: "relative", height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div key={boss.hit} style={{ fontSize: boss.phase === "win" ? 70 : 104, filter: boss.phase === "win" ? "grayscale(1) opacity(.4)" : "drop-shadow(0 0 30px rgba(255,60,90,.5))", animation: boss.hit && boss.phase === "fight" ? "gqHit .45s ease" : "gqBob 2.4s ease-in-out infinite", transition: "font-size .4s" }}>{b.face}</div>
                {boss.hit > 0 && boss.phase === "fight" && (<div key={"d" + boss.hit} style={{ position: "absolute", top: 20, right: "22%", fontSize: 28, fontWeight: 900, color: GOLD, textShadow: "0 0 18px rgba(255,210,122,.8)", animation: "gqDmg .9s ease-out forwards" }}>{"-" + Math.ceil(100 / b.qs.length)}</div>)}
              </div>

              {boss.phase === "intro" && (<>
                <div style={{ ...card, textAlign: "left", borderColor: "rgba(255,90,110,.35)" }}><div style={{ fontSize: 9.5, letterSpacing: ".2em", color: RED, fontWeight: 800, marginBottom: 6 }}>{b.name + " SAYS"}</div><div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.45 }}><Type text={b.taunt} /></div></div>
                <p style={{ color: "rgba(255,255,255,.6)", fontSize: 13.5, lineHeight: 1.5, margin: "14px 0" }}>{"Every right answer deals damage. Every wrong answer costs a heart. Lose all 3 and you run it back."}</p>
                <button onClick={() => { sTap(); setBoss({ ...boss, phase: "fight" }); }} style={{ ...bigBtn, background: "linear-gradient(135deg,#ff5a6e,#ff9f43)", boxShadow: "0 14px 38px rgba(255,90,110,.4)" }}><span style={{ position: "relative", zIndex: 1 }}>{"⚔️  FIGHT"}</span></button>
              </>)}

              {boss.phase === "fight" && (<div style={{ textAlign: "left" }}>
                <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>{b.qs.map((_: any, i: number) => (<div key={i} style={{ flex: 1, height: 5, borderRadius: 5, background: i < boss.qi ? GOLD : i === boss.qi ? "rgba(255,210,122,.45)" : "rgba(255,255,255,.1)" }} />))}</div>
                <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.4, marginBottom: 10 }}>{q.q}</div>
                {q.a.map((a: string, i: number) => { const chosen = boss.pick === i; const ok = i === q.c; return (
                  <button key={a} onClick={() => bossAnswer(i)} style={{ ...row, padding: "14px 14px", borderColor: chosen ? (ok ? G : RED) : "rgba(255,255,255,.12)", background: chosen ? (ok ? "rgba(0,255,135,.12)" : "rgba(255,90,110,.14)") : "rgba(255,255,255,.04)", animation: chosen && !ok ? "gqShake .35s ease" : "none" }}>
                    <span style={{ flex: 1, textAlign: "left", fontSize: 14.5, fontWeight: 700 }}>{a}</span>
                  </button>); })}
                {boss.pick !== null && (<div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: right ? "#9affce" : GOLD }}>{right ? "Direct hit. " + q.why : boss.hearts <= 0 ? "Out of hearts. " + q.why : "Ouch, that cost you a heart. Think it through and try again."}</div>
                  <button onClick={bossNext} style={{ ...bigBtn, marginTop: 12, padding: "14px 0", fontSize: 15 }}><span style={{ position: "relative", zIndex: 1 }}>{right ? (boss.qi + 1 >= b.qs.length ? "FINISH HIM  →" : "NEXT ATTACK  →") : boss.hearts <= 0 ? "CONTINUE" : "TRY AGAIN"}</span></button>
                </div>)}
              </div>)}

              {boss.phase === "lose" && (<div>
                <div style={{ fontSize: 22, fontWeight: 900, color: RED }}>{"DEFEATED"}</div>
                <p style={{ color: "rgba(255,255,255,.65)", fontSize: 14, lineHeight: 1.5 }}>{b.name + " got you this time. Every pro lost a few rounds. Run it back."}</p>
                <button onClick={() => { sTap(); setBoss({ ...boss, qi: 0, hp: 100, hearts: 3, pick: null, phase: "fight", hit: 0 }); }} style={{ ...bigBtn, background: "linear-gradient(135deg,#ff5a6e,#ff9f43)" }}><span style={{ position: "relative", zIndex: 1 }}>{"↻  RUN IT BACK"}</span></button>
              </div>)}

              {boss.phase === "win" && (<div style={{ animation: "gqPop .5s cubic-bezier(.2,.9,.3,1.4) both" }}>
                <div style={{ fontSize: 46 }}>{"👑"}</div>
                <div style={{ ...shine, fontSize: 30, fontWeight: 900 }}>{"BOSS DEFEATED"}</div>
                <p style={{ color: "rgba(255,255,255,.65)", fontSize: 14, lineHeight: 1.5 }}>{b.name + " is down. +" + boss.st.xp + " XP and a crown on your map."}</p>
                <button onClick={() => { const st = boss.st; setBoss(null); completeStep(st); }} style={bigBtn}><span style={{ position: "relative", zIndex: 1 }}>{"CLAIM VICTORY  →"}</span><span style={sheen} /></button>
              </div>)}
            </div>
          </div>
        );
      })()}

      {/* chest */}
      {chest && (
        <div style={{ ...overlay, alignItems: "center" }}>
          <div style={{ width: "100%", maxWidth: 400, textAlign: "center", padding: 24 }}>
            {!chest.opened ? (<>
              <div style={{ fontSize: 10.5, letterSpacing: ".3em", color: GOLD, fontWeight: 900 }}>{chest.w ? chest.w.name.toUpperCase() + " CHEST" : "DAILY DROP"}</div>
              <button onClick={tapChest} key={chest.taps} style={{ fontSize: 120, background: "none", border: "none", cursor: "pointer", margin: "22px 0", animation: chest.taps ? "gqChest .35s ease" : "gqWiggle 1.6s ease-in-out infinite", filter: "drop-shadow(0 0 " + (20 + chest.taps * 18) + "px rgba(255,210,122,.7))" }}>{"🎁"}</button>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{["Tap to crack it open", "Again!", "One more!"][chest.taps]}</div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>{[0, 1, 2].map((i) => (<span key={i} style={{ width: 10, height: 10, borderRadius: 99, background: i < chest.taps ? GOLD : "rgba(255,255,255,.15)" }} />))}</div>
            </>) : (<div style={{ animation: "gqPop .5s cubic-bezier(.2,.9,.3,1.4) both" }}>
              {chest.w && (<>
                <div style={{ fontSize: 82, filter: "drop-shadow(0 0 30px rgba(255,210,122,.7))", animation: "gqBob 2s ease-in-out infinite" }}>{chest.w.badgeIcon}</div>
                <div style={{ fontSize: 10.5, letterSpacing: ".3em", color: GOLD, fontWeight: 900, marginTop: 6 }}>{"BADGE UNLOCKED"}</div>
                <div style={{ ...shine, fontSize: 30, fontWeight: 900 }}>{chest.w.badge}</div>
              </>)}
              {!chest.w && <div style={{ fontSize: 70 }}>{"✨"}</div>}
              <div style={{ fontSize: 34, fontWeight: 900, color: GOLD, marginTop: 10, textShadow: "0 0 24px rgba(255,210,122,.6)" }}>{"+" + chest.xp + " XP"}</div>
              <div style={{ ...card, marginTop: 16, textAlign: "left", borderColor: "rgba(0,255,135,.3)" }}>
                <div style={{ fontSize: 9.5, letterSpacing: ".2em", color: G, fontWeight: 800 }}>{"PRO TIP"}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, lineHeight: 1.45 }}>{chest.tip}</div>
              </div>
              <button onClick={claimChest} style={{ ...bigBtn, marginTop: 16 }}><span style={{ position: "relative", zIndex: 1 }}>{"CLAIM  →"}</span><span style={sheen} /></button>
            </div>)}
          </div>
        </div>
      )}

      {/* badge case */}
      {drawer && (
        <div onClick={() => setDrawer(false)} style={overlay}>
          <div onClick={(e: any) => e.stopPropagation()} style={sheet}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,.2)", margin: "0 auto 14px" }} />
            <div style={{ fontSize: 10, letterSpacing: ".22em", color: G, fontWeight: 800 }}>{"BADGE CASE"}</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{badgeCount + " of 9 earned"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
              {WORLDS.map((w) => { const on = !!s.chests[w.id]; return (<div key={w.id} style={badgeTile(on)}><div style={{ fontSize: 34, filter: on ? "none" : "grayscale(1) opacity(.25)" }}>{w.badgeIcon}</div><div style={{ fontSize: 11.5, fontWeight: 800, marginTop: 6 }}>{on ? w.badge : "???"}</div></div>); })}
              {WORLDS.flatMap((w) => w.steps.filter((st) => st.kind === "boss")).map((st) => { const on = !!s.done[st.id]; return (<div key={st.id} style={badgeTile(on, true)}><div style={{ fontSize: 34, filter: on ? "none" : "grayscale(1) opacity(.25)" }}>{st.icon}</div><div style={{ fontSize: 11, fontWeight: 800, marginTop: 6 }}>{on ? "Beat " + (st.boss ? st.boss.name.toLowerCase().replace(/(^|\s)\S/g, (m: string) => m.toUpperCase()) : "") : "Boss ???"}</div></div>); })}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", inset: 0, zIndex: 95, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div key={toast.k} style={{ textAlign: "center", animation: "gqPop .5s cubic-bezier(.2,.9,.3,1.4) both", padding: "0 20px" }}>
            <div style={{ ...shine, fontSize: 40, fontWeight: 900, letterSpacing: "-1px" }}>{toast.big}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,.88)", marginTop: 6, textShadow: "0 2px 10px #000" }}>{toast.small}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const shell: any = { position: "fixed", inset: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", background: "radial-gradient(130% 70% at 50% -10%, rgba(0,255,135,.12), transparent 55%), " + INK, color: "#fff", fontFamily: "var(--font-inter), Inter, system-ui, sans-serif" };
const center: any = { position: "relative", zIndex: 10, minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "calc(30px + env(safe-area-inset-top)) 20px 80px", textAlign: "center", boxSizing: "border-box" };
const orb: any = { position: "fixed", width: 540, height: 540, borderRadius: "50%", filter: "blur(44px)", pointerEvents: "none" };
const shine: any = { background: "linear-gradient(90deg,#fff,#9affce,#fff)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "gqShine 5s linear infinite" };
const hud: any = { position: "sticky", top: 0, zIndex: 40, padding: "calc(10px + env(safe-area-inset-top)) 14px 12px", background: "linear-gradient(180deg, rgba(5,8,11,.95), rgba(5,8,11,.8) 70%, transparent)", backdropFilter: "blur(10px)" };
const avatarBox: any = { position: "relative", flex: "0 0 auto", width: 42, height: 42, borderRadius: 14, background: "radial-gradient(circle at 50% 35%, #12382a, #05080b)", border: "1px solid rgba(0,255,135,.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: "0 0 16px rgba(0,255,135,.3)" };
const lvlTag: any = { position: "absolute", right: -5, bottom: -5, minWidth: 18, height: 18, borderRadius: 9, background: G, color: "#06110c", fontSize: 10.5, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + INK };
const pill: any = { flex: "0 0 auto", fontSize: 12.5, fontWeight: 800, padding: "6px 9px", borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.04)", color: "#fff", fontFamily: "inherit" };
const card: any = { borderRadius: 20, padding: 16, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 14px 40px rgba(0,0,0,.4)", boxSizing: "border-box" };
const label: any = { fontSize: 10, letterSpacing: ".22em", color: G, fontWeight: 800 };
const input: any = { width: "100%", boxSizing: "border-box", marginTop: 8, padding: "14px 15px", borderRadius: 14, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 16, outline: "none", fontFamily: "inherit" };
const row: any = { width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", marginTop: 8, borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", color: "#fff", cursor: "pointer", fontFamily: "inherit", boxSizing: "border-box" };
const tickBox: any = { flex: "0 0 auto", width: 22, height: 22, borderRadius: 7, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900 };
const bigBtn: any = { position: "relative", overflow: "hidden", width: "100%", padding: "17px 0", borderRadius: 16, border: "none", cursor: "pointer", fontWeight: 900, fontSize: 16, letterSpacing: ".02em", color: "#06110c", background: "linear-gradient(135deg,#00ff87,#00d774)", boxShadow: "0 14px 38px rgba(0,255,135,.4)", fontFamily: "inherit" };
const ghostBtn: any = { flex: 1, padding: "13px 12px", borderRadius: 13, border: "1px solid rgba(0,255,135,.4)", background: "rgba(0,255,135,.07)", color: "#fff", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" };
const sheen: any = { position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)", backgroundSize: "200% 100%", animation: "gqShine 2.4s linear infinite", pointerEvents: "none" };
const overlay: any = { position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center" };
const sheet: any = { width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxSizing: "border-box", borderRadius: "26px 26px 0 0", padding: "12px 18px calc(26px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg,#0d1512,#070b0e)", border: "1px solid rgba(0,255,135,.25)", borderBottom: "none", boxShadow: "0 -20px 60px rgba(0,0,0,.6)", animation: "gqSheet .32s cubic-bezier(.2,.9,.3,1) both" };
const badgeTile = (on: boolean, boss?: boolean): any => ({ borderRadius: 16, padding: "14px 6px", textAlign: "center", background: on ? (boss ? "rgba(255,90,110,.1)" : "rgba(0,255,135,.08)") : "rgba(255,255,255,.03)", border: "1px solid " + (on ? (boss ? "rgba(255,90,110,.4)" : "rgba(0,255,135,.4)") : "rgba(255,255,255,.08)"), color: on ? "#fff" : "rgba(255,255,255,.35)" });

const KF = "@keyframes gqA{0%,100%{transform:translate(-8%,-5%) scale(1)}50%{transform:translate(10%,8%) scale(1.22)}}" +
  "@keyframes gqB{0%,100%{transform:translate(8%,5%) scale(1.1)}50%{transform:translate(-10%,-8%) scale(1.3)}}" +
  "@keyframes gqShine{0%{background-position:0% 50%}100%{background-position:200% 50%}}" +
  "@keyframes gqRise{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:translateY(0)}}" +
  "@keyframes gqPop{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}" +
  "@keyframes gqBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}" +
  "@keyframes gqPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}" +
  "@keyframes gqWiggle{0%,100%{transform:rotate(0) scale(1)}20%{transform:rotate(-8deg) scale(1.05)}40%{transform:rotate(8deg) scale(1.05)}60%{transform:rotate(-4deg)}80%{transform:rotate(3deg)}}" +
  "@keyframes gqShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}" +
  "@keyframes gqHit{0%{transform:scale(1)}20%{transform:scale(.82) rotate(-10deg);filter:brightness(3)}50%{transform:scale(1.08) rotate(6deg)}100%{transform:scale(1)}}" +
  "@keyframes gqDmg{0%{opacity:0;transform:translateY(10px) scale(.7)}25%{opacity:1;transform:translateY(-6px) scale(1.2)}100%{opacity:0;transform:translateY(-50px) scale(1)}}" +
  "@keyframes gqChest{0%{transform:scale(1)}30%{transform:scale(1.18) rotate(-10deg)}60%{transform:scale(.95) rotate(8deg)}100%{transform:scale(1)}}" +
  "@keyframes gqFade{0%{opacity:1}100%{opacity:0}}" +
  "@keyframes gqSheet{0%{transform:translateY(100%)}100%{transform:translateY(0)}}";
