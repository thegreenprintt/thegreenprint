"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

/* ───────────────────────────────────────────────────────────────────────────
   /track — The Greenprint Business Command Center (private)
   A retention platform over the One House book of business.
   - Focus This Week: a scored, ranked lock-in list (who to work + why)
   - Full roster: Due This Week / Inactive / Active / Everyone
   - One-tap reactivation email (Resend), tap-to-call, builder badges
   Reads the nightly snapshot from /api/chat?kind=track. Passcode-gated.
   ─────────────────────────────────────────────────────────────────────────── */

type Status = "active" | "inactive" | "lapsed";
interface Member {
  name: string; email: string; phone: string; level: number;
  status: Status; amount: number; nextDue: string | null; referred: number;
}
interface Goal { earnings: number | null; target: number; perSub: number; deadline: string; }
interface Snapshot { updatedAt: number; source: string; counts: Record<string, number>; members: Member[]; goal?: Goal; }

const LS_KEY = "gp_track_key";
const DAY = 86400000;

const fmtWhen = (ms: number) => (!ms ? "never" : new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));
const telHref = (p: string) => "tel:" + (p || "").replace(/[^\d+]/g, "");
function daysUntil(iso: string | null): number | null { if (!iso) return null; const t = new Date(iso).getTime(); return isNaN(t) ? null : Math.ceil((t - Date.now()) / DAY); }
function initials(n: string) { const p = (n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?"; }
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

function StatTile({ label, value, tone, delay }: { label: string; value: number; tone: string; delay: number }) {
  const n = useCountUp(value);
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex-1 min-w-[104px] overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.05] to-transparent p-4 backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${tone},transparent)` }} />
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted mb-2">{label}</div>
      <div className="text-[32px] leading-none font-mono font-bold tabular-nums" style={{ color: tone }}>{n}</div>
    </motion.div>
  );
}
function Avatar({ name, status, size = 10 }: { name: string; status: Status; size?: number }) {
  const ring = status === "active" ? "#00FF85" : status === "lapsed" ? "#FF4444" : "#3a3a3a";
  return (
    <div className="relative shrink-0">
      <div className={`h-${size} w-${size} rounded-full grid place-items-center font-mono text-xs font-bold text-text/90 bg-surface2 border border-white/[0.06]`} style={{ height: size * 4, width: size * 4 }}>{initials(name)}</div>
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
const TEXT_VOICES: { key: string; label: string; hint: string; build: (f: string) => string }[] = [
  { key: "young", label: "Younger", hint: "high energy", build: (f) => `Yo ${f || "bro"}! It's Jay. How you feeling? Been a minute fr, just wanted to check on you 🙌` },
  { key: "classic", label: "Classic", hint: "warm & respectful", build: (f) => `Hi ${f || "there"}, it's Jay. How are you doing? It's been a little while and I wanted to check in on you.` },
  { key: "casual", label: "Casual", hint: "easy & neutral", build: (f) => `Hey ${f || "there"}, what's up? It's Jay. How you been? Been meaning to reach out and see how you're doing.` },
];
function smsHref(phone: string, msg: string): string {
  const num = (phone || "").replace(/[^\d+]/g, "");
  return `sms:${num}?&body=${encodeURIComponent(msg)}`;
}
function TextBtn({ m }: { m: Member }) {
  const [open, setOpen] = useState(false);
  const phone = m.phone;
  if (!phone) return null;
  const first = (m.name || "").split(" ")[0];
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border text-[11px] font-mono font-semibold transition-all ${open ? "border-accent text-accent" : "border-white/10 text-muted hover:border-accent hover:text-accent"}`}>💬 text</button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} transition={{ duration: 0.15 }}
              className="absolute right-0 bottom-full mb-2 z-50 w-64 rounded-2xl border border-white/10 bg-surface2 shadow-2xl shadow-black/70 overflow-hidden">
              <div className="px-3.5 py-2.5 text-[9px] font-mono uppercase tracking-[0.18em] text-muted border-b border-white/[0.06]">Pick a voice to text {first || ""}</div>
              {TEXT_VOICES.map((v) => (
                <a key={v.key} href={smsHref(phone, v.build(first))} onClick={() => setOpen(false)}
                  className="block px-3.5 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono font-bold text-accent">{v.label}</span>
                    <span className="text-[9px] font-mono text-muted">{v.hint}</span>
                  </div>
                  <div className="text-[11px] text-text/65 leading-snug">{v.build(first)}</div>
                </a>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FocusCard({ m, rank, reasons, emailState, onEmail }: { m: Member; rank: number; reasons: string[]; emailState: EmailState; onEmail: (m: Member) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: Math.min(rank * 0.05, 0.5), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-4 hover:border-gold/40 transition-colors">
      <div className="absolute -left-10 -top-10 h-24 w-24 rounded-full blur-2xl" style={{ background: m.status === "lapsed" ? "rgba(255,68,68,0.18)" : "rgba(201,168,76,0.14)" }} />
      <div className="relative flex items-start gap-3">
        <div className="shrink-0 grid place-items-center h-7 w-7 rounded-lg bg-gold/15 border border-gold/30 text-gold font-mono text-xs font-bold">{rank}</div>
        <Avatar name={m.name} status={m.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text truncate">{m.name || "(no name)"}</span>
            <StatusPill status={m.status} />
            <span className="text-[10px] font-mono text-muted">L{m.level}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {reasons.slice(0, 3).map((r, i) => (
              <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-text/80">{r}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="relative mt-3 flex items-center gap-2 justify-end flex-wrap">
        <EmailBtn m={m} state={emailState} onEmail={onEmail} />
        <TextBtn m={m} />
        <CallBtn phone={m.phone} />
      </div>
    </motion.div>
  );
}

function MemberRow({ m, i, emailState, onEmail }: { m: Member; i: number; emailState: EmailState; onEmail: (m: Member) => void }) {
  const du = daysUntil(m.nextDue); const dueSoon = du !== null && du <= 7; const badge = builderBadge(m.referred);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.01, 0.3), duration: 0.3 }}
      className="group relative flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors">
      {dueSoon && <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-red" />}
      <Avatar name={m.name} status={m.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-text truncate">{m.name || "(no name)"}</span>
          <StatusPill status={m.status} />
          <span className="text-[10px] font-mono text-muted">L{m.level}</span>
          {m.amount > 0 && <span className="text-[10px] font-mono text-gold">${m.amount}</span>}
          {badge && <span title="People brought in, not earnings" className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold rounded tracking-wider" style={{ color: badge.color, border: `1px solid ${badge.color}55` }}>{badge.label}</span>}
          {dueSoon && <span className="text-[10px] font-mono font-bold text-red">{du! <= 0 ? "DUE NOW" : `DUE ${du}D`}</span>}
        </div>
        <div className="text-xs text-muted truncate font-mono">{m.email}</div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <EmailBtn m={m} state={emailState} onEmail={onEmail} />
        <TextBtn m={m} />
        <CallBtn phone={m.phone} />
      </div>
    </motion.div>
  );
}

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
      className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-br from-gold/[0.10] via-white/[0.02] to-transparent p-5 sm:p-6 mb-6">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: "rgba(201,168,76,0.18)" }} />
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
              <div className="text-[64px] sm:text-[80px] leading-none font-mono font-black text-gold tabular-nums">{subsN}</div>
              <div className="text-sm text-text/70 font-mono -mt-1">subscribers to ${ (target/1000) }K</div>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-bold text-text">Goal: ${(target / 1000)}K</div>
              <div className="text-sm text-muted font-mono mt-1">Earnings sync on tonight's refresh</div>
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

type View = "focus" | "due" | "inactive" | "active" | "all";

export default function TrackPage() {
  const [pass, setPass] = useState(""); const [input, setInput] = useState("");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false); const [err, setErr] = useState(""); const [authed, setAuthed] = useState(false);
  const [q, setQ] = useState(""); const [view, setView] = useState<View>("focus"); const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const [emailStates, setEmailStates] = useState<Record<string, EmailState>>({});
  const [msgStyle, setMsgStyle] = useState<MsgStyle>("checkin");

  const load = useCallback(async (key: string) => {
    setLoading(true); setErr("");
    try {
      const res = await fetch(`/api/chat?kind=track&key=${encodeURIComponent(key)}&t=${Date.now()}`);
      if (res.status === 403) { setErr("Wrong passcode."); setAuthed(false); setLoading(false); return; }
      const j = await res.json(); setSnap(j.snapshot || null); setAuthed(true);
      try { localStorage.setItem(LS_KEY, key); } catch {}
    } catch { setErr("Could not reach the server."); }
    setLoading(false);
  }, []);
  useEffect(() => { let k = ""; try { k = localStorage.getItem(LS_KEY) || ""; } catch {} if (k) { setPass(k); load(k); } }, [load]);

  const onEmail = useCallback(async (m: Member) => {
    const key = m.email; const cur = emailStates[key];
    if (cur !== "confirm") { setEmailStates((s) => ({ ...s, [key]: "confirm" })); setTimeout(() => setEmailStates((s) => (s[key] === "confirm" ? { ...s, [key]: "idle" } : s)), 4000); return; }
    setEmailStates((s) => ({ ...s, [key]: "sending" }));
    try {
      const res = await fetch(`/api/chat?kind=track-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: pass, to: m.email, name: (m.name || "").split(" ")[0], style: msgStyle }) });
      const j = await res.json(); setEmailStates((s) => ({ ...s, [key]: j.ok ? "sent" : "error" }));
    } catch { setEmailStates((s) => ({ ...s, [key]: "error" })); }
  }, [emailStates, pass, msgStyle]);

  const members = snap?.members || [];
  const counts = useMemo(() => {
    let active = 0, inactive = 0, lapsed = 0, due = 0, withPhone = 0;
    for (const m of members) { if (m.status === "active") active++; else if (m.status === "lapsed") lapsed++; else inactive++; const du = daysUntil(m.nextDue); if (m.status === "active" && du !== null && du <= 7) due++; if (m.phone) withPhone++; }
    return { active, inactive, lapsed, due, withPhone, total: members.length };
  }, [members]);
  const levels = useMemo(() => { const s = new Set<number>(); members.forEach((m) => s.add(m.level)); return Array.from(s).sort((a, b) => a - b); }, [members]);

  const focus = useMemo(() => {
    return members.map((m) => ({ m, ...score(m) }))
      .filter((x) => x.m.status !== "active" || (daysUntil(x.m.nextDue) !== null && daysUntil(x.m.nextDue)! <= 7))
      .sort((a, b) => b.s - a.s).slice(0, 15);
  }, [members]);

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
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-sm relative z-10">
          <div className="text-center mb-6">
            <div className="text-accent font-mono text-[11px] tracking-[0.35em] uppercase mb-2">The Greenprint</div>
            <h1 className="text-3xl font-bold text-text tracking-tight">Command Center</h1>
            <p className="text-muted text-sm mt-2">Private. Enter your passcode.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (input) { setPass(input); load(input); } }} className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent p-5 space-y-3 backdrop-blur">
            <input type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Passcode" autoFocus className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-text font-mono text-sm outline-none focus:border-accent transition-colors" />
            <button type="submit" disabled={loading || !input} className="w-full bg-accent text-bg font-bold rounded-xl py-3 text-sm disabled:opacity-40 hover:shadow-[0_0_24px_rgba(0,255,133,0.4)] transition-all">{loading ? "Checking…" : "Unlock"}</button>
            {err && <div className="text-red text-xs font-mono text-center">{err}</div>}
          </form>
        </motion.div>
        <style>{auroraCss}</style>
      </main>
    );
  }

  const nav: { id: View; label: string; n: number }[] = [
    { id: "focus", label: "Focus This Week", n: focus.length },
    { id: "due", label: "Due This Week", n: counts.due },
    { id: "inactive", label: "Inactive", n: counts.inactive + counts.lapsed },
    { id: "active", label: "Active", n: counts.active },
    { id: "all", label: "Everyone", n: counts.total },
  ];

  return (
    <main className="min-h-screen bg-bg text-text relative">
      <div className="gp-aurora opacity-60" />
      <div className="relative z-10 lg:flex max-w-7xl mx-auto">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/[0.06] min-h-screen p-5 sticky top-0 self-start">
          <div className="flex items-center gap-2 mb-8">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-accent font-mono text-[11px] tracking-[0.3em] uppercase">The Greenprint</span>
          </div>
          <nav className="space-y-1">
            {nav.map((t) => (
              <button key={t.id} onClick={() => setView(t.id)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-mono flex items-center justify-between transition-colors ${view === t.id ? "bg-accent/15 text-accent border border-accent/30" : "text-muted hover:text-text hover:bg-white/[0.03] border border-transparent"}`}>
                <span>{t.label}</span><span className="opacity-60 text-xs">{t.n}</span>
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-6 text-[10px] font-mono text-muted leading-relaxed">
            Last refresh<br />{snap ? fmtWhen(snap.updatedAt) : "never"}
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 px-4 sm:px-6 pb-28">
          {/* Header */}
          <div className="pt-8 pb-5 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[26px] sm:text-4xl font-bold tracking-tight">{nav.find((n) => n.id === view)?.label}</h1>
              <p className="text-muted text-xs font-mono mt-1.5">{view === "focus" ? "Your ranked lock-in list, work top to bottom" : `Last refreshed ${snap ? fmtWhen(snap.updatedAt) : "never"}`}{snap?.source ? ` · ${snap.source}` : ""}</p>
            </div>
            <button onClick={() => load(pass)} disabled={loading} className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-mono hover:border-accent hover:text-accent transition-colors disabled:opacity-50 flex items-center gap-2"><span className={loading ? "inline-block animate-spin" : "inline-block"}>↻</span>{loading ? "Refreshing" : "Refresh"}</button>
          </div>

          {/* Goal tracker */}
          {snap && <GoalPanel goal={snap.goal} />}

          {/* Stat tiles */}
          <div className="flex gap-3 flex-wrap mb-6">
            <StatTile label="Inactive" value={counts.inactive + counts.lapsed} tone="#8a8a8a" delay={0.02} />
            <StatTile label="Due ≤ 7 Days" value={counts.due} tone="#FF4444" delay={0.07} />
            <StatTile label="Active" value={counts.active} tone="#00FF85" delay={0.12} />
            <StatTile label="Have Phone" value={counts.withPhone} tone="#C9A84C" delay={0.17} />
            <StatTile label="Total" value={counts.total} tone="#F5F5F5" delay={0.22} />
          </div>

          {/* Mobile nav chips */}
          <LayoutGroup>
            <div className="lg:hidden flex gap-1.5 flex-wrap mb-5 overflow-x-auto">
              {nav.map((t) => (
                <button key={t.id} onClick={() => setView(t.id)} className={`relative px-3 py-2 rounded-xl text-xs font-mono whitespace-nowrap transition-colors ${view === t.id ? "text-bg" : "text-muted"}`}>
                  {view === t.id && <motion.span layoutId="navchip" className="absolute inset-0 rounded-xl bg-accent" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}
                  <span className="relative z-10 font-semibold">{t.label} <span className="opacity-70">({t.n})</span></span>
                </button>
              ))}
            </div>
          </LayoutGroup>

          {!snap && <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center"><div className="text-text font-semibold mb-1">No snapshot yet</div><div className="text-muted text-sm">The nightly refresh will fill this in.</div></div>}

          {snap && (
            <div className="mb-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-0.5">Email tone <span className="text-text/30">· texts pick their own voice</span></div>
                  <div className="text-[11px] text-text/70">
                    {msgStyle === "checkin" ? "Pure check-in. No pitch, just \"how are you.\"" : msgStyle === "nudge" ? "Warm check-in that mentions the room's momentum." : "Invite them back with your sign-up link."}
                  </div>
                </div>
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
            </div>
          )}

          {/* FOCUS VIEW */}
          {snap && view === "focus" && (
            <AnimatePresence mode="wait">
              <motion.div key="focus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.06] to-transparent p-4 mb-5">
                  <div className="text-gold font-mono text-[11px] tracking-[0.2em] uppercase mb-1">This Week's Mission</div>
                  <div className="text-sm text-text/90">These {focus.length} are your highest-impact calls this week: past-due first, then people billing soon, then builders whose downline you reactivate with them. Lock them in.</div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {focus.map((f, i) => <FocusCard key={f.m.email || i} m={f.m} rank={i + 1} reasons={f.reasons} emailState={emailStates[f.m.email] || "idle"} onEmail={onEmail} />)}
                </div>
                {focus.length === 0 && <div className="text-center text-muted text-sm py-10">Nothing urgent this week. Everyone's current.</div>}
              </motion.div>
            </AnimatePresence>
          )}

          {/* LIST VIEWS */}
          {snap && view !== "focus" && (
            <>
              <div className="flex gap-2 mb-4 flex-wrap">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className="flex-1 min-w-[180px] bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-accent transition-colors" />
                <select value={String(levelFilter)} onChange={(e) => setLevelFilter(e.target.value === "all" ? "all" : Number(e.target.value))} className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-accent text-text">
                  <option value="all">All levels</option>{levels.map((l) => <option key={l} value={l}>Level {l}</option>)}
                </select>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.025] to-transparent overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div key={view + String(levelFilter) + q} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    {list.length === 0 ? <div className="px-4 py-12 text-center text-muted text-sm">Nobody here right now.</div> : list.map((m, i) => <MemberRow key={(m.email || m.name) + i} m={m} i={i} emailState={emailStates[m.email] || "idle"} onEmail={onEmail} />)}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="text-center text-[11px] font-mono text-muted mt-4">Showing {list.length} of {counts.total} · badges reflect people brought in, not earnings</div>
            </>
          )}
        </div>
      </div>
      <style>{auroraCss}</style>
    </main>
  );
}

const auroraCss = `
.gp-aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.gp-aurora::before,.gp-aurora::after{content:"";position:absolute;width:60vmax;height:60vmax;border-radius:50%;filter:blur(90px);opacity:.14}
.gp-aurora::before{background:radial-gradient(circle,#00FF85,transparent 60%);top:-20vmax;left:-10vmax;animation:gpDrift1 22s ease-in-out infinite}
.gp-aurora::after{background:radial-gradient(circle,#C9A84C,transparent 60%);bottom:-25vmax;right:-15vmax;animation:gpDrift2 28s ease-in-out infinite}
@keyframes gpDrift1{0%,100%{transform:translate(0,0)}50%{transform:translate(12vmax,8vmax)}}
@keyframes gpDrift2{0%,100%{transform:translate(0,0)}50%{transform:translate(-10vmax,-6vmax)}}
@media(prefers-reduced-motion:reduce){.gp-aurora::before,.gp-aurora::after{animation:none}}
`;
