"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function MarketCountdown() {
  const [display, setDisplay] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function update() {
      const now = new Date();
      const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const day = est.getDay();
      const h = est.getHours(), m = est.getMinutes(), s = est.getSeconds();
      const open = h === 9 && m >= 30 || h > 9 && h < 16;
      const weekend = day === 0 || day === 6;
      if (weekend) { setDisplay("Market closed — weekend"); setIsOpen(false); return; }
      if (open) { setDisplay("Market is open"); setIsOpen(true); return; }
      if (h >= 16) {
        const tomorrow = new Date(est);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 30, 0, 0);
        const diff = Math.floor((tomorrow.getTime() - est.getTime()) / 1000);
        const hh = Math.floor(diff/3600), mm = Math.floor((diff%3600)/60), ss = diff%60;
        setDisplay(`Opens in ${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`);
      } else {
        const open930 = new Date(est); open930.setHours(9,30,0,0);
        const diff = Math.floor((open930.getTime() - est.getTime()) / 1000);
        const hh = Math.floor(diff/3600), mm = Math.floor((diff%3600)/60), ss = diff%60;
        setDisplay(`Opens in ${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`);
      }
      setIsOpen(false);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {isOpen && <span className="w-2 h-2 rounded-full bg-accent pulse-dot inline-block" />}
      <span className="font-mono text-xs text-muted">{display}</span>
    </div>
  );
}

function Sidebar({ name, tier }: { name: string; tier: string }) {
  const links = [
    { label: "Dashboard", href: "/dashboard", icon: "⊞" },
    { label: "Scanner", href: "/scanner", icon: "◈" },
    { label: "Watch Live", href: "/stream", icon: "◉" },
    { label: "Alerts", href: "/alerts", icon: "⚡" },
  ];
  return (
    <aside className="hidden lg:flex flex-col w-56 bg-surface border-r border-border min-h-screen fixed left-0 top-0">
      <div className="p-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-accent rounded flex items-center justify-center">
            <span className="text-bg font-black text-xs">GP</span>
          </div>
          <span className="font-bold text-xs tracking-widest uppercase text-text">Greenprint</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-btn text-xs text-muted hover:text-text hover:bg-surface2 transition-colors">
            <span className="text-base">{l.icon}</span>{l.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-1">
        <Link href="/dashboard/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-btn text-xs text-muted hover:text-text hover:bg-surface2 transition-colors">
          <span>○</span> Profile
        </Link>
        {tier !== "elite" && (
          <Link href="/join"
            className="flex items-center gap-3 px-3 py-2.5 rounded-btn text-xs text-gold hover:text-gold/80 hover:bg-gold/5 transition-colors">
            <span>⚡</span> Upgrade
          </Link>
        )}
        <div className="px-3 pt-2">
          <p className="font-mono text-[9px] tracking-widest uppercase text-muted/50">{name}</p>
          <p className="font-mono text-[9px] text-muted/40 capitalize">{tier}</p>
        </div>
      </div>
    </aside>
  );
}

function MobileNav() {
  const links = [
    { label: "Home", href: "/dashboard", icon: "⊞" },
    { label: "Scanner", href: "/scanner", icon: "◈" },
    { label: "Live", href: "/stream", icon: "◉" },
    { label: "Alerts", href: "/alerts", icon: "⚡" },
    { label: "Profile", href: "/dashboard/profile", icon: "○" },
  ];
  return (
    <nav className="lg:hidden fixed bottom-8 left-0 right-0 z-40 bg-surface border-t border-border flex">
      {links.map(l => (
        <Link key={l.href} href={l.href}
          className="flex-1 flex flex-col items-center py-3 text-muted hover:text-text transition-colors min-h-[44px]">
          <span className="text-base leading-none mb-1">{l.icon}</span>
          <span className="text-[9px] tracking-wide">{l.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [nextSession, setNextSession] = useState<any>(null);
  const [liveSession, setLiveSession] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const [{ data: prof }, { data: wl }, { data: al }, { data: sess }] = await Promise.all([
        supabase.from("users").select("*").eq("id", user.id).single(),
        supabase.from("watchlist").select("*").order("created_at", { ascending: false }).limit(6),
        supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("sessions").select("*").order("scheduled_at", { ascending: true }).limit(3),
      ]);

      setProfile(prof);
      setWatchlist(wl || []);
      setAlerts(al || []);
      if (sess) {
        const live = sess.find((s: any) => s.is_live);
        const next = sess.find((s: any) => !s.is_live && new Date(s.scheduled_at) > new Date());
        setLiveSession(live || null);
        setNextSession(next || null);
        setIsLive(!!live);
      }

      // Poll Firebase RTDB for live status
      const rtdbUrl = process.env.NEXT_PUBLIC_FIREBASE_RTDB_URL;
      if (rtdbUrl) {
        const checkLive = async () => {
          try {
            const r = await fetch(`${rtdbUrl}/livestatus.json`);
            const d = await r.json();
            if (d?.isLive) setIsLive(true);
          } catch {}
        };
        checkLive();
        const interval = setInterval(checkLive, 10000);
        return () => clearInterval(interval);
      }

      setLoading(false);
    })();
  }, []);

  if (loading && !user) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
    </div>
  );

  const name = profile?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const tier = profile?.tier || "member";

  const widgetVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
  };

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar name={name} tier={tier} />
      <MobileNav />

      <main className="lg:pl-56 pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text">{greeting()}, {name}.</h1>
            <MarketCountdown />
          </div>

          {/* Live banner */}
          {isLive && (
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
              className="mb-6 bg-red/10 border border-red/30 rounded-card p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-red pulse-dot" />
                <span className="text-sm font-semibold text-text">Jay is live right now</span>
              </div>
              <Link href="/stream">
                <Button size="sm">Join Session →</Button>
              </Link>
            </motion.div>
          )}

          {/* Widgets 2-col grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Watchlist */}
            <motion.div custom={0} variants={widgetVariants} initial="hidden" animate="visible">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-muted">Today&apos;s Watchlist</p>
                  <Link href="/alerts" className="text-[10px] text-accent hover:text-accent/80 transition-colors">View All →</Link>
                </div>
                {watchlist.length === 0 ? (
                  <p className="text-xs text-muted">No watchlist items yet.</p>
                ) : (
                  <div className="space-y-2">
                    {watchlist.map((item: any) => (
                      <div key={item.id} className="flex items-start justify-between">
                        <span className="font-mono text-sm font-bold text-text">{item.ticker}</span>
                        <span className="text-[10px] text-muted text-right max-w-[60%]">{item.notes}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted mt-3">Added by Jay</p>
              </Card>
            </motion.div>

            {/* Scanner signals */}
            <motion.div custom={1} variants={widgetVariants} initial="hidden" animate="visible">
              <Card className="relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[10px] tracking-widest uppercase text-muted">Scanner Signals</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot" />
                  </div>
                  <Link href="/scanner" className="text-[10px] text-accent hover:text-accent/80 transition-colors">Open Scanner →</Link>
                </div>
                {tier === "member" ? (
                  <div className="relative">
                    <div className="blur-sm pointer-events-none space-y-2">
                      {["NVDA","AAPL","AMD","SPY","QQQ"].map(t => (
                        <div key={t} className="flex items-center justify-between font-mono text-xs">
                          <span className="text-text">{t}</span>
                          <Badge variant="breakout">BREAKOUT</Badge>
                          <span className="text-accent">+3.2%</span>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-[2px] rounded">
                      <div className="text-center">
                        <p className="text-xs text-muted mb-2">Scanner — Trader feature</p>
                        <Link href="/join"><Button size="sm">Upgrade →</Button></Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.slice(0,5).map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between font-mono text-xs">
                        <span className="text-text font-bold">{a.ticker}</span>
                        <Badge variant={a.signal_type?.toLowerCase() as any}>{a.signal_type}</Badge>
                        <span className={a.direction === "bullish" ? "text-accent" : "text-red"}>
                          {a.direction === "bullish" ? "+" : ""}{a.change_percent}%
                        </span>
                      </div>
                    ))}
                    {alerts.length === 0 && <p className="text-xs text-muted">No signals yet today.</p>}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Next session — full width */}
            <motion.div custom={2} variants={widgetVariants} initial="hidden" animate="visible"
              className="md:col-span-2"
            >
              <Card>
                <p className="font-mono text-[10px] tracking-widest uppercase text-muted mb-4">Next Live Session</p>
                {liveSession ? (
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="font-semibold text-text text-lg">{liveSession.title}</p>
                      <p className="text-xs text-muted mt-1">{liveSession.description}</p>
                    </div>
                    <Link href="/stream"><Button>Join Now →</Button></Link>
                  </div>
                ) : nextSession ? (
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="font-semibold text-text">{nextSession.title}</p>
                      <p className="text-xs text-muted mt-1">
                        {new Date(nextSession.scheduled_at).toLocaleString("en-US", {
                          weekday: "short", month: "short", day: "numeric",
                          hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone: "America/New_York"
                        })}
                      </p>
                    </div>
                    <Link href="/stream"><Button variant="ghost">View Stream →</Button></Link>
                  </div>
                ) : (
                  <p className="text-xs text-muted">No sessions scheduled yet. Check back soon.</p>
                )}
              </Card>
            </motion.div>

            {/* Recent alerts */}
            <motion.div custom={3} variants={widgetVariants} initial="hidden" animate="visible"
              className="md:col-span-2"
            >
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-muted">Recent Alerts</p>
                  <Link href="/alerts" className="text-[10px] text-accent hover:text-accent/80 transition-colors">See All →</Link>
                </div>
                <div className="space-y-3">
                  {alerts.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between border-b border-border pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-text">{a.ticker}</span>
                        <Badge variant={a.signal_type?.toLowerCase() as any}>{a.signal_type}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <span className={`font-mono text-sm ${a.direction === "bullish" ? "text-accent" : "text-red"}`}>
                          {a.direction === "bullish" ? "+" : ""}{a.change_percent}%
                        </span>
                        <span className="font-mono text-[10px] text-muted">
                          {new Date(a.created_at).toLocaleTimeString("en-US", {hour:"numeric",minute:"2-digit"})}
                        </span>
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && <p className="text-xs text-muted">No alerts yet.</p>}
                </div>
                <p className="text-[9px] text-muted mt-4">For educational purposes only.</p>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
