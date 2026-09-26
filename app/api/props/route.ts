import { NextResponse } from "next/server";

// ─── HIGHEST-PROBABILITY SLIPS ENGINE ────────────────────────────────────────
// Free + legit. Pulls player game logs from ESPN's public API, derives a
// standard line per stat, and ranks plays by how consistently they hit.
// No sportsbook scraping, no paid feeds, no player-prop lines from walled apps.
// Cached ~10 min per league so it refreshes itself all day.

export const dynamic = "force-dynamic";
export const revalidate = 0;
// If the site is on a Vercel plan that allows it, this lets the fan-out finish.
export const maxDuration = 60;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HDRS: Record<string, string> = { "User-Agent": UA, Accept: "application/json" };

type StatDef = { name: string; label: string };
type LeagueCfg = {
  sport: string;
  league: string;
  stats: StatDef[];
  // ESPN roster position abbreviations worth pulling game logs for
  positions: string[];
  playersPerTeam: number;
  maxGames: number;
};

// app tab -> ESPN {sport, league} + which stats become "props"
const LEAGUES: Record<string, LeagueCfg> = {
  NFL: {
    sport: "football",
    league: "nfl",
    positions: ["QB", "RB", "WR", "TE"],
    playersPerTeam: 4,
    maxGames: 8,
    stats: [
      { name: "passingYards", label: "Pass Yds" },
      { name: "rushingYards", label: "Rush Yds" },
      { name: "receivingYards", label: "Rec Yds" },
      { name: "receptions", label: "Receptions" },
    ],
  },
  NBA: {
    sport: "basketball",
    league: "nba",
    positions: ["PG", "SG", "SF", "PF", "C", "G", "F"],
    playersPerTeam: 5,
    maxGames: 6,
    stats: [
      { name: "points", label: "Points" },
      { name: "rebounds", label: "Rebounds" },
      { name: "assists", label: "Assists" },
      { name: "threePointFieldGoalsMade", label: "3-Pointers" },
    ],
  },
  WNBA: {
    sport: "basketball",
    league: "wnba",
    positions: ["PG", "SG", "SF", "PF", "C", "G", "F"],
    playersPerTeam: 5,
    maxGames: 6,
    stats: [
      { name: "points", label: "Points" },
      { name: "rebounds", label: "Rebounds" },
      { name: "assists", label: "Assists" },
      { name: "threePointFieldGoalsMade", label: "3-Pointers" },
    ],
  },
  MLB: {
    sport: "baseball",
    league: "mlb",
    positions: ["1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "C"],
    playersPerTeam: 5,
    maxGames: 10,
    stats: [
      { name: "hits", label: "Hits" },
      { name: "totalBases", label: "Total Bases" },
      { name: "RBIs", label: "RBIs" },
      { name: "runs", label: "Runs" },
    ],
  },
  NHL: {
    sport: "hockey",
    league: "nhl",
    positions: ["C", "LW", "RW", "D"],
    playersPerTeam: 5,
    maxGames: 8,
    stats: [
      { name: "points", label: "Points" },
      { name: "shots", label: "Shots on Goal" },
      { name: "goals", label: "Goals" },
      { name: "assists", label: "Assists" },
    ],
  },
};

// fetch JSON with a hard timeout so one slow upstream never hangs the request
async function jget(url: string, ms = 3500): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: HDRS, signal: ctrl.signal, next: { revalidate: 600 } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// bounded concurrency so we don't fire 60 requests at once
async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const roundHalf = (x: number) => Math.round(x * 2) / 2;
const countHits = (vals: number[], line: number, over: boolean) =>
  vals.filter((v) => (over ? v > line : v < line)).length;

type TeamCtx = { teamId: string; abbr: string; oppAbbr: string; start: string };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const league = (searchParams.get("league") || "NFL").toUpperCase();
  const cfg = LEAGUES[league];
  if (!cfg) return NextResponse.json({ league, error: "unsupported_league", slips: [] });

  const base = `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}`;
  const glBase = `https://site.api.espn.com/apis/common/v3/sports/${cfg.sport}/${cfg.league}`;

  try {
    // 1) scoreboard -> upcoming games (state "pre") and the teams playing
    const sb = await jget(`${base}/scoreboard`);
    const seasonYear = Number(sb?.season?.year) || new Date().getFullYear();
    const events = (sb?.events || []).filter(
      (e: any) => e?.status?.type?.state === "pre"
    );
    if (!events.length) {
      return NextResponse.json({
        league,
        updated: new Date().toISOString(),
        count: 0,
        slips: [],
        note: "no_upcoming_games",
      });
    }

    const teams: TeamCtx[] = [];
    for (const e of events.slice(0, 8)) {
      const comp = e?.competitions?.[0];
      const cs = comp?.competitors || [];
      const start = e?.date || "";
      if (cs.length === 2) {
        const [a, b] = cs;
        teams.push({
          teamId: String(a?.team?.id),
          abbr: a?.team?.abbreviation || "",
          oppAbbr: b?.team?.abbreviation || "",
          start,
        });
        teams.push({
          teamId: String(b?.team?.id),
          abbr: b?.team?.abbreviation || "",
          oppAbbr: a?.team?.abbreviation || "",
          start,
        });
      }
    }

    // 2) rosters -> a bounded set of skill-position athletes
    const rosterResults = await pool(teams, 8, async (t) => {
      const r = await jget(`${base}/teams/${t.teamId}/roster`);
      const groups = r?.athletes || [];
      let ath: any[] = [];
      for (const g of groups) ath = g?.items ? ath.concat(g.items) : ath.concat([g]);
      const picked = ath
        .filter((p: any) => {
          const pos = p?.position?.abbreviation || "";
          return cfg.positions.length ? cfg.positions.includes(pos) : true;
        })
        .slice(0, cfg.playersPerTeam)
        .map((p: any) => ({
          id: String(p?.id),
          name: p?.displayName || p?.fullName || "",
          pos: p?.position?.abbreviation || "",
          headshot: p?.headshot?.href || "",
        }));
      return { t, picked };
    });

    const athletes: {
      id: string;
      name: string;
      pos: string;
      headshot: string;
      t: TeamCtx;
    }[] = [];
    for (const r of rosterResults) for (const p of r.picked) athletes.push({ ...p, t: r.t });
    const capped = athletes.slice(0, 36);

    const extractRows = (gl: any): string[][] => {
      const rows: string[][] = [];
      for (const stp of gl?.seasonTypes || [])
        for (const cat of stp?.categories || [])
          for (const ev of cat?.events || []) rows.push(ev?.stats || []);
      return rows;
    };

    // 3) game logs -> derive standard line + hit rates -> slips
    const slips: any[] = [];
    await pool(capped, 12, async (a) => {
      const gl = await jget(`${glBase}/athletes/${a.id}/gamelog`);
      if (!gl) return;
      const names: string[] = gl?.names || [];
      if (!names.length) return;

      // newest first (ESPN lists current season first). If the current season
      // is thin (early NFL/NBA), backfill with the prior season for a real L10.
      let rows: string[][] = extractRows(gl);
      if (rows.length < 8) {
        const prev = await jget(`${glBase}/athletes/${a.id}/gamelog?season=${seasonYear - 1}`);
        if (prev) rows = rows.concat(extractRows(prev));
      }
      if (rows.length < 3) return;
      const recent = rows.slice(0, 12);

      for (const sd of cfg.stats) {
        const idx = names.indexOf(sd.name);
        if (idx < 0) continue;
        const vals = recent.map((r) => parseFloat(r[idx])).filter((v) => !isNaN(v));
        if (vals.length < 5) continue; // need a real sample to call it a trend

        const l10 = vals.slice(0, 10);
        const l5 = vals.slice(0, 5);
        const med = median(l10);
        if (med <= 0) continue;

        // "standard line": nearest half-point to the recent median
        let line = roundHalf(med);
        if (line < 0.5) line = 0.5;

        const overRate = countHits(l10, line, true) / l10.length;
        const over = overRate >= 0.5;

        const l10hit = countHits(l10, line, over);
        const l5hit = countHits(l5, line, over);
        const seasonHit = countHits(vals, line, over);
        const l10pct = l10hit / l10.length;
        const l5pct = l5hit / l5.length;

        // only surface genuinely strong, consistent trends
        if (l10pct < 0.6) continue;

        const score = 0.6 * l10pct + 0.4 * l5pct;
        const tier =
          l10pct >= 0.8 && l5pct >= 0.8 ? "ELITE" : l10pct >= 0.7 ? "STRONG" : "LEAN";

        slips.push({
          player: a.name,
          headshot: a.headshot,
          pos: a.pos,
          team: a.t.abbr,
          opp: a.t.oppAbbr,
          start: a.t.start,
          league,
          stat: sd.label,
          line,
          side: over ? "Over" : "Under",
          tier,
          score,
          l5: { hit: l5hit, of: l5.length, pct: Math.round(l5pct * 100) },
          l10: { hit: l10hit, of: l10.length, pct: Math.round(l10pct * 100) },
          season: {
            hit: seasonHit,
            of: vals.length,
            pct: Math.round((seasonHit / vals.length) * 100),
          },
        });
      }
    });

    slips.sort((x, y) => y.score - x.score);

    return NextResponse.json({
      league,
      updated: new Date().toISOString(),
      count: slips.length,
      slips: slips.slice(0, 50),
      note: "standard_lines", // lines are derived from stats, not a book's board
    });
  } catch {
    return NextResponse.json({ league, error: "feed_unavailable", slips: [] });
  }
}
