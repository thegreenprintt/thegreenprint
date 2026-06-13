"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data } = await supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(100);
      setAlerts(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text">Alerts Feed</h1>
            <p className="text-xs text-muted mt-1">All trade alerts from Jay. For educational purposes only.</p>
          </div>
          <Link href="/dashboard"><Button variant="ghost" size="sm">← Dashboard</Button></Link>
        </div>
        <div className="bg-surface border border-border rounded-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center"><div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin mx-auto" /></div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">No alerts yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map(a => (
                <div key={a.id} className="px-4 py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-sm font-bold text-text">{a.ticker}</span>
                    <Badge variant={a.signal_type?.toLowerCase() as any}>{a.signal_type}</Badge>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-mono text-sm ${a.direction === "bullish" ? "text-accent" : "text-red"}`}>
                      {a.direction === "bullish" ? "+" : ""}{a.change_percent}%
                    </p>
                    <p className="font-mono text-[10px] text-muted">
                      {new Date(a.created_at).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}
                    </p>
                    <p className="text-[9px] text-muted/50 mt-1">Educational only.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
