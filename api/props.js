// ─── LIVE PROPS FEED ─────────────────────────────────────────────────────────
// Pulls the current player-prop board server-side (Underdog primary,
// PrizePicks fallback) and normalizes it for the app.
// Edge-cached ~10 min, so it refreshes itself all day automatically.

const HDRS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'application/json',
};

function matchesLeague(tab, sport) {
  const n = String(sport || '').toUpperCase();
  switch (tab) {
    case 'NBA': return n === 'NBA';
    case 'NFL': return n === 'NFL';
    case 'MLB': return n === 'MLB';
    case 'NHL': return n === 'NHL';
    case 'WNBA': return n === 'WNBA';
    case 'MMA': return n === 'MMA' || n === 'UFC';
    case 'TENNIS': return n.indexOf('TENNIS') !== -1;
    case 'NCAAF': return n === 'CFB' || n === 'NCAAF' || n === 'NCAAFB' || n === 'COLLEGE FOOTBALL';
    case 'NCAAB': return n === 'CBB' || n === 'NCAAB' || n === 'NCAAM' || n === 'COLLEGE BASKETBALL';
    case 'SOCCER': return ['SOCCER', 'EPL', 'UCL', 'MLS', 'UEFA', 'WC', 'FIFA', 'LALIGA', 'SERIEA', 'BUNDES'].some(k => n.indexOf(k) !== -1);
    default: return n === tab;
  }
}

async function fromUnderdog(league, dbg) {
  const r = await fetch('https://api.underdogfantasy.com/beta/v6/over_under_lines', { headers: HDRS });
  dbg.underdog_status = r.status;
  if (!r.ok) return null;
  const j = await r.json();
  dbg.underdog_lines = (j.over_under_lines || []).length;
  const players = {}; (j.players || []).forEach(p => { players[String(p.id)] = p; });
  const games = {}; (j.games || []).forEach(g => { games[String(g.id)] = g; });
  (j.solo_games || []).forEach(g => { games[String(g.id)] = g; });
  const apps = {}; (j.appearances || []).forEach(a => { apps[String(a.id)] = a; });

  const out = [];
  (j.over_under_lines || []).forEach(l => {
    const ou = l.over_under || {};
    const st = ou.appearance_stat || {};
    const app = apps[String(st.appearance_id)] || {};
    const p = players[String(app.player_id)] || {};
    const g = games[String(app.match_id)] || {};
    const sport = String(p.sport_id || g.sport_id || '').toUpperCase();
    if (!matchesLeague(league, sport)) return;
    const name = ((p.first_name || '') + ' ' + (p.last_name || '')).trim();
    const line = parseFloat(l.stat_value);
    if (!name || isNaN(line)) return;
    out.push({
      player: name,
      team: '',
      prop: st.display_stat || st.stat || '',
      line: line,
      opp: g.title || '',
      start: g.scheduled_at || '',
      league: sport,
      board: 'Underdog',
    });
  });
  return out;
}

async function fromPrizePicks(league, dbg) {
  const lgRes = await fetch('https://api.prizepicks.com/leagues', { headers: HDRS });
  dbg.pp_leagues_status = lgRes.status;
  if (!lgRes.ok) return null;
  const lg = await lgRes.json();
  const ids = (lg && lg.data ? lg.data : [])
    .filter(l => l && l.attributes && l.attributes.active !== false && matchesLeague(league, l.attributes.name))
    .map(l => ({ id: String(l.id), name: String(l.attributes.name || '') }))
    .slice(0, 3);
  dbg.pp_league_ids = ids.length;
  if (!ids.length) return [];
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
        all.push({ player: player, team: p.team || '', prop: a.stat_display_name || a.stat_type || '', line: line, opp: a.description || '', start: a.start_time || '', league: item.name, board: 'PrizePicks' });
      });
    } catch (e) {}
  }
  return all;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const league = String((req.query && req.query.league) || 'NBA').toUpperCase();
  const debug = req.query && req.query.debug === '1';
  const dbg = {};

  let props = null;
  try { props = await fromUnderdog(league, dbg); } catch (e) { dbg.underdog_error = String(e && e.message || e); }
  if (!props || !props.length) {
    try {
      const pp = await fromPrizePicks(league, dbg);
      if (pp && pp.length) props = pp;
      else if (!props) props = pp;
    } catch (e) { dbg.pp_error = String(e && e.message || e); }
  }

  const list = (props || []).sort((x, y) => String(x.start || '').localeCompare(String(y.start || ''))).slice(0, 300);
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
  const body = { league: league, updated: new Date().toISOString(), count: list.length, props: list };
  if (props === null) body.error = 'feed_unavailable';
  if (debug) body.debug = dbg;
  return res.status(200).json(body);
};
