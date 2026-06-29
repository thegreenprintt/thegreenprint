import { AccessToken } from 'livekit-server-sdk';
import { NextRequest } from 'next/server';

const ROOM = 'greenprint-live';

export async function POST(req: NextRequest) {
  const { name, isHost } = await req.json();
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !url) {
    return Response.json({ error: 'LiveKit not configured' }, { status: 500 });
  }
  const at = new AccessToken(apiKey, apiSecret, {
    identity: isHost ? 'host' : (name || `viewer-${Date.now()}`),
    ttl: '4h',
  });
  at.addGrant({ roomJoin: true, room: ROOM, canPublish: !!isHost });
  const token = await at.toJwt();
  return Response.json({ token, url });
}
