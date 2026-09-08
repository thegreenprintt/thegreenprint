import { createHmac } from "node:crypto";

export const runtime = "nodejs";

export async function GET() {
  const h = createHmac("sha256", "x").update("y").digest("hex").slice(0, 6);
  return Response.json({ ok: true, marker: "GPTEST_MARKER_v3", h });
}

