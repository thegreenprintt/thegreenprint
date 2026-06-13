const SECRET = process.env.LIVE_SECRET || 'gp-live-2024';
let state = { isLive: false, title: '', updatedAt: 0 };

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Live-Secret');
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json(state);
  }

  if (req.method === 'POST') {
    if (req.headers['x-live-secret'] !== SECRET) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const { isLive, title } = req.body || {};
    state = { isLive: !!isLive, title: title || '', updatedAt: Date.now() };
    return res.status(200).json({ ok: true, state });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
