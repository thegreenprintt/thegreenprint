"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

/* ───────────────────────────────────────────────────────────────────────────
   /track — private business command center (One House book of business)
   Reads the nightly snapshot from /api/chat?kind=track. Passcode-gated.
   Built for one job: reach inactives, and catch members before they lapse.
   ─────────────────────────────────────────────────────────────────────────── */

type Status = "active" | "inactive" | "lapsed";

interface Member {
  name: string;
  email: string;
  phone: string;
  level: number;
  status: Status;
  amount: number;
  nextDue: string | null;
  referred: number;
}
interface Snapshot {
  updatedAt: number;
  source: string;
  counts: Record<string, number>;
  members: Member[];
}

const LS_KEY = "gp_track_key";
const DAY = 86400000;

function fmtWhen(ms: number): string {
  if (!ms) return "never";
  return new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function telHref(phone: string): string { return "tel:" + (phone || "").replace(/[^\d+]/g, ""); }
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / DAY);
}
function initials(name: string): string {
  const p = (name || "?").trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

/* animated number count-up */
function useCountUp(target: number, ms = 900) {
  const [n, setN] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const from = ref.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (target - from) * eased);
      setN(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else ref.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

function StatTile({ label, value, tone, delay }: { label: string; value: number; tone: string; delay: number }) {
  const n = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex-1 min-w-[108px] overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-4 backdrop-blur"
    >
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tone}, transparent)` }} />
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted mb-2">{label}</div>
      <div className="text-[34px] leading-none font-mono font-bold tabular-nums" style={{ color: tone }}>{n}</div>
    </motion.div>
  );
}

function Avatar({ name, status }: { name: string; status: Status }) {
  const ring = status === "active" ? "#00FF85" : status === "lapsed" ? "#FF4444" : "#3a3a3a";
  return (
    <div className="relative shrink-0">
      <div className="h-10 w-10 rounded-full grid place-items-center font-mono text-xs font-bold text-text/90 bg-surface2 border border-white/[0.06]">
        {initials(name)}
      </div>
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
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-mono font-bold tracking-[0.14em] rounded-md" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function MemberRow({ m, i }: { m: Member; i: number }) {
  const du = daysUntil(m.nextDue);
  const dueSoon = du !== null && du <= 7;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.012, 0.35), duration: 0.35 }}
      className="group relative flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors"
    >
      {dueSoon && <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-red" />}
      <Avatar name={m.name} status={m.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-text truncate">{m.name || "(no name)"}</span>
          <StatusPill status={m.status} />
          <span className="text-[10px] font-mono text-muted">L{m.level}</span>
          {m.amount > 0 && <span className="text-[10px] font-mono text-gold">${m.amount}</span>}
          {dueSoon && (
            <span className="text-[10px] font-mono font-bold text-red">
              {du! <= 0 ? "DUE NOW" : `DUE ${du}D`}
            </span>
          )}
        </div>
        <div className="text-xs text-muted truncate font-mono">{m.email}</div>
      </div>
      <div className="shrink-0">
        {m.phone ? (
          <a
            href={telHref(m.phone)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-semibold hover:bg-accent hover:text-bg transition-all hover:shadow-[0_0_20px_rgba(0,255,133,0.35)]"
          >
            <span className="text-sm">☎</span> {m.phone}
          </a>
        ) : (
          <span className="text-[10px] font-mono text-muted/70 pr-1">no number</span>
        )}
      </div>
    </motion.div>
  );
}

export default function TrackPage() {
  const [pass, setPass] = useState("");
  const [input, setInput] = useState("");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [authed, setAuthed] = useState(false);

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"due" | "inactive" | "active" | "all">("inactive");
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");

  const load = useCallback(async (key: string) => {
    setLoading(true); setErr("");
    try {
      const res = await fetch(`/api/chat?kind=track&key=${encodeURIComponent(key)}&t=${Date.now()}`);
      if (res.status === 403) { setErr("Wrong passcode."); setAuthed(false); setLoading(false); return; }
      const j = await res.json();
      setSnap(j.snapshot || null); setAuthed(true);
      try { localStorage.setItem(LS_KEY, key); } catch {}
    } catch { setErr("Could not reach the server."); }
    setLoading(false);
  }, []);

  useEffect(() => {
    let k = ""; try { k = localStorage.getItem(LS_KEY) || ""; } catch {}
    if (k) { setPass(k); load(k); }
  }, [load]);

  const members = snap?.members || [];

  const counts = useMemo(() => {
    let active = 0, inactive = 0, lapsed = 0, due = 0, withPhone = 0;
    for (const m of members) {
      if (m.status === "active") active++;
      else if (m.status === "lapsed") lapsed++;
      else inactive++;
      const du = daysUntil(m.nextDue);
      if (m.status === "active" && du !== null && du <= 7) due++;
      if (m.phone) withPhone++;
    }
    return { active, inactive, lapsed, due, withPhone, total: members.length };
  }, [members]);

  const levels = useMemo(() => {
    const s = new Set<number>(); members.forEach((m) => s.add(m.level));
    return Array.from(s).sort((a, b) => a - b);
  }, [members]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = members.filter((m) => {
      if (levelFilter !== "all" && m.level !== levelFilter) return false;
      if (tab === "active" && m.status !== "active") return false;
      if (tab === "inactive" && m.status === "active") return false;
      if (tab === "due") { const du = daysUntil(m.nextDue); if (!(m.status === "active" && du !== null && du <= 7)) return false; }
      if (needle) { if (!(m.name + " " + m.email + " " + m.phone).toLowerCase().includes(needle)) return false; }
      return true;
    });
    list = list.slice().sort((a, b) => {
      if (!!b.phone !== !!a.phone) return (b.phone ? 1 : 0) - (a.phone ? 1 : 0);
      const da = daysUntil(a.nextDue), db = daysUntil(b.nextDue);
      if (da !== null && db !== null && da !== db) return da - db;
      return (a.name || "").localeCompare(b.name || "");
    });
    return list;
  }, [members, q, tab, levelFilter]);

  /* ── Passcode gate ─────────────────────────────────────────────────────── */
  if (!authed) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 50% at 50% 0%, rgba(0,255,133,0.08), transparent 70%)" }} />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm relative">
          <div className="text-center mb-6">
            <div className="text-accent font-mono text-[11px] tracking-[0.35em] uppercase mb-2">The Greenprint</div>
            <h1 className="text-3xl font-bold text-text tracking-tight">Business Tracker</h1>
            <p className="text-muted text-sm mt-2">Private. Enter your passcode.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (input) { setPass(input); load(input); } }}
            className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent p-5 space-y-3 backdrop-blur">
            <input type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Passcode" autoFocus
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-text font-mono text-sm outline-none focus:border-accent transition-colors" />
            <button type="submit" disabled={loading || !input}
              className="w-full bg-accent text-bg font-bold rounded-xl py-3 text-sm disabled:opacity-40 hover:shadow-[0_0_24px_rgba(0,255,133,0.4)] transition-all">
              {loading ? "Checking…" : "Unlock"}
            </button>
            {err && <div className="text-red text-xs font-mono text-center">{err}</div>}
          </form>
        </motion.div>
      </main>
    );
  }

  const tabs: { id: typeof tab; label: string; n: number }[] = [
    { id: "inactive", label: "Inactive", n: counts.inactive + counts.lapsed },
    { id: "due", label: "Due This Week", n: counts.due },
    { id: "active", label: "Active", n: counts.active },
    { id: "all", label: "Everyone", n: counts.total },
  ];

  return (
    <main className="min-h-screen bg-bg text-text pb-28 relative">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: "radial-gradient(70% 40% at 50% -5%, rgba(0,255,133,0.06), transparent 60%)" }} />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="pt-9 pb-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-accent font-mono text-[11px] tracking-[0.3em] uppercase">The Greenprint</span>
            </div>
            <h1 className="text-[28px] sm:text-4xl font-bold tracking-tight">Business Tracker</h1>
            <p className="text-muted text-xs font-mono mt-1.5">
              Last refreshed {snap ? fmtWhen(snap.updatedAt) : "never"}{snap?.source ? ` · ${snap.source}` : ""}
            </p>
          </div>
          <button onClick={() => load(pass)} disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-mono hover:border-accent hover:text-accent transition-colors disabled:opacity-50 flex items-center gap-2">
            <span className={loading ? "inline-block animate-spin" : "inline-block"}>↻</span> {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>

        {/* Stat tiles */}
        <div className="flex gap-3 flex-wrap mb-6">
          <StatTile label="Inactive" value={counts.inactive + counts.lapsed} tone="#8a8a8a" delay={0.02} />
          <StatTile label="Due ≤ 7 Days" value={counts.due} tone="#FF4444" delay={0.07} />
          <StatTile label="Active" value={counts.active} tone="#00FF85" delay={0.12} />
          <StatTile label="Have Phone" value={counts.withPhone} tone="#C9A84C" delay={0.17} />
          <StatTile label="Total" value={counts.total} tone="#F5F5F5" delay={0.22} />
        </div>

        {!snap && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center">
            <div className="text-text font-semibold mb-1">No snapshot yet</div>
            <div className="text-muted text-sm">The nightly refresh will fill this in.</div>
          </div>
        )}

        {snap && (
          <>
            {/* Tabs with sliding indicator */}
            <LayoutGroup>
              <div className="flex gap-1.5 flex-wrap mb-4">
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`relative px-3.5 py-2 rounded-xl text-xs font-mono transition-colors ${tab === t.id ? "text-bg" : "text-muted hover:text-text"}`}>
                    {tab === t.id && (
                      <motion.span layoutId="tabbg" className="absolute inset-0 rounded-xl bg-accent" transition={{ type: "spring", stiffness: 450, damping: 35 }} />
                    )}
                    <span className="relative z-10 font-semibold">{t.label} <span className="opacity-70">({t.n})</span></span>
                  </button>
                ))}
              </div>
            </LayoutGroup>

            {/* Search + level */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…"
                className="flex-1 min-w-[180px] bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-accent transition-colors" />
              <select value={String(levelFilter)} onChange={(e) => setLevelFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-accent text-text">
                <option value="all">All levels</option>
                {levels.map((l) => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>

            {/* List */}
            <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.025] to-transparent overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={tab + levelFilter + q} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  {filtered.length === 0 ? (
                    <div className="px-4 py-12 text-center text-muted text-sm">Nobody here right now.</div>
                  ) : (
                    filtered.map((m, i) => <MemberRow key={(m.email || m.name) + i} m={m} i={i} />)
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="text-center text-[11px] font-mono text-muted mt-4">Showing {filtered.length} of {counts.total}</div>
          </>
        )}
      </div>
    </main>
  );
}
