"use client";

import { useEffect, useState } from "react";

// ─── THE GREENPRINT · FIND YOUR NEXT PLAY ────────────────────────────────────
// Highest-probability slips per sport, ranked by how consistently they hit.
// Data: ESPN public game logs (free). Lines are standardized, not a book's board.

const SPORTS = [
  { key: "NFL", label: "NFL" },
  { key: "NBA", label: "NBA" },
  { key: "WNBA", label: "WNBA" },
  { key: "MLB", label: "MLB" },
  { key: "NHL", label: "NHL" },
];

// Platform is context only — lines shown are standardized, so we never imply a
// live scrape of a walled board.
const PLATFORMS = [
  { key: "underdog", label: "Underdog" },
  { key: "prizepicks", label: "PrizePicks" },
  { key: "dabble", label: "Dabble" },
  { key: "standard", label: "Standard" },
];

type Rate = { hit: number; of: number; pct: number };
type Slip = {
  player: string;
  headshot?: string;
  pos?: string;
  team: string;
  opp: string;
  start?: string;
  league: string;
  stat: string;
  line: number;
  side: "Over" | "Under";
  tier: "ELITE" | "STRONG" | "LEAN";
  l5: Rate;
  l10: Rate;
  season: Rate;
};

const GREEN = "#00FF85";
const INK = "#04070A";

function tierColor(t: string) {
  if (t === "ELITE") return GREEN;
  if (t === "STRONG") return "#7CE0FF";
  return "#FFC24B";
}

function Bar({ label, r }: { label: string; r: Rate }) {
  const pct = Math.max(0, Math.min(100, r.pct));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "7px 0" }}>
      <div style={{ width: 118, fontSize: 12.5, color: "rgba(255,255,255,.62)", fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 6,
          background: "rgba(255,255,255,.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 6,
            background: pct >= 80 ? GREEN : pct >= 65 ? "#7CE0FF" : "#FFC24B",
          }}
        />
      </div>
      <div style={{ width: 40, textAlign: "right", fontSize: 13, fontWeight: 800 }}>{pct}%</div>
    </div>
  );
}

function Card({ s }: { s: Slip }) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg,#0B1116,#070C10)",
        border: "1px solid rgba(0,255,133,.16)",
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 18px 50px rgba(0,0,0,.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: "rgba(255,255,255,.06)",
            overflow: "hidden",
            flex: "0 0 auto",
          }}
        >
          {s.headshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.headshot} alt={s.player} width={46} height={46} style={{ objectFit: "cover" }} />
          ) : null}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.1 }}>{s.player}</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)", marginTop: 2 }}>
            {s.pos ? s.pos + " · " : ""}
            {s.team} vs {s.opp}
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: ".08em",
            color: INK,
            background: tierColor(s.tier),
            padding: "5px 9px",
            borderRadius: 7,
          }}
        >
          {s.tier}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          paddingBottom: 12,
          borderBottom: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 800, color: s.side === "Over" ? GREEN : "#FF7C7C" }}>
          {s.side}
        </span>
        <span style={{ fontSize: 22, fontWeight: 900 }}>{s.line}</span>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,.7)", fontWeight: 600 }}>{s.stat}</span>
      </div>

      <div style={{ marginTop: 8 }}>
        <Bar label={`Last 5 (${s.l5.hit}/${s.l5.of})`} r={s.l5} />
        <Bar label={`Last 10 (${s.l10.hit}/${s.l10.of})`} r={s.l10} />
        <Bar label={`Season (${s.season.hit}/${s.season.of})`} r={s.season} />
      </div>
    </div>
  );
}

export default function AppPage() {
  const [sport, setSport] = useState("NFL");
  const [platform, setPlatform] = useState("underdog");
  const [slips, setSlips] = useState<Slip[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");

  useEffect(() => {
    let live = true;
    setState("loading");
    fetch(`/api/props?league=${sport}&platform=${platform}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        const arr: Slip[] = d?.slips || [];
        setSlips(arr);
        setState(d?.error ? "error" : arr.length ? "ready" : "empty");
      })
      .catch(() => live && setState("error"));
    return () => {
      live = false;
    };
  }, [sport, platform]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(90% 60% at 50% -10%, rgba(0,255,133,.10), transparent 60%), ${INK}`,
        color: "#fff",
        fontFamily:
          "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "34px 20px 80px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 900, letterSpacing: ".02em", fontSize: 20 }}>
            THE <span style={{ color: GREEN }}>GREENPRINT</span>
          </div>
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 900, margin: "14px 0 4px", letterSpacing: "-.01em" }}>
          Find your next play.
        </h1>
        <p style={{ color: "rgba(255,255,255,.6)", fontSize: 15, maxWidth: 640 }}>
          The highest-probability slips for any sport, ranked by how often they actually hit. Powered
          by live game logs.
        </p>

        {/* sport tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 22 }}>
          {SPORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSport(s.key)}
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                border: "1px solid " + (sport === s.key ? GREEN : "rgba(255,255,255,.14)"),
                background: sport === s.key ? GREEN : "transparent",
                color: sport === s.key ? INK : "#fff",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* platform pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPlatform(p.key)}
              style={{
                padding: "6px 13px",
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
                border: "1px solid " + (platform === p.key ? "rgba(0,255,133,.5)" : "rgba(255,255,255,.12)"),
                background: platform === p.key ? "rgba(0,255,133,.10)" : "transparent",
                color: platform === p.key ? GREEN : "rgba(255,255,255,.7)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 10 }}>
          Lines shown are standardized from live stats, for research only. Not affiliated with any
          platform. Not betting advice.
        </div>

        {/* body */}
        <div style={{ marginTop: 24 }}>
          {state === "loading" && (
            <div style={{ color: "rgba(255,255,255,.6)", padding: "40px 0" }}>Loading the board…</div>
          )}
          {state === "empty" && (
            <div style={{ color: "rgba(255,255,255,.6)", padding: "40px 0" }}>
              No {sport} games on the slate right now. Check back on a game day.
            </div>
          )}
          {state === "error" && (
            <div style={{ color: "#FFC24B", padding: "40px 0" }}>
              Board is syncing — give it a minute and refresh.
            </div>
          )}
          {state === "ready" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 16,
              }}
            >
              {slips.map((s, i) => (
                <Card key={i} s={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
