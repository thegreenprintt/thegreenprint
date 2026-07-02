// ─── LIVE PROPS FEED ─────────────────────────────────────────────────────────
// Pulls the current PrizePicks board server-side and normalizes it for the app.
// Cached at the edge ~10 min, so it refreshes itself all day automatically.

const HDRS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'application/json',
};

const SOCCER_KEYS = ['SOCCER', 'EPL', 'UCL', 'MLS', 'UEFA', 'WC', 'FIFA', 'LALIGA', 'SERIEA', 'BUNDES'];

function leagueMatches(tab, name) {
  const n = String(name || '').toUpperCase();
  switch (tab) {
    case 'NBA': return n === 'NBA';
    case 'NFL': return n === 'NFL';
    case 'MLB': return n === 'MLB';
    case 'NHL': return n === 'NHL';
    case 'WNBA': return n === 'WNBA';
    case 'MMA': return n === 'MMA' || n === 'UFC';
    case 'TENNIS': return n.indexOf('TENNIS') !== -1;
    case 'SOCCER': return SOCCER_KEYS.some(k => n.indexOf(k) !== -1);
    default: return n === tab;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const league = String((req.query && req.query.league) || 'NBA').toUpperCase();

  try {
    // 1) resolve current league ids live (names/ids change over time)
    const lgRes = await fetch('https://api.prizepicks.com/leagues', { headers: HDRS });
    const lg = await lgRes.json();
    const ids = (lg && lg.data ? lg.data : [])
      .filter(l => l && l.attributes && l.attributes.active !== false && leagueMatches(league, l.attributes.name))
      .map(l => ({ id: String(l.id), name: String(l.attributes.name || '') }))
      .slice(0, 3);

    if (!ids.length) {
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
      return res.status(200).json({ league, updated: new Date().toISOString(), props: [] });
    }

    // 2) pull current projections for those leagues
    const all = [];
    for (const item of ids) {
      try {
        const pjRes = await fetch('https://api.prizepicks.com/projections?league_id=' + item.id + '&per_page=250&single_stat=true', { headers: HDRS });
        const pj = await pjRes.json();
        const players = {};
        (pj && pj.included ? pj.included : []).forEach(i => { if (i && i.type === 'new_player') players[String(i.id)] = i.attributes || {}; });
        (pj && pj.data ? pj.data : []).forEach(d => {
          const a = (d && d.attributes) || {};
          const rel = d && d.relationships && d.relationships.new_player && d.relationships.new_player.data;
          const p = players[String(rel && rel.id)] || {};
          const line = parseFloat(a.line_score);
          const player = p.display_name || p.name || '';
          if (!player || isNaN(line)) return;
          all.push({
            player: player,
            team: p.team || p.team_name || '',
            prop: a.stat_display_name || a.stat_type || '',
            line: line,
            opp: a.description || '',
            start: a.start_time || '',
            league: item.name,
            board: 'PrizePicks',
          });
        });
      } catch (e) {}
    }

    all.sort((x, y) => String(x.start || '').localeCompare(String(y.start || '')));
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({ league, updated: new Date().toISOString(), count: all.length, props: all.slice(0, 300) });
  } catch (e) {
    return res.status(200).json({ league, error: 'feed_unavailable', props: [] });
  }
};
