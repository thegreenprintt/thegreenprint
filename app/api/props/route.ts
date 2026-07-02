import { NextResponse } from "next/server";

// ─── LIVE PROPS FEED ─────────────────────────────────────────────────────────
// Pulls the current PrizePicks board server-side and normalizes it for the app.
// Cached ~10 min per league, so it refreshes itself all day automatically.

export const dynamic = "force-dynamic";

const HDRS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
};

// Which PrizePicks league names roll up under each app tab
const LEAGUE_MATCH: Record<string, (name: string) => boolean> = {
  NBA: n => n === "NBA",
  NFL: n => n === "NFL",
  MLB: n => n === "MLB",
  NHL: n => n === "NHL",
  SOCCER: n => n.includes("SOCCER") || ["EPL", "UCL", "MLS", "UEFA", "WC", "FIFA", "LALIGA", "SERIEA", "BUNDES"].some(k => n.includes(k)),
  WNBA: n => n === "WNBA",
  MMA: n => n === "MMA" || n === "UFC",
  TENNIS: n => n.includes("TENNIS"),
};

type Prop = { player: string; team: string; prop: string; line: number; opp: string; start: string; league: string; board: string };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const league = (searchParams.get("league") || "NBA").toUpperCase();
  const match = LEAGUE_MATCH[league] || ((n: string) => n === league);

  try {
    // 1) resolve current league ids (names/ids change, so look them up live)
    const lg = await fetch("https://api.prizepicks.com/leagues", { headers: HDRS, next: { revalidate: 3600 } }).then(r => r.json());
    const ids: { id: string; name: string }[] = (lg?.data || [])
      .filter((l: any) => l?.attributes?.active !== false && match(String(l?.attributes?.name || "").toUpperCase()))
      .map((l: any) => ({ id: String(l.id), name: String(l?.attributes?.name || "") }))
      .slice(0, 3);

    if (!ids.length) return NextResponse.json({ league, updated: new Date().toISOString(), props: [] });

    // 2) pull current projections for those leagues
    const all: Prop[] = [];
    for (const { id, name } of ids) {
      try {
        const pj = await fetch(`https://api.prizepicks.com/projections?league_id=${id}&per_page=250&single_stat=true`, { headers: HDRS, next: { revalidate: 600 } }).then(r => r.json());
        const players: Record<string, any> = {};
        (pj?.included || []).forEach((i: any) => { if (i?.type === "new_player") players[String(i.id)] = i?.attributes || {}; });
        (pj?.data || []).forEach((d: any) => {
          const a = d?.attributes || {};
          const p = players[String(d?.relationships?.new_player?.data?.id || "")] || {};
          const line = parseFloat(a.line_score);
          const player = p.display_name || p.name || "";
          if (!player || isNaN(line)) return;
          all.push({
            player,
            team: p.team || p.team_name || "",
            prop: a.stat_display_name || a.stat_type || "",
            line,
            opp: a.description || "",
            start: a.start_time || "",
            league: name,
            board: "PrizePicks",
          });
        });
      } catch {}
    }

    all.sort((x, y) => (x.start || "").localeCompare(y.start || ""));
    return NextResponse.json({ league, updated: new Date().toISOString(), count: all.length, props: all.slice(0, 300) });
  } catch {
    return NextResponse.json({ league, error: "feed_unavailable", props: [] });
  }
}
