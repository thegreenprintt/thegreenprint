"use client";
import { useState, useEffect, useRef } from "react";

// ─── THE GREENPRINT APP ──────────────────────────────────────────────────────
// Standalone app shell at /app — does not touch the stream, site, or studio.
// Tabs: Live · Picks · Community · Journal

const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const get = async (p: string) => { try { const r = await fetch(`${FB}/${p}.json`, { cache: "no-store" }); return await r.json(); } catch { return null; } };
const push = async (p: string, d: unknown) => { try { await fetch(`${FB}/${p}.json`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); } catch {} };

type Msg = { name: string; msg: string; ts: number };
type Trade = { id: string; sym: string; side: "LONG" | "SHORT"; entry: number; exit: number; qty: number; notes: string; ts: number };
type LiveProp = { player: string; team: string; prop: string; line: number; opp: string; start: string; league: string; board: string };
type HitRate = { l5: { h: number; of: number }; l10: { h: number; of: number }; l20: { h: number; of: number }; n: number; recent?: number[]; avg?: number | null; headshot?: string };

// ─── CUSTOM ICON SET (vector, no emojis) ─────────────────────────────────────
const icp = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const IcoLive = ({ s = 19 }: { s?: number }) => (<svg width={s} height={s} viewBox="0 0 24 24" {...icp}><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" /><path d="M8.6 8.6a4.8 4.8 0 0 0 0 6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8M5.8 5.8a8.8 8.8 0 0 0 0 12.4M18.2 5.8a8.8 8.8 0 0 1 0 12.4" /></svg>);
const IcoTarget = ({ s = 19 }: { s?: number }) => (<svg width={s} height={s} viewBox="0 0 24 24" {...icp}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /></svg>);
const IcoChat = ({ s = 19 }: { s?: number }) => (<svg width={s} height={s} viewBox="0 0 24 24" {...icp}><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3.1-.4-4.4-1.2L3 20.5l1.7-4.6A8.5 8.5 0 1 1 21 11.5z" /></svg>);
const IcoJournal = ({ s = 19 }: { s?: number }) => (<svg width={s} height={s} viewBox="0 0 24 24" {...icp}><path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V3z" /><path d="M9 7h6M9 11h6M9 15h4" /></svg>);
const IcoBolt = ({ s = 13 }: { s?: number }) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 2 4.5 13.5H10L9 22l8.5-11.5H12L13 2z" /></svg>);
const IcoBars = ({ s = 13 }: { s?: number }) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="4" y="13" width="4" height="8" rx="1" /><rect x="10" y="8" width="4" height="13" rx="1" /><rect x="16" y="3" width="4" height="18" rx="1" /></svg>);
const IcoTrend = ({ s = 13 }: { s?: number }) => (<svg width={s} height={s} viewBox="0 0 24 24" {...icp}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>);
const IcoFlame = ({ s = 13 }: { s?: number }) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2s5.5 5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2 .8-3.8 1.8-5.3 0 0 .7 2.2 2.2 3.3C10.5 8 11 5 12 2z" /></svg>);
const IcoArrowUp = ({ s = 19 }: { s?: number }) => (<svg width={s} height={s} viewBox="0 0 24 24" {...icp}><path d="M7 17L17 7M9 7h8v8" /></svg>);
const RowIco = ({ k }: { k: string }) => (k === "l5" ? <IcoBolt /> : k === "l10" ? <IcoBars /> : <IcoTrend />);
const STATS_LEAGUES = ["NBA", "WNBA", "MLB", "NFL", "NHL", "SOCCER", "NCAAF", "NCAAB"];
const rateKey = (p: LiveProp) => p.player + "|" + p.prop + "|" + p.line;
const pctOf = (r: HitRate | null | undefined): number | null => {
  if (!r) return null;
  const w = r.l10 && r.l10.of ? r.l10 : r.l5 && r.l5.of ? r.l5 : r.l20 && r.l20.of ? r.l20 : null;
  return w ? Math.round((w.h / w.of) * 100) : null;
};
const pctColor = (pct: number) => (pct >= 70 ? "#00ff87" : pct >= 50 ? "#ffd93d" : "#ff6b6b");

const CHAT_COLORS = ["#00ff87", "#ff6b6b", "#ffd93d", "#6bcbff", "#c77dff", "#ff9f43", "#48dbfb", "#ff6b9d"];
const nc = (n: string) => CHAT_COLORS[n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % CHAT_COLORS.length];

const LEAGUES = ["NBA", "NFL", "MLB", "NHL", "SOCCER", "WNBA", "NCAAF", "NCAAB", "MMA", "TENNIS"] as const;
type League = (typeof LEAGUES)[number];
const fmtStart = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return sameDay ? `Today ${time}` : d.toLocaleDateString([], { weekday: "short" }) + " " + time;
};

const fmtMoney = (n: number) => (n < 0 ? "-$" : "+$") + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

// ─── TRADING ACADEMY ─────────────────────────────────────────────────────────
const LESSONS: { ico: string; title: string; body: string }[] = [
  { ico: "🛡️", title: "Risk Management First", body: "Rule one: survive. Never risk more than 1–2% of your account on a single trade. A 10-trade losing streak at 1% risk costs you ~10% — painful but recoverable. The same streak at 10% risk ends your account. Position size is decided BEFORE the trade, from your stop distance — never from how confident you feel." },
  { ico: "🧠", title: "Trade the Plan, Not the Feeling", body: "Write your entry, stop, and target before you click. If the setup isn't on your plan, it isn't a trade — it's a gamble. The market pays disciplined traders and taxes emotional ones. Log every trade in your Journal tab: the note you write after a loss is worth more than the win." },
  { ico: "📊", title: "How to Read Player Props", body: "A prop is a line — the book's guess at a player's stat. Our board shows the real hit rate: how often the player actually beat that exact line in their last 5/10/20 games. High hit rate + big sample beats gut feeling. One hot game means nothing; 8 of the last 10 means something." },
  { ico: "💵", title: "Bankroll for Picks", body: "Treat picks like trading: units, not vibes. One unit = 1–3% of your bankroll, every play the same size. Avoid stacking correlated legs in one slip (two players from the same blowout game can die together). The goal is staying in the game long enough for your edge to show up." },
  { ico: "📈", title: "Prep Like a Pro", body: "Before every session: mark your levels, build a watchlist of 3–5 names max, and pick ONE setup you're hunting. When the bell rings you're executing a checklist, not searching for action. Catch the live sessions — watching decisions in real time is the fastest way to learn." },
  { ico: "⏱️", title: "When NOT to Trade", body: "No setup? No trade. Choppy market? No trade. Just took two losses and feel the revenge coming? Walk away — that's the most profitable decision of your day. The market opens again tomorrow. Flat is a position, and often the best one." },
];

export default function GreenprintApp() {
  const [tab, setTab] = useState<"live" | "picks" | "chat" | "journal">("live");
  const [isLive, setIsLive] = useState(false);
  const [watching, setWatching] = useState(false);
  const [league, setLeague] = useState<League>("NBA");
  const [liveProps, setLiveProps] = useState<LiveProp[]>([]);
  const [propsLoading, setPropsLoading] = useState(false);
  const [propsErr, setPropsErr] = useState(false);
  const [propsUpdated, setPropsUpdated] = useState("");
  const [rates, setRates] = useState<Record<string, HitRate | null>>({});
  const ratesRef = useRef<Record<string, HitRate | null>>({});

  const [isHostUser, setIsHostUser] = useState(false);

  // In-app stream player (connects directly — no iframe)
  const appRoomRef = useRef<any>(null);
  const appVideoRef = useRef<HTMLVideoElement>(null);
  const pendingAppTrack = useRef<any>(null);
  const [appHasVideo, setAppHasVideo] = useState(false);
  const [appNeedTap, setAppNeedTap] = useState(false);
  const [appConnecting, setAppConnecting] = useState(false);
  const [pod, setPod] = useState<{ p: LiveProp; r: HitRate | null } | null>(null);
  const [openLesson, setOpenLesson] = useState<number | null>(null);

  // Slip builder · lazy board · in-stream chat · GP record
  const [slip, setSlip] = useState<{ p: LiveProp; eff: number; side: string }[]>([]);
  const [slipOpen, setSlipOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);
  const [liveChat, setLiveChat] = useState<Msg[]>([]);
  const [liveDraft, setLiveDraft] = useState("");
  const [record, setRecord] = useState<{ w: number; l: number } | null>(null);
  const liveChatEnd = useRef<HTMLDivElement>(null);
  const lastLiveSend = useRef(0);
  const snapshotDone = useRef<Record<string, boolean>>({});
  const recordTried = useRef(false);

  // First-open setup (Linemate-style onboarding)
  const [setupDone, setSetupDone] = useState(true);
  const [setupStep, setSetupStep] = useState(0);
  const [selLeagues, setSelLeagues] = useState<string[]>([]);
  const [selOps, setSelOps] = useState<string[]>([]);
  const [purpose, setPurpose] = useState("");
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [leagueOrder, setLeagueOrder] = useState<League[]>([...LEAGUES]);

  // Community chat
  const [chatName, setChatName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const lastSend = useRef(0);
  const chatEnd = useRef<HTMLDivElement>(null);

  // Journal
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [fSym, setFSym] = useState(""); const [fSide, setFSide] = useState<"LONG" | "SHORT">("LONG");
  const [fEntry, setFEntry] = useState(""); const [fExit, setFExit] = useState("");
  const [fQty, setFQty] = useState(""); const [fNotes, setFNotes] = useState("");

  // ── live status (same signal the stream uses — read-only) ──
  useEffect(() => {
    const poll = () => get("livestatus").then(d => setIsLive(!!d?.live));
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, []);

  // ── chat identity ──
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gp_viewer") || "null");
      if (saved?.name) setChatName(saved.name);
      else { const n = localStorage.getItem("gp_chat_name"); if (n) setChatName(n); }
    } catch {}
    try { const t = JSON.parse(localStorage.getItem("gp_journal") || "[]"); if (Array.isArray(t)) setTrades(t); } catch {}
    try { setIsHostUser(localStorage.getItem("gp_host") === "true"); } catch {}
    try {
      setSetupDone(localStorage.getItem("gp_app_setup") === "1");
      const fav = JSON.parse(localStorage.getItem("gp_leagues") || "[]");
      if (Array.isArray(fav) && fav.length) {
        const good = fav.filter((l: string) => (LEAGUES as readonly string[]).includes(l)) as League[];
        if (good.length) {
          setLeagueOrder([...good, ...LEAGUES.filter(l => !good.includes(l))]);
          setLeague(good[0]);
        }
      }
    } catch {}
  }, []);

  const doSignIn = async () => {
    const n = suName.trim(); const e = suEmail.trim();
    if (!n) { alert("Enter your name"); return; }
    if (!/^\S+@\S+\.\S+$/.test(e)) { alert("Enter a valid email address"); return; }
    try { localStorage.setItem("gp_viewer", JSON.stringify({ name: n, email: e })); localStorage.setItem("gp_chat_name", n); } catch {}
    setChatName(n);
    try {
      const k = e.toLowerCase().replace(/[^a-z0-9]/g, "_") || "no_email";
      const ref = FB + "/live/leads/" + k + ".json";
      const ex = await fetch(ref).then(r => r.json()).catch(() => null);
      await fetch(ref, { method: "PUT", body: JSON.stringify({ name: n, email: e, firstSeen: ex?.firstSeen || new Date().toISOString(), lastSeen: new Date().toISOString(), joinCount: ex?.joinCount || 0 }) });
    } catch {}
    setSetupStep(4);
  };

  const startWatch = async () => {
    if (watching || appConnecting) return;
    setAppConnecting(true);
    try {
      const nm = chatName || "App Viewer";
      const tokenRes = await fetch(`/api/token?isHost=0&name=${encodeURIComponent(nm)}`, { cache: "no-store" });
      const { token, url } = tokenRes.ok ? await tokenRes.json().catch(() => ({} as any)) : ({} as any);
      if (!token || !url) { setAppConnecting(false); alert("Stream unavailable — try again in a second."); return; }
      const lk = await import("livekit-client");
      const room = new lk.Room({ adaptiveStream: false });
      appRoomRef.current = room;
      const attach = (track: any, pub: any) => {
        if (track.kind === lk.Track.Kind.Video && pub.source !== lk.Track.Source.Camera) {
          if (appVideoRef.current) { track.attach(appVideoRef.current); appVideoRef.current.play().catch(() => setAppNeedTap(true)); setAppHasVideo(true); }
          else { pendingAppTrack.current = track; }
        }
        if (track.kind === lk.Track.Kind.Audio) { const el = track.attach() as HTMLMediaElement; el.autoplay = true; el.setAttribute("playsinline", "true"); document.body.appendChild(el); el.play().catch(() => setAppNeedTap(true)); }
      };
      room.on(lk.RoomEvent.TrackSubscribed, (t: any, pub: any) => attach(t, pub));
      room.on(lk.RoomEvent.AudioPlaybackStatusChanged, () => { if (!room.canPlaybackAudio) setAppNeedTap(true); });
      room.on(lk.RoomEvent.Disconnected, () => { setWatching(false); setAppHasVideo(false); });
      await room.connect(url, token);
      room.remoteParticipants.forEach((pt: any) => { pt.trackPublications.forEach((pub: any) => { if (pub.track) attach(pub.track, pub); }); });
      setWatching(true);
    } catch { alert("Couldn't connect — try again."); }
    setAppConnecting(false);
  };
  useEffect(() => {
    if (!watching) return;
    if (appVideoRef.current && pendingAppTrack.current) {
      pendingAppTrack.current.attach(appVideoRef.current);
      appVideoRef.current.play().catch(() => setAppNeedTap(true));
      setAppHasVideo(true); pendingAppTrack.current = null;
    }
  }, [watching]);
  useEffect(() => {
    if (tab === "live") return;
    if (appRoomRef.current) { try { appRoomRef.current.disconnect(); } catch {} appRoomRef.current = null; setWatching(false); setAppHasVideo(false); setAppNeedTap(false); }
  }, [tab]);

  const sendLiveMsg = async () => {
    const t = liveDraft.trim();
    if (!t || !chatName) return;
    const now = Date.now();
    if (now - lastLiveSend.current < 1500) return;
    lastLiveSend.current = now; setLiveDraft("");
    setLiveChat(m => [...m, { name: chatName, msg: t, ts: now }]);
    await push("live/chat", { name: chatName, msg: t, ts: now });
  };

  const inSlip = (p: LiveProp) => slip.some(s => rateKey(s.p) === rateKey(p));
  const toggleSlip = (p: LiveProp, pct: number | null) => {
    if (pct == null) return;
    const over = pct >= 50;
    const eff = over ? pct : 100 - pct;
    setSlip(s => {
      if (s.some(x => rateKey(x.p) === rateKey(p))) return s.filter(x => rateKey(x.p) !== rateKey(p));
      if (s.length >= 6 || s.some(x => x.p.player === p.player)) return s;
      return [...s, { p, eff, side: over ? "Over" : "Under" }];
    });
  };

  const shareSlip = async () => {
    try {
      const c = document.createElement("canvas");
      c.width = 1080; c.height = 1350;
      const x = c.getContext("2d")!;
      x.fillStyle = "#050705"; x.fillRect(0, 0, 1080, 1350);
      const grd = x.createRadialGradient(540, 500, 100, 540, 500, 900);
      grd.addColorStop(0, "rgba(0,255,135,0.08)"); grd.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = grd; x.fillRect(0, 0, 1080, 1350);
      x.fillStyle = "#00ff87"; x.font = "900 84px -apple-system, system-ui, sans-serif"; x.fillText("GP", 64, 140);
      x.fillStyle = "#ffffff"; x.font = "800 40px -apple-system, system-ui, sans-serif"; x.fillText("THE GREENPRINT SLIP", 210, 126);
      x.strokeStyle = "rgba(0,255,135,0.25)"; x.lineWidth = 2;
      x.beginPath(); x.moveTo(64, 180); x.lineTo(1016, 180); x.stroke();
      let y = 280;
      for (const s of slip) {
        x.fillStyle = "#ffffff"; x.font = "800 46px -apple-system, system-ui, sans-serif"; x.fillText(s.p.player, 64, y);
        x.fillStyle = "rgba(255,255,255,0.55)"; x.font = "600 34px -apple-system, system-ui, sans-serif";
        x.fillText(`${s.side} ${s.p.line} ${s.p.prop}`, 64, y + 48);
        x.fillStyle = "#00ff87"; x.font = "900 52px -apple-system, system-ui, sans-serif";
        const t = `${s.eff}%`; x.fillText(t, 1016 - x.measureText(t).width, y + 20);
        y += 140;
      }
      const combo = Math.round(slip.reduce((a, s) => a * s.eff / 100, 1) * 100);
      x.fillStyle = "rgba(0,255,135,0.08)"; x.fillRect(64, 1090, 952, 130);
      x.strokeStyle = "rgba(0,255,135,0.4)"; x.strokeRect(64, 1090, 952, 130);
      x.fillStyle = "rgba(255,255,255,0.6)"; x.font = "700 34px -apple-system, system-ui, sans-serif"; x.fillText("ESTIMATED HIT RATE", 96, 1145);
      x.fillStyle = "#00ff87"; x.font = "900 72px -apple-system, system-ui, sans-serif";
      const ct = `${combo}%`; x.fillText(ct, 984 - x.measureText(ct).width, 1178);
      x.fillStyle = "rgba(255,255,255,0.35)"; x.font = "600 30px -apple-system, system-ui, sans-serif"; x.fillText("thegreenprint.trade/app", 64, 1300);
      const blob: Blob = await new Promise(r => c.toBlob(b => r(b as Blob), "image/png"));
      const file = new File([blob], "gp-slip.png", { type: "image/png" });
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) await nav.share({ files: [file], title: "GP Slip" }).catch(() => {});
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gp-slip.png"; a.click(); }
    } catch {}
  };

  const finishSetup = () => {
    try {
      localStorage.setItem("gp_app_setup", "1");
      localStorage.setItem("gp_leagues", JSON.stringify(selLeagues));
      localStorage.setItem("gp_operators", JSON.stringify(selOps));
      localStorage.setItem("gp_purpose", purpose);
    } catch {}
    const good = selLeagues.filter(l => (LEAGUES as readonly string[]).includes(l)) as League[];
    if (good.length) {
      setLeagueOrder([...good, ...LEAGUES.filter(l => !good.includes(l))]);
      setLeague(good[0]);
    }
    setSetupDone(true);
    setTab("picks");
  };

  // ── pick of the day (home hub) ──
  useEffect(() => {
    if (tab !== "live" || pod) return;
    let dead = false;
    (async () => {
      try {
        const fav = leagueOrder[0];
        const j = await fetch(`/api/props?league=${fav}`).then(x => x.json());
        const props: LiveProp[] = Array.isArray(j?.props) ? j.props : [];
        if (dead || !props.length) return;
        let best: { p: LiveProp; r: HitRate; pct: number } | null = null;
        if (STATS_LEAGUES.includes(fav)) {
          for (const p of props.slice(0, 6)) {
            try {
              const r = await fetch(`/api/hitrate?league=${fav}&player=${encodeURIComponent(p.player)}&prop=${encodeURIComponent(p.prop)}&line=${p.line}`).then(x => x.json());
              if (dead) return;
              if (r && !r.error && r.l10 && r.l10.of) {
                const pc = Math.round((r.l10.h / r.l10.of) * 100);
                const eff = pc >= 50 ? pc : 100 - pc;
                if (!best || eff > best.pct) best = { p, r, pct: eff };
              }
            } catch {}
          }
        }
        if (!dead) setPod(best ? { p: best.p, r: best.r } : { p: props[0], r: null });
      } catch {}
    })();
    return () => { dead = true; };
  }, [tab, leagueOrder]);

  // ── GP record (yesterday's graded picks) ──
  useEffect(() => {
    if (tab !== "live" || recordTried.current) return;
    recordTried.current = true;
    (async () => {
      try {
        const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const r = await fetch(`/api/grade?date=${y}`).then(x => x.json());
        if (r && typeof r.w === "number" && r.w + r.l > 0) setRecord({ w: r.w, l: r.l });
      } catch {}
    })();
  }, [tab]);

  // ── in-stream chat while watching ──
  useEffect(() => {
    if (tab !== "live" || !watching) return;
    const poll = async () => {
      const d = await get("live/chat");
      if (d && typeof d === "object") setLiveChat((Object.values(d) as Msg[]).filter(m => m?.msg && m?.name).sort((a, b) => a.ts - b.ts).slice(-30));
    };
    poll();
    const id = setInterval(poll, 2500);
    return () => clearInterval(id);
  }, [tab, watching]);
  useEffect(() => { liveChatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [liveChat]);

  // ── lazy board rendering ──
  useEffect(() => { setVisibleCount(40); }, [league, tab]);

  // ── live props board — fetches itself, refreshes every 10 min ──
  useEffect(() => {
    if (tab !== "picks") return;
    let dead = false;
    const load = async () => {
      setPropsLoading(true); setPropsErr(false);
      try {
        const r = await fetch(`/api/props?league=${league}`).then(x => x.json());
        if (dead) return;
        setLiveProps(Array.isArray(r?.props) ? r.props : []);
        setPropsUpdated(r?.updated || "");
        if (r?.error) setPropsErr(true);
      } catch { if (!dead) { setPropsErr(true); setLiveProps([]); } }
      if (!dead) setPropsLoading(false);
    };
    load();
    const id = setInterval(load, 600000);
    return () => { dead = true; clearInterval(id); };
  }, [tab, league]);

  // ── hit rates — pulled per pick from real game logs, cached server-side ──
  useEffect(() => {
    if (tab !== "picks" || !liveProps.length || !STATS_LEAGUES.includes(league)) return;
    let dead = false;
    const targets = liveProps.filter(p => ratesRef.current[rateKey(p)] === undefined); // EVERY pick gets stats
    if (!targets.length) return;
    (async () => {
      const CHUNK = 8; // parallel lookups — much faster
      for (let i = 0; i < targets.length; i += CHUNK) {
        if (dead) return;
        await Promise.all(targets.slice(i, i + CHUNK).map(async p => {
          const key = rateKey(p);
          try {
            const r = await fetch(`/api/hitrate?league=${league}&player=${encodeURIComponent(p.player)}&prop=${encodeURIComponent(p.prop)}&line=${p.line}`).then(x => x.json());
            ratesRef.current[key] = r && !r.error && r.l20 ? (r as HitRate) : null;
          } catch { ratesRef.current[key] = null; }
        }));
        if (!dead) setRates({ ...ratesRef.current });
      }
    })();
    return () => { dead = true; };
  }, [tab, league, liveProps]);

  // ── snapshot top picks daily so /api/grade can build the public record ──
  useEffect(() => {
    if (tab !== "picks" || !STATS_LEAGUES.includes(league)) return;
    const good = liveProps
      .map(p => ({ p, pct: pctOf(rates[rateKey(p)]) }))
      .filter(e => e.pct != null)
      .map(e => ({ ...e, eff: (e.pct as number) >= 50 ? (e.pct as number) : 100 - (e.pct as number), side: (e.pct as number) >= 50 ? "over" : "under" }))
      .filter(e => e.eff >= 62)
      .sort((a, b) => b.eff - a.eff)
      .slice(0, 10);
    if (good.length < 3) return;
    const skey = league + "|" + new Date().toISOString().slice(0, 10);
    if (snapshotDone.current[skey]) return;
    snapshotDone.current[skey] = true;
    good.forEach(async e => {
      const d = (e.p.start || "").slice(0, 10);
      if (!d) return;
      const id = rateKey(e.p).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 90);
      try {
        await fetch(`${FB}/gp_record/${d}/${id}.json`, { method: "PUT", body: JSON.stringify({ player: e.p.player, prop: e.p.prop, line: e.p.line, side: e.side, league, pct: e.eff, graded: null }) });
      } catch {}
    });
  }, [rates, tab, league, liveProps]);

  // ── community chat polling ──
  useEffect(() => {
    if (tab !== "chat") return;
    const poll = async () => {
      const data = await get("community/chat");
      if (!data || typeof data !== "object") return;
      setMsgs((Object.values(data) as Msg[]).filter(m => m?.msg && m?.name).sort((a, b) => a.ts - b.ts).slice(-60));
    };
    poll();
    const id = setInterval(poll, 2500);
    return () => clearInterval(id);
  }, [tab]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const sendMsg = async () => {
    const text = draft.trim(); if (!text || !chatName) return;
    const now = Date.now(); if (now - lastSend.current < 1500) return;
    lastSend.current = now; setDraft("");
    setMsgs(m => [...m, { name: chatName, msg: text, ts: now }]);
    await push("community/chat", { name: chatName, msg: text, ts: now });
  };

  const saveTrades = (t: Trade[]) => { setTrades(t); try { localStorage.setItem("gp_journal", JSON.stringify(t)); } catch {} };
  const addTrade = () => {
    const entry = parseFloat(fEntry), exit = parseFloat(fExit), qty = parseFloat(fQty);
    if (!fSym.trim() || isNaN(entry) || isNaN(exit) || isNaN(qty) || qty <= 0) { alert("Fill in symbol, entry, exit and size"); return; }
    const t: Trade = { id: String(Date.now()), sym: fSym.trim().toUpperCase(), side: fSide, entry, exit, qty, notes: fNotes.trim(), ts: Date.now() };
    saveTrades([t, ...trades]);
    setFSym(""); setFEntry(""); setFExit(""); setFQty(""); setFNotes(""); setShowForm(false);
  };
  const pnl = (t: Trade) => (t.exit - t.entry) * t.qty * (t.side === "LONG" ? 1 : -1);
  const totalPnl = trades.reduce((a, t) => a + pnl(t), 0);
  const wins = trades.filter(t => pnl(t) > 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;
  const streak = (() => { let s = 0; for (const t of trades) { if (pnl(t) > 0) s++; else break; } return s; })();

  // ── ranked board + suggested slips (Linemate-style) ──
  const ranked = liveProps
    .map(p => ({ p, pct: pctOf(rates[rateKey(p)]) }))
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || String(a.p.start).localeCompare(String(b.p.start)));
  const slipLegs: { p: LiveProp; pct: number | null }[] = [];
  {
    const seenPl = new Set<string>();
    for (const e of ranked) {
      if ((e.pct ?? 0) < 65 || seenPl.has(e.p.player)) continue;
      seenPl.add(e.p.player); slipLegs.push(e);
      if (slipLegs.length >= 3) break;
    }
  }
  const slips: { p: LiveProp; pct: number | null }[][] = [];
  if (slipLegs.length >= 2) slips.push(slipLegs.slice(0, 2));
  if (slipLegs.length >= 3) slips.push(slipLegs.slice(0, 3));

  const card: React.CSSProperties = { background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, backdropFilter: "blur(20px)" };

  // ── FIRST-OPEN SETUP (shown once, then remembered) ──
  if (!setupDone) {
    const LG_META: { id: League; ico: string; name: string }[] = [
      { id: "NBA", ico: "🏀", name: "NBA" },
      { id: "NFL", ico: "🏈", name: "NFL" },
      { id: "MLB", ico: "⚾", name: "MLB" },
      { id: "NHL", ico: "🏒", name: "NHL" },
      { id: "SOCCER", ico: "⚽", name: "Soccer · World Cup" },
      { id: "WNBA", ico: "🏀", name: "WNBA" },
      { id: "NCAAF", ico: "🏈", name: "NCAA Football" },
      { id: "NCAAB", ico: "🏀", name: "NCAA Basketball" },
      { id: "MMA", ico: "🥊", name: "MMA / UFC" },
      { id: "TENNIS", ico: "🎾", name: "Tennis" },
    ];
    const OPS = ["Underdog", "PrizePicks", "FanDuel", "DraftKings", "Sleeper", "Fliff"];
    const tile = (on: boolean): React.CSSProperties => ({ background: on ? "rgba(0,255,135,.12)" : "rgba(255,255,255,.04)", border: on ? "1px solid rgba(0,255,135,.6)" : "1px solid rgba(255,255,255,.09)", borderRadius: 16, padding: "18px 12px", textAlign: "center", cursor: "pointer", color: on ? "#00ff87" : "#fff", fontWeight: 800, fontSize: 13.5, transition: "all .15s" });
    const bigBtn = (on: boolean): React.CSSProperties => ({ marginTop: 20, padding: "16px 0", width: "100%", background: on ? "linear-gradient(135deg,#00ff87,#00c864)" : "rgba(255,255,255,.08)", border: "none", borderRadius: 14, color: on ? "#000" : "rgba(255,255,255,.35)", fontWeight: 900, fontSize: 16, cursor: on ? "pointer" : "default" });
    return (
      <div style={{ minHeight: "100dvh", background: "#030503", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top,0px) + 20px) 22px calc(env(safe-area-inset-bottom,0px) + 24px)", position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes glowPulse{0%,100%{box-shadow:0 0 24px rgba(0,255,135,.25)}50%{box-shadow:0 0 48px rgba(0,255,135,.55)}}`}</style>
        <div style={{ position: "absolute", top: -140, left: "50%", transform: "translateX(-50%)", width: 480, height: 320, background: "radial-gradient(ellipse,rgba(0,255,135,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24, position: "relative" }}>
          {[0, 1, 2, 3, 4, 5].map(s => <span key={s} style={{ width: 22, height: 4, borderRadius: 3, background: s <= setupStep ? "#00ff87" : "rgba(255,255,255,.12)", transition: "background .3s" }} />)}
        </div>

        {setupStep === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 430, width: "100%", margin: "0 auto", animation: "fadeUp .4s ease", position: "relative" }}>
            <div style={{ background: "rgba(255,255,255,.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 18, padding: 18, marginBottom: 38, boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>A. Reese <span style={{ color: "rgba(255,255,255,.4)", fontWeight: 600 }}>@ WAS</span></div>
                  <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.7)" }}>Over 14.5 Points</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 900, color: "#ffd700", background: "rgba(255,215,0,.1)", border: "1px solid rgba(255,215,0,.4)", borderRadius: 8, padding: "4px 8px" }}>ELITE</span>
              </div>
              {([["l5", "Hit in 8 of last 10 games", "80%"], ["l10", "Hit in 4 of last 5 games", "80%"], ["l20", "Hit in 11 of last 19 games", "58%"]] as [string, string, string][]).map(([i2, t, pc], ri) => (
                <div key={ri} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
                  <span style={{ width: 18, textAlign: "center", color: "rgba(0,255,135,.75)", display: "inline-flex", justifyContent: "center" }}><RowIco k={i2} /></span>
                  <span style={{ flex: 1, fontSize: 12.5, color: "rgba(255,255,255,.75)" }}>{t}</span>
                  <span style={{ fontWeight: 900, fontSize: 13, color: "#00ff87" }}>{pc}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ display: "inline-flex", width: 54, height: 54, borderRadius: 16, background: "linear-gradient(135deg,#00ff87,#00c864)", alignItems: "center", justifyContent: "center", marginBottom: 14, boxShadow: "0 6px 30px rgba(0,255,135,.4)" }}><span style={{ fontWeight: 900, fontSize: 21, color: "#000", letterSpacing: "-1px" }}>GP</span></div>
              <h1 style={{ margin: "0 0 6px", fontSize: 30, fontWeight: 900, letterSpacing: "-1px" }}>The Greenprint</h1>
              <p style={{ margin: 0, color: "rgba(255,255,255,.45)", fontSize: 15 }}>Find your next play.</p>
            </div>
            <button onClick={() => setSetupStep(1)} style={{ ...bigBtn(true), animation: "glowPulse 2.2s infinite" }}>Get Started</button>
          </div>
        )}

        {setupStep === 1 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 430, width: "100%", margin: "0 auto", animation: "fadeUp .4s ease", position: "relative" }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 27, fontWeight: 900, letterSpacing: "-.5px", textAlign: "center" }}>Everything in one app</h1>
            <p style={{ margin: "0 0 26px", color: "rgba(255,255,255,.45)", fontSize: 14, textAlign: "center" }}>Built to make you sharper every single day.</p>
            {([
              ["target", "Daily Picks", "Live props across every major sport, ranked by real hit rates — updates itself all day."],
              ["live", "Live Trading", "Watch live trading sessions the second they start — the app lights up automatically."],
              ["chat", "Community", "Chat with the whole Greenprint fam in real time."],
              ["journal", "Trade Journal", "Log trades, track P&L and win rate like a pro."],
            ] as [string, string, string][]).map(([ico, t, d], fi) => (
              <div key={fi} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "15px 16px", marginBottom: 10, animation: `fadeUp .4s ease ${0.08 * fi}s both` }}>
                <span style={{ width: 34, textAlign: "center", color: "#00ff87", display: "inline-flex", justifyContent: "center", paddingTop: 2 }}>{ico === "target" ? <IcoTarget s={24} /> : ico === "live" ? <IcoLive s={24} /> : ico === "chat" ? <IcoChat s={24} /> : <IcoJournal s={24} />}</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>{t}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.45)", marginTop: 3, lineHeight: 1.45 }}>{d}</div>
                </div>
              </div>
            ))}
            <button onClick={() => setSetupStep(2)} style={bigBtn(true)}>Continue</button>
          </div>
        )}

        {setupStep === 2 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 430, width: "100%", margin: "0 auto", animation: "fadeUp .4s ease", position: "relative" }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 27, fontWeight: 900, letterSpacing: "-.5px" }}>What are you here for?</h1>
            <p style={{ margin: "0 0 20px", color: "rgba(255,255,255,.45)", fontSize: 14 }}>We&apos;ll shape the app around it.</p>
            {([["trend", "Trading", "Live sessions, education & journal"], ["target", "Picks", "High-probability props & slips"], ["bolt", "Both", "The full Greenprint experience"]] as [string, string, string][]).map(([ico, t, d]) => {
              const on = purpose === t;
              return (
                <div key={t} onClick={() => setPurpose(t)} style={{ ...tile(on), textAlign: "left", display: "flex", gap: 14, alignItems: "center", padding: "17px 16px", marginBottom: 10 }}>
                  <span style={{ color: on ? "#00ff87" : "rgba(255,255,255,.7)", display: "inline-flex" }}>{ico === "trend" ? <IcoTrend s={24} /> : ico === "target" ? <IcoTarget s={24} /> : <IcoBolt s={24} />}</span>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{t}</div>
                    <div style={{ fontSize: 12, color: on ? "rgba(0,255,135,.7)" : "rgba(255,255,255,.4)", marginTop: 2 }}>{d}</div>
                  </div>
                </div>
              );
            })}
            <button onClick={() => purpose && setSetupStep(3)} style={bigBtn(!!purpose)}>Continue</button>
          </div>
        )}

        {setupStep === 3 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 430, width: "100%", margin: "0 auto", animation: "fadeUp .4s ease", position: "relative" }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 27, fontWeight: 900, letterSpacing: "-.5px" }}>Create your profile</h1>
            <p style={{ margin: "0 0 22px", color: "rgba(255,255,255,.45)", fontSize: 14 }}>Your name shows in the community and on stream chat.</p>
            <input value={suName} onChange={e => setSuName(e.target.value)} placeholder="Your name" style={{ width: "100%", padding: "15px 17px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
            <input value={suEmail} onChange={e => setSuEmail(e.target.value)} type="email" placeholder="Email address" style={{ width: "100%", padding: "15px 17px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
            <button onClick={doSignIn} style={bigBtn(true)}>Sign In →</button>
            <p style={{ fontSize: 10.5, color: "rgba(255,255,255,.25)", textAlign: "center", marginTop: 14 }}>One account for picks, chat and live streams.</p>
          </div>
        )}

        {setupStep === 4 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 430, width: "100%", margin: "0 auto", animation: "fadeUp .4s ease", position: "relative" }}>
            <h1 style={{ margin: "6px 0 8px", fontSize: 27, fontWeight: 900, letterSpacing: "-.5px" }}>Choose your favorite leagues</h1>
            <p style={{ margin: "0 0 20px", color: "rgba(255,255,255,.45)", fontSize: 14 }}>See the leagues you care about first, every time you open the app.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, overflowY: "auto" }}>
              {LG_META.map(m => {
                const on = selLeagues.includes(m.id);
                return (
                  <div key={m.id} style={tile(on)} onClick={() => setSelLeagues(on ? selLeagues.filter(x => x !== m.id) : [...selLeagues, m.id])}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>{m.ico}</div>{m.name}
                  </div>
                );
              })}
            </div>
            <button onClick={() => selLeagues.length && setSetupStep(5)} style={bigBtn(selLeagues.length > 0)}>Continue</button>
          </div>
        )}

        {setupStep === 5 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 430, width: "100%", margin: "0 auto", animation: "fadeUp .4s ease", position: "relative" }}>
            <h1 style={{ margin: "6px 0 8px", fontSize: 27, fontWeight: 900, letterSpacing: "-.5px" }}>Pick your boards</h1>
            <p style={{ margin: "0 0 20px", color: "rgba(255,255,255,.45)", fontSize: 14 }}>Where do you play? We&apos;ll tune your picks and slips to match.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {OPS.map(o => {
                const on = selOps.includes(o);
                return (
                  <div key={o} style={tile(on)} onClick={() => setSelOps(on ? selOps.filter(x => x !== o) : [...selOps, o])}>
                    <div style={{ fontSize: 22, marginBottom: 8, fontWeight: 900, color: on ? "#00ff87" : "rgba(255,255,255,.6)" }}>{o.charAt(0)}</div>{o}
                  </div>
                );
              })}
            </div>
            <button onClick={finishSetup} style={bigBtn(true)}>Continue</button>
            <button onClick={finishSetup} style={{ background: "none", border: "none", color: "rgba(255,255,255,.45)", fontSize: 14, fontWeight: 700, marginTop: 14, cursor: "pointer" }}>I don&apos;t have one yet</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: "100dvh", background: "#030503", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.92)}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 24px rgba(0,255,135,.25)}50%{box-shadow:0 0 48px rgba(0,255,135,.55)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes orb{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.9;transform:scale(1.1)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(0,255,135,.25);border-radius:4px}
        .tabIn{animation:fadeUp .35s ease}
        .gpInput{width:100%;padding:13px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;color:#fff;font-size:15px;outline:none;box-sizing:border-box}
        .gpInput:focus{border-color:rgba(0,255,135,.5)}
        .gpBtn{background:linear-gradient(135deg,#00ff87,#00c864);border:none;border-radius:14px;color:#000;font-weight:900;cursor:pointer;font-size:15px;transition:transform .12s ease}
        .gpBtn:active{transform:scale(.96)}
        .chip{transition:all .15s ease}
        .chip:active{transform:scale(.93)}
        .chip{border-radius:20px;padding:7px 16px;font-size:13px;font-weight:800;cursor:pointer;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);transition:all .15s}
        .chip.on{background:rgba(0,255,135,.14);border-color:rgba(0,255,135,.5);color:#00ff87}
        .navBtn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 0 5px;background:none;border:none;cursor:pointer;color:rgba(255,255,255,.35);font-size:10px;font-weight:800;letter-spacing:.5px}
        .navBtn.on{color:#00ff87}
        .navBtn.on .navIco{background:rgba(0,255,135,.14);box-shadow:0 0 18px rgba(0,255,135,.3)}
        .navIco{width:44px;height:30px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:17px;transition:all .2s}
      `}</style>

      {/* ambient glow */}
      <div style={{ position: "absolute", top: -140, left: "50%", transform: "translateX(-50%)", width: 480, height: 320, background: "radial-gradient(ellipse,rgba(0,255,135,.14) 0%,transparent 65%)", animation: "orb 5s ease-in-out infinite", pointerEvents: "none" }} />

      {/* ── header ── */}
      <div style={{ padding: "calc(env(safe-area-inset-top,0px) + 14px) 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 2, maxWidth: 560, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: "linear-gradient(135deg,#00ff87,#00c864)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,255,135,.35)" }}><span style={{ fontWeight: 900, fontSize: 15, color: "#000", letterSpacing: "-0.5px" }}>GP</span></div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: "-.5px", background: "linear-gradient(90deg,#fff,#00ff87,#fff)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 5s linear infinite" }}>The Greenprint</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "2.5px", textTransform: "uppercase", fontWeight: 700 }}>Trade · Bet · Win</div>
          </div>
        </div>
        {isLive ? (
          <button onClick={() => setTab("live")} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,45,85,.14)", border: "1px solid rgba(255,45,85,.45)", borderRadius: 20, padding: "6px 13px", cursor: "pointer" }}>
            <span style={{ width: 7, height: 7, background: "#ff2d55", borderRadius: "50%", animation: "pulse 1.1s infinite", display: "inline-block" }} />
            <span style={{ color: "#ff2d55", fontWeight: 900, fontSize: 11, letterSpacing: "1.5px" }}>LIVE</span>
          </button>
        ) : (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "6px 13px", letterSpacing: "1.5px", fontWeight: 700 }}>OFFLINE</span>
        )}
      </div>

      {/* ── body ── */}
      <div onScroll={e => { const el = e.currentTarget; if (tab === "picks" && el.scrollTop + el.clientHeight > el.scrollHeight - 700) setVisibleCount(c => c + 40); }} style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1, maxWidth: 560, width: "100%", margin: "0 auto", boxSizing: "border-box", padding: "6px 16px 18px" }}>

        {/* ══ LIVE ══ */}
        {tab === "live" && (
          <div className="tabIn">
            <div style={{ margin: "4px 2px 14px" }}>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-.5px" }}>
                {chatName ? <>Welcome back, <span style={{ color: "#00ff87" }}>{chatName.split(" ")[0]}</span> 👋</> : <>Welcome to the Greenprint 👋</>}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 3, fontWeight: 600 }}>
                {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })} · let&apos;s get it
              </div>
            </div>
            {record && (
              <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", marginBottom: 14, border: "1px solid rgba(0,255,135,.25)" }}>
                <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: "1.5px", color: "rgba(255,255,255,.55)", display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ color: "#00ff87", display: "inline-flex" }}><IcoBars s={12} /></span>GP RECORD · YESTERDAY</span>
                <span style={{ fontWeight: 900, fontSize: 16, color: record.w >= record.l ? "#00ff87" : "#ff6b6b" }}>
                  {record.w}-{record.l} <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>({Math.round((record.w / (record.w + record.l)) * 100)}%)</span>
                </span>
              </div>
            )}
            {isLive ? (
              watching ? (
                <>
                  <div style={{ ...card, overflow: "hidden", position: "relative", background: "#000", height: "40dvh", minHeight: 260, border: "1px solid rgba(0,255,135,.3)" }}>
                    <video ref={appVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                    {!appHasVideo && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                        <div style={{ width: 38, height: 38, border: "3px solid rgba(0,255,135,.25)", borderTopColor: "#00ff87", borderRadius: "50%", animation: "spin_a .9s linear infinite" }} />
                        <style>{`@keyframes spin_a{to{transform:rotate(360deg)}}`}</style>
                        <span style={{ color: "rgba(255,255,255,.4)", fontSize: 12.5 }}>Connecting to the stream...</span>
                      </div>
                    )}
                    {appNeedTap && (
                      <div onClick={() => { appVideoRef.current?.play().catch(() => {}); try { appRoomRef.current?.startAudio?.(); } catch {} setAppNeedTap(false); }} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)", cursor: "pointer" }}>
                        <div style={{ background: "#00ff87", color: "#000", fontWeight: 900, borderRadius: 14, padding: "16px 32px", fontSize: 16 }}>▶ Tap to Play</div>
                      </div>
                    )}
                  </div>
                  <div style={{ ...card, marginTop: 10, display: "flex", flexDirection: "column", height: 250 }}>
                    <div style={{ padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,.06)", fontWeight: 800, fontSize: 11.5, letterSpacing: "1px", color: "rgba(255,255,255,.55)", flexShrink: 0, display: "flex", alignItems: "center", gap: 7 }}><span style={{ color: "#00ff87", display: "inline-flex" }}><IcoChat s={12} /></span>STREAM CHAT</div>
                    <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
                      {liveChat.map((m, i) => (
                        <div key={i} style={{ marginBottom: 7, fontSize: 12.5, lineHeight: 1.4 }}>
                          <span style={{ color: m.name === "Host" ? "#ff9900" : nc(m.name), fontWeight: 800 }}>{m.name}</span>{" "}
                          <span style={{ color: "rgba(255,255,255,.8)" }}>{m.msg}</span>
                        </div>
                      ))}
                      <div ref={liveChatEnd} />
                    </div>
                    <div style={{ display: "flex", gap: 7, padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>
                      <input className="gpInput" value={liveDraft} onChange={e => setLiveDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && sendLiveMsg()} placeholder={chatName ? `Chat as ${chatName}...` : "Set up your profile to chat"} style={{ flex: 1, padding: "9px 13px", fontSize: 13 }} />
                      <button className="gpBtn" onClick={sendLiveMsg} style={{ padding: "0 16px", fontSize: 15 }}>→</button>
                    </div>
                  </div>
                  <a href="/stream" style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: 12, color: "rgba(0,255,135,.7)", fontWeight: 700, textDecoration: "none" }}>Open full experience ↗</a>
                </>
              ) : (
                <div style={{ ...card, padding: 34, textAlign: "center", border: "1px solid rgba(0,255,135,.35)", animation: "glowPulse 2.2s infinite" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                    <span style={{ width: 10, height: 10, background: "#ff2d55", borderRadius: "50%", animation: "pulse 1.1s infinite", display: "inline-block" }} />
                    <span style={{ color: "#ff2d55", fontWeight: 900, fontSize: 13, letterSpacing: "3px" }}>LIVE NOW</span>
                  </div>
                  <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900, letterSpacing: "-.5px" }}>Live Trading Session</h2>
                  <p style={{ color: "rgba(255,255,255,.45)", fontSize: 14, margin: "0 0 26px" }}>The stream is on right now. Tap in.</p>
                  <button className="gpBtn" onClick={startWatch} disabled={appConnecting} style={{ padding: "16px 44px", animation: appConnecting ? "none" : "glowPulse 2s infinite", opacity: appConnecting ? 0.7 : 1 }}>{appConnecting ? "Connecting..." : "▶ Watch Stream"}</button>
                </div>
              )
            ) : (
              <div style={{ ...card, padding: 40, textAlign: "center" }}>
                <div style={{ marginBottom: 16, color: "rgba(0,255,135,.45)", display: "flex", justifyContent: "center" }}><IcoLive s={48} /></div>
                <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,.75)" }}>Stream Offline</h2>
                <p style={{ color: "rgba(255,255,255,.35)", fontSize: 13.5, margin: "0 0 6px" }}>The moment we go live, this page lights up automatically.</p>
                <p style={{ color: "rgba(0,255,135,.6)", fontSize: 12.5, margin: 0, fontWeight: 700 }}>Keep the app open — no refresh needed.</p>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <button onClick={() => setTab("picks")} style={{ ...card, padding: "20px 16px", textAlign: "left", cursor: "pointer", color: "#fff" }}>
                <div style={{ marginBottom: 8, color: "#00ff87" }}><IcoTarget s={24} /></div>
                <div style={{ fontWeight: 900, fontSize: 15 }}>Today&apos;s Picks</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginTop: 3 }}>Highest probability props</div>
              </button>
              <a href="/onboard" style={{ ...card, padding: "20px 16px", textAlign: "left", textDecoration: "none", color: "#fff", display: "block" }}>
                <div style={{ marginBottom: 8, color: "#00ff87" }}><IcoArrowUp s={24} /></div>
                <div style={{ fontWeight: 900, fontSize: 15 }}>Get Onboarded</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginTop: 3 }}>Broker, chats &amp; setup</div>
              </a>
            </div>

            {pod && (
              <div style={{ borderRadius: 20, padding: 1.5, background: "linear-gradient(135deg,rgba(255,215,0,.55),rgba(0,255,135,.45),rgba(0,255,135,.1))", marginTop: 14 }}>
                <div style={{ background: "#060f09", borderRadius: 19, padding: "15px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "2px", color: "#ffd700", marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}><IcoFlame s={12} />PICK OF THE DAY</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(0,255,135,.1)", border: "1px solid rgba(0,255,135,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: "#00ff87", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                      {pod.p.player.split(" ").map(w => w.charAt(0)).slice(0, 2).join("").toUpperCase()}
                      {pod.r?.headshot && <img src={pod.r.headshot} alt="" onError={e => { e.currentTarget.style.display = "none"; }} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#0c130e" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pod.p.player}</div>
                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)", marginTop: 2 }}>
                        {(() => { if (!pod.r || !pod.r.l10 || !pod.r.l10.of) return `${pod.p.line} ${pod.p.prop} · ${fmtStart(pod.p.start)}`; const pc = Math.round((pod.r.l10.h / pod.r.l10.of) * 100); const over = pc >= 50; return `${over ? "Over" : "Under"} ${pod.p.line} ${pod.p.prop} · hit ${over ? pod.r.l10.h : pod.r.l10.of - pod.r.l10.h} of last ${pod.r.l10.of}`; })()}
                      </div>
                    </div>
                    {pod.r && pod.r.l10 && pod.r.l10.of ? (() => { const pc = Math.round((pod.r!.l10.h / pod.r!.l10.of) * 100); const shown = pc >= 50 ? pc : 100 - pc; return <div style={{ fontWeight: 900, fontSize: 21, color: pctColor(shown), flexShrink: 0 }}>{shown}%</div>; })() : null}
                  </div>
                  <button onClick={() => setTab("picks")} style={{ width: "100%", marginTop: 12, padding: "11px 0", background: "rgba(0,255,135,.1)", border: "1px solid rgba(0,255,135,.35)", borderRadius: 12, color: "#00ff87", fontWeight: 900, fontSize: 13, cursor: "pointer" }}>See the full board →</button>
                </div>
              </div>
            )}

            <div style={{ margin: "20px 2px 10px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "2px", color: "#00ff87", display: "inline-flex", alignItems: "center", gap: 7 }}><IcoJournal s={14} />TRADING ACADEMY</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,.35)", fontWeight: 700 }}>the fundamentals, free</span>
            </div>
            {LESSONS.map((l, li) => (
              <div key={li} style={{ ...card, marginBottom: 8, overflow: "hidden" }}>
                <div onClick={() => setOpenLesson(openLesson === li ? null : li)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(0,255,135,.08)", border: "1px solid rgba(0,255,135,.25)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#00ff87", flexShrink: 0 }}>{String(li + 1).padStart(2, "0")}</span>
                  <span style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>{l.title}</span>
                  <span style={{ color: "rgba(0,255,135,.6)", fontSize: 13, fontWeight: 900, transform: openLesson === li ? "rotate(90deg)" : "none", transition: "transform .2s" }}>›</span>
                </div>
                {openLesson === li && (
                  <div style={{ padding: "0 16px 15px 47px", fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,.65)", animation: "fadeUp .25s ease" }}>{l.body}</div>
                )}
              </div>
            ))}
            <p style={{ fontSize: 10, color: "rgba(255,255,255,.25)", textAlign: "center", margin: "14px 0 4px", lineHeight: 1.5 }}>Educational purposes only · not financial advice · trading involves risk of loss.</p>
          </div>
        )}

        {/* ══ PICKS — live board, auto-updating ══ */}
        {tab === "picks" && (
          <div className="tabIn">
            <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
              {leagueOrder.map(l => (
                <button key={l} className={`chip${league === l ? " on" : ""}`} style={{ flexShrink: 0 }} onClick={() => setLeague(l)}>{l === "SOCCER" ? "⚽ SOCCER" : l}</button>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,255,135,.06)", border: "1px solid rgba(0,255,135,.2)", borderRadius: 14, padding: "10px 14px", marginBottom: 14 }}>
              <span style={{ fontSize: 11.5, color: "rgba(0,255,135,.85)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff87", display: "inline-block", boxShadow: "0 0 8px rgba(0,255,135,.8)" }} />LIVE BOARD · highest hit % first</span>
              {propsUpdated && <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontWeight: 600 }}>as of {fmtStart(propsUpdated) || "now"}</span>}
            </div>

            {["SOCCER", "TENNIS", "MMA"].includes(league) && (
              <div style={{ background: "rgba(255,217,61,.05)", border: "1px solid rgba(255,217,61,.18)", borderRadius: 12, padding: "8px 13px", marginBottom: 12, fontSize: 10.5, color: "rgba(255,217,61,.75)", fontWeight: 600 }}>
                Lines below are live · per-game stat logs aren&apos;t published for this league yet, so hit-rate bars are limited here.
              </div>
            )}

            {propsLoading && (
              <div style={{ ...card, padding: 40, textAlign: "center" }}>
                <div style={{ width: 34, height: 34, border: "3px solid rgba(0,255,135,.2)", borderTopColor: "#00ff87", borderRadius: "50%", margin: "0 auto 14px", animation: "spin_ .8s linear infinite" }} />
                <style>{`@keyframes spin_{to{transform:rotate(360deg)}}`}</style>
                <p style={{ color: "rgba(255,255,255,.35)", fontSize: 13, margin: 0 }}>Pulling the live {league} board...</p>
              </div>
            )}

            {!propsLoading && propsErr && (
              <div style={{ ...card, padding: 34, textAlign: "center" }}>
                <div style={{ marginBottom: 10, color: "rgba(0,255,135,.4)", display: "flex", justifyContent: "center" }}><IcoLive s={36} /></div>
                <p style={{ color: "rgba(255,255,255,.45)", fontSize: 13.5, margin: 0 }}>Feed hiccup — it retries automatically. Check back in a minute.</p>
              </div>
            )}

            {!propsLoading && !propsErr && liveProps.length === 0 && (
              <div style={{ ...card, padding: 34, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🌙</div>
                <p style={{ color: "rgba(255,255,255,.45)", fontSize: 13.5, margin: 0 }}>No {league} props on the board right now — try another sport.</p>
              </div>
            )}

            {!propsLoading && slips.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 2px 10px" }}>
                  <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "2px", color: "#ffd700", display: "inline-flex", alignItems: "center", gap: 6 }}><IcoBolt s={13} />GP SLIPS</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.35)", fontWeight: 700 }}>built from today&apos;s highest hit rates</span>
                </div>
                {slips.map((legs, si) => {
                  const combo = Math.round(legs.reduce((a, e) => a * ((e.pct ?? 0) / 100), 1) * 100);
                  return (
                    <div key={si} style={{ borderRadius: 20, padding: 1.5, background: "linear-gradient(135deg,rgba(0,255,135,.65),rgba(255,215,0,.4),rgba(0,255,135,.12))", marginBottom: 12 }}>
                      <div style={{ background: "#060f09", borderRadius: 19, padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: "1.5px" }}>{legs.length}-MAN SLIP</span>
                          <span style={{ fontWeight: 900, fontSize: 16, color: "#ffd700" }}>{combo}% <span style={{ fontSize: 9, color: "rgba(255,255,255,.4)", letterSpacing: "1px" }}>EST. HIT</span></span>
                        </div>
                        {legs.map((e, li) => (
                          <div key={li} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: li ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                            <div style={{ width: 30, height: 30, borderRadius: 10, background: "rgba(0,255,135,.1)", border: "1px solid rgba(0,255,135,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, color: "#00ff87", flexShrink: 0 }}>{e.p.player.split(" ").map(w => w.charAt(0)).slice(0, 2).join("").toUpperCase()}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.p.player}</div>
                              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.45)" }}>Over {e.p.line} {e.p.prop}</div>
                            </div>
                            <span style={{ fontWeight: 900, fontSize: 13.5, color: "#00ff87" }}>{e.pct}%</span>
                          </div>
                        ))}
                        <div style={{ fontSize: 9.5, color: "rgba(255,255,255,.3)", marginTop: 8 }}>Based on last-10-game hit rates · live lines</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!propsLoading && ranked.slice(0, visibleCount).map(({ p, pct }, i) => (
              <div key={rateKey(p)} style={{ ...card, padding: 16, marginBottom: 10, border: pct != null && pct >= 80 ? "1px solid rgba(255,215,0,.35)" : undefined, animation: "fadeUp .45s ease both", animationDelay: `${Math.min(i, 12) * 40}ms`, transition: "border .3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(0,255,135,.08)", border: "1px solid rgba(0,255,135,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, color: "#00ff87", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                    {p.player.split(" ").map(w => w.charAt(0)).slice(0, 2).join("").toUpperCase()}
                    {rates[rateKey(p)]?.headshot && (
                      <img src={rates[rateKey(p)]!.headshot} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = "none"; }} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#0c130e" }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 15.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.player}
                      {pct != null && pct >= 80 && <span style={{ marginLeft: 7, fontSize: 9, fontWeight: 900, letterSpacing: "1px", color: "#ffd700", background: "rgba(255,215,0,.1)", border: "1px solid rgba(255,215,0,.35)", borderRadius: 6, padding: "2px 6px", verticalAlign: "middle" }}>ELITE</span>}
                      {pct != null && pct >= 70 && pct < 80 && <span style={{ marginLeft: 7, fontSize: 9, fontWeight: 900, letterSpacing: "1px", color: "#00ff87", background: "rgba(0,255,135,.1)", border: "1px solid rgba(0,255,135,.35)", borderRadius: 6, padding: "2px 6px", verticalAlign: "middle" }}>SMASH</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.team}{p.opp ? ` · ${p.opp}` : ""}{p.league ? ` · ${p.league}` : ""}
                    </div>
                    {!rates[rateKey(p)] && (
                      <div style={{ marginTop: 6 }}>
                        <span style={{ background: "rgba(0,255,135,.08)", border: "1px solid rgba(0,255,135,.2)", color: "#00ff87", borderRadius: 8, padding: "3px 9px", fontSize: 12, fontWeight: 900 }}>{p.line}</span>
                        <span style={{ marginLeft: 8, fontSize: 11.5, color: "rgba(255,255,255,.55)", fontWeight: 700 }}>{p.prop}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {pct != null ? (
                      <>
                        <div style={{ fontWeight: 900, fontSize: 24, color: pctColor(pct), lineHeight: 1 }}>{pct}%</div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", fontWeight: 800, letterSpacing: "1px", marginTop: 4 }}>HIT RATE</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,.25)", fontWeight: 700, maxWidth: 70, textAlign: "right" }}>{STATS_LEAGUES.includes(league) && !(rateKey(p) in rates) ? "⏳" : "—"}</div>
                    )}
                  </div>
                </div>
                {(() => {
                  const r = rates[rateKey(p)];
                  if (!r) return null;
                  const w = r.l10 && r.l10.of ? r.l10 : r.l5 && r.l5.of ? r.l5 : r.l20;
                  if (!w || !w.of) return null;
                  const overPct = Math.round((w.h / w.of) * 100);
                  const over = overPct >= 50;
                  const shown = over ? overPct : 100 - overPct;
                  const propLc = p.prop.toLowerCase();
                  const segs = r.recent && r.recent.length ? r.recent : null;
                  return (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ margin: "0 0 12px", fontSize: 14.5, fontWeight: 700, lineHeight: 1.5, color: "rgba(255,255,255,.92)" }}>
                        {p.player} has {over ? "exceeded" : "failed to exceed"} {p.line} {propLc} in {over ? w.h : w.of - w.h} of the last {w.of} games{r.avg != null ? ` (${r.avg} ${propLc}/game average)` : ""}.
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: "9px 12px", marginBottom: 10 }}>
                        <span style={{ fontWeight: 900, fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ color: "#00ff87", display: "inline-flex" }}><IcoBars s={13} /></span>{over ? "Over" : "Under"} {p.line} {p.prop}</span>
                        <span style={{ fontSize: 10, color: "rgba(0,255,135,.7)", fontWeight: 900, letterSpacing: "1px" }}>{p.board.toUpperCase()}</span>
                      </div>
                      {segs && (
                        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                          {segs.map((s, si) => {
                            const hit = over ? s === 1 : s === 0;
                            return <div key={si} style={{ flex: 1, height: 6, borderRadius: 4, background: hit ? "#00ff87" : "#ff5f7a", boxShadow: hit ? "0 0 8px rgba(0,255,135,.35)" : "none" }} />;
                          })}
                        </div>
                      )}
                      <div style={{ fontSize: 13, fontWeight: 900, color: pctColor(shown) }}>{shown}% <span style={{ color: "rgba(255,255,255,.45)", fontWeight: 600 }}>in the last {segs ? segs.length : w.of} games</span></div>
                    </div>
                  );
                })()}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 11, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.05)" }}>
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.35)", fontWeight: 700 }}>{fmtStart(p.start)} · <span style={{ color: "rgba(0,255,135,.55)", letterSpacing: "1px" }}>{p.board.toUpperCase()}</span></span>
                  {pct != null && (
                    <button onClick={() => toggleSlip(p, pct)} style={{ background: inSlip(p) ? "rgba(0,255,135,.18)" : "rgba(255,255,255,.06)", border: inSlip(p) ? "1px solid rgba(0,255,135,.6)" : "1px solid rgba(255,255,255,.14)", borderRadius: 9, color: inSlip(p) ? "#00ff87" : "rgba(255,255,255,.65)", fontWeight: 900, fontSize: 11, padding: "5px 12px", cursor: "pointer" }}>
                      {inSlip(p) ? "✓ In slip" : "+ Slip"}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {!propsLoading && liveProps.length > 0 && (
              <p style={{ fontSize: 10.5, color: "rgba(255,255,255,.25)", textAlign: "center", margin: "16px 0 4px", lineHeight: 1.5 }}>
                Live lines · refreshes automatically every day, all day.<br />L5/L10/L20 = times the player beat this line in their last 5/10/20 games (real game logs).
              </p>
            )}
          </div>
        )}

        {/* ══ COMMUNITY ══ */}
        {tab === "chat" && (
          <div className="tabIn" style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 190px)", minHeight: 360 }}>
            {!chatName ? (
              <div style={{ ...card, padding: 30, textAlign: "center", margin: "auto 0" }}>
                <div style={{ marginBottom: 12, color: "rgba(0,255,135,.5)", display: "flex", justifyContent: "center" }}><IcoChat s={38} /></div>
                <h3 style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 19 }}>Join the Community</h3>
                <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13, margin: "0 0 20px" }}>Pick a name — it shows next to your messages.</p>
                <input className="gpInput" value={nameDraft} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && nameDraft.trim()) { setChatName(nameDraft.trim()); try { localStorage.setItem("gp_chat_name", nameDraft.trim()); } catch {} } }} placeholder="Your name" style={{ marginBottom: 12 }} />
                <button className="gpBtn" style={{ width: "100%", padding: "14px 0" }} onClick={() => { if (nameDraft.trim()) { setChatName(nameDraft.trim()); try { localStorage.setItem("gp_chat_name", nameDraft.trim()); } catch {} } }}>Enter Chat →</button>
              </div>
            ) : (
              <>
                <div style={{ ...card, flex: 1, overflowY: "auto", padding: "14px 14px 6px", marginBottom: 10 }}>
                  {msgs.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 0" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#00ff87,#00c864)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}><span style={{ fontWeight: 900, fontSize: 17, color: "#000" }}>GP</span></div>
                      <p style={{ color: "rgba(255,255,255,.25)", fontSize: 13, margin: 0 }}>Be the first to say something.</p>
                    </div>
                  )}
                  {msgs.map((m, i) => (
                    <div key={i} style={{ marginBottom: 12, display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: (m.name === "Host" ? "#ff9900" : nc(m.name)) + "22", border: `1.5px solid ${m.name === "Host" ? "#ff9900" : nc(m.name)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: m.name === "Host" ? "#ff9900" : nc(m.name) }}>
                        {m.name === "Host" ? "G" : m.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ color: m.name === "Host" ? "#ff9900" : nc(m.name), fontWeight: 800, fontSize: 12 }}>{m.name}</span>
                        <span style={{ display: "block", color: "rgba(255,255,255,.82)", fontSize: 13.5, wordBreak: "break-word", lineHeight: 1.45 }}>{m.msg}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEnd} />
                </div>
                {isHostUser && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <button onClick={() => { const n = chatName === "Host" ? (JSON.parse(localStorage.getItem("gp_viewer") || "{}")?.name || "Host") : "Host"; setChatName(n); }} style={{ flex: 1, background: chatName === "Host" ? "rgba(255,153,0,.15)" : "rgba(255,255,255,.05)", border: chatName === "Host" ? "1px solid rgba(255,153,0,.5)" : "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: chatName === "Host" ? "#ff9900" : "rgba(255,255,255,.55)", fontWeight: 800, fontSize: 11.5, padding: "8px 0", cursor: "pointer" }}>
                      {chatName === "Host" ? "Chatting as Host ✓" : "Chat as Host"}
                    </button>
                    <button onClick={async () => { if (!confirm("Clear the entire community chat?")) return; try { await fetch(`${FB}/community/chat.json`, { method: "DELETE" }); } catch {} setMsgs([]); }} style={{ flex: 1, background: "rgba(255,45,85,.08)", border: "1px solid rgba(255,45,85,.35)", borderRadius: 10, color: "#ff2d55", fontWeight: 800, fontSize: 11.5, padding: "8px 0", cursor: "pointer" }}>🧹 Clear chat</button>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="gpInput" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder={`Chat as ${chatName}...`} style={{ flex: 1 }} />
                  <button className="gpBtn" onClick={sendMsg} style={{ padding: "0 20px", fontSize: 17 }}>→</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ JOURNAL ══ */}
        {tab === "journal" && (
          <div className="tabIn">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ ...card, padding: "16px 14px", textAlign: "center", border: streak >= 3 ? "1px solid rgba(255,215,0,.35)" : undefined }}>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", fontWeight: 800, letterSpacing: "1px", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><span style={{ color: streak > 0 ? "#ffd700" : "rgba(255,255,255,.3)", display: "inline-flex" }}><IcoFlame s={11} /></span>STREAK</div>
                <div style={{ fontWeight: 900, fontSize: 17, color: streak >= 3 ? "#ffd700" : streak > 0 ? "#00ff87" : "rgba(255,255,255,.6)" }}>{trades.length ? `${streak} W` : "—"}</div>
              </div>
              <div style={{ ...card, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", fontWeight: 800, letterSpacing: "1px", marginBottom: 6 }}>NET P&amp;L</div>
                <div style={{ fontWeight: 900, fontSize: 17, color: totalPnl >= 0 ? "#00ff87" : "#ff6b6b" }}>{trades.length ? fmtMoney(totalPnl) : "—"}</div>
              </div>
              <div style={{ ...card, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", fontWeight: 800, letterSpacing: "1px", marginBottom: 6 }}>WIN RATE</div>
                <div style={{ fontWeight: 900, fontSize: 17, color: winRate >= 50 ? "#00ff87" : "#ffd93d" }}>{trades.length ? winRate + "%" : "—"}</div>
              </div>
              <div style={{ ...card, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", fontWeight: 800, letterSpacing: "1px", marginBottom: 6 }}>TRADES</div>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{trades.length}</div>
              </div>
            </div>

            {!showForm ? (
              <button className="gpBtn" style={{ width: "100%", padding: "15px 0", marginBottom: 14 }} onClick={() => setShowForm(true)}>＋ Log a Trade</button>
            ) : (
              <div style={{ ...card, padding: 18, marginBottom: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input className="gpInput" value={fSym} onChange={e => setFSym(e.target.value)} placeholder="Symbol (ES, SPY...)" />
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["LONG", "SHORT"] as const).map(s => (
                      <button key={s} onClick={() => setFSide(s)} style={{ flex: 1, borderRadius: 14, border: fSide === s ? `1px solid ${s === "LONG" ? "#00ff87" : "#ff6b6b"}` : "1px solid rgba(255,255,255,.1)", background: fSide === s ? (s === "LONG" ? "rgba(0,255,135,.12)" : "rgba(255,107,107,.12)") : "rgba(255,255,255,.04)", color: fSide === s ? (s === "LONG" ? "#00ff87" : "#ff6b6b") : "rgba(255,255,255,.5)", fontWeight: 900, fontSize: 12, cursor: "pointer" }}>{s}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input className="gpInput" value={fEntry} onChange={e => setFEntry(e.target.value)} placeholder="Entry" inputMode="decimal" />
                  <input className="gpInput" value={fExit} onChange={e => setFExit(e.target.value)} placeholder="Exit" inputMode="decimal" />
                  <input className="gpInput" value={fQty} onChange={e => setFQty(e.target.value)} placeholder="Size" inputMode="decimal" />
                </div>
                <input className="gpInput" value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Notes — setup, mistake, lesson..." style={{ marginBottom: 12 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="gpBtn" style={{ flex: 1, padding: "13px 0" }} onClick={addTrade}>Save Trade</button>
                  <button onClick={() => setShowForm(false)} style={{ padding: "0 18px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, color: "rgba(255,255,255,.6)", fontWeight: 800, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}

            {trades.length === 0 && !showForm && (
              <div style={{ ...card, padding: 36, textAlign: "center" }}>
                <div style={{ marginBottom: 12, color: "rgba(0,255,135,.5)", display: "flex", justifyContent: "center" }}><IcoJournal s={38} /></div>
                <p style={{ color: "rgba(255,255,255,.35)", fontSize: 13.5, margin: 0 }}>Your journal is empty. Every pro tracks their trades — start with your last one.</p>
              </div>
            )}

            {trades.map(t => {
              const p = pnl(t);
              return (
                <div key={t.id} style={{ ...card, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: p >= 0 ? "rgba(0,255,135,.1)" : "rgba(255,107,107,.1)", border: `1px solid ${p >= 0 ? "rgba(0,255,135,.35)" : "rgba(255,107,107,.35)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, color: p >= 0 ? "#00ff87" : "#ff6b6b", flexShrink: 0 }}>{t.sym.slice(0, 4)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontWeight: 900, fontSize: 14 }}>{t.sym}</span>
                      <span style={{ fontSize: 10, fontWeight: 900, color: t.side === "LONG" ? "#00ff87" : "#ff6b6b", background: t.side === "LONG" ? "rgba(0,255,135,.1)" : "rgba(255,107,107,.1)", borderRadius: 6, padding: "2px 7px" }}>{t.side}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginTop: 3 }}>{t.entry} → {t.exit} · {t.qty}x{t.notes ? ` · ${t.notes}` : ""}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 14.5, color: p >= 0 ? "#00ff87" : "#ff6b6b" }}>{fmtMoney(p)}</div>
                    <button onClick={() => saveTrades(trades.filter(x => x.id !== t.id))} style={{ background: "none", border: "none", color: "rgba(255,255,255,.25)", fontSize: 10.5, cursor: "pointer", padding: 0, marginTop: 3 }}>remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── slip bar ── */}
      {slip.length > 0 && tab === "picks" && (
        <div style={{ position: "absolute", bottom: 84, left: 0, right: 0, zIndex: 6, display: "flex", justifyContent: "center", padding: "0 16px" }}>
          <div style={{ width: "100%", maxWidth: 528 }}>
            {slipOpen && (
              <div style={{ background: "#07130b", border: "1px solid rgba(0,255,135,.35)", borderRadius: 18, padding: "14px 16px", marginBottom: 10, boxShadow: "0 18px 50px rgba(0,0,0,.7)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: "1.5px" }}>{slip.length}-MAN SLIP</span>
                  <span style={{ fontWeight: 900, fontSize: 14, color: "#ffd700" }}>{Math.round(slip.reduce((a, s) => a * s.eff / 100, 1) * 100)}% <span style={{ fontSize: 9, color: "rgba(255,255,255,.4)" }}>EST. HIT</span></span>
                </div>
                {slip.map((s, si) => (
                  <div key={si} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.p.player}</div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.45)" }}>{s.side} {s.p.line} {s.p.prop}</div>
                    </div>
                    <span style={{ fontWeight: 900, fontSize: 12.5, color: "#00ff87" }}>{s.eff}%</span>
                    <button onClick={() => setSlip(x => x.filter(v => rateKey(v.p) !== rateKey(s.p)))} style={{ background: "none", border: "none", color: "rgba(255,255,255,.35)", fontSize: 15, cursor: "pointer", padding: "0 2px" }}>✕</button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={shareSlip} className="gpBtn" style={{ flex: 1, padding: "11px 0", fontSize: 13 }}>Share Slip →</button>
                  <button onClick={() => { setSlip([]); setSlipOpen(false); }} style={{ padding: "0 16px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "rgba(255,255,255,.55)", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Clear</button>
                </div>
              </div>
            )}
            <button onClick={() => setSlipOpen(o => !o)} style={{ width: "100%", padding: "13px 16px", background: "linear-gradient(135deg,#00ff87,#00c864)", border: "none", borderRadius: 14, fontWeight: 900, color: "#000", fontSize: 13.5, cursor: "pointer", display: "flex", justifyContent: "space-between", boxShadow: "0 8px 30px rgba(0,255,135,.35)" }}>
              <span>Slip · {slip.length} leg{slip.length > 1 ? "s" : ""}</span>
              <span>{Math.round(slip.reduce((a, s) => a * s.eff / 100, 1) * 100)}% est · {slipOpen ? "close ▾" : "view ▴"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── bottom nav ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", background: "rgba(3,5,3,.9)", backdropFilter: "blur(24px)", paddingBottom: "env(safe-area-inset-bottom,0px)", position: "relative", zIndex: 3 }}>
        <div style={{ display: "flex", maxWidth: 560, margin: "0 auto" }}>
          <button className={`navBtn${tab === "live" ? " on" : ""}`} onClick={() => setTab("live")}><span className="navIco"><IcoLive /></span>LIVE</button>
          <button className={`navBtn${tab === "picks" ? " on" : ""}`} onClick={() => setTab("picks")}><span className="navIco"><IcoTarget /></span>PICKS</button>
          <button className={`navBtn${tab === "chat" ? " on" : ""}`} onClick={() => setTab("chat")}><span className="navIco"><IcoChat /></span>COMMUNITY</button>
          <button className={`navBtn${tab === "journal" ? " on" : ""}`} onClick={() => setTab("journal")}><span className="navIco"><IcoJournal /></span>JOURNAL</button>
        </div>
      </div>
    </div>
  );
}
