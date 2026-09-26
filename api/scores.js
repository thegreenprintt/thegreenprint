// ─── LIVE SCORES ────────────────────────────────────────────────────────────
// Real-time scoreboard for any league off ESPN's free public feed.
// Short edge cache so live games update fast when the client re-polls.

const HDRS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'application/json',
};

const PATHS = {
  NFL: 'football/nfl',
  NBA: 'basketball/nba',
  WNBA: 'basketball/wnba',
  MLB: 'baseball/mlb',
  NHL: 'hockey/nhl',
  NCAAF: 'football/college-football',
};

async function jget(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3000);
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

function ymd(d) { return d.toISOString().slice(0, 10).replace(/-/g, ''); }

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const league = String((req.query && req.query.league) || 'NFL').toUpperCase();
  const path = PATHS[league];
  if (!path) {
    res.setHeader('Cache-Control', 's-maxage=60');
    return res.status(200).json({ league: league, games: [], error: 'unsupported_league' });
  }

  const base = 'https://site.api.espn.com/apis/site/v2/sports/' + path;

  try {
    const now = new Date();
    // today first; if nothing, look ahead for the next slate
    let events = [];
    for (let off = 0; off < 4; off++) {
      const d = new Date(now.getTime() + off * 86400000);
      const sb = await jget(base + '/scoreboard?dates=' + ymd(d));
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
        id: e.id,
        state: st.state || '',
        detail: st.shortDetail || st.detail || '',
        clock: (e.status && e.status.displayClock) || '',
        period: (e.status && e.status.period) || 0,
        start: e.date || '',
        home: sideOf(cs, 'home'),
        away: sideOf(cs, 'away'),
      };
    });

    const rank = (s) => (s === 'in' ? 0 : s === 'pre' ? 1 : 2);
    games.sort((a, b) => rank(a.state) - rank(b.state) || String(a.start).localeCompare(String(b.start)));

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json({ league: league, updated: new Date().toISOString(), count: games.length, games: games });
  } catch (e) {
    return res.status(200).json({ league: league, games: [], error: 'feed_unavailable' });
  }
};
