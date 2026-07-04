// ─── HIT RATE ENGINE ─────────────────────────────────────────────────────────
// For one player + prop + line, pulls the player's real game log (ESPN public
// data) and counts how many of the last 5 / 10 / 20 games went OVER the line.
// Edge-cached 6h per player+prop+line.

const HDRS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'application/json',
};

const LEAGUE_CFG = {
  NBA: { slug: 'nba', path: 'basketball/nba' },
  WNBA: { slug: 'wnba', path: 'basketball/wnba' },
  MLB: { slug: 'mlb', path: 'baseball/mlb' },
  NFL: { slug: 'nfl', path: 'football/nfl' },
  NHL: { slug: 'nhl', path: 'hockey/nhl' },
  NCAAF: { slug: 'college-football', path: 'football/college-football' },
  NCAAB: { slug: 'mens-college-basketball', path: 'basketball/mens-college-basketball' },
  SOCCER: { dynamic: true },
};

function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

// Returns a function(row, idx) -> numeric value for this prop, or null if unmappable
function statPicker(prop, labels) {
  const idx = {};
  labels.forEach((l, i) => { idx[String(l).toUpperCase()] = i; });
  const val = (row, key) => { const i = idx[key]; if (i == null) return NaN; return parseFloat(row[i]); };
  const has = k => idx[k] != null;
  const p = norm(prop);

  // Basketball
  if (p === 'points' && has('PTS')) return r => val(r, 'PTS');
  if (p === 'rebounds' && has('REB')) return r => val(r, 'REB');
  if (p === 'assists' && has('AST')) return r => val(r, 'AST');
  if ((p === 'ptsrebsasts' || p === 'pointsreboundsassists') && has('PTS')) return r => val(r, 'PTS') + val(r, 'REB') + val(r, 'AST');
  if ((p === 'ptsrebs' || p === 'pointsrebounds') && has('PTS')) return r => val(r, 'PTS') + val(r, 'REB');
  if ((p === 'ptsasts' || p === 'pointsassists') && has('PTS')) return r => val(r, 'PTS') + val(r, 'AST');
  if ((p === 'rebsasts' || p === 'reboundsassists') && has('REB')) return r => val(r, 'REB') + val(r, 'AST');
  if ((p === '3pointersmade' || p === 'threepointersmade' || p === '3ptmade') && has('3PT')) return r => val(r, '3PT');
  if (p === 'steals' && has('STL')) return r => val(r, 'STL');
  if (p === 'blocks' && has('BLK')) return r => val(r, 'BLK');
  if (p === 'turnovers' && has('TO')) return r => val(r, 'TO');
  if ((p === 'blksstls' || p === 'stealsblocks' || p === 'blockssteals') && has('STL')) return r => val(r, 'STL') + val(r, 'BLK');

  // Baseball — batting
  if (p === 'hits' && has('H') && has('AB')) return r => val(r, 'H');
  if (p === 'runs' && has('R') && has('AB')) return r => val(r, 'R');
  if ((p === 'rbis' || p === 'runsbattedin') && has('RBI')) return r => val(r, 'RBI');
  if ((p === 'hitsrunsrbis') && has('H') && has('RBI')) return r => val(r, 'H') + val(r, 'R') + val(r, 'RBI');
  if ((p === 'homeruns') && has('HR')) return r => val(r, 'HR');
  if ((p === 'totalbases') && has('H') && has('2B')) return r => val(r, 'H') + val(r, '2B') + 2 * val(r, '3B') + 3 * val(r, 'HR');
  if ((p === 'singles') && has('H') && has('2B')) return r => val(r, 'H') - val(r, '2B') - val(r, '3B') - val(r, 'HR');
  if ((p === 'doubles') && has('2B')) return r => val(r, '2B');
  if ((p === 'stolenbases') && has('SB')) return r => val(r, 'SB');
  if ((p === 'walks') && has('BB') && has('AB')) return r => val(r, 'BB');
  if ((p === 'strikeouts' || p === 'batterstrikeouts') && has('SO') && has('AB')) return r => val(r, 'SO');

  // Baseball — pitching (pitcher gamelogs have IP)
  if (has('IP')) {
    if (p === 'strikeouts' && (has('K') || has('SO'))) return r => (has('K') ? val(r, 'K') : val(r, 'SO'));
    if ((p === 'hitsallowed') && has('H')) return r => val(r, 'H');
    if ((p === 'walksallowed') && has('BB')) return r => val(r, 'BB');
    if ((p === 'earnedrunsallowed') && has('ER')) return r => val(r, 'ER');
    if (p === 'pitchingouts') return r => { const ip = String(r[idx['IP']] || '0').split('.'); return parseInt(ip[0] || '0', 10) * 3 + parseInt(ip[1] || '0', 10); };
  }
  // NFL (labels depend on position: QB has CMP, RB has CAR, WR/TE has REC)
  if ((p === 'passyards' || p === 'passingyards') && has('CMP') && has('YDS')) return r => val(r, 'YDS');
  if ((p === 'rushyards' || p === 'rushingyards') && has('CAR') && has('YDS')) return r => val(r, 'YDS');
  if ((p === 'recyards' || p === 'receivingyards' || p === 'receptionyards') && has('REC') && has('YDS')) return r => val(r, 'YDS');
  if (p === 'receptions' && has('REC')) return r => val(r, 'REC');
  if ((p === 'passtds' || p === 'passingtds' || p === 'passingtouchdowns') && has('CMP') && has('TD')) return r => val(r, 'TD');
  if ((p === 'rushattempts' || p === 'rushingattempts' || p === 'carries') && has('CAR')) return r => val(r, 'CAR');
  if (p === 'completions' && has('CMP')) return r => val(r, 'CMP');
  if (p === 'interceptions' && has('CMP') && has('INT')) return r => val(r, 'INT');

  // NHL
  if (has('SOG')) {
    if (p === 'goals') return r => val(r, 'G');
    if (p === 'assists' && has('A')) return r => val(r, 'A');
    if (p === 'shots' || p === 'shotsongoal') return r => val(r, 'SOG');
    if ((p === 'blockedshots' || p === 'blocks') && has('BS')) return r => val(r, 'BS');
  }

  // Soccer (sparse gamelog data — works when ESPN tracks the player)
  if (has('G') && has('A') && !has('AB') && !has('PTS') && !has('SOG')) {
    if (p === 'goals') return r => val(r, 'G');
    if (p === 'assists') return r => val(r, 'A');
    if (p === 'shots' && has('SH')) return r => val(r, 'SH');
    if ((p === 'shotsontarget' || p === 'shotsongoal') && has('ST')) return r => val(r, 'ST');
  }
  return null;
}

async function findAthlete(name, league) {
  const cfg = LEAGUE_CFG[league];
  const s = await fetch('https://site.web.api.espn.com/apis/search/v2?query=' + encodeURIComponent(name) + '&limit=10', { headers: HDRS }).then(r => r.json());
  let out = null;
  (s && s.results ? s.results : []).forEach(g => {
    if (g.type !== 'player') return;
    (g.contents || []).forEach(c => {
      if (out || !c.uid || c.uid.indexOf('~a:') === -1) return;
      const id = c.uid.split('~a:')[1];
      if (league === 'SOCCER') {
        if (c.sport === 'soccer' && c.defaultLeagueSlug) out = { id: id, path: 'soccer/' + c.defaultLeagueSlug };
      } else if (cfg && String(c.defaultLeagueSlug || '') === cfg.slug) {
        out = { id: id, path: cfg.path };
      }
    });
  });
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const q = req.query || {};
  const league = String(q.league || '').toUpperCase();
  const player = String(q.player || '');
  const prop = String(q.prop || '');
  const line = parseFloat(q.line);
  const cfg = LEAGUE_CFG[league];

  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200');

  if (!cfg || !player || !prop || isNaN(line)) return res.status(200).json({ error: 'unsupported' });

  try {
    const ath = await findAthlete(player, league);
    if (!ath) return res.status(200).json({ error: 'no_player' });

    const g = await fetch('https://site.web.api.espn.com/apis/common/v3/sports/' + ath.path + '/athletes/' + ath.id + '/gamelog', { headers: HDRS }).then(r => r.json());
    const labels = g && g.labels ? g.labels : [];
    const pick = statPicker(prop, labels);
    if (!pick) return res.status(200).json({ error: 'no_stat' });

    // Collect games from regular-season categories, newest first
    const meta = g.events || {};
    const rows = [];
    (g.seasonTypes || []).forEach(st => {
      const nm = String(st.displayName || '').toLowerCase();
      if (nm.indexOf('preseason') !== -1) return;
      (st.categories || []).forEach(cat => {
        (cat.events || []).forEach(ev => {
          const m = meta[String(ev.eventId)] || {};
          rows.push({ date: m.gameDate || '', stats: ev.stats || [] });
        });
      });
    });
    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const games = rows.slice(0, 20);

    const win = k => {
      const g2 = games.slice(0, k);
      let h = 0;
      g2.forEach(r => { const v = pick(r.stats); if (!isNaN(v) && v > line) h++; });
      return { h: h, of: g2.length };
    };

    // per-game over/under results, oldest → newest (for streak bars), plus avg
    const last10 = games.slice(0, 10);
    const recent = last10.map(r => { const v = pick(r.stats); return !isNaN(v) && v > line ? 1 : 0; }).reverse();
    let sum = 0, cnt = 0;
    last10.forEach(r => { const v = pick(r.stats); if (!isNaN(v)) { sum += v; cnt++; } });
    const avg = cnt ? Math.round((sum / cnt) * 10) / 10 : null;

    const seg = ath.path.indexOf('soccer/') === 0 ? 'soccer' : ath.path.split('/')[1];
    const headshot = 'https://a.espncdn.com/i/headshots/' + seg + '/players/full/' + ath.id + '.png';
    return res.status(200).json({ player: player, league: league, prop: prop, line: line, n: games.length, l5: win(5), l10: win(10), l20: win(20), recent: recent, avg: avg, headshot: headshot });
  } catch (e) {
    return res.status(200).json({ error: 'feed_unavailable' });
  }
};
