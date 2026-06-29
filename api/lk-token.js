module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  const { AccessToken } = await import('livekit-server-sdk');
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const { name, isHost } = body;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !url) {
    return res.status(500).json({ error: 'LiveKit not configured' });
  }
  const at = new AccessToken(apiKey, apiSecret, {
    identity: isHost ? 'host' : (name || 'viewer-' + Date.now()),
    ttl: '4h',
  });
  at.addGrant({ roomJoin: true, room: 'greenprint-live', canPublish: !!isHost });
  const token = await at.toJwt();
  res.json({ token, url });
};
