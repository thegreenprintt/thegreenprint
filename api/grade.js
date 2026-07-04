// ─── GP RECORD — grades the board's top picks against real results ───────────
// GET /api/grade?date=YYYY-MM-DD
// Reads that day's snapshotted picks from Firebase, checks each player's real
// game log for that date, marks win/loss, returns the record. Self-maintaining.

const FB = 'https://the-greenprint-53d98-default-rtdb.firebaseio.com';
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
};

function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

function statPicker(prop, labels) {
  const idx = {};
  labels.forEach((l, i) => { idx[String(l).toUpperCase()] = i; });
  const val = (row, key) => { const i = idx[key]; if (i == null) return NaN; return parseFloat(row[i]); };
  const has = k => idx[k] != null;
  const p = norm(prop);
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
  if (has('IP')) {
    if (p === 'strikeouts' && (has('K') || has('SO'))) return r => (has('K') ? val(r, 'K') : val(r, 'SO'));
    if ((p === 'hitsallowed') && has('H')) return r => val(r, 'H');
    if ((p === 'walksallowed') && has('BB')) return r => val(r, 'BB');
    if ((p === 'earnedrunsallowed') && has('ER')) return r => val(r, 'ER');
  }
  if ((p === 'passyards' || p === 'passingyards') && has('CMP') && has('YDS')) return r => val(r, 'YDS');
  if ((p === 'rushyards' || p === 'rushingyards') && has('CAR') && has('YDS')) return r => val(r, 'YDS');
  if ((p === 'recyards' || p === 'receivingyards') && has('REC') && has('YDS')) return r => val(r, 'YDS');
  if (p === 'receptions' && has('REC')) return r => val(r, 'REC');
  if (has('SOG')) {
    if (p === 'goals') return r => val(r, 'G');
    if (p === 'assists' && has('A')) return r => val(r, 'A');
    if (p === 'shots' || p === 'shotsongoal') return r => val(r, 'SOG');
  }
  return null;
}

async function findAthlete(name, league) {
  const cfg = LEAGUE_CFG[league];
  if (!cfg) return null;
  const s = await fetch('https://site.web.api.espn.com/apis/search/v2?query=' + encodeURIComponent(name) + '&limit=10', { headers: HDRS }).then(r => r.json());
  let out = null;
  (s && s.results ? s.results : []).forEach(g => {
    if (g.type !== 'player') return;
    (g.contents || []).forEach(c => {
      if (out || !c.uid || c.uid.indexOf('~a:') === -1) return;
      if (String(c.defaultLeagueSlug || '') === cfg.slug) out = { id: c.uid.split('~a:')[1], path: cfg.path };
    });
  });
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const date = String((req.query && req.query.date) || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(200).json({ error: 'bad_date' });

  try {
    const snap = await fetch(FB + '/gp_record/' + date + '.json').then(r => r.json());
    if (!snap || typeof snap !== 'object') {
      res.setHeader('Cache-Control', 's-maxage=1800');
      return res.status(200).json({ date: date, w: 0, l: 0, pending: 0 });
    }
    let w = 0, l = 0, pending = 0, budget = 15;
    for (const [id, p] of Object.entries(snap)) {
      if (!p || typeof p !== 'object') continue;
      if (p.graded === true) { w++; continue; }
      if (p.graded === false) { l++; continue; }
      if (budget <= 0) { pending++; continue; }
      budget--;
      try {
        const ath = await findAthlete(p.player, p.league);
        if (!ath) { pending++; continue; }
        const g = await fetch('https://site.web.api.espn.com/apis/common/v3/sports/' + ath.path + '/athletes/' + ath.id + '/gamelog', { headers: HDRS }).then(r => r.json());
        const pick = statPicker(p.prop, g && g.labels ? g.labels : []);
        if (!pick) { pending++; continue; }
        const meta = (g && g.events) || {};
        let val = null;
        (g.seasonTypes || []).forEach(st => (st.categories || []).forEach(cat => (cat.events || []).forEach(ev => {
          const m = meta[String(ev.eventId)] || {};
          if (String(m.gameDate || '').slice(0, 10) === date) {
            const v = pick(ev.stats || []);
            if (!isNaN(v)) val = v;
          }
        })));
        if (val == null) { pending++; continue; }
        const hit = p.side === 'over' ? val > p.line : val < p.line;
        if (hit) w++; else l++;
        await fetch(FB + '/gp_record/' + date + '/' + id + '/graded.json', { method: 'PUT', body: JSON.stringify(hit) });
      } catch (e) { pending++; }
    }
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json({ date: date, w: w, l: l, pending: pending });
  } catch (e) {
    return res.status(200).json({ error: 'grade_failed' });
  }
};
