import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const key = process.env.METERED_SECRET_KEY ?? "";
  const domain = process.env.METERED_DOMAIN ?? "thegreenprint.metered.live";

  // Fallback ICE servers (STUN only) used if Metered is unavailable
  const fallback: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];

  if (!key) return NextResponse.json(fallback);

  try {
    const r = await fetch(
      `https://${domain}/api/v1/turn/credentials?apiKey=${key}`,
      { next: { revalidate: 60 } }
    );
    if (!r.ok) return NextResponse.json(fallback);
    const servers = await r.json();
    return NextResponse.json(servers);
  } catch {
    return NextResponse.json(fallback);
  }
}
