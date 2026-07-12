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
  const wantsStage = String(q.stage || '') === '1';

  // Stage guests: only get publish rights if the host approved this name in Firebase
  let isApprovedGuest = false;
  if (wantsStage && !isHost && name) {
    try {
      const key = name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
      const fb = await fetch('https://the-greenprint-53d98-default-rtdb.firebaseio.com/live/stage/approved/' + key + '.json');
      const entry = await fb.json();
      isApprovedGuest = !!(entry && entry.name === name);
    } catch (e) {}
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !url) {
    return res.status(500).json({ error: 'LiveKit not configured' });
  }

  const { AccessToken } = await import('livekit-server-sdk');
  const at = new AccessToken(apiKey, apiSecret, {
    identity: isHost ? 'host' : (isApprovedGuest ? 'guest-' + name : (name || 'viewer-' + Date.now())),
    ttl: isApprovedGuest ? '2h' : '4h',
  });
  at.addGrant({ roomJoin: true, room: 'greenprint-live', canPublish: isHost || isApprovedGuest });
  const token = await at.toJwt();

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ token: token, url: url });
};
