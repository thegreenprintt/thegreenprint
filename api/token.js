// LiveKit token endpoint — GET style, matching the proven-working functions
// (api/props.js, api/hitrate.js). Used by /go-live (host) and /stream (viewers).
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const q = req.query || {};
  const name = String(q.name || '');
  // SECURITY: a host token (publish rights over the whole stream) now requires the
  // broadcast password — previously anyone could mint one with ?isHost=1.
  const HOST_HASH = 'f7bbb300691e55f6eaad18327a462a30ff3bf38a4a36a24e9458fdfc508d4ab1';
  let isHost = false;
  if (String(q.isHost || '') === '1') {
    try {
      const crypto = require('crypto');
      const keyHash = crypto.createHash('sha256').update(String(q.key || '')).digest('hex');
      isHost = keyHash === HOST_HASH;
    } catch (e) { isHost = false; }
  }
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

  // ── MEETING MODE: Zoom-style room, entry gated by the meeting code the host set ──
  if (String(q.mode || '') === 'meeting') {
    if (!name) return res.status(400).json({ error: 'Name required' });
    const FB = 'https://the-greenprint-53d98-default-rtdb.firebaseio.com';
    const fbRead = async (p) => { try { const r = await fetch(FB + p); return await r.json(); } catch (e) { return null; } };
    const meetingCode = await fbRead('/live/meeting/code.json');
    if (!meetingCode || String(q.code || '') !== String(meetingCode)) {
      return res.status(403).json({ error: 'Wrong meeting code' });
    }
    // Meeting HOST: proven by the broadcast password (server-verified) — gets the
    // 'mhost-' identity prefix that unlocks moderation tools in the room UI.
    let isMeetingHost = false;
    if (q.hostkey) {
      try {
        const crypto = require('crypto');
        isMeetingHost = crypto.createHash('sha256').update(String(q.hostkey)).digest('hex')
          === 'f7bbb300691e55f6eaad18327a462a30ff3bf38a4a36a24e9458fdfc508d4ab1';
      } catch (e) {}
    }
    // Waiting room + lock (host-controlled). Host and admitted names bypass both.
    const nameKey = name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
    const [settings, admitted] = await Promise.all([
      fbRead('/live/meeting/settings.json'),
      fbRead('/live/meeting/admitted/' + nameKey + '.json'),
    ]);
    const isAdmitted = isMeetingHost || !!(admitted && admitted.name === name);
    if (settings && settings.locked && !isAdmitted) {
      return res.status(423).json({ locked: true, error: 'Meeting is locked' });
    }
    if (settings && settings.waiting && !isAdmitted) {
      return res.status(428).json({ waiting: true, error: 'Waiting for host approval' });
    }
    const mt = new AccessToken(apiKey, apiSecret, {
      identity: (isMeetingHost ? 'mhost-' : 'meet-') + name.slice(0, 30) + '-' + Math.floor(Math.random() * 10000),
      ttl: '4h',
    });
    mt.addGrant({ roomJoin: true, room: 'greenprint-meeting', canPublish: true, canSubscribe: true });
    const mtoken = await mt.toJwt();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ token: mtoken, url: url });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: isHost ? 'host' : (isApprovedGuest ? 'guest-' + name : (name || 'viewer-' + Date.now())),
    ttl: isApprovedGuest ? '2h' : '4h',
  });
  at.addGrant({ roomJoin: true, room: 'greenprint-live', canPublish: isHost || isApprovedGuest });
  const token = await at.toJwt();

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ token: token, url: url });
};
