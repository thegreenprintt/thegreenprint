export const runtime = "nodejs";
export async function GET() {
  return Response.json({ ok: true, marker: "GPTEST_MARKER_9x" });
}
