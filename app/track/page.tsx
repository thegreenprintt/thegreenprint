"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

/* ───────────────────────────────────────────────────────────────────────────
   /track — private business command center (One House book of business)
   Reads the nightly snapshot from /api/chat?kind=track. Passcode-gated.
   Only someone with the passcode sees any data.
   ─────────────────────────────────────────────────────────────────────────── */

type Status = "active" | "inactive" | "lapsed";

interface Member {
  name: string;
  email: string;
  phone: string;      // "" when unknown
  level: number;
  status: Status;
  amount: number;     // current/last plan amount
  nextDue: string | null; // ISO date for active members' next renewal
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
  const d = new Date(ms);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function telHref(phone: string): string {
  const d = (phone || "").replace(/[^\d+]/g, "");
  return "tel:" + d;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / DAY);
}

function StatTile({ label, value, tone }: { label: string; value: number | string; tone?: "accent" | "red" | "gold" | "muted" }) {
  const color =
    tone === "accent" ? "text-accent" : tone === "red" ? "text-red" : tone === "gold" ? "text-gold" : "text-text";
  return (
    <div className="bg-surface border border-border rounded-card p-4 flex-1 min-w-[120px]">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">{label}</div>
      <div className={`text-3xl font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    active: "bg-accent text-bg",
    inactive: "bg-surface2 text-muted border border-border",
    lapsed: "bg-red/20 text-red border border-red/40",
  };
  const label = status === "active" ? "ACTIVE" : status === "lapsed" ? "LAPSED" : "INACTIVE";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded ${map[status]}`}>
      {label}
    </span>
  );
}

function MemberRow({ m }: { m: Member }) {
  const du = daysUntil(m.nextDue);
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-surface2/40 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-text truncate">{m.name || "(no name)"}</span>
          <StatusPill status={m.status} />
          <span className="text-[10px] font-mono text-muted">L{m.level}</span>
          {m.amount > 0 && <span className="text-[10px] font-mono text-gold">${m.amount}</span>}
          {du !== null && du <= 7 && (
            <span className="text-[10px] font-mono text-red">
              {du <= 0 ? "DUE NOW" : `due in ${du}d`}
            </span>
          )}
        </div>
        <div className="text-xs text-muted truncate font-mono">{m.email}</div>
      </div>
      <div className="shrink-0 text-right">
        {m.phone ? (
          <a
            href={telHref(m.phone)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-btn bg-accent/10 border border-accent/40 text-accent text-xs font-mono font-semibold hover:bg-accent hover:text-bg transition-colors"
          >
            ☎ {m.phone}
          </a>
        ) : (
          <span className="text-[11px] font-mono text-muted">no phone</span>
        )}
      </div>
    </div>
  );
}

export default function TrackPage() {
  const [pass, setPass] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [authed, setAuthed] = useState(false);

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"due" | "inactive" | "active" | "all">("due");
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/chat?kind=track&key=${encodeURIComponent(key)}&t=${Date.now()}`);
      if (res.status === 403) {
        setErr("Wrong passcode.");
        setAuthed(false);
        setLoading(false);
        return;
      }
      const j = await res.json();
      setSnap(j.snapshot || null);
      setAuthed(true);
      try { localStorage.setItem(LS_KEY, key); } catch {}
    } catch (e) {
      setErr("Could not reach the server. Try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let k = "";
    try { k = localStorage.getItem(LS_KEY) || ""; } catch {}
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
    const s = new Set<number>();
    members.forEach((m) => s.add(m.level));
    return Array.from(s).sort((a, b) => a - b);
  }, [members]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = members.filter((m) => {
      if (levelFilter !== "all" && m.level !== levelFilter) return false;
      if (tab === "active" && m.status !== "active") return false;
      if (tab === "inactive" && m.status === "active") return false; // inactive + lapsed
      if (tab === "due") {
        const du = daysUntil(m.nextDue);
        if (!(m.status === "active" && du !== null && du <= 7)) return false;
      }
      if (needle) {
        const hay = (m.name + " " + m.email + " " + m.phone).toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    // sort: phone-havers first, then by next-due soonest, then name
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
      <main className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-accent font-mono text-xs tracking-[0.3em] uppercase mb-2">The Greenprint</div>
            <h1 className="text-2xl font-bold text-text">Business Tracker</h1>
            <p className="text-muted text-sm mt-1">Private. Enter your passcode.</p>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); if (input) { setPass(input); load(input); } }}
            className="bg-surface border border-border rounded-card p-5 space-y-3"
          >
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Passcode"
              autoFocus
              className="w-full bg-bg border border-border rounded-inp px-3 py-2.5 text-text font-mono text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading || !input}
              className="w-full bg-accent text-bg font-semibold rounded-btn py-2.5 text-sm disabled:opacity-50 transition-opacity"
            >
              {loading ? "Checking…" : "Unlock"}
            </button>
            {err && <div className="text-red text-xs font-mono text-center">{err}</div>}
          </form>
        </div>
      </main>
    );
  }

  /* ── Dashboard ─────────────────────────────────────────────────────────── */
  const tabs: { id: typeof tab; label: string; n: number }[] = [
    { id: "due", label: "Due This Week", n: counts.due },
    { id: "inactive", label: "Inactive", n: counts.inactive + counts.lapsed },
    { id: "active", label: "Active", n: counts.active },
    { id: "all", label: "Everyone", n: counts.total },
  ];

  return (
    <main className="min-h-screen bg-bg text-text pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="pt-8 pb-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-accent font-mono text-xs tracking-[0.3em] uppercase mb-1">The Greenprint</div>
            <h1 className="text-2xl sm:text-3xl font-bold">Business Tracker</h1>
            <p className="text-muted text-xs font-mono mt-1">
              Last refreshed: {snap ? fmtWhen(snap.updatedAt) : "never"}
              {snap?.source ? ` · ${snap.source}` : ""}
            </p>
          </div>
          <button
            onClick={() => load(pass)}
            disabled={loading}
            className="px-4 py-2 rounded-btn border border-border text-xs font-mono hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>

        {/* Stat tiles */}
        <div className="flex gap-3 flex-wrap mb-5">
          <StatTile label="Active" value={counts.active} tone="accent" />
          <StatTile label="Inactive" value={counts.inactive + counts.lapsed} tone="muted" />
          <StatTile label="Due ≤ 7 days" value={counts.due} tone="red" />
          <StatTile label="Have Phone" value={counts.withPhone} tone="gold" />
          <StatTile label="Total" value={counts.total} />
        </div>

        {!snap && (
          <div className="bg-surface border border-border rounded-card p-8 text-center">
            <div className="text-text font-semibold mb-1">No snapshot yet</div>
            <div className="text-muted text-sm">The first nightly refresh will fill this in. Check back after midnight, or run a manual refresh from your session.</div>
          </div>
        )}

        {snap && (
          <>
            {/* Tabs */}
            <div className="flex gap-2 flex-wrap mb-3">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-btn text-xs font-mono transition-colors border ${
                    tab === t.id ? "bg-accent text-bg border-accent font-bold" : "border-border text-muted hover:text-text"
                  }`}
                >
                  {t.label} <span className="opacity-70">({t.n})</span>
                </button>
              ))}
            </div>

            {/* Search + level filter */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, phone…"
                className="flex-1 min-w-[180px] bg-surface border border-border rounded-inp px-3 py-2 text-sm font-mono outline-none focus:border-accent"
              />
              <select
                value={String(levelFilter)}
                onChange={(e) => setLevelFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="bg-surface border border-border rounded-inp px-3 py-2 text-sm font-mono outline-none focus:border-accent text-text"
              >
                <option value="all">All levels</option>
                {levels.map((l) => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>

            {/* List */}
            <div className="bg-surface border border-border rounded-card overflow-hidden">
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-muted text-sm">Nobody here right now.</div>
              ) : (
                filtered.map((m, i) => <MemberRow key={m.email || i} m={m} />)
              )}
            </div>

            <div className="text-center text-[11px] font-mono text-muted mt-3">
              Showing {filtered.length} of {counts.total}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
