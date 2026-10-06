import { NextResponse } from "next/server";
export const runtime = "nodejs";
// Unused stub — push runs on root /api/webpush.js.
export async function GET() { return NextResponse.json({ ok: true }); }
