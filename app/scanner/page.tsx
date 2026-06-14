"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type Signal = "all" | "breakout" | "momentum" | "reversal" | "setup";

const FILTERS: Signal[] = ["all","breakout","momentum","reversal","setup"];

function VolumeBar({ level }: { level: string }) {
  const w = level === "HI" ? "100%" : level === "MD" ? "55%" : "25%";
  return (
    <div className="w-16 h-1.5 bg-surface2 rounded-full overflow-hidden">
      <div className="h-full bg-accent rounded-full transition-all" style={{ width: w }} />
    </div>
  );
}

export default function ScannerPage() {
  const [tier, setTier] = useState<string>("member");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState<Signal>("all");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data: profile } = await supabase.from("users").select("tier,scanner_access").eq("id", user.id).single();
      const t = profile?.tier || "member";
      setTier(t);
      if (t === "member") { setShowUpgrade(true); setLoading(false); return; }
      fetchAlerts(filter);
    })();
  }, []);

  const fetchAlerts = useCallback(async (sig: Signal) => {
    try {
      const supabase = createClient();
      let query = supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(50);
      if (sig !== "all") query = query.eq("signal_type", sig.toUpperCase());
      const { data } = await query;
      setAlerts(data || []);
      setLastUpdate(new Date());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tier === "member") return;
    fetchAlerts(filter);
    const id = setInterval(() => fetchAlerts(filter), 15000);
    return () => clearInterval(id);
  }, [filter, tier]);

  const filteredAlerts = filter === "all" ? alerts : alerts.filter(a => a.signal_type?.toLowerCase() === filter);

  return (
    <div className="min-h-screen bg-bg pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-mono text-lg font-bold text-text tracking-widest uppercase">
                Greenprint Scanner
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent pulse-dot" />
                <span className="font-mono text-[10px] text-accent uppercase tracking-widest">Live</span>
              </div>
              <span className="font-mono text-[10px] text-muted">
                {lastUpdate.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",second:"2-digit"})}
              </span>
            </div>
            <p className="text-[10px] text-muted">
              Signals are generated for educational purposes only. Not a recommendation to buy or sell. Always do your own research.
            </p>
          </div>
          <Link href="/dashboard"><Button variant="ghost" size="sm">← Dashboard</Button></Link>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap mb-5">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[11px] font-mono tracking-wider uppercase rounded-btn border transition-all ${
                filter === f
                  ? "bg-accent text-bg border-accent"
                  : "bg-transparent text-muted border-border hover:border-border/80 hover:text-text"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table / upgrade overlay */}
        <div className="relative bg-surface border border-border rounded-card overflow-hidden">
          {showUpgrade && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="text-center px-6">
                <div className="text-4xl mb-4 text-accent">⚡</div>
                <h3 className="text-lg font-bold text-text mb-2">Scanner is a Trader feature.</h3>
                <p className="text-sm text-muted mb-6">Upgrade to unlock real-time signals.</p>
                <Link href="/join">
                  <Button fullWidth className="mb-3">Upgrade to Trader — $97/mo →</Button>
                </Link>
                <Link href="/join">
                  <Button variant="ghost" fullWidth>View Plans →</Button>
                </Link>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["TICKER","SIGNAL","CHANGE","VOLUME","TIME"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] text-muted tracking-widest font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                  {loading ? (
                    Array.from({length:8}).map((_,i) => (
                      <tr key={i} className="border-b border-border/50">
                        {Array.from({length:5}).map((_,j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-3 bg-surface2 rounded animate-pulse" style={{width:`${40+j*15}%`}} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredAlerts.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">No signals for this filter.</td></tr>
                  ) : (
                    filteredAlerts.map((a, i) => (
                      <>
                        <tr key={a.id}
                          onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                          className="border-b border-border/50 cursor-pointer hover:bg-surface2 transition-colors"
                        >
                          <td className="px-4 py-3 font-bold text-text">{a.ticker}</td>
                          <td className="px-4 py-3"><Badge variant={a.signal_type?.toLowerCase() as any}>{a.signal_type}</Badge></td>
                          <td className={`px-4 py-3 ${a.direction === "bullish" ? "text-accent" : "text-red"}`}>
                            {a.direction === "bullish" ? "+" : ""}{a.change_percent}%
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <VolumeBar level={a.volume_level || "MD"} />
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {new Date(a.created_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}
                          </td>
                        </tr>
                        {expanded === a.id && (
                          <tr key={a.id+"exp"} className="bg-surface2 border-b border-border/50">
                            <td colSpan={5} className="px-4 py-3">
                              <p className="text-muted text-xs leading-relaxed mb-1">{a.message || "No additional details."}</p>
                              <p className="text-[9px] text-muted/60">Educational only. Not financial advice.</p>
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
            <p className="text-[10px] text-muted font-mono">Refreshing live — Last update: {lastUpdate.toLocaleTimeString()}</p>
          </div>
        </div>
        <p className="text-[9px] text-muted text-center mt-3">
          For educational purposes only. Not a recommendation to buy or sell.
        </p>
      </div>
    </div>
  );
}
