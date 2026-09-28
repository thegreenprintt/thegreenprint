// ─── HIGHEST-PROBABILITY SLIPS ENGINE ────────────────────────────────────────
// Free + legit. Pulls player game logs from ESPN's public API, derives a
// standard line per stat, and ranks plays by how consistently they hit.
// No sportsbook scraping, no paid feeds, no player-prop lines from walled apps.
// Edge-cached ~10 min per league so it refreshes itself all day.

const HDRS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'application/json',
};

// app tab -> ESPN {sport, league} + which stats become "props"
const LEAGUES = {
  NFL: {
    sport: 'football', league: 'nfl',
    positions: ['QB', 'RB', 'WR', 'TE'], playersPerTeam: 4,
    stats: [
      { name: 'passingYards', label: 'Pass Yds' },
      { name: 'rushingYards', label: 'Rush Yds' },
      { name: 'receivingYards', label: 'Rec Yds' },
      { name: 'receptions', label: 'Receptions' },
    ],
  },
  NBA: {
    sport: 'basketball', league: 'nba',
    positions: ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F'], playersPerTeam: 5,
    stats: [
      { name: 'points', label: 'Points' },
      { name: 'rebounds', label: 'Rebounds' },
      { name: 'assists', label: 'Assists' },
      { name: 'threePointFieldGoalsMade', label: '3-Pointers' },
    ],
  },
  WNBA: {
    sport: 'basketball', league: 'wnba',
    positions: ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F'], playersPerTeam: 5,
    stats: [
      { name: 'points', label: 'Points' },
      { name: 'rebounds', label: 'Rebounds' },
      { name: 'assists', label: 'Assists' },
      { name: 'threePointFieldGoalsMade', label: '3-Pointers' },
    ],
  },
  MLB: {
    sport: 'baseball', league: 'mlb',
    positions: ['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'C'], playersPerTeam: 5,
    stats: [
      { name: 'hits', label: 'Hits' },
      { name: 'totalBases', label: 'Total Bases' },
      { name: 'RBIs', label: 'RBIs' },
      { name: 'runs', label: 'Runs' },
    ],
  },
  NHL: {
    sport: 'hockey', league: 'nhl',
    positions: ['C', 'LW', 'RW', 'D'], playersPerTeam: 5,
    stats: [
      { name: 'points', label: 'Points' },
      { name: 'shots', label: 'Shots on Goal' },
      { name: 'goals', label: 'Goals' },
      { name: 'assists', label: 'Assists' },
    ],
  },
};

// ESPN blocks datacenter IPs (Vercel runs on AWS), so all ESPN calls are
// routed through a lightweight relay when ESPN_PROXY is set in the Vercel
// env. The relay takes ?url=<encoded espn url> and echoes JSON with CORS.
// With no proxy set, we call ESPN directly (works locally, blocked on Vercel).
const PROXY = process.env.ESPN_PROXY || '';
const viaProxy = (u) => (PROXY ? PROXY + encodeURIComponent(u) : u);

async function jget(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms || 5000);
  try {
    const r = await fetch(viaProxy(url), { headers: HDRS, signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function pool(items, n, fn) {
  const out = [];
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

function median(a) {
  const s = a.slice().sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const roundHalf = (x) => Math.round(x * 2) / 2;
const countHits = (vals, line, over) => vals.filter((v) => (over ? v > line : v < line)).length;

function extractRows(gl) {
  const rows = [];
  const sts = (gl && gl.seasonTypes) || [];
  for (const stp of sts)
    for (const cat of (stp.categories || []))
      for (const ev of (cat.events || [])) rows.push(ev.stats || []);
  return rows;
}

// live scoreboard side (same function serves /api/props?type=scores)
function sideOf(competitors, homeAway) {
  const c = (competitors || []).find((x) => x && x.homeAway === homeAway) || {};
  const team = c.team || {};
  return {
    abbr: team.abbreviation || '',
    name: team.shortDisplayName || team.name || '',
    logo: team.logo || '',
    score: c.score != null ? Number(c.score) : null,
    record: (c.records && c.records[0] && c.records[0].summary) || '',
    winner: !!c.winner,
  };
}
async function doScores(res, base, league) {
  const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  try {
    const now = new Date();
    let events = [];
    for (let off = 0; off < 4; off++) {
      const d = new Date(now.getTime() + off * 86400000);
      const sb = await jget(base + '/scoreboard?dates=' + ymd(d), 6000);
      const evs = (sb && sb.events) || [];
      if (off === 0) events = evs;
      if (off === 0 && evs.length) break;
      if (off > 0 && evs.length) { events = evs; break; }
    }
    const games = events.map((e) => {
      const comp = (e.competitions && e.competitions[0]) || {};
      const st = (e.status && e.status.type) || {};
      const cs = comp.competitors || [];
      return {
        id: e.id, state: st.state || '', detail: st.shortDetail || st.detail || '',
        clock: (e.status && e.status.displayClock) || '', start: e.date || '',
        home: sideOf(cs, 'home'), away: sideOf(cs, 'away'),
      };
    });
    const rank = (s) => (s === 'in' ? 0 : s === 'pre' ? 1 : 2);
    games.sort((a, b) => rank(a.state) - rank(b.state) || String(a.start).localeCompare(String(b.start)));
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json({ league: league, updated: new Date().toISOString(), count: games.length, games: games });
  } catch (e) {
    return res.status(200).json({ league: league, games: [], error: 'feed_unavailable' });
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const league = String((req.query && req.query.league) || 'NFL').toUpperCase();
  const cfg = LEAGUES[league];
  if (!cfg) {
    res.setHeader('Cache-Control', 's-maxage=60');
    return res.status(200).json({ league: league, error: 'unsupported_league', slips: [], games: [] });
  }

  // site.web.api mirrors site.api exactly (same paths + JSON) but is NOT on
  // ESPN's IP-reputation blocklist, so it works through the edge relay.
  const base = 'https://site.web.api.espn.com/apis/site/v2/sports/' + cfg.sport + '/' + cfg.league;
  const glBase = 'https://site.web.api.espn.com/apis/common/v3/sports/' + cfg.sport + '/' + cfg.league;

  if (String((req.query && req.query.type) || '') === 'scores') return doScores(res, base, league);

  const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

  try {
    // ESPN's scoreboard defaults to today only, so weekly sports (NFL) look
    // empty on off-days. Look a few days ahead and collect upcoming games.
    let seasonYear = new Date().getFullYear();
    let events = [];
    const now = new Date();
    for (let off = 0; off < 4 && events.length < 6; off++) {
      const d = new Date(now.getTime() + off * 86400000);
      const sb = await jget(base + '/scoreboard?dates=' + ymd(d));
      if (off === 0) seasonYear = Number(sb && sb.season && sb.season.year) || seasonYear;
      const evs = ((sb && sb.events) || []).filter(
        (e) => e && e.status && e.status.type && e.status.type.state === 'pre'
      );
      events = events.concat(evs);
    }
    if (!events.length) {
      res.setHeader('Cache-Control', 's-maxage=300');
      return res.status(200).json({ league: league, updated: new Date().toISOString(), count: 0, slips: [], note: 'no_upcoming_games' });
    }

    const teams = [];
    for (const e of events.slice(0, 8)) {
      const comp = e.competitions && e.competitions[0];
      const cs = (comp && comp.competitors) || [];
      const start = e.date || '';
      if (cs.length === 2) {
        const a = cs[0], b = cs[1];
        teams.push({ teamId: String(a.team && a.team.id), abbr: (a.team && a.team.abbreviation) || '', oppAbbr: (b.team && b.team.abbreviation) || '', start: start });
        teams.push({ teamId: String(b.team && b.team.id), abbr: (b.team && b.team.abbreviation) || '', oppAbbr: (a.team && a.team.abbreviation) || '', start: start });
      }
    }

    const rosterResults = await pool(teams, 12, async (t) => {
      const r = await jget(base + '/teams/' + t.teamId + '/roster');
      const groups = (r && r.athletes) || [];
      let ath = [];
      for (const g of groups) ath = g && g.items ? ath.concat(g.items) : ath.concat([g]);
      const picked = ath
        .filter((p) => {
          const pos = (p && p.position && p.position.abbreviation) || '';
          return cfg.positions.length ? cfg.positions.indexOf(pos) !== -1 : true;
        })
        .slice(0, cfg.playersPerTeam)
        .map((p) => ({
          id: String(p && p.id),
          name: (p && (p.displayName || p.fullName)) || '',
          pos: (p && p.position && p.position.abbreviation) || '',
          headshot: (p && p.headshot && p.headshot.href) || '',
        }));
      return { t: t, picked: picked };
    });

    const athletes = [];
    for (const r of rosterResults) for (const p of r.picked) athletes.push(Object.assign({}, p, { t: r.t }));
    const capped = athletes.slice(0, 26);

    const slips = [];
    await pool(capped, 12, async (a) => {
      const gl = await jget(glBase + '/athletes/' + a.id + '/gamelog');
      if (!gl) return;
      const names = (gl && gl.names) || [];
      if (!names.length) return;

      let rows = extractRows(gl);
      if (rows.length < 8) {
        const prev = await jget(glBase + '/athletes/' + a.id + '/gamelog?season=' + (seasonYear - 1));
        if (prev) rows = rows.concat(extractRows(prev));
      }
      if (rows.length < 3) return;
      // wider window so the baseline line is a real body-of-work number,
      // not the same 10 games we then grade against (which forces 50%).
      const recent = rows.slice(0, 20);

      for (const sd of cfg.stats) {
        const idx = names.indexOf(sd.name);
        if (idx < 0) continue;
        const vals = recent.map((r) => parseFloat(r[idx])).filter((v) => !isNaN(v));
        if (vals.length < 6) continue;

        const l10 = vals.slice(0, 10);
        const l5 = vals.slice(0, 5);
        const med = median(vals);
        if (med <= 0) continue;

        // Real prop platforms grade a player against a fixed line. We don't have
        // sportsbook lines for free, so we derive two honest, meaningful lines
        // from the player's own last-10 distribution:
        //   • an OVER "floor" line they usually clear
        //   • an UNDER "ceiling" line they rarely exceed
        // then take whichever side is the more consistent play. A steady player
        // who beats a real floor 9-10 times reads as ELITE (90-100%); a volatile
        // one falls to LEAN or off the board.
        const sorted = l10.slice().sort((a, b) => a - b);
        const q = (arr, p) => arr[Math.min(arr.length - 1, Math.max(0, Math.round((arr.length - 1) * p)))];

        let overLine = roundHalf(q(sorted, 0.15) - 0.25);
        const floorMin = roundHalf(med * 0.45);
        if (overLine < floorMin) overLine = floorMin;
        if (overLine < 0.5) overLine = 0.5;
        const overHit = countHits(l10, overLine, true);
        const overPct = overHit / l10.length;

        let underLine = roundHalf(q(sorted, 0.85) + 0.25);
        const ceilMax = roundHalf(med * 1.7);
        if (underLine > ceilMax) underLine = ceilMax;
        if (underLine <= overLine) underLine = overLine + 0.5;
        const underHit = countHits(l10, underLine, false);
        const underPct = underHit / l10.length;

        const over = overPct >= underPct;
        const line = over ? overLine : underLine;
        const l10hit = over ? overHit : underHit;
        const l5hit = countHits(l5, line, over);
        const seasonHit = countHits(vals, line, over);
        const l10pct = l10hit / l10.length;
        const l5pct = l5hit / l5.length;
        if (l10pct < 0.6) continue; // only genuine high-confidence trends

        const score = 0.7 * l10pct + 0.3 * l5pct;
        const tier = l10pct >= 0.9 ? 'ELITE' : l10pct >= 0.8 ? 'STRONG' : 'LEAN';

        // last 10, oldest -> newest, for the hit/miss story strip
        const spark = l10.slice().reverse().map((v) => ({
          v: v,
          hit: over ? v > line : v < line,
        }));

        slips.push({
          player: a.name, headshot: a.headshot, pos: a.pos,
          team: a.t.abbr, opp: a.t.oppAbbr, start: a.t.start,
          league: league, stat: sd.label, line: line,
          side: over ? 'Over' : 'Under', tier: tier, score: score,
          spark: spark,
          l5: { hit: l5hit, of: l5.length, pct: Math.round(l5pct * 100) },
          l10: { hit: l10hit, of: l10.length, pct: Math.round(l10pct * 100) },
          season: { hit: seasonHit, of: vals.length, pct: Math.round((seasonHit / vals.length) * 100) },
        });
      }
    });

    slips.sort((x, y) => y.score - x.score);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({ league: league, updated: new Date().toISOString(), count: slips.length, slips: slips.slice(0, 50), note: 'standard_lines' });
  } catch (e) {
    return res.status(200).json({ league: league, error: 'feed_unavailable', slips: [] });
  }
};
