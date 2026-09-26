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

async function jget(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms || 2200);
  try {
    const r = await fetch(url, { headers: HDRS, signal: ctrl.signal });
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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const league = String((req.query && req.query.league) || 'NFL').toUpperCase();
  const cfg = LEAGUES[league];
  if (!cfg) {
    res.setHeader('Cache-Control', 's-maxage=60');
    return res.status(200).json({ league: league, error: 'unsupported_league', slips: [] });
  }

  const base = 'https://site.api.espn.com/apis/site/v2/sports/' + cfg.sport + '/' + cfg.league;
  const glBase = 'https://site.api.espn.com/apis/common/v3/sports/' + cfg.sport + '/' + cfg.league;

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
    for (const e of events.slice(0, 6)) {
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
    const capped = athletes.slice(0, 18);

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
      const recent = rows.slice(0, 12);

      for (const sd of cfg.stats) {
        const idx = names.indexOf(sd.name);
        if (idx < 0) continue;
        const vals = recent.map((r) => parseFloat(r[idx])).filter((v) => !isNaN(v));
        if (vals.length < 5) continue;

        const l10 = vals.slice(0, 10);
        const l5 = vals.slice(0, 5);
        const med = median(l10);
        if (med <= 0) continue;

        let line = roundHalf(med);
        if (line < 0.5) line = 0.5;

        const overRate = countHits(l10, line, true) / l10.length;
        const over = overRate >= 0.5;

        const l10hit = countHits(l10, line, over);
        const l5hit = countHits(l5, line, over);
        const seasonHit = countHits(vals, line, over);
        const l10pct = l10hit / l10.length;
        const l5pct = l5hit / l5.length;
        if (l10pct < 0.6) continue;

        const score = 0.6 * l10pct + 0.4 * l5pct;
        const tier = l10pct >= 0.8 && l5pct >= 0.8 ? 'ELITE' : l10pct >= 0.7 ? 'STRONG' : 'LEAN';

        slips.push({
          player: a.name, headshot: a.headshot, pos: a.pos,
          team: a.t.abbr, opp: a.t.oppAbbr, start: a.t.start,
          league: league, stat: sd.label, line: line,
          side: over ? 'Over' : 'Under', tier: tier, score: score,
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
