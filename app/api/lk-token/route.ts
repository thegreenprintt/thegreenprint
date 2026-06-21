import { AccessToken } from 'livekit-server-sdk';
import { NextRequest } from 'next/server';

const ROOM = 'greenprint-live';

export async function POST(req: NextRequest) {
  const { name, isHost } = await req.json();
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return Response.json({ error: 'LiveKit not configured' }, { status: 500 });
  }
  const at = new AccessToken(apiKey, apiSecret, {
    identity: isHost ? 'host' : (name || `viewer-${Date.now()}`),
    ttl: '4h',
  });
  at.addGrant({
    roomJoin: true,
    room: ROOM,
    canPublish: !!isHost,
    canPublishData: true,
    canSubscribe: true,
  });
  const token = await at.toJwt();
  return Response.json({ token, room: ROOM, url: process.env.NEXT_PUBLIC_LIVEKIT_URL });
}
