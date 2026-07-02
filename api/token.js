// LiveKit token endpoint — GET style, matching the proven-working functions
// (api/props.js, api/hitrate.js). Used by /go-live (host) and /stream (viewers).
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const q = req.query || {};
  const name = String(q.name || '');
  const isHost = String(q.isHost || '') === '1';

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !url) {
    return res.status(500).json({ error: 'LiveKit not configured' });
  }

  const { AccessToken } = await import('livekit-server-sdk');
  const at = new AccessToken(apiKey, apiSecret, {
    identity: isHost ? 'host' : (name || 'viewer-' + Date.now()),
    ttl: '4h',
  });
  at.addGrant({ roomJoin: true, room: 'greenprint-live', canPublish: isHost });
  const token = await at.toJwt();

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ token: token, url: url });
};
