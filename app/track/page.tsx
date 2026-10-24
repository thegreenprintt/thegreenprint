"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { stateFromPhone, stateName } from "./areacodes";

/* ───────────────────────────────────────────────────────────────────────────
   /track — The Greenprint Business Command Center (private)
   A retention + closing platform over the One House book of business.
   - Today: your daily method of operation, a sized hit list, work it top down
   - Focus This Week: a scored, ranked lock-in list (who to work + why)
   - Pipeline: every member tracked new → contacted → talking → committed → closed
   - Sprint: the $10K-by-Nov-1 double-pay pace, daily target, money on the table
   - Playbook: the scripts, objection handlers and follow-up cadence
   - The System: a duplicatable whiteboard of the whole machine
   Reads the snapshot from /api/chat?kind=track. Passcode-gated. Marks persist.
   ─────────────────────────────────────────────────────────────────────────── */

type Status = "active" | "inactive" | "lapsed";
interface Member {
  name: string; email: string; phone: string; level: number;
  status: Status; amount: number; nextDue: string | null; referred: number;
  state?: string; city?: string;
}
interface Lead { _key: string; name?: string; email?: string; phone?: string; status?: string; path?: string; lastSeen?: string; firstSeen?: string; why?: string; }
interface TreeNode { id: number; sp: number | null; name: string; email: string; active: number; subs: number; lvl: number; paid?: number; lastEnroll?: string | null; }
interface Goal { earnings: number | null; target: number; perSub: number; deadline: string; }
interface Snapshot { updatedAt: number; source: string; counts: Record<string, number>; members: Member[]; goal?: Goal; }

type Stage = "new" | "contacted" | "talking" | "committed" | "closed" | "skip";
type VoiceKey = "default" | "auntie" | "og" | "homie";
interface Mark { stage: Stage; note: string; touchedAt: number; closedAt: number; voice: VoiceKey; birthday: string; }
type Marks = Record<string, Mark>;
const DEFAULT_MARK: Mark = { stage: "new", note: "", touchedAt: 0, closedAt: 0, voice: "default", birthday: "" };
const STAGES: Stage[] = ["new", "contacted", "talking", "committed", "closed"];
const STAGE_META: Record<Stage, { label: string; color: string; short: string }> = {
  new:       { label: "Not worked yet", color: "#8a8a8a", short: "NEW" },
  contacted: { label: "Reached out", color: "#4a9eff", short: "REACHED" },
  talking:   { label: "Interested", color: "#C9A84C", short: "INTERESTED" },
  committed: { label: "Enrolling / reactivating", color: "#9b7bff", short: "ENROLLING" },
  closed:    { label: "Active in One House", color: "#00FF85", short: "ACTIVE ✓" },
  skip:      { label: "Set aside", color: "#555", short: "SET ASIDE" },
};

const LS_KEY = "gp_track_key";
const MARKS_LS = "gp_track_marks";
const DAY = 86400000;
const SPRINT_START = "2026-10-23"; // the night Jay called the $10K/10-day sprint

const fmtWhen = (ms: number) => (!ms ? "never" : new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));
const telHref = (p: string) => "tel:" + (p || "").replace(/[^\d+]/g, "");
function daysUntil(iso: string | null): number | null { if (!iso) return null; const t = new Date(iso).getTime(); return isNaN(t) ? null : Math.ceil((t - Date.now()) / DAY); }
function isToday(ms: number): boolean { if (!ms) return false; const d = new Date(ms), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate(); }
function initials(n: string) { const p = (n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?"; }
function properName(n: string): string { return (n || "").trim().split(/\s+/).map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)).join(" "); }
function firstName(n: string): string { return properName(n).split(" ")[0] || ""; }
function builderBadge(r: number): { label: string; color: string } | null {
  if (r >= 10) return { label: "TOP BUILDER", color: "#C9A84C" };
  if (r >= 5) return { label: "BUILDER", color: "#00FF85" };
  if (r >= 1) return { label: `${r} REF`, color: "#5a8f7a" };
  return null;
}
/* Retention score: higher = work them first this week */
function score(m: Member): { s: number; reasons: string[] } {
  let s = 0; const reasons: string[] = [];
  const du = daysUntil(m.nextDue);
  if (m.status === "lapsed") { s += 100; reasons.push("Past due, win back now"); }
  else if (m.status === "active" && du !== null && du <= 7) { s += 55 + (7 - Math.max(0, du)) * 4; reasons.push(du <= 0 ? "Bills today" : `Bills in ${du}d`); }
  else if (m.status === "inactive") { s += 22; reasons.push("Inactive, reactivate"); }
  if (m.referred >= 5) { s += 30; reasons.push(`Builder · ${m.referred} brought in`); }
  else if (m.referred >= 1) { s += m.referred * 4; }
  if (m.phone) { s += 16; reasons.push("Reachable by phone"); }
  if (m.level === 1) s += 8;
  return { s, reasons };
}

function useCountUp(target: number, ms = 1000) {
  const [n, setN] = useState(0); const ref = useRef(0);
  useEffect(() => {
    const start = performance.now(); const from = ref.current; let raf = 0;
    const tick = (now: number) => { const p = Math.min(1, (now - start) / ms); const e = 1 - Math.pow(1 - p, 3); setN(Math.round(from + (target - from) * e)); if (p < 1) raf = requestAnimationFrame(tick); else ref.current = target; };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [target, ms]); return n;
}

/* ── Celebration confetti (fires when you close someone) ──────────────────── */
const CONFETTI_COLORS = ["#00FF85", "#C9A84C", "#4a9eff", "#9b7bff", "#ffffff"];
function ConfettiBurst() {
  const pieces = useMemo(() => Array.from({ length: 64 }).map((_, i) => ({ i, x: (Math.random() * 2 - 1) * 55, r: Math.random() * 540, d: 0.9 + Math.random() * 0.6, delay: Math.random() * 0.12, c: CONFETTI_COLORS[i % CONFETTI_COLORS.length], left: Math.random() * 100, s: 6 + Math.random() * 7 })), []);
  return (
    <>{pieces.map((p) => (
      <motion.span key={p.i} initial={{ opacity: 1, y: -24, x: 0, rotate: 0 }} animate={{ opacity: 0, y: "82vh", x: `${p.x}vw`, rotate: p.r }} transition={{ duration: p.d, delay: p.delay, ease: "easeOut" }}
        style={{ position: "absolute", top: 0, left: `${p.left}%`, width: p.s, height: p.s, borderRadius: 2, background: p.c }} />
    ))}</>
  );
}
function Confetti({ fire }: { fire: number }) {
  const [bursts, setBursts] = useState<number[]>([]);
  useEffect(() => { if (!fire) return; const id = fire; setBursts((b) => [...b, id]); const t = setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 1600); return () => clearTimeout(t); }, [fire]);
  return <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">{bursts.map((id) => <ConfettiBurst key={id} />)}</div>;
}

function StatTile({ label, value, tone, delay, prefix, suffix }: { label: string; value: number; tone: string; delay: number; prefix?: string; suffix?: string }) {
  const n = useCountUp(value);
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="gp-card group relative flex-1 min-w-[104px] overflow-hidden rounded-2xl p-4 transition-transform hover:-translate-y-0.5">
      <div className="absolute inset-x-0 top-0 h-px z-[1]" style={{ background: `linear-gradient(90deg,transparent,${tone},transparent)` }} />
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-25 group-hover:opacity-60 transition-opacity" style={{ background: tone }} />
      <div className="relative z-[1] text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-2">{label}</div>
      <div className="gp-display gp-num relative z-[1] text-[34px] leading-none font-bold" style={{ color: tone, textShadow: `0 0 28px ${tone}40` }}>{prefix || ""}{n.toLocaleString()}{suffix || ""}</div>
    </motion.div>
  );
}
function Avatar({ name, status, size = 10 }: { name: string; status: Status; size?: number }) {
  const ring = status === "active" ? "#00FF85" : status === "lapsed" ? "#FF4444" : "#3a3a3a";
  return (
    <div className="relative shrink-0">
      <div className="rounded-full grid place-items-center font-mono text-xs font-bold text-text/90 bg-surface2 border border-white/[0.06]" style={{ height: size * 4, width: size * 4 }}>{initials(name)}</div>
      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg" style={{ background: ring }} />
    </div>
  );
}
function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { bg: string; fg: string; label: string }> = {
    active: { bg: "rgba(0,255,133,0.12)", fg: "#00FF85", label: "ACTIVE" },
    inactive: { bg: "rgba(255,255,255,0.05)", fg: "#8a8a8a", label: "INACTIVE" },
    lapsed: { bg: "rgba(255,68,68,0.14)", fg: "#FF6B6B", label: "PAST DUE" },
  };
  const s = map[status];
  return <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-mono font-bold tracking-[0.14em] rounded-md" style={{ background: s.bg, color: s.fg }}>{s.label}</span>;
}

type EmailState = "idle" | "confirm" | "sending" | "sent" | "error";
type MsgStyle = "checkin" | "nudge" | "invite";

function EmailBtn({ m, state, onEmail }: { m: Member; state: EmailState; onEmail: (m: Member) => void }) {
  if (!m.email) return null;
  return (
    <button onClick={() => onEmail(m)} disabled={state === "sending" || state === "sent"}
      className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-mono font-semibold transition-all border ${
        state === "sent" ? "border-accent/40 text-accent bg-accent/10" : state === "confirm" ? "border-gold text-gold bg-gold/10" : state === "error" ? "border-red/50 text-red" : "border-white/10 text-muted hover:border-gold hover:text-gold"}`}>
      {state === "sending" ? "…" : state === "sent" ? "✓ sent" : state === "confirm" ? "send?" : state === "error" ? "retry" : "✉ email"}
    </button>
  );
}
function CallBtn({ phone }: { phone: string }) {
  if (!phone) return <span className="text-[10px] font-mono text-muted/70 pr-1">no number</span>;
  return <a href={telHref(phone)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-semibold hover:bg-accent hover:text-bg transition-all hover:shadow-[0_0_20px_rgba(0,255,133,0.35)]"><span className="text-sm">☎</span> {phone}</a>;
}
function smsHref(phone: string, msg: string): string {
  const num = (phone || "").replace(/[^\d+]/g, "");
  return `sms:${num}?&body=${encodeURIComponent(msg)}`;
}
/* Jay's own voice, in rotations. Each person gets a stable pick per voice (salt reshuffles). */
const VOICES: { key: VoiceKey; label: string; hint: string; lines: ((f: string) => string)[] }[] = [
  { key: "default", label: "Like me", hint: "everyday check-in", lines: [
    (f) => `Yo ${f || "fam"}! How you feeling? Wanted to check in with you fr.`,
    (f) => `Yo ${f || "fam"}, it's Jay. Just checking in on you, how you been?`,
    (f) => `What's good ${f || "fam"}? Wanted to see how you're doing. How you feeling?`,
    (f) => `Yo ${f || "fam"}! Been thinking about you, how's everything going on your end?`,
    (f) => `${f || "Yo"}! It's Jay. Checking in on you fam, how you been lately?`,
  ] },
  { key: "auntie", label: "Auntie", hint: "respectful & warm", lines: [
    (f) => `Hey auntie${f ? " " + f : ""}! It's Jay. How you feeling? Been thinking about you 🙏`,
    (f) => `What's up auntie! How you doing? Just wanted to check in on you.`,
    (f) => `Hi auntie${f ? " " + f : ""}, it's Jay. How you been? Hope everything good with you ❤️`,
    (f) => `Heyy auntie! Just checking in on you, how you feeling today?`,
  ] },
  { key: "og", label: "OG / Unc", hint: "elder respect", lines: [
    (f) => `What's up OG! It's Jay. How you feeling? Been meaning to check on you.`,
    (f) => `Yo unc${f ? " " + f : ""}! How you doing? Wanted to check in with you.`,
    (f) => `Hey OG, it's Jay. How you been? Hope all is well fr.`,
    (f) => `What's good unc! Checking in on you, how's everything going?`,
  ] },
  { key: "homie", label: "Homie", hint: "high energy", lines: [
    (f) => `Yo ${f || "bro"}! How you feeling bro? Been a minute, checking on you 🙌`,
    (f) => `${f || "Bro"}!! It's Jay. How you been fam? Lmk you good.`,
    (f) => `Yooo ${f || "bro"}, what's good? Checking on you, how everything been?`,
    (f) => `Ayy ${f || "bro"}! How you feeling? Been thinking bout you, hit me back.`,
  ] },
];
const VOICE_MAP: Record<string, typeof VOICES[number]> = VOICES.reduce((o, v) => { o[v.key] = v; return o; }, {} as Record<string, typeof VOICES[number]>);
function pickVoiceMsg(voice: string, email: string, first: string, salt = 0): string {
  const v = VOICE_MAP[voice] || VOICES[0];
  let h = salt >>> 0; const s = (email || "") + "";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return v.lines[h % v.lines.length](first);
}
function agoShort(ms: number): string {
  if (!ms) return "";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return `${d}d ago`;
}
function birthdayMsg(voice: string, first: string): string {
  const f = first || "";
  if (voice === "auntie") return `Happy Birthday auntie${f ? " " + f : ""}!! 🎉❤️ It's Jay. Hope your day is everything you deserve and more. Enjoy it 🙏`;
  if (voice === "og") return `Happy Birthday OG!! 🎉 It's Jay. Hope you have a blessed day fam, you earned it.`;
  if (voice === "homie") return `HBD ${f || "bro"}!! 🎉🙌 It's Jay. Enjoy your day to the fullest fam, let's get it.`;
  return `Happy Birthday ${f || "fam"}!! 🎉 It's Jay. Hope you have an amazing day, enjoy every bit of it 🙏`;
}
function bdValid(bd: string): boolean { return /^\d{2}-\d{2}$/.test(bd || ""); }
function bdToday(bd: string): boolean { if (!bdValid(bd)) return false; const n = new Date(); const mm = String(n.getMonth() + 1).padStart(2, "0"); const dd = String(n.getDate()).padStart(2, "0"); return bd === `${mm}-${dd}`; }
function bdDaysUntil(bd: string): number | null { if (!bdValid(bd)) return null; const [m, d] = bd.split("-").map(Number); const n = new Date(); const today = new Date(n.getFullYear(), n.getMonth(), n.getDate()); let t = new Date(n.getFullYear(), m - 1, d); if (t < today) t = new Date(n.getFullYear() + 1, m - 1, d); return Math.round((t.getTime() - today.getTime()) / DAY); }
function NoteField({ mark, onSave }: { mark: Mark; onSave: (patch: Partial<Mark>) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(mark.note || "");
  const [bd, setBd] = useState(mark.birthday || "");
  useEffect(() => { setVal(mark.note || ""); setBd(mark.birthday || ""); }, [mark.note, mark.birthday]);
  if (!editing) {
    return (
      <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="block text-left w-full">
        {mark.note ? <div className="text-[12px] text-text/75 leading-snug">📝 {mark.note}</div> : <div className="text-[10px] font-mono text-muted/60 hover:text-accent transition-colors">＋ note / birthday</div>}
        {mark.birthday && <div className="text-[10px] font-mono text-gold mt-0.5">🎂 {mark.birthday.replace("-", "/")}</div>}
      </button>
    );
  }
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Note e.g. said call back Friday" className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-2 text-base outline-none focus:border-accent" />
      <div className="flex items-center gap-2">
        <input value={bd} onChange={(e) => setBd(e.target.value)} placeholder="Birthday MM-DD" className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-lg px-2.5 py-2 text-base font-mono outline-none focus:border-accent" />
        <button onClick={() => { onSave({ note: val.trim(), birthday: bdValid(bd) ? bd : "" }); setEditing(false); }} className="shrink-0 px-3 py-2 rounded-lg bg-accent text-bg text-[12px] font-bold">save</button>
        <button onClick={() => setEditing(false)} className="shrink-0 px-2 py-2 rounded-lg border border-white/10 text-[12px] text-muted">✕</button>
      </div>
    </div>
  );
}
function RapidTextQueue({ items, markFor, voiceFor, onClose, onContacted, onVoice, onSave }: { items: Member[]; markFor: (email: string) => Mark; voiceFor: (email: string) => VoiceKey; onClose: () => void; onContacted: (email: string) => void; onVoice: (email: string, v: VoiceKey) => void; onSave: (email: string, patch: Partial<Mark>) => void }) {
  const withPhone = useMemo(() => items.filter((m) => m.phone), [items]);
  const [idx, setIdx] = useState(0);
  const [salt, setSalt] = useState(0);
  const total = withPhone.length;
  const m = withPhone[idx];
  const first = firstName(m?.name || "");
  const mk = m ? markFor(m.email) : DEFAULT_MARK;
  const voice = m ? voiceFor(m.email) : "default";
  const isBd = m ? bdToday(mk.birthday) : false;
  const msg = m ? (isBd ? birthdayMsg(voice, first) : pickVoiceMsg(voice, m.email, first, salt)) : "";
  return (
    <div className="fixed inset-0 z-[70] bg-bg/95 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent animate-pulse" /><span className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent">Rapid Text</span></div>
        <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full border border-white/10 text-muted hover:text-text text-lg">✕</button>
      </div>
      <div className="h-1 bg-white/[0.06]"><motion.div className="h-full bg-accent" animate={{ width: `${total ? (Math.min(idx, total) / total) * 100 : 0}%` }} transition={{ duration: 0.3 }} /></div>
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col items-center justify-center">
        {!m ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="text-5xl mb-4">🔥</div>
            <div className="gp-display text-2xl font-bold mb-1">List cleared.</div>
            <div className="text-muted text-sm mb-6">You texted everyone in the queue. That's how you hit $10K.</div>
            <button onClick={onClose} className="px-6 py-3 rounded-xl bg-accent text-bg font-bold text-sm">Done</button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={idx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="w-full max-w-md">
              <div className="text-center text-[11px] font-mono text-muted mb-4">{idx + 1} of {total}</div>
              <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-6 text-center">
                <div className="flex justify-center mb-3"><Avatar name={m.name} status={m.status} size={16} /></div>
                <div className="gp-display text-2xl font-bold">{properName(m.name) || "(no name)"}</div>
                <div className="font-mono text-sm text-accent mt-0.5">{m.phone}</div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                  {VOICES.map((v) => (
                    <button key={v.key} onClick={() => onVoice(m.email, v.key)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold border transition-all ${voice === v.key ? "bg-accent text-bg border-accent" : "border-white/10 text-muted hover:text-text hover:border-white/25"}`}>{v.label}</button>
                  ))}
                </div>
                <div className="mt-3 rounded-2xl bg-black/30 border border-white/[0.06] p-4 text-left">
                  <div className="text-[9px] font-mono uppercase tracking-wider text-muted mb-1.5">They'll receive · {VOICE_MAP[voice]?.hint}</div>
                  <div className="text-[15px] text-text/90 leading-relaxed">{msg}</div>
                  {!isBd && <button onClick={() => setSalt((s) => s + 1)} className="mt-3 text-[11px] font-mono text-muted hover:text-accent transition-colors">↻ shuffle message</button>}
                  {isBd && <div className="mt-2 text-[11px] font-mono text-gold">🎂 birthday message</div>}
                </div>
                <div className="mt-3 text-left rounded-2xl bg-black/20 border border-white/[0.05] p-3"><NoteField mark={mk} onSave={(patch) => onSave(m.email, patch)} /></div>
                <a href={smsHref(m.phone, msg)} onClick={() => { onContacted(m.email); setTimeout(() => setIdx((i) => i + 1), 350); }}
                  className="mt-5 block w-full py-4 rounded-2xl bg-accent text-bg font-bold text-base hover:shadow-[0_0_28px_rgba(0,255,133,0.45)] transition-all active:scale-[0.98]">Open text in Messages →</a>
                <div className="mt-2.5 flex items-center gap-2">
                  <a href={telHref(m.phone)} onClick={() => onContacted(m.email)} className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-mono text-text/80 hover:border-accent hover:text-accent transition-colors text-center">☎ call instead</a>
                  <button onClick={() => setIdx((i) => i + 1)} className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-mono text-muted hover:text-text transition-colors">skip →</button>
                </div>
              </div>
              <div className="text-center text-[11px] font-mono text-muted/70 mt-4">Tap send in Messages, come back, keep rolling.</div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
function TextBtn({ m }: { m: Member }) {
  const [open, setOpen] = useState(false);
  const phone = m.phone;
  if (!phone) return null;
  const first = firstName(m.name);
  const sheet = open && typeof document !== "undefined" ? createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full sm:max-w-md max-h-[82vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 bg-surface2 shadow-2xl shadow-black/80 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="sticky top-0 bg-surface2/95 backdrop-blur px-5 pt-4 pb-3 border-b border-white/[0.06] flex items-center justify-between">
          <span className="gp-display font-semibold text-text">Text {first || m.name}</span>
          <button onClick={() => setOpen(false)} className="h-8 w-8 grid place-items-center rounded-full border border-white/10 text-muted hover:text-text">✕</button>
        </div>
        {VOICES.map((v) => {
          const line = pickVoiceMsg(v.key, m.email, first);
          return (
            <a key={v.key} href={smsHref(phone, line)} onClick={() => setOpen(false)}
              className="block px-5 py-4 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors border-b border-white/[0.05] last:border-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[12px] font-mono font-bold text-accent">{v.label}</span>
                <span className="text-[10px] font-mono text-muted">{v.hint}</span>
              </div>
              <div className="text-[13px] text-text/85 leading-relaxed">{line}</div>
            </a>
          );
        })}
      </motion.div>
    </div>, document.body) : null;
  return (
    <>
      <button onClick={() => setOpen(true)} aria-expanded={open}
        className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border text-[11px] font-mono font-semibold transition-all ${open ? "border-accent text-accent" : "border-white/10 text-muted hover:border-accent hover:text-accent"}`}>💬 text</button>
      {sheet}
    </>
  );
}

/* Mirrors the server email copy so the tone buttons preview live */
const EMAIL_PREVIEW: Record<MsgStyle, { subject: string; open: string }> = {
  checkin: { subject: "[name], just checking in", open: "Hey [name], it's Jay. It's been a minute and you've been on my mind, so I just wanted to check in. No agenda at all. How are you doing?" },
  nudge: { subject: "[name], thinking about you", open: "Hey [name], it's Jay. It's been a little while and you came to mind. The energy in the room lately has honestly been incredible, and I wondered how you're doing." },
  invite: { subject: "[name], I'd love to catch up", open: "Hey [name], it's Jay. I've genuinely missed having you with us in One House. We're live every day now and the room has grown into something special. I'd love to help you pick it back up whenever you're ready." },
};

/* ── Pipeline stage control: 5 dots, tap to set; closing fires confetti ───── */
function StageDots({ stage, onSet }: { stage: Stage; onSet: (s: Stage) => void }) {
  const idx = STAGES.indexOf(stage);
  const cur = idx >= 0 ? STAGE_META[STAGES[idx]].color : "rgba(255,255,255,0.14)";
  return (
    <div className="flex items-center gap-1.5">
      {STAGES.map((s, i) => (
        <button key={s} onClick={() => onSet(s)} title={STAGE_META[s].label} aria-label={STAGE_META[s].label}
          className="h-2.5 w-2.5 rounded-full transition-all hover:scale-150"
          style={{ background: idx >= 0 && i <= idx ? cur : "rgba(255,255,255,0.12)", boxShadow: idx === i ? `0 0 9px ${cur}` : "none" }} />
      ))}
      <span className="ml-1 text-[9px] font-mono font-bold tracking-wider" style={{ color: idx >= 0 ? cur : "#666" }}>{STAGE_META[stage].short}</span>
    </div>
  );
}
function WorkedCheck({ touchedAt, onTouch }: { touchedAt: number; onTouch: () => void }) {
  const done = isToday(touchedAt);
  return (
    <button onClick={onTouch} title={done ? "Worked today" : "Mark worked today"}
      className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border text-[11px] font-mono font-semibold transition-all ${done ? "border-accent/40 text-accent bg-accent/10" : "border-white/10 text-muted hover:border-accent hover:text-accent"}`}>
      {done ? "✓ worked" : "◎ worked"}
    </button>
  );
}

function FocusCard({ m, rank, reasons, emailState, onEmail, mark, onStage, onTouch, onSave }: { m: Member; rank: number; reasons: string[]; emailState: EmailState; onEmail: (m: Member) => void; mark: Mark; onStage: (s: Stage) => void; onTouch: () => void; onSave: (patch: Partial<Mark>) => void }) {
  const du = daysUntil(m.nextDue); const badge = builderBadge(m.referred);
  const closed = mark.stage === "closed";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(rank * 0.02, 0.3), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative overflow-hidden rounded-2xl border p-4 transition-all hover:-translate-y-0.5 ${closed ? "border-accent/30 bg-accent/[0.04]" : "border-white/[0.07] bg-gradient-to-br from-white/[0.035] to-transparent hover:border-white/[0.16]"}`}>
      <div className="absolute right-3 top-3 text-[32px] font-mono font-black text-white/[0.05] leading-none select-none">{rank < 10 ? "0" + rank : rank}</div>
      <div className="relative flex items-start gap-3">
        <Avatar name={m.name} status={m.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="gp-display font-semibold text-text truncate">{properName(m.name) || "(no name)"}</span>
            <StatusPill status={m.status} />
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-[10px] font-mono text-muted">L{m.level}</span>
            {m.amount > 0 && <span className="text-[10px] font-mono text-gold">${m.amount}</span>}
            {badge && <span title="People brought in, not earnings" className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold rounded tracking-wider" style={{ color: badge.color, border: `1px solid ${badge.color}55` }}>{badge.label}</span>}
            {du !== null && du <= 7 && <span className="text-[10px] font-mono font-bold text-red">{du <= 0 ? "DUE NOW" : `DUE ${du}D`}</span>}
          </div>
          <div className={`text-[11px] font-mono truncate mt-1 ${m.phone || m.email ? "text-muted/80" : "text-red/70"}`}>{m.phone || m.email || "no contact on file"}</div>
        </div>
      </div>
      <div className="relative mt-3 flex flex-wrap gap-1.5">
        {reasons.slice(0, 3).map((r, i) => (
          <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-text/70 border border-white/[0.05]">{r}</span>
        ))}
        {bdToday(mark.birthday) && <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gold/15 text-gold border border-gold/30">🎂 birthday today</span>}
      </div>
      <div className="relative mt-3 pt-3 border-t border-white/[0.06]"><NoteField mark={mark} onSave={onSave} /></div>
      {m.phone && bdToday(mark.birthday) && <a href={smsHref(m.phone, birthdayMsg(mark.voice, firstName(m.name)))} onClick={() => onTouch()} className="relative mt-2 block w-full text-center py-2 rounded-xl bg-gold/15 border border-gold/30 text-gold text-[12px] font-mono font-semibold hover:bg-gold hover:text-bg transition-all">🎂 Send birthday text</a>}
      {mark.touchedAt > 0 && <div className="relative mt-2 text-[10px] font-mono text-muted/70">last worked {agoShort(mark.touchedAt)}</div>}
      <div className="relative mt-3 flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
        <StageDots stage={mark.stage} onSet={onStage} />
        <WorkedCheck touchedAt={mark.touchedAt} onTouch={onTouch} />
      </div>
      <div className="relative mt-2 flex items-center gap-2 justify-end flex-wrap">
        <EmailBtn m={m} state={emailState} onEmail={onEmail} />
        <TextBtn m={m} />
        <CallBtn phone={m.phone} />
      </div>
    </motion.div>
  );
}

function MemberRow({ m, i, emailState, onEmail, mark, onStage, onTouch }: { m: Member; i: number; emailState: EmailState; onEmail: (m: Member) => void; mark: Mark; onStage: (s: Stage) => void; onTouch: () => void }) {
  const du = daysUntil(m.nextDue); const dueSoon = du !== null && du <= 7; const badge = builderBadge(m.referred);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.01, 0.3), duration: 0.3 }}
      className="group relative flex flex-col gap-2.5 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors sm:flex-row sm:items-center sm:gap-3">
      {dueSoon && <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-red" />}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar name={m.name} status={m.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="gp-display font-semibold text-text truncate">{properName(m.name) || "(no name)"}</span>
            <StatusPill status={m.status} />
            <span className="text-[10px] font-mono text-muted">L{m.level}</span>
            {m.amount > 0 && <span className="text-[10px] font-mono text-gold">${m.amount}</span>}
            {badge && <span title="People brought in, not earnings" className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold rounded tracking-wider" style={{ color: badge.color, border: `1px solid ${badge.color}55` }}>{badge.label}</span>}
            {dueSoon && <span className="text-[10px] font-mono font-bold text-red">{du! <= 0 ? "DUE NOW" : `DUE ${du}D`}</span>}
          </div>
          <div className={`text-xs truncate font-mono mt-0.5 ${m.email || m.phone ? "text-muted" : "text-red/70"}`}>{m.email || m.phone || "no contact on file"}</div>
          {mark.note && <div className="text-[11px] text-text/60 truncate mt-0.5">📝 {mark.note}</div>}
          <div className="mt-1.5"><StageDots stage={mark.stage} onSet={onStage} /></div>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2 flex-wrap justify-end pl-13 sm:pl-0">
        <WorkedCheck touchedAt={mark.touchedAt} onTouch={onTouch} />
        <EmailBtn m={m} state={emailState} onEmail={onEmail} />
        <TextBtn m={m} />
        <CallBtn phone={m.phone} />
      </div>
    </motion.div>
  );
}

/* ── Double-pay goal panel (unchanged core, lightly polished) ─────────────── */
function GoalPanel({ goal }: { goal?: Goal }) {
  const target = goal?.target ?? 10000;
  const perSub = goal?.perSub ?? 100;
  const deadline = goal?.deadline ?? "2026-11-01";
  const earnings = goal?.earnings ?? null;
  const remaining = earnings != null ? Math.max(0, target - earnings) : null;
  const subsToGo = remaining != null ? Math.ceil(remaining / perSub) : null;
  const pct = earnings != null ? Math.min(100, (earnings / target) * 100) : 0;
  const daysLeft = Math.max(0, Math.ceil((new Date(deadline + "T23:59:59").getTime() - Date.now()) / DAY));
  const subsN = useCountUp(subsToGo ?? 0);
  const earnN = useCountUp(earnings ?? 0);
  const [barW, setBarW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setBarW(pct), 150); return () => clearTimeout(t); }, [pct]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="gp-card gp-card-gold relative overflow-hidden rounded-3xl p-5 sm:p-6 mb-4">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl" style={{ background: "rgba(201,168,76,0.22)" }} />
      <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(0,255,133,0.10)" }} />
      <div className="relative">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            <span className="text-gold font-mono text-[11px] tracking-[0.25em] uppercase">Double Pay Goal</span>
          </div>
          <div className="font-mono text-[11px] text-text/80">
            <span className="text-gold font-bold">{daysLeft}</span> days left · ${perSub}/sub ends {new Date(deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          {subsToGo != null ? (
            <div>
              <div className="gp-display gp-metal gp-num text-[64px] sm:text-[80px] leading-none font-black">{subsN}</div>
              <div className="text-sm text-text/70 font-mono -mt-1">subscribers to ${(target / 1000)}K</div>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-bold text-text">Goal: ${(target / 1000)}K</div>
              <div className="text-sm text-muted font-mono mt-1">Earnings sync on the next refresh</div>
            </div>
          )}
          <div className="flex-1 min-w-[180px]">
            <div className="flex justify-between text-[11px] font-mono text-muted mb-1.5">
              <span>{earnings != null ? `$${earnN.toLocaleString()}` : "—"}</span>
              <span>${target.toLocaleString()}</span>
            </div>
            <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden border border-white/[0.06]">
              <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#00FF85,#C9A84C)" }} animate={{ width: `${barW}%` }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <div className="text-[11px] font-mono text-muted mt-1.5">{earnings != null ? `${pct.toFixed(0)}% there · each $${perSub} sub before ${new Date(deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} pays you $${perSub}` : `Goal $${target.toLocaleString()}`}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Sprint strip: $10K in 10 days pace + money on the table ──────────────── */
function Ring({ pct, size = 54, stroke = 5, color = "#00FF85", children }: { pct: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const off = c * (1 - Math.min(1, Math.max(0, pct / 100)));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: off }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
function SprintStrip({ goal, inactiveCount, dueCount, closedToday }: { goal?: Goal; inactiveCount: number; dueCount: number; closedToday: number }) {
  const target = goal?.target ?? 10000;
  const perSub = goal?.perSub ?? 100;
  const earnings = goal?.earnings ?? null;
  const subsToGo = earnings != null ? Math.ceil(Math.max(0, target - earnings) / perSub) : null;
  const deadline = goal?.deadline ?? "2026-11-01";
  const daysToMoney = Math.max(1, Math.ceil((new Date(deadline + "T23:59:59").getTime() - Date.now()) / DAY));
  const sprintTotal = 10;
  const dayOf = Math.min(sprintTotal, Math.max(1, Math.round((Date.now() - new Date(SPRINT_START + "T00:00:00").getTime()) / DAY) + 1));
  const dailyTarget = subsToGo != null ? Math.ceil(subsToGo / daysToMoney) : null;
  const onTable = inactiveCount * perSub;
  const tableN = useCountUp(onTable);
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/[0.07] via-white/[0.015] to-transparent p-5 mb-6">
      <div className="absolute -left-16 -bottom-20 h-52 w-52 rounded-full blur-3xl" style={{ background: "rgba(0,255,133,0.12)" }} />
      <div className="relative flex items-center gap-2 mb-4">
        <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
        <span className="text-accent font-mono text-[11px] tracking-[0.25em] uppercase">The $10K Sprint</span>
        <span className="ml-auto font-mono text-[11px] text-text/70">Day <span className="text-accent font-bold">{dayOf}</span> of {sprintTotal}</span>
      </div>
      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <Ring pct={(dayOf / sprintTotal) * 100} color="#00FF85"><span className="font-mono text-sm font-bold text-accent">{daysToMoney}</span></Ring>
          <div><div className="text-[10px] font-mono uppercase tracking-wider text-muted">Days to Nov 1</div><div className="text-sm text-text/80 font-mono">double pay ends</div></div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">Subs to $10K</div>
          <div className="gp-display text-4xl font-black text-gold tabular-nums">{subsToGo ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">Close per day</div>
          <div className="gp-display text-4xl font-black text-accent tabular-nums">{dailyTarget ?? "—"}</div>
          <div className="text-[10px] font-mono text-muted mt-0.5">{closedToday} closed today</div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">On the table</div>
          <div className="gp-display text-3xl font-black text-text tabular-nums">${tableN.toLocaleString()}</div>
          <div className="text-[10px] font-mono text-muted mt-0.5">{inactiveCount} inactive × ${perSub} · {dueCount} due soon</div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Conversion funnel ────────────────────────────────────────────────────── */
function Funnel({ steps }: { steps: { label: string; n: number; color: string }[] }) {
  const max = Math.max(1, steps[0]?.n || 1);
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2.5">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">Your funnel right now</div>
      {steps.map((s, i) => {
        const w = Math.max(6, (s.n / max) * 100);
        const conv = i > 0 && steps[i - 1].n > 0 ? Math.round((s.n / steps[i - 1].n) * 100) : null;
        return (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-[11px] font-mono text-text/70">{s.label}</div>
            <div className="flex-1 h-7 rounded-lg bg-white/[0.03] overflow-hidden relative">
              <motion.div initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-lg flex items-center px-2.5" style={{ background: `linear-gradient(90deg,${s.color}aa,${s.color}44)` }}>
                <span className="text-[11px] font-mono font-bold text-white tabular-nums">{s.n}</span>
              </motion.div>
            </div>
            <div className="w-10 shrink-0 text-right text-[10px] font-mono text-muted">{conv != null ? `${conv}%` : ""}</div>
          </div>
        );
      })}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64); const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
type NotifyState = "idle" | "working" | "on" | "blocked" | "unsupported";
function NotifyBell() {
  const [st, setSt] = useState<NotifyState>(() => {
    try { if (typeof window !== "undefined" && "Notification" in window) { if (Notification.permission === "granted") return "on"; if (Notification.permission === "denied") return "blocked"; } } catch {}
    return "idle";
  });
  useEffect(() => {
    try {
      if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) { setSt((s) => (s === "on" ? "on" : "unsupported")); return; }
      if (Notification.permission === "denied") { setSt("blocked"); return; }
      if (Notification.permission === "granted") setSt("on");
    } catch {}
  }, []);
  // Once notifications are on, get out of the way.
  if (st === "on") return null;
  const enable = useCallback(async () => {
    try {
      setSt("working");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setSt(perm === "denied" ? "blocked" : "idle"); return; }
      const kr = await fetch("/api/chat?kind=push").then((r) => r.json()).catch(() => null);
      const vapid = kr && kr.key;
      if (!vapid) { setSt("idle"); return; }
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) as unknown as BufferSource });
      await fetch("/api/chat?kind=push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "subscribe", subscription: sub }) });
      setSt("on");
      try { reg.showNotification("Notifications on ✅", { body: "I'll ping you about new subscribers, due dates, and your morning brief.", icon: "/icon-192.png", badge: "/icon-192.png" }); } catch {}
    } catch { setSt("idle"); }
  }, []);
  const label = st === "working" ? "enabling…" : st === "blocked" ? "🔕 Turn on in Settings" : st === "unsupported" ? "📲 Add to Home Screen first" : "🔔 Enable notifications";
  const done = st === "working" || st === "blocked" || st === "unsupported";
  return (
    <button onClick={done ? undefined : enable} disabled={st === "working"}
      className={`gp-display w-full px-3 py-2.5 rounded-xl text-[12px] font-semibold border transition-colors ${st === "blocked" || st === "unsupported" ? "border-white/10 text-muted" : "border-accent/30 text-accent hover:bg-accent/10"}`}>
      {label}
    </button>
  );
}

type View = "today" | "focus" | "pipeline" | "community" | "due" | "inactive" | "active" | "all" | "playbook" | "system";

/* ── AI Command: a living read on the board that names your highest-leverage play ── */
function AICommand({ moves, markFor, openLeads, counts, goal, onTouch }: {
  moves: { m: Member; s: number; reasons: string[] }[];
  markFor: (email: string) => Mark;
  openLeads: Lead[];
  counts: { active: number; inactive: number; lapsed: number; due: number };
  goal?: Goal;
  onTouch: (email: string) => void;
}) {
  const DAYMS = 86400000, now = Date.now();
  const freshness = (l: Lead) => { const t = Date.parse(l.lastSeen || l.firstSeen || "") || 0; return t ? now - t : Infinity; };
  const allHot = openLeads.filter((l) => (l.path || "").startsWith("🔥"));
  const hotFresh = allHot.filter((l) => freshness(l) < 10 * DAYMS).sort((a, b) => freshness(a) - freshness(b));
  const backlog = allHot.length - hotFresh.length;
  const builders = moves.filter((x) => x.m.referred >= 5).length;
  const interested = moves.filter((x) => { const st = markFor(x.m.email).stage; return st === "talking" || st === "committed"; }).length;
  const target = goal?.target ?? 10000, perSub = goal?.perSub ?? 100, earn = goal?.earnings ?? null;
  const subsToGo = earn != null ? Math.max(0, Math.ceil((target - earn) / perSub)) : null;

  // Pick the single highest-leverage play, and the one move that goes with it
  let play: string;
  let topLead: Lead | null = null;
  let topMove = moves[0] || null;
  if (hotFresh.length) {
    play = `${hotFresh.length} hot ${hotFresh.length > 1 ? "leads" : "lead"} came in this week, people who said they're ready to buy. Work these before anything else, warm beats cold every time.`;
    topLead = hotFresh[0]; topMove = null;
  } else if (builders) {
    play = `${builders} ${builders > 1 ? "builders are" : "builder is"} in today's list. Each one carries a team, so winning them back tends to pull their downline with them. Start there.`;
  } else if (counts.lapsed) {
    play = `${counts.lapsed} ${counts.lapsed > 1 ? "members are" : "member is"} just past due. A lapsed member is the easiest yes you'll get, they already know the value.`;
  } else if (counts.due) {
    play = `${counts.due} ${counts.due > 1 ? "members" : "member"} bill this week. Lock them in now, before any slip.`;
  } else if (backlog > 0) {
    play = `No fresh leads today, but you've got ${backlog} ready leads sitting in the backlog. Chip through a few, they already raised their hand.`;
    topLead = allHot.sort((a, b) => freshness(a) - freshness(b))[0] || null; topMove = null;
  } else {
    play = `Board's steady. Keep reactivating inactives and stay close to your leads. Momentum is the whole game.`;
  }

  const topName = topLead ? (properName(topLead.name || "") || "New hot lead") : (topMove ? (properName(topMove.m.name) || "your top contact") : null);
  const topSub = topLead ? "🔥 Ready to buy, call while warm" : (topMove ? ((topMove.reasons[0] || "Highest-leverage contact") + (topMove.m.city ? ` · ${topMove.m.city}` : "")) : "");
  const topPhone = topLead ? topLead.phone : (topMove ? topMove.m.phone : "");
  const topTextHref = topMove && topMove.m.phone ? smsHref(topMove.m.phone, pickVoiceMsg(markFor(topMove.m.email).voice, topMove.m.email, firstName(topMove.m.name))) : "";
  const onTopTouch = () => { if (topMove) onTouch(topMove.m.email); };

  const chips = [
    hotFresh.length ? { label: "🔥 New this week", n: hotFresh.length, c: "#E4C878" } : null,
    backlog > 5 ? { label: "Ready backlog", n: backlog, c: "#C9A84C" } : null,
    counts.lapsed ? { label: "Past due", n: counts.lapsed, c: "#FF5A5A" } : null,
    counts.due ? { label: "Bill this week", n: counts.due, c: "#4a9eff" } : null,
    interested ? { label: "Interested", n: interested, c: "#9b7bff" } : null,
    builders ? { label: "Builders in play", n: builders, c: "#00FF85" } : null,
  ].filter(Boolean) as { label: string; n: number; c: string }[];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="gp-card relative overflow-hidden rounded-3xl p-5 mb-4">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(0,255,133,0.12)" }} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-accent" /></span>
          <span className="gp-display text-[11px] tracking-[0.26em] uppercase text-accent font-semibold">The play right now</span>
          <span className="ml-auto text-[10px] font-mono text-muted">live</span>
        </div>
        <p className="gp-display text-[15px] sm:text-base text-text/90 leading-snug">{play}</p>
        {topName && (
          <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl grid place-items-center bg-accent/10 border border-accent/25 text-accent gp-display font-bold">1</div>
            <div className="min-w-0 flex-1">
              <div className="gp-display text-sm font-semibold text-text truncate">{topName}</div>
              <div className="text-[11px] font-mono text-muted truncate">{topSub}</div>
            </div>
            {topTextHref ? (
              <a href={topTextHref} onClick={onTopTouch} className="shrink-0 px-3.5 py-2 rounded-xl bg-accent text-bg text-[12px] font-bold hover:shadow-[0_0_22px_rgba(0,255,133,0.45)] transition-all active:scale-95">Start here →</a>
            ) : topPhone ? (
              <a href={telHref(topPhone)} onClick={onTopTouch} className="shrink-0 px-3.5 py-2 rounded-xl bg-accent text-bg text-[12px] font-bold hover:shadow-[0_0_22px_rgba(0,255,133,0.45)] transition-all active:scale-95">Call →</a>
            ) : null}
          </div>
        )}
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((ch) => (
              <div key={ch.label} className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1">
                <span className="gp-num text-[13px] font-bold" style={{ color: ch.c }}>{ch.n}</span>
                <span className="text-[10px] font-mono text-muted">{ch.label}</span>
              </div>
            ))}
            {subsToGo != null && <div className="flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/[0.05] px-3 py-1"><span className="gp-num gp-metal text-[13px] font-bold">{subsToGo}</span><span className="text-[10px] font-mono text-muted">subs to ${(target / 1000)}K</span></div>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function TrackPage() {
  const [pass, setPass] = useState(""); const [input, setInput] = useState("");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(false); const [err, setErr] = useState(""); const [authed, setAuthed] = useState(false);
  const [q, setQ] = useState(""); const [view, setView] = useState<View>("today"); const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const [emailStates, setEmailStates] = useState<Record<string, EmailState>>({});
  const [msgStyle, setMsgStyle] = useState<MsgStyle>("checkin");
  const [marks, setMarks] = useState<Marks>({});
  const [confetti, setConfetti] = useState(0);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const [queueOpen, setQueueOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [geo, setGeo] = useState<Record<string, { p?: string; c?: string; s?: string }>>({});

  const load = useCallback(async (key: string, silent = false) => {
    if (!silent) { setLoading(true); setErr(""); }
    try {
      const res = await fetch(`/api/chat?kind=track&key=${encodeURIComponent(key)}&t=${Date.now()}`);
      if (res.status === 403) { if (!silent) { setErr("Wrong passcode."); setAuthed(false); setLoading(false); } return; }
      const j = await res.json(); setSnap(j.snapshot || null); setAuthed(true);
      if (j.marks && typeof j.marks === "object") setMarks((prev) => ({ ...prev, ...j.marks }));
      if (Array.isArray(j.tree)) setTree(j.tree);
      if (j.geo && typeof j.geo === "object") setGeo(j.geo);
      try { localStorage.setItem(LS_KEY, key); } catch {}
    } catch { if (!silent) setErr("Could not reach the server."); }
    if (!silent) setLoading(false);
  }, []);
  useEffect(() => {
    let k = ""; try { k = localStorage.getItem(LS_KEY) || ""; } catch {}
    try { const lm = JSON.parse(localStorage.getItem(MARKS_LS) || "{}"); if (lm && typeof lm === "object") setMarks(lm); } catch {}
    if (k) { setPass(k); load(k); }
  }, [load]);
  // Never let the browser restore a saved scroll position; open at the very top
  useEffect(() => { try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch {} }, []);
  // When the data first lands, pin to the top (content height jumps as it loads on mobile)
  const didTop = useRef(false);
  useEffect(() => {
    if (!authed || didTop.current) return;
    didTop.current = true;
    const top = () => { try { if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0; window.scrollTo(0, 0); } catch {} };
    top(); requestAnimationFrame(top); setTimeout(top, 80); setTimeout(top, 250); setTimeout(top, 600);
  }, [authed]);
  // live clock + silent auto-refresh every 10 min
  useEffect(() => { const t = setInterval(() => setNowTs(Date.now()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { if (!authed || !pass) return; const t = setInterval(() => load(pass, true), 25000); return () => clearInterval(t); }, [authed, pass, load]);
  // Jump to the top whenever the tab changes so the new view's header is visible
  useEffect(() => {
    const toTop = () => {
      try {
        if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
        window.scrollTo({ top: 0, behavior: "auto" });
        if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      } catch {}
    };
    toTop();
    const r1 = requestAnimationFrame(toTop);
    const r2 = requestAnimationFrame(() => requestAnimationFrame(toTop));
    const t = setTimeout(toTop, 60);
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); clearTimeout(t); };
  }, [view]);
  // Pull interested leads from the /start funnel store (read-only; Telegram/Viato untouched)
  useEffect(() => {
    if (!authed) return; let stop = false;
    const pull = async () => { try { const res = await fetch(`/api/chat?kind=leads&key=${encodeURIComponent(pass)}&cb=${Date.now()}`, { cache: "no-store" }); if (!res.ok) return; const j = await res.json(); const d = j && j.leads; if (stop || !d) return; const list: Lead[] = Object.entries(d).map(([k, v]) => ({ ...(v as object), _key: k } as Lead)); setLeads(list); } catch {} };
    pull(); const t = setInterval(pull, 25000); return () => { stop = true; clearInterval(t); };
  }, [authed, pass]);
  // Make /track its own installable app + register the push service worker
  useEffect(() => {
    if (typeof document === "undefined") return;
    try {
      if (!document.querySelector('link[rel="manifest"][data-gp-track]')) { const l = document.createElement("link"); l.rel = "manifest"; l.href = "/track.webmanifest"; l.setAttribute("data-gp-track", "1"); document.head.appendChild(l); }
      if (!document.querySelector('link[rel="apple-touch-icon"][data-gp-track]')) { const a = document.createElement("link"); a.rel = "apple-touch-icon"; a.href = "/apple-touch-icon.png"; a.setAttribute("data-gp-track", "1"); document.head.appendChild(a); }
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    } catch {}
  }, []);

  const markFor = useCallback((email: string): Mark => marks[(email || "").toLowerCase()] || DEFAULT_MARK, [marks]);
  const saveMark = useCallback((email: string, patch: Partial<Mark>) => {
    const key = (email || "").toLowerCase(); if (!key) return;
    setMarks((prev) => {
      const cur = prev[key] || DEFAULT_MARK;
      const next: Mark = { ...cur };
      if (patch.stage) { next.stage = patch.stage; if (patch.stage === "closed" && cur.stage !== "closed") { next.closedAt = Date.now(); setConfetti(Date.now()); } }
      if (patch.note !== undefined) next.note = patch.note;
      if (patch.touchedAt !== undefined) next.touchedAt = patch.touchedAt;
      if (patch.voice) next.voice = patch.voice;
      if (patch.birthday !== undefined) next.birthday = patch.birthday;
      const all = { ...prev, [key]: next };
      try { localStorage.setItem(MARKS_LS, JSON.stringify(all)); } catch {}
      return all;
    });
    const payload: Record<string, unknown> = { key: pass, email: key };
    if (patch.stage) payload.stage = patch.stage;
    if (patch.note !== undefined) payload.note = patch.note;
    if (patch.voice) payload.voice = patch.voice;
    if (patch.birthday !== undefined) payload.birthday = patch.birthday;
    if (patch.touchedAt !== undefined) payload.touch = 1;
    fetch(`/api/chat?kind=track-mark`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
  }, [pass]);
  const onStage = useCallback((email: string, s: Stage) => saveMark(email, { stage: s }), [saveMark]);
  const onTouch = useCallback((email: string) => saveMark(email, { touchedAt: Date.now() }), [saveMark]);

  const onEmail = useCallback(async (m: Member) => {
    const key = m.email; const cur = emailStates[key];
    if (cur !== "confirm") { setEmailStates((s) => ({ ...s, [key]: "confirm" })); setTimeout(() => setEmailStates((s) => (s[key] === "confirm" ? { ...s, [key]: "idle" } : s)), 4000); return; }
    setEmailStates((s) => ({ ...s, [key]: "sending" }));
    try {
      const res = await fetch(`/api/chat?kind=track-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: pass, to: m.email, name: firstName(m.name), style: msgStyle }) });
      const j = await res.json(); setEmailStates((s) => ({ ...s, [key]: j.ok ? "sent" : "error" }));
      if (j.ok) saveMark(m.email, { stage: markFor(m.email).stage === "new" ? "contacted" : markFor(m.email).stage, touchedAt: Date.now() });
    } catch { setEmailStates((s) => ({ ...s, [key]: "error" })); }
  }, [emailStates, pass, msgStyle, saveMark, markFor]);

  const members = useMemo(() => {
    const base = snap?.members || [];
    if (!base.length || !Object.keys(geo).length) return base;
    return base.map((m) => {
      const g = geo[(m.email || "").toLowerCase()] || geo["name:" + (m.name || "").toLowerCase().replace(/\s+/g, " ").trim()];
      if (!g) return m;
      const out = { ...m };
      if (!out.phone && g.p) out.phone = g.p;
      if (g.s) out.state = g.s;
      if (g.c) out.city = g.c;
      return out;
    });
  }, [snap, geo]);
  const counts = useMemo(() => {
    let active = 0, inactive = 0, lapsed = 0, due = 0, withPhone = 0;
    for (const m of members) { if (m.status === "active") active++; else if (m.status === "lapsed") lapsed++; else inactive++; const du = daysUntil(m.nextDue); if (m.status === "active" && du !== null && du <= 7) due++; if (m.phone) withPhone++; }
    return { active, inactive, lapsed, due, withPhone, total: members.length };
  }, [members]);
  const levels = useMemo(() => { const s = new Set<number>(); members.forEach((m) => s.add(m.level)); return Array.from(s).sort((a, b) => a - b); }, [members]);

  const pipe = useMemo(() => {
    let worked = 0, talking = 0, closed = 0, closedToday = 0, workedToday = 0;
    const reachable = members.filter((m) => m.email || m.phone).length;
    for (const m of members) {
      const mk = marks[(m.email || "").toLowerCase()];
      if (!mk) continue;
      if (mk.stage !== "new" && mk.stage !== "skip") worked++;
      if (mk.stage === "talking" || mk.stage === "committed" || mk.stage === "closed") talking++;
      if (mk.stage === "closed") { closed++; if (isToday(mk.closedAt)) closedToday++; }
      if (isToday(mk.touchedAt)) workedToday++;
    }
    return { reachable, worked, talking, closed, closedToday, workedToday };
  }, [members, marks]);

  const scored = useMemo(() => members.map((m) => ({ m, ...score(m) })).sort((a, b) => b.s - a.s), [members]);
  const builders = useMemo(() => members.filter((m) => (m.referred || 0) >= 1).sort((a, b) => (b.referred || 0) - (a.referred || 0) || (a.name || "").localeCompare(b.name || "")), [members]);
  const openLeads = useMemo(() => {
    const skip = new Set(["Signed up", "Not now"]);
    return leads.filter((l) => !skip.has(l.status || "") && (l.phone || l.email))
      .sort((a, b) => { const hot = (l: Lead) => ((l.path || "").startsWith("🔥") ? 0 : 1); if (hot(a) !== hot(b)) return hot(a) - hot(b); return new Date(b.lastSeen || b.firstSeen || 0).getTime() - new Date(a.lastSeen || a.firstSeen || 0).getTime(); });
  }, [leads]);
  const focus = useMemo(() => scored.filter((x) => x.m.status !== "active" || (daysUntil(x.m.nextDue) !== null && daysUntil(x.m.nextDue)! <= 7)).slice(0, 15), [scored]);

  // Today's hit list: highest-impact, not already closed/skipped, sized to the sprint
  const dailyTarget = useMemo(() => {
    const target = snap?.goal?.target ?? 10000, perSub = snap?.goal?.perSub ?? 100, earn = snap?.goal?.earnings ?? null;
    const deadline = snap?.goal?.deadline ?? "2026-11-01";
    const dTo = Math.max(1, Math.ceil((new Date(deadline + "T23:59:59").getTime() - Date.now()) / DAY));
    const subsToGo = earn != null ? Math.ceil(Math.max(0, target - earn) / perSub) : 3;
    return Math.max(1, Math.ceil(subsToGo / dTo));
  }, [snap]);
  const hitSize = Math.min(14, Math.max(6, dailyTarget * 5));
  const hitList = useMemo(() => scored.filter((x) => { const mk = marks[(x.m.email || "").toLowerCase()]; return !mk || (mk.stage !== "closed" && mk.stage !== "skip"); }).slice(0, hitSize), [scored, marks, hitSize]);
  const birthdays = useMemo(() => {
    const out: { m: Member; days: number }[] = [];
    for (const mm of members) { const bd = marks[(mm.email || "").toLowerCase()]?.birthday; const du = bd ? bdDaysUntil(bd) : null; if (du !== null && du <= 7) out.push({ m: mm, days: du }); }
    return out.sort((a, b) => a.days - b.days);
  }, [members, marks]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let l = members.filter((m) => {
      if (levelFilter !== "all" && m.level !== levelFilter) return false;
      if (view === "active" && m.status !== "active") return false;
      if (view === "inactive" && m.status === "active") return false;
      if (view === "due") { const du = daysUntil(m.nextDue); if (!(m.status === "active" && du !== null && du <= 7)) return false; }
      if (needle && !(m.name + " " + m.email + " " + m.phone).toLowerCase().includes(needle)) return false;
      return true;
    });
    l = l.slice().sort((a, b) => { if (!!b.phone !== !!a.phone) return (b.phone ? 1 : 0) - (a.phone ? 1 : 0); const da = daysUntil(a.nextDue), db = daysUntil(b.nextDue); if (da !== null && db !== null && da !== db) return da - db; return (a.name || "").localeCompare(b.name || ""); });
    return l;
  }, [members, q, view, levelFilter]);

  /* ── Gate ──────────────────────────────────────────────────────────────── */
  if (!authed) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-4 relative overflow-hidden">
        <div className="gp-aurora" />
        <div className="gp-grid" />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-sm relative z-10">
          <div className="text-center mb-6">
            <div className="text-accent font-mono text-[11px] tracking-[0.35em] uppercase mb-2">The Greenprint</div>
            <h1 className="text-3xl font-bold text-text tracking-tight">Command Center</h1>
            <p className="text-muted text-sm mt-2">Private. Enter your passcode.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (input) { setPass(input); load(input); } }} className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent p-5 space-y-3 backdrop-blur">
            <input type="password" inputMode="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Passcode" autoFocus className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-text font-mono text-base outline-none focus:border-accent transition-colors" />
            <button type="submit" disabled={loading || !input} className="w-full bg-accent text-bg font-bold rounded-xl py-3 text-sm disabled:opacity-40 hover:shadow-[0_0_24px_rgba(0,255,133,0.4)] transition-all">{loading ? "Checking…" : "Unlock"}</button>
            {err && <div className="text-red text-xs font-mono text-center">{err}</div>}
          </form>
        </motion.div>
        <style>{auroraCss}</style>
      </main>
    );
  }

  const nav: { id: View; label: string; n?: number; group: string }[] = [
    { id: "today", label: "Today", n: hitList.length, group: "Work" },
    { id: "focus", label: "Focus This Week", n: focus.length, group: "Work" },
    { id: "pipeline", label: "Pipeline", n: pipe.worked, group: "Work" },
    { id: "community", label: "Community", n: builders.length, group: "Work" },
    { id: "due", label: "Due This Week", n: counts.due, group: "Book" },
    { id: "inactive", label: "Inactive", n: counts.inactive + counts.lapsed, group: "Book" },
    { id: "active", label: "Active", n: counts.active, group: "Book" },
    { id: "all", label: "Everyone", n: counts.total, group: "Book" },
    { id: "playbook", label: "Playbook", group: "Win" },
    { id: "system", label: "The System", group: "Win" },
  ];
  const groups = ["Work", "Book", "Win"];
  const listViews: View[] = ["due", "inactive", "active", "all"];
  const showHero = view === "today" || view === "focus" || view === "pipeline";
  const showTiles = view !== "playbook" && view !== "system" && view !== "community";
  const agoMin = snap?.updatedAt ? Math.max(0, Math.floor((nowTs - snap.updatedAt) / 60000)) : null;

  return (
    <main ref={mainScrollRef} style={{ overflowAnchor: "none", paddingTop: "env(safe-area-inset-top)" }} className="gp-root gp-grain h-[100dvh] overflow-y-auto overflow-x-clip overscroll-contain bg-bg text-text relative">
      <div className="gp-aurora opacity-60" />
      <div className="gp-grid" />
      <div className="gp-vignette" />
      <Confetti fire={confetti} />
      {queueOpen && <RapidTextQueue items={(view === "today" ? hitList : focus).map((f) => f.m)} markFor={markFor} voiceFor={(email) => markFor(email).voice} onVoice={(email, v) => saveMark(email, { voice: v })} onSave={(email, patch) => saveMark(email, patch)} onClose={() => setQueueOpen(false)} onContacted={(email) => saveMark(email, { stage: markFor(email).stage === "new" ? "contacted" : markFor(email).stage, touchedAt: Date.now() })} />}
      <div className="relative z-10 lg:flex max-w-7xl mx-auto">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/[0.06] min-h-screen p-5 sticky top-0 self-start">
          <div className="flex items-center gap-2 mb-8">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-accent font-mono text-[11px] tracking-[0.3em] uppercase">The Greenprint</span>
          </div>
          <nav className="space-y-4">
            {groups.map((g) => (
              <div key={g}>
                <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted/60 px-3 mb-1.5">{g}</div>
                <div className="space-y-1">
                  {nav.filter((t) => t.group === g).map((t) => (
                    <button key={t.id} onClick={() => setView(t.id)} className={`gp-display w-full text-left px-3 py-2 rounded-xl text-[15px] font-medium flex items-center justify-between transition-all duration-200 ${view === t.id ? "gp-navon text-accent" : "text-muted hover:text-text hover:bg-white/[0.03] border border-transparent"}`}>
                      <span>{t.label}</span>{t.n !== undefined && <span className="opacity-60 text-xs">{t.n}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-auto pt-6 space-y-3">
            <NotifyBell />
            <div className="text-[10px] font-mono text-muted leading-relaxed">
              <div className="flex items-center gap-1.5 mb-1"><span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> live · auto-refresh</div>
              {agoMin != null ? `updated ${agoMin === 0 ? "just now" : agoMin + "m ago"}` : "no data yet"}
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 px-4 sm:px-6 pb-28">
          {/* Header */}
          <div className="pt-8 pb-5 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="gp-display gp-title text-[30px] sm:text-[44px] font-bold leading-[0.95]">{nav.find((n) => n.id === view)?.label}</h1>
              <p className="text-muted text-xs font-mono mt-1.5">
                {view === "today" ? "Your daily method of operation. Work this list top to bottom." :
                  view === "focus" ? "Your ranked lock-in list, work top to bottom." :
                  view === "pipeline" ? "Every member, from first touch to closed." :
                  view === "playbook" ? "The scripts, the objection handlers, the cadence." :
                  view === "system" ? "The whole machine on one page. Duplicate it anywhere." :
                  `${agoMin != null ? `updated ${agoMin === 0 ? "just now" : agoMin + "m ago"}` : "no data yet"}`}
                {snap?.source && showTiles ? ` · ${snap.source}` : ""}
              </p>
            </div>
            <button onClick={() => load(pass)} disabled={loading} className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-mono hover:border-accent hover:text-accent transition-colors disabled:opacity-50 flex items-center gap-2"><span className={loading ? "inline-block animate-spin" : "inline-block"}>↻</span>{loading ? "Refreshing" : "Refresh"}</button>
          </div>
          <div className="lg:hidden mb-5"><NotifyBell /></div>

          {snap && showHero && (
            <div className={view === "today" ? "" : "hidden lg:block"}>
              <GoalPanel goal={snap.goal} />
              <SprintStrip goal={snap.goal} inactiveCount={counts.inactive + counts.lapsed} dueCount={counts.due} closedToday={pipe.closedToday} />
            </div>
          )}

          {snap && showTiles && (
            <div className="hidden lg:flex gap-3 flex-wrap mb-6">
              <StatTile label="Inactive" value={counts.inactive + counts.lapsed} tone="#8a8a8a" delay={0.02} />
              <StatTile label="Due ≤ 7 Days" value={counts.due} tone="#FF4444" delay={0.07} />
              <StatTile label="Active" value={counts.active} tone="#00FF85" delay={0.12} />
              <StatTile label="Closed" value={pipe.closed} tone="#C9A84C" delay={0.17} />
              <StatTile label="Worked Today" value={pipe.workedToday} tone="#F5F5F5" delay={0.22} />
            </div>
          )}

          {/* Mobile bottom tab bar (native app-style: 5 fixed tabs + More sheet) */}
          {(() => {
            const primary: { id: View; label: string; icon: string }[] = [
              { id: "today", label: "Today", icon: "🎯" },
              { id: "focus", label: "Focus", icon: "⭐" },
              { id: "pipeline", label: "Pipeline", icon: "🪜" },
              { id: "all", label: "Roster", icon: "👥" },
            ];
            const moreViews: { id: View; label: string; icon: string }[] = [
              { id: "community", label: "Community", icon: "🌳" },
              { id: "due", label: "Due This Week", icon: "⏰" },
              { id: "inactive", label: "Inactive", icon: "💤" },
              { id: "active", label: "Active", icon: "✅" },
              { id: "playbook", label: "Playbook", icon: "📘" },
              { id: "system", label: "The System", icon: "🧭" },
            ];
            const inMore = moreViews.some((v) => v.id === view);
            return (
              <>
                <div className="gp-tabbar lg:hidden fixed bottom-0 left-0 right-0 z-40 flex pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
                  {primary.map((t) => {
                    const on = view === t.id;
                    return (
                      <button key={t.id} onClick={() => { setMoreOpen(false); setView(t.id); }} className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-1 active:scale-90 transition-transform ${on ? "gp-tabon" : ""}`}>
                        {on && <span className="gp-tabdot" />}
                        <span className={`text-[19px] leading-none transition-all ${on ? "drop-shadow-[0_0_8px_rgba(0,255,133,0.5)]" : "grayscale opacity-50"}`}>{t.icon}</span>
                        <span className={`gp-display text-[10px] font-semibold ${on ? "text-accent" : "text-muted"}`}>{t.label}</span>
                      </button>
                    );
                  })}
                  <button onClick={() => setMoreOpen(true)} className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-1 active:scale-90 transition-transform ${inMore ? "gp-tabon" : ""}`}>
                    {inMore && <span className="gp-tabdot" />}
                    <span className={`text-[19px] leading-none transition-all ${inMore ? "drop-shadow-[0_0_8px_rgba(0,255,133,0.5)]" : "grayscale opacity-50"}`}>⋯</span>
                    <span className={`gp-display text-[10px] font-semibold ${inMore ? "text-accent" : "text-muted"}`}>More</span>
                  </button>
                </div>
                {moreOpen && (
                  <div className="lg:hidden fixed inset-0 z-[75] flex items-end" >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
                    <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="relative z-10 w-full rounded-t-3xl border-t border-white/10 bg-surface2 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
                      <div className="grid grid-cols-2 gap-2">
                        {moreViews.map((v) => (
                          <button key={v.id} onClick={() => { setView(v.id); setMoreOpen(false); }} className={`gp-display flex items-center gap-2.5 rounded-2xl border p-3.5 text-left transition-colors ${view === v.id ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-text/80 hover:border-white/25"}`}>
                            <span className="text-lg">{v.icon}</span>
                            <span className="text-[13px] font-semibold">{v.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                )}
              </>
            );
          })()}

          {!snap && <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center"><div className="text-text font-semibold mb-1">No snapshot yet</div><div className="text-muted text-sm">The next refresh will fill this in.</div></div>}

          {snap && showTiles && (
            <div className={`mb-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 ${view === "today" || view === "focus" ? "" : "hidden lg:block"}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Email tone <span className="text-text/30">· texts pick their own voice</span></div>
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/20 border border-white/[0.06]">
                  {([["checkin", "Check in"], ["nudge", "Nudge"], ["invite", "Invite back"]] as [MsgStyle, string][]).map(([id, label]) => (
                    <button key={id} onClick={() => setMsgStyle(id)}
                      className={`relative px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${msgStyle === id ? "text-bg" : "text-muted hover:text-text"}`}>
                      {msgStyle === id && <motion.span layoutId="stylechip" className="absolute inset-0 rounded-lg bg-accent" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}
                      <span className="relative z-10">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <AnimatePresence mode="wait">
                  <motion.div key={msgStyle} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-accent/80 mb-1">Preview · subject: {EMAIL_PREVIEW[msgStyle].subject}</div>
                    <div className="text-[12px] text-text/70 leading-relaxed">{EMAIL_PREVIEW[msgStyle].open}</div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* TODAY VIEW */}
          {snap && view === "today" && (
            <AnimatePresence mode="wait">
              <motion.div key="today" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AICommand moves={hitList} markFor={markFor} openLeads={openLeads} counts={counts} goal={snap.goal} onTouch={onTouch} />
                {birthdays.length > 0 && (
                  <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.08] to-transparent p-4 mb-5">
                    <div className="text-gold font-mono text-[11px] tracking-[0.2em] uppercase mb-2">🎂 Birthdays this week</div>
                    <div className="flex flex-wrap gap-2">
                      {birthdays.map(({ m, days }) => (
                        <div key={m.email || m.name} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5">
                          <span className="text-sm text-text">{properName(m.name) || "(no name)"}</span>
                          <span className="text-[10px] font-mono text-gold">{days === 0 ? "today" : `${days}d`}</span>
                          {m.phone && days === 0 && <a href={smsHref(m.phone, birthdayMsg(markFor(m.email).voice, firstName(m.name)))} onClick={() => onTouch(m.email)} className="text-[10px] font-mono text-gold underline hover:no-underline">text 🎂</a>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] to-transparent p-4 mb-5">
                  <div className="flex items-center gap-4">
                    <Ring pct={(pipe.workedToday / hitSize) * 100} size={64} stroke={6}><div className="text-center"><div className="font-mono text-base font-bold text-accent leading-none">{pipe.workedToday}</div><div className="text-[8px] font-mono text-muted">of {hitSize}</div></div></Ring>
                    <div>
                      <div className="text-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-1">Today's Hit List</div>
                      <div className="text-sm text-text/90">Reach out to these {hitList.length}. Close <span className="text-accent font-bold">{dailyTarget}</span> today to stay on sprint pace. Tap ◎ worked once you touch someone.</div>
                    </div>
                  </div>
                  <button onClick={() => setQueueOpen(true)} className="mt-3 w-full py-3 rounded-xl bg-accent text-bg font-bold text-sm hover:shadow-[0_0_24px_rgba(0,255,133,0.4)] transition-all active:scale-[0.99]">⚡ Rapid-text this list</button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {hitList.map((f, i) => <FocusCard key={f.m.email || i} m={f.m} rank={i + 1} reasons={f.reasons} emailState={emailStates[f.m.email] || "idle"} onEmail={onEmail} mark={markFor(f.m.email)} onStage={(s) => onStage(f.m.email, s)} onTouch={() => onTouch(f.m.email)} onSave={(patch) => saveMark(f.m.email, patch)} />)}
                </div>
                {hitList.length === 0 && <div className="text-center text-muted text-sm py-10">Everyone's closed or set aside. Incredible.</div>}
              </motion.div>
            </AnimatePresence>
          )}

          {/* FOCUS VIEW */}
          {snap && view === "focus" && (
            <AnimatePresence mode="wait">
              <motion.div key="focus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.06] to-transparent p-4 mb-5">
                  <div className="text-gold font-mono text-[11px] tracking-[0.2em] uppercase mb-1">This Week's Mission</div>
                  <div className="text-sm text-text/90">These {focus.length} are your highest-impact calls this week: past-due first, then people billing soon, then builders whose downline you reactivate with them. Lock them in.</div>
                  <button onClick={() => setQueueOpen(true)} className="mt-3 w-full py-3 rounded-xl bg-gold text-bg font-bold text-sm hover:shadow-[0_0_24px_rgba(201,168,76,0.4)] transition-all active:scale-[0.99]">⚡ Rapid-text the Focus list</button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {focus.map((f, i) => <FocusCard key={f.m.email || i} m={f.m} rank={i + 1} reasons={f.reasons} emailState={emailStates[f.m.email] || "idle"} onEmail={onEmail} mark={markFor(f.m.email)} onStage={(s) => onStage(f.m.email, s)} onTouch={() => onTouch(f.m.email)} onSave={(patch) => saveMark(f.m.email, patch)} />)}
                </div>
                {focus.length === 0 && <div className="text-center text-muted text-sm py-10">Nothing urgent this week. Everyone's current.</div>}
              </motion.div>
            </AnimatePresence>
          )}

          {/* PIPELINE VIEW */}
          {snap && view === "pipeline" && (
            <AnimatePresence mode="wait">
              <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-5"><Funnel steps={[
                  { label: "Everyone", n: counts.total, color: "#8a8a8a" },
                  { label: "Reachable", n: pipe.reachable, color: "#4a9eff" },
                  { label: "Worked", n: pipe.worked, color: "#C9A84C" },
                  { label: "Interested", n: pipe.talking, color: "#9b7bff" },
                  { label: "Active", n: pipe.closed, color: "#00FF85" },
                ]} /></div>
                <div className="space-y-3 pb-3 lg:flex lg:gap-3 lg:space-y-0 lg:overflow-x-auto lg:-mx-4 lg:px-4">
                  {STAGES.map((st) => {
                    const col = members.filter((m) => (markFor(m.email).stage) === st).sort((a, b) => score(b).s - score(a).s);
                    const meta = STAGE_META[st];
                    return (
                      <div key={st} className="w-full lg:shrink-0 lg:w-72 rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
                        <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/[0.06]" style={{ background: `${meta.color}12` }}>
                          <span className="text-[11px] font-mono font-bold tracking-wider" style={{ color: meta.color }}>{meta.short}</span>
                          <span className="text-[11px] font-mono text-muted">{col.length + (st === "talking" ? openLeads.length : 0)}</span>
                        </div>
                        <div className="p-2 space-y-2 lg:max-h-[62vh] lg:overflow-y-auto">
                          {st === "talking" && openLeads.slice(0, 40).map((l) => {
                            const first = firstName(l.name || "");
                            return (
                              <div key={"lead-" + l._key} className="rounded-xl border border-gold/25 bg-gold/[0.06] p-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 shrink-0 rounded-full grid place-items-center bg-surface2 border border-gold/30 text-xs">{(l.path || "").startsWith("🔥") ? "🔥" : "🙋"}</div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium text-text truncate">{properName(l.name || "") || "(lead)"} <span className="text-[8px] font-mono text-gold">NEW LEAD</span></div>
                                    <div className="text-[10px] font-mono text-muted truncate">{l.phone || l.email || "no contact"}</div>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                  {l.phone && <a href={telHref(l.phone)} className="px-2 py-1 rounded-lg bg-accent/10 border border-accent/25 text-accent text-[10px] font-mono">☎</a>}
                                  {l.phone && <a href={leadSms(l.phone, first)} className="px-2 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-muted hover:text-accent hover:border-accent transition-colors">💬</a>}
                                  {l.email && <a href={leadMailto(l.email, first)} className="px-2 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-muted hover:text-gold hover:border-gold transition-colors">✉</a>}
                                </div>
                              </div>
                            );
                          })}
                          {col.length === 0 && !(st === "talking" && openLeads.length) && <div className="text-center text-[11px] text-muted/60 py-6 font-mono">empty</div>}
                          {col.slice(0, 60).map((m) => {
                            const idx = STAGES.indexOf(st); const nextStage = idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
                            return (
                              <div key={m.email || m.name} className="rounded-xl border border-white/[0.06] bg-surface2/60 p-2.5">
                                <div className="flex items-center gap-2">
                                  <Avatar name={m.name} status={m.status} size={8} />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium text-text truncate">{properName(m.name) || "(no name)"}</div>
                                    <div className="text-[10px] font-mono text-muted truncate">{m.phone || m.email || "no contact"}</div>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                  {m.phone && <a href={telHref(m.phone)} className="px-2 py-1 rounded-lg bg-accent/10 border border-accent/25 text-accent text-[10px] font-mono">☎</a>}
                                  {m.phone && <TextBtn m={m} />}
                                  {nextStage && <button onClick={() => onStage(m.email, nextStage)} className="px-2 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-muted hover:text-accent hover:border-accent transition-colors">→ {STAGE_META[nextStage].short}</button>}
                                  {st !== "skip" && <button onClick={() => onStage(m.email, "skip")} title="Set aside" className="px-2 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-muted hover:text-red hover:border-red/40 transition-colors">⌁</button>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center text-[11px] font-mono text-muted mt-4">Move members from first touch to Active in One House. Marking someone Active pops the confetti.</div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* LIST VIEWS */}
          {snap && listViews.includes(view) && (
            <>
              <div className="flex gap-2 mb-4 flex-wrap">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className="flex-1 min-w-[180px] bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-base font-mono outline-none focus:border-accent transition-colors" />
                <select value={String(levelFilter)} onChange={(e) => setLevelFilter(e.target.value === "all" ? "all" : Number(e.target.value))} className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-base font-mono outline-none focus:border-accent text-text">
                  <option value="all">All levels</option>{levels.map((l) => <option key={l} value={l}>Level {l}</option>)}
                </select>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.025] to-transparent overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div key={view + String(levelFilter) + q} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    {list.length === 0 ? <div className="px-4 py-12 text-center text-muted text-sm">Nobody here right now.</div> : list.map((m, i) => <MemberRow key={(m.email || m.name) + i} m={m} i={i} emailState={emailStates[m.email] || "idle"} onEmail={onEmail} mark={markFor(m.email)} onStage={(s) => onStage(m.email, s)} onTouch={() => onTouch(m.email)} />)}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="text-center text-[11px] font-mono text-muted mt-4">Showing {list.length} of {counts.total} · badges reflect people brought in, not earnings</div>
            </>
          )}

          {/* COMMUNITY VIEW */}
          {snap && view === "community" && <CommunityView members={members} tree={tree} />}

          {/* PLAYBOOK VIEW */}
          {view === "playbook" && <Playbook />}

          {/* SYSTEM VIEW */}
          {view === "system" && <SystemView dailyTarget={dailyTarget} />}
        </div>
      </div>
      <style>{auroraCss}</style>
    </main>
  );
}

/* ── Playbook: scripts, objection handlers, cadence, principles ───────────── */
function CopyCard({ title, tag, body }: { title: string; tag?: string; body: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
      className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.03] to-transparent p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text text-sm">{title}</span>
          {tag && <span className="text-[9px] font-mono uppercase tracking-wider text-accent/80 border border-accent/25 rounded px-1.5 py-0.5">{tag}</span>}
        </div>
        <button onClick={() => { try { navigator.clipboard.writeText(body); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}
          className={`shrink-0 text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition-all ${copied ? "border-accent/40 text-accent bg-accent/10" : "border-white/10 text-muted hover:text-accent hover:border-accent"}`}>{copied ? "copied ✓" : "copy"}</button>
      </div>
      <p className="text-[13px] leading-relaxed text-text/75 whitespace-pre-line">{body}</p>
    </motion.div>
  );
}
function Playbook() {
  const scripts = [
    { title: "Reactivation call opener", tag: "call", body: "Hey [name], it's Jay, you got a quick second? ... Awesome. Look, no big sales pitch, I was going through the room and your name jumped out at me, and I realized I hadn't checked on you in a minute. How you been, for real?\n\n(Listen. Let them talk. Then:) That's what's up. I'll be honest, I'd love to see you back plugged in. What pulled you away from it?" },
    { title: "First text (no pitch)", tag: "text", body: "Hey [name], it's Jay. It's been a minute and you crossed my mind, so I just wanted to check in. How you been?" },
    { title: "The value touch", tag: "text / DM", body: "[name] this made me think of you. We broke this down live in the room this week and people are already running with it. Thought you'd want it. How's everything going on your end?" },
    { title: "The takeaway close", tag: "call", body: "Honestly [name], I'm not going to chase you on this, that's not my style. The room is moving with or without any one person. But I started this with you in mind, and I'd hate for you to look up in 90 days and we're way further along and you're on the outside looking in. The door's open right now. You want me to get you back in tonight?" },
    { title: "Voicemail", tag: "call", body: "Hey [name], it's Jay, nothing urgent. Was just thinking about you and wanted to see how you're doing. Shoot me a text when you get this. Talk soon." },
  ];
  const objections = [
    { title: "\"I don't have the money right now\"", body: "I hear you, and I respect that. Real question though: is it that you can't, or that you're not sure it's worth it yet? Because if it's the money, I can show you exactly how people in the room are covering the $200 and then some. If it's the belief, that's the real conversation, let's have that one." },
    { title: "\"I didn't make money last time\"", body: "Felt. A lot of people felt that same way early. What they found was they were in the room but not in the reps, they weren't showing up live and running the plays. The ones who did stuck are eating now. If you plug back in and actually run it with me this time, that changes. Would you give it an honest 30 days with me in your corner?" },
    { title: "\"I'm too busy\"", body: "That's exactly why this fits, it's built for busy. The live sessions are the training, you don't have to go figure it out alone. 30 minutes a day beats spinning your wheels for hours. What does your schedule actually look like day to day? Let's find the pocket." },
    { title: "\"Let me think about it\"", body: "Totally fair, I'd never pressure you. Just so I'm clear though, when you say think about it, what's the one thing you'd be thinking through? Because usually it's either money, time, or belief, and I can probably clear that up for you right now so you're not sitting on it." },
    { title: "\"I need to ask my spouse\"", body: "Love that, a real partnership. So they can get a yes from you first: if it was just up to you, are you in? ... Perfect. Then let's get the info in your hands so you can have a clean conversation with them. Want me to send you the one-pager you can show them?" },
  ];
  const cadence = [
    { d: "Day 1", t: "Pure check-in", c: "Text, no pitch. \"How you been?\" Just reconnect." },
    { d: "Day 2", t: "Stay visible", c: "Like and comment on their post. Be a face they see." },
    { d: "Day 3", t: "The call", c: "Phone them. Ask how they're doing. Listen more than you talk." },
    { d: "Day 5", t: "Send value", c: "Drop a clip, a win, or invite them to a live session." },
    { d: "Day 7", t: "The ask", c: "Make the invite. Use the takeaway close. Posture, not pressure." },
    { d: "Day 10", t: "Door open", c: "Last touch of the sprint. \"Door's open, I'd love to have you.\"" },
  ];
  const principles = [
    ["Lead with the person", "Check on them before you ever mention the business. People join people."],
    ["Posture over pressure", "You're inviting, not chasing. The room moves with or without any one person."],
    ["Feel, felt, found", "\"I understand how you feel. Others felt the same. Here's what they found.\""],
    ["The fortune is the follow-up", "Most sales come after the 5th touch. Keep showing up warm."],
    ["Control the dials", "You can't control who says yes. You can control how many you talk to. Hit the number."],
    ["Reactivate leaders first", "Win back one builder and their whole downline often comes with them."],
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <section>
        <h2 className="gp-display text-lg font-bold mb-1">Scripts</h2>
        <p className="text-muted text-xs font-mono mb-4">Say it like you. Copy, tweak the name, send.</p>
        <div className="grid md:grid-cols-2 gap-3">{scripts.map((s) => <CopyCard key={s.title} {...s} />)}</div>
      </section>
      <section>
        <h2 className="gp-display text-lg font-bold mb-1">Objection handlers</h2>
        <p className="text-muted text-xs font-mono mb-4">The five you'll hear most, and how to clear them.</p>
        <div className="grid md:grid-cols-2 gap-3">{objections.map((s) => <CopyCard key={s.title} {...s} />)}</div>
      </section>
      <section>
        <h2 className="gp-display text-lg font-bold mb-1">10-day follow-up cadence</h2>
        <p className="text-muted text-xs font-mono mb-4">Run this on everyone you reach out to. Consistency closes.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cadence.map((c, i) => (
            <motion.div key={c.d} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="text-accent font-mono text-[11px] tracking-wider mb-1">{c.d}</div>
              <div className="font-semibold text-text text-sm mb-1">{c.t}</div>
              <div className="text-[12px] text-text/65 leading-relaxed">{c.c}</div>
            </motion.div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="gp-display text-lg font-bold mb-1">Sales principles</h2>
        <p className="text-muted text-xs font-mono mb-4">The timeless network-marketing fundamentals. Tape them to your wall.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {principles.map(([t, b], i) => (
            <motion.div key={t} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-gold/15 bg-gradient-to-br from-gold/[0.05] to-transparent p-4">
              <div className="font-semibold text-gold text-sm mb-1">{t}</div>
              <div className="text-[12px] text-text/70 leading-relaxed">{b}</div>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

/* ── The System: the whole machine, duplicatable ─────────────────────────── */
function SystemView({ dailyTarget }: { dailyTarget: number }) {
  const dmo = [
    { n: 1, t: "Pull the list", c: "Open Today. The hit list is already sized and ranked for you." },
    { n: 2, t: "Reach out warm", c: "Text or call top to bottom. Pure check-in first, no pitch." },
    { n: 3, t: "Move the dot", c: "Every touch, advance their stage. New → contacted → talking." },
    { n: 4, t: "Handle the objection", c: "Pull the Playbook. Feel, felt, found. Posture, not pressure." },
    { n: 5, t: "Make the ask", c: "When they're warm, invite them back. Use the takeaway close." },
    { n: 6, t: "Close + duplicate", c: "Mark them closed. Then ask who they know. The room grows." },
  ];
  const funnelStages = [
    { label: "Everyone in the book", color: "#8a8a8a" },
    { label: "Reachable (phone/email)", color: "#4a9eff" },
    { label: "Reached out", color: "#C9A84C" },
    { label: "In conversation", color: "#9b7bff" },
    { label: "Closed + reactivated", color: "#00FF85" },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] to-transparent p-6">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ background: "rgba(0,255,133,0.10)" }} />
        <div className="relative">
          <div className="text-accent font-mono text-[11px] tracking-[0.25em] uppercase mb-2">The Daily Method of Operation</div>
          <h2 className="gp-display text-2xl font-bold mb-1">Run this every day and the business runs itself.</h2>
          <p className="text-text/70 text-sm">Close <span className="text-accent font-bold">{dailyTarget}/day</span> and you hit $10K before Nov 1. Here's the exact loop.</p>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-muted mb-4">The loop</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {dmo.map((s, i) => (
            <motion.div key={s.n} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 overflow-hidden">
              <div className="absolute right-3 top-2 text-[46px] font-mono font-black text-white/[0.05] leading-none">{s.n}</div>
              <div className="relative">
                <div className="font-semibold text-text mb-1">{s.t}</div>
                <div className="text-[12px] text-text/65 leading-relaxed">{s.c}</div>
              </div>
              {i < dmo.length - 1 && <div className="hidden lg:block absolute -right-1.5 top-1/2 text-accent/40 text-xl">→</div>}
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-muted mb-4">The funnel</h3>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-2">
          {funnelStages.map((s, i) => {
            const w = 100 - i * 16;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, scaleX: 0.8 }} whileInView={{ opacity: 1, scaleX: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} style={{ transformOrigin: "center" }} className="mx-auto">
                <div className="mx-auto rounded-xl flex items-center justify-center py-3 text-[13px] font-mono font-semibold text-white" style={{ width: `${w}%`, background: `linear-gradient(90deg,${s.color}55,${s.color}22)`, border: `1px solid ${s.color}55` }}>{s.label}</div>
              </motion.div>
            );
          })}
        </div>
        <p className="text-center text-[11px] font-mono text-muted mt-3">Every name starts at the top. Your only job is to move people down one step at a time.</p>
      </section>

      <section>
        <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-muted mb-4">The 10-day game plan</h3>
        <div className="rounded-2xl border border-gold/15 bg-gradient-to-br from-gold/[0.05] to-transparent p-5 space-y-3 text-[13px] text-text/80 leading-relaxed">
          <p><span className="text-gold font-bold">Days 1–3:</span> Blitz the list. Pure check-ins to everyone inactive and everyone due this week. No pitching, just reconnecting. Move every touch to "contacted."</p>
          <p><span className="text-gold font-bold">Days 4–6:</span> Work the conversations. Anyone who replied moves to "talking." Call them, handle objections, invite the warm ones to a live session.</p>
          <p><span className="text-gold font-bold">Days 7–9:</span> Close. Make the ask to everyone in "talking" and "committed." Use the takeaway. Each reactivation before Nov 1 pays you double.</p>
          <p><span className="text-gold font-bold">Day 10:</span> Last push + duplication. Final door-open touch, then ask every new yes who they know. End the sprint at $10K.</p>
        </div>
      </section>
    </motion.div>
  );
}

function leadSms(phone: string, first: string): string {
  const num = (phone || "").replace(/[^\d+]/g, "");
  const msg = `Hey ${first || "there"}! It's Jay from The Greenprint. Saw you were interested in getting started, so I wanted to reach out personally. What's got you looking to jump in?`;
  return `sms:${num}?&body=${encodeURIComponent(msg)}`;
}
function leadMailto(email: string, first: string): string {
  const subj = encodeURIComponent("Jay from The Greenprint");
  const body = encodeURIComponent(`Hey ${first || "there"},\n\nIt's Jay from The Greenprint. Saw you were interested in getting started and wanted to reach out personally. What's got you looking to jump in? Happy to answer anything.\n\n— Jay`);
  return `mailto:${email}?subject=${subj}&body=${body}`;
}
function LeadCard({ lead }: { lead: Lead }) {
  const first = firstName(lead.name || "");
  const hot = (lead.path || "").startsWith("🔥");
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors">
      <div className="h-9 w-9 shrink-0 rounded-full grid place-items-center bg-surface2 border border-white/10 text-sm">{hot ? "🔥" : "🙋"}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2"><span className="gp-display font-semibold text-text truncate">{properName(lead.name || "") || "(lead)"}</span>{hot && <span className="text-[9px] font-mono font-bold text-gold border border-gold/40 rounded px-1">HOT</span>}{lead.status && <span className="text-[9px] font-mono text-muted">{lead.status}</span>}</div>
        <div className="text-[11px] font-mono text-muted truncate">{lead.phone || lead.email || "no contact"}{lead.why ? ` · ${lead.why}` : ""}</div>
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        {lead.phone && <a href={leadSms(lead.phone, first)} className="px-2.5 py-2 rounded-xl border border-white/10 text-muted text-[11px] font-mono hover:border-accent hover:text-accent transition-all">💬</a>}
        {lead.email && <a href={leadMailto(lead.email, first)} className="px-2.5 py-2 rounded-xl border border-white/10 text-muted text-[11px] font-mono hover:border-gold hover:text-gold transition-all">✉</a>}
        {lead.phone && <a href={telHref(lead.phone)} className="px-2.5 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-[11px] font-mono hover:bg-accent hover:text-bg transition-all">☎</a>}
      </div>
    </div>
  );
}

/* ── Org tree: expandable sponsor → downline, from the 1House genealogy ───── */
function CommunityTree({ tree, memberByEmail }: { tree: TreeNode[]; memberByEmail: Map<string, Member> }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [q, setQ] = useState("");
  const idSet = useMemo(() => new Set(tree.map((n) => n.id)), [tree]);
  const children = useMemo(() => {
    const m = new Map<number, TreeNode[]>();
    for (const n of tree) { if (n.sp != null && idSet.has(n.sp)) { const a = m.get(n.sp) || []; a.push(n); m.set(n.sp, a); } }
    for (const a of m.values()) a.sort((x, y) => y.subs - x.subs || x.name.localeCompare(y.name));
    return m;
  }, [tree, idSet]);
  const roots = useMemo(() => tree.filter((n) => n.sp == null || !idSet.has(n.sp)).sort((a, b) => b.subs - a.subs || a.name.localeCompare(b.name)), [tree, idSet]);
  const descCount = useMemo(() => {
    const memo = new Map<number, number>();
    const count = (id: number): number => { if (memo.has(id)) return memo.get(id)!; const ch = children.get(id) || []; let c = ch.length; for (const k of ch) c += count(k.id); memo.set(id, c); return c; };
    return count;
  }, [children]);
  const statusOf = (n: TreeNode): Status => { const m = memberByEmail.get((n.email || "").toLowerCase()); if (m) return m.status; return n.paid ? "active" : "inactive"; };
  const phoneOf = (n: TreeNode): string => { const m = memberByEmail.get((n.email || "").toLowerCase()); return m ? m.phone : ""; };
  const toggle = (id: number) => setExpanded((e) => ({ ...e, [id]: !e[id] }));
  useEffect(() => { if (!roots.length) return; const top = roots.find((rt) => (children.get(rt.id) || []).length > 0); if (top) setExpanded((e) => (Object.keys(e).length ? e : { [top.id]: true })); }, [roots, children]);
  const matches = q.trim() ? tree.filter((n) => (n.name + " " + n.email).toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => b.subs - a.subs).slice(0, 50) : null;

  const Node = ({ n, depth }: { n: TreeNode; depth: number }) => {
    const kids = children.get(n.id) || [];
    const isOpen = !!expanded[n.id];
    const st = statusOf(n); const phone = phoneOf(n); const team = descCount(n.id);
    const dot = st === "active" ? "#00FF85" : st === "lapsed" ? "#FF4444" : "#3a3a3a";
    return (
      <div>
        <div className="flex items-center gap-2 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors" style={{ paddingLeft: 6 + depth * 20 }}>
          <button onClick={() => kids.length && toggle(n.id)} className={`w-5 h-5 shrink-0 grid place-items-center rounded text-xs ${kids.length ? "text-muted hover:text-accent" : "opacity-0 pointer-events-none"}`}>{isOpen ? "▾" : "▸"}</button>
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: dot }} />
          <span className="gp-display text-sm font-medium text-text truncate flex-1 min-w-0">{properName(n.name) || "(no name)"}</span>
          {n.subs > 0 && <span className="text-[10px] font-mono font-bold text-gold shrink-0">{n.subs} enrolled</span>}
          {team > 0 && <span className="text-[10px] font-mono font-bold text-accent shrink-0">{team} under</span>}
          <span className="text-[9px] font-mono text-muted/60 shrink-0">L{n.lvl}</span>
          {phone && <a href={telHref(phone)} title="Call" className="text-accent shrink-0 px-1.5">☎</a>}
        </div>
        {isOpen && kids.map((k) => <Node key={k.id} n={k} depth={depth + 1} />)}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your org…" className="flex-1 min-w-[180px] bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-base font-mono outline-none focus:border-accent" />
        <div className="flex gap-2">
          <button onClick={() => { const e: Record<number, boolean> = {}; roots.forEach((r) => (e[r.id] = true)); setExpanded(e); }} className="px-3 py-2 rounded-xl border border-white/10 text-[11px] font-mono text-muted hover:text-accent hover:border-accent transition-colors">expand L1</button>
          <button onClick={() => setExpanded({})} className="px-3 py-2 rounded-xl border border-white/10 text-[11px] font-mono text-muted hover:text-text transition-colors">collapse</button>
        </div>
      </div>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1.5 max-h-[70vh] overflow-y-auto">
        {matches ? (matches.length ? matches.map((n) => <Node key={n.id} n={n} depth={0} />) : <div className="px-4 py-8 text-center text-muted text-sm">No one matches.</div>) : roots.map((n) => <Node key={n.id} n={n} depth={0} />)}
      </div>
      <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#00FF85" }} /> active</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#FF4444" }} /> past due</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#3a3a3a" }} /> inactive</span>
      </div>
    </div>
  );
}

/* ── By-state grouping for tour planning ─────────────────────────────────── */
function CommunityStates({ members, tree }: { members: Member[]; tree: TreeNode[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const byId = useMemo(() => { const m = new Map<number, TreeNode>(); tree.forEach((n) => m.set(n.id, n)); return m; }, [tree]);
  const byEmail = useMemo(() => { const m = new Map<string, TreeNode>(); tree.forEach((n) => { if (n.email) m.set(n.email.toLowerCase(), n); }); return m; }, [tree]);
  const invitedBy = (m: Member): string | null => { const n = byEmail.get((m.email || "").toLowerCase()); if (!n || n.sp == null) return null; const s = byId.get(n.sp); return s ? properName(s.name) : null; };
  const groups = useMemo(() => {
    const g = new Map<string, Member[]>();
    for (const m of members) { const st = (m.state && m.state.length === 2 ? m.state.toUpperCase() : null) || (m.phone ? stateFromPhone(m.phone) : null); const key = st || "??"; const a = g.get(key) || []; a.push(m); g.set(key, a); }
    const arr = [...g.entries()].map(([k, v]) => ({ st: k, list: v.sort((a, b) => (a.name || "").localeCompare(b.name || "")) }));
    arr.sort((a, b) => { if (a.st === "??") return 1; if (b.st === "??") return -1; return b.list.length - a.list.length; });
    return arr;
  }, [members]);
  return (
    <div className="space-y-2">
      <p className="text-muted text-xs font-mono mb-1">Grouped by each member's real city/state. Great for planning Bag Day Tour stops. Tap a state to see who's there and who invited them.</p>
      {groups.map((g) => {
        const isOpen = !!open[g.st];
        const label = g.st === "??" ? "No location yet" : stateName(g.st);
        const active = g.list.filter((m) => m.status === "active").length;
        return (
          <div key={g.st} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            <button onClick={() => setOpen((o) => ({ ...o, [g.st]: !o[g.st] }))} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.025] transition-colors">
              <span className="gp-display font-semibold text-text">{isOpen ? "▾" : "▸"} {label}</span>
              <span className="text-[11px] font-mono text-muted">{g.list.length} ppl · <span className="text-accent">{active} active</span></span>
            </button>
            {isOpen && (
              <div className="border-t border-white/[0.06]">
                {g.list.map((m) => {
                  const inv = invitedBy(m);
                  return (
                    <div key={m.email || m.name} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: m.status === "active" ? "#00FF85" : m.status === "lapsed" ? "#FF4444" : "#3a3a3a" }} />
                      <div className="flex-1 min-w-0">
                        <div className="gp-display text-sm text-text truncate">{properName(m.name) || "(no name)"}</div>
                        <div className="text-[10px] font-mono text-muted truncate">{m.city ? m.city + " · " : ""}{m.phone || m.email || ""}{inv ? ` · invited by ${inv}` : ""}</div>
                      </div>
                      {m.phone && <TextBtn m={m} />}
                      {m.phone && <a href={telHref(m.phone)} className="px-2.5 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-[11px] font-mono shrink-0">☎</a>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Community: your builders / leaders at a glance (desktop) ─────────────── */
function CommunityView({ members, tree }: { members: Member[]; tree: TreeNode[] }) {
  const [tab, setTab] = useState<"tree" | "state">("tree");
  const memberByEmail = useMemo(() => { const m = new Map<string, Member>(); for (const x of members) if (x.email) m.set(x.email.toLowerCase(), x); return m; }, [members]);
  const builders = useMemo(() => members.filter((m) => (m.referred || 0) >= 1).sort((a, b) => (b.referred || 0) - (a.referred || 0) || (a.name || "").localeCompare(b.name || "")), [members]);
  const totalRefs = useMemo(() => members.reduce((s, m) => s + (m.referred || 0), 0), [members]);
  const atRisk = useMemo(() => builders.filter((b) => { const du = daysUntil(b.nextDue); return b.status !== "active" || (du !== null && du <= 7); }), [builders]);
  const levels = useMemo(() => {
    const map = new Map<number, { active: number; inactive: number; total: number }>();
    for (const m of members) { const e = map.get(m.level) || { active: 0, inactive: 0, total: 0 }; e.total++; if (m.status === "active") e.active++; else e.inactive++; map.set(m.level, e); }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([level, v]) => ({ level, ...v }));
  }, [members]);
  const maxRef = builders.length ? (builders[0].referred || 1) : 1;
  const Row = ({ m, rank }: { m: Member; rank?: number }) => {
    const du = daysUntil(m.nextDue); const dueSoon = du !== null && du <= 7; const badge = builderBadge(m.referred);
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors">
        {rank !== undefined && <span className="gp-display w-6 shrink-0 text-center text-sm font-bold text-white/25">{rank}</span>}
        <Avatar name={m.name} status={m.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="gp-display font-semibold text-text truncate">{properName(m.name) || "(no name)"}</span>
            <StatusPill status={m.status} />
            <span className="text-[10px] font-mono text-muted">L{m.level}</span>
            {badge && <span title="People brought in" className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold rounded tracking-wider" style={{ color: badge.color, border: `1px solid ${badge.color}55` }}>{badge.label}</span>}
            {dueSoon && <span className="text-[10px] font-mono font-bold text-red">{du! <= 0 ? "DUE NOW" : `DUE ${du}D`}</span>}
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden max-w-[220px]">
            <div className="h-full rounded-full" style={{ width: `${Math.max(8, ((m.referred || 0) / maxRef) * 100)}%`, background: "linear-gradient(90deg,#00FF85,#C9A84C)" }} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="gp-display text-xl font-bold text-gold tabular-nums leading-none">{m.referred}</div>
          <div className="text-[9px] font-mono text-muted uppercase tracking-wider">refs</div>
        </div>
        <div className="shrink-0 flex items-center gap-2"><TextBtn m={m} />{m.phone ? <a href={telHref(m.phone)} className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-mono hover:bg-accent hover:text-bg transition-all">☎</a> : null}</div>
      </div>
    );
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] to-transparent p-4">
        <div className="text-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-1">Your Organization</div>
        <div className="text-sm text-text/90">Track your builders and leaders in one view. Reactivate a leader and their whole team often comes back with them, so the people at risk here are your highest-leverage calls.</div>
      </div>
      <div className="flex gap-3 flex-wrap">
        <StatTile label="Org Size" value={members.length} tone="#F5F5F5" delay={0.02} />
        <StatTile label="Builders" value={builders.length} tone="#00FF85" delay={0.07} />
        <StatTile label="Total Referrals" value={totalRefs} tone="#C9A84C" delay={0.12} />
        <StatTile label="Leaders At Risk" value={atRisk.length} tone="#FF4444" delay={0.17} />
      </div>

      {tree.length > 0 ? (
        <div>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/20 border border-white/[0.06] w-fit mb-3">
            {([["tree", "Org tree"], ["state", "By state"]] as [typeof tab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`gp-display px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${tab === id ? "bg-accent text-bg" : "text-muted hover:text-text"}`}>{label}</button>
            ))}
          </div>
          {tab === "tree" ? (
            <>
              <p className="text-muted text-xs font-mono mb-3">Tap a name to open their downline. The dot shows active, past due, or inactive. "Enrolled" is who they personally brought in, "under" is their whole team.</p>
              <CommunityTree tree={tree} memberByEmail={memberByEmail} />
            </>
          ) : (
            <CommunityStates members={members} tree={tree} />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 text-sm text-text/70">The org tree loads once your One House genealogy has been pulled. Below is what I can show from referral counts in the meantime.</div>
      )}

      {atRisk.length > 0 && (
        <div>
          <h2 className="gp-display text-lg font-bold mb-1">⚠️ Leaders to watch</h2>
          <p className="text-muted text-xs font-mono mb-3">Builders who are past due, inactive, or billing soon. Save these first, you save their downline too.</p>
          <div className="rounded-2xl border border-red/20 bg-gradient-to-b from-red/[0.04] to-transparent overflow-hidden">
            {atRisk.map((m) => <Row key={m.email || m.name} m={m} />)}
          </div>
        </div>
      )}

      <div>
        <h2 className="gp-display text-lg font-bold mb-1">Builder leaderboard</h2>
        <p className="text-muted text-xs font-mono mb-3">Everyone in your org who has brought at least one person in, ranked by referrals.</p>
        <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.025] to-transparent overflow-hidden">
          {builders.length === 0 ? <div className="px-4 py-12 text-center text-muted text-sm">No referrals recorded in your current data.</div> : builders.slice(0, 100).map((m, i) => <Row key={m.email || m.name} m={m} rank={i + 1} />)}
        </div>
      </div>

      <div>
        <h2 className="gp-display text-lg font-bold mb-1">Organization by level</h2>
        <p className="text-muted text-xs font-mono mb-3">Where your business is healthy and where it's leaking. Active vs inactive at each level.</p>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
          {levels.map((l) => {
            const pct = l.total ? (l.active / l.total) * 100 : 0;
            return (
              <div key={l.level} className="flex items-center gap-3">
                <div className="gp-display w-16 shrink-0 text-sm font-semibold text-text/80">Level {l.level}</div>
                <div className="flex-1 h-6 rounded-lg bg-red/15 overflow-hidden relative">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="h-full bg-accent/30" />
                  <div className="absolute inset-0 flex items-center justify-between px-2.5 text-[11px] font-mono">
                    <span className="text-accent font-bold">{l.active} active</span>
                    <span className="text-red/80">{l.inactive} inactive</span>
                  </div>
                </div>
                <div className="w-10 shrink-0 text-right text-[11px] font-mono text-muted">{Math.round(pct)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-[11px] font-mono text-muted/70">Tip: a true sponsor-by-sponsor downline tree needs the referrer link captured in the data pull. Say the word and I'll add it so this can show exactly whose personal team is slipping.</p>
    </motion.div>
  );
}

const auroraCss = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
.gp-display{font-family:'Space Grotesk',ui-sans-serif,system-ui,-apple-system,sans-serif;font-feature-settings:'tnum' 1,'ss01' 1}
.gp-num{font-variant-numeric:tabular-nums;letter-spacing:-.01em}
/* Premium layered base — deep obsidian with a faint emerald/gold wash for depth */
.gp-root{background:
  radial-gradient(130% 78% at 50% -14%, rgba(0,255,133,.055), transparent 52%),
  radial-gradient(90% 60% at 102% 2%, rgba(201,168,76,.05), transparent 48%),
  radial-gradient(80% 60% at -5% 8%, rgba(0,255,133,.035), transparent 50%),
  linear-gradient(180deg,#070B0A 0%, #06090B 55%, #04070A 100%);}
/* film grain for a crafted, non-flat surface */
.gp-grain::after{content:"";position:fixed;inset:0;z-index:1;pointer-events:none;opacity:.04;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
/* Premium glass card: top-edge highlight, hairline gradient ring, ambient depth shadow */
.gp-card{position:relative;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.014));border:1px solid rgba(255,255,255,.07);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 22px 44px -26px rgba(0,0,0,.85),0 2px 6px -2px rgba(0,0,0,.5);backdrop-filter:blur(14px) saturate(135%);-webkit-backdrop-filter:blur(14px) saturate(135%)}
.gp-card::after{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;background:linear-gradient(135deg,rgba(255,255,255,.16),transparent 38%,transparent 72%,rgba(0,255,133,.14));-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;opacity:.8}
.gp-card-gold::after{background:linear-gradient(135deg,rgba(243,226,166,.3),transparent 42%,transparent 70%,rgba(201,168,76,.18))}
/* Title: cool white with the faintest emerald fall-off */
.gp-title{background:linear-gradient(176deg,#ffffff 0%,#eafff6 55%,rgba(0,255,133,.82) 150%);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:-.035em}
/* Brushed metallic gold for money/goal numerals */
.gp-metal{background:linear-gradient(176deg,#F7E8B0 0%,#E4C878 45%,#B8923D 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
/* Active nav: inner glow rail + emerald wash */
.gp-navon{position:relative;background:linear-gradient(90deg,rgba(0,255,133,.15),rgba(0,255,133,.03));border:1px solid rgba(0,255,133,.3);box-shadow:0 0 26px -8px rgba(0,255,133,.55),inset 0 1px 0 rgba(255,255,255,.06)}
.gp-navon::before{content:"";position:absolute;left:-1px;top:16%;bottom:16%;width:3px;border-radius:0 3px 3px 0;background:#00FF85;box-shadow:0 0 12px #00FF85}
/* Premium mobile tab bar */
.gp-tabbar{background:linear-gradient(180deg,rgba(11,16,15,.72),rgba(5,8,9,.95));backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);border-top:1px solid rgba(255,255,255,.08);box-shadow:0 -18px 44px -22px rgba(0,0,0,.9)}
.gp-tabon{color:#00FF85}
.gp-tabon .gp-tabdot{position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:26px;height:3px;border-radius:3px;background:#00FF85;box-shadow:0 0 12px #00FF85}
.gp-aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.gp-aurora::before,.gp-aurora::after{content:"";position:absolute;width:62vmax;height:62vmax;border-radius:50%;filter:blur(96px);opacity:.13}
.gp-aurora::before{background:radial-gradient(circle,#00FF85,transparent 60%);top:-22vmax;left:-12vmax;animation:gpDrift1 24s ease-in-out infinite}
.gp-aurora::after{background:radial-gradient(circle,#E4C878,transparent 60%);bottom:-26vmax;right:-16vmax;animation:gpDrift2 30s ease-in-out infinite}
@keyframes gpDrift1{0%,100%{transform:translate(0,0)}50%{transform:translate(12vmax,8vmax)}}
@keyframes gpDrift2{0%,100%{transform:translate(0,0)}50%{transform:translate(-10vmax,-6vmax)}}
.gp-grid{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:46px 46px;mask-image:radial-gradient(ellipse at 50% 0%,#000 0%,transparent 72%)}
.gp-vignette{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(130% 85% at 50% -12%, rgba(0,255,133,.06), transparent 52%)}
@media(prefers-reduced-motion:reduce){.gp-aurora::before,.gp-aurora::after{animation:none}}
/* Phones: kill the constant heavy-blur repaint so taps + scrolling stay snappy */
@media(max-width:1023px){.gp-aurora::before,.gp-aurora::after{animation:none;filter:blur(48px);opacity:.1}.gp-grid{display:none}.gp-grain::after{opacity:.03}}
`;
