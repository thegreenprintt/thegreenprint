import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  Diagnostic endpoint for The Greenprint AI.
  Visit /api/ai-health in a browser. It reports what the running server can see,
  WITHOUT ever exposing secret values. Used to pinpoint config problems.
*/

export async function GET() {
  const envNames = Object.keys(process.env);

  const openrouterNames = envNames.filter((k) => /OPENROUTER|OPEN_ROUTER/i.test(k));
  const keyValue =
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_KEY ||
    process.env.OPEN_ROUTER_API_KEY ||
    process.env.NEXT_OPENROUTER_API_KEY ||
    "";

  // Report presence and shape only — never the actual key.
  const keyReport = keyValue
    ? {
        present: true,
        length: keyValue.length,
        startsWith: keyValue.slice(0, 7), // e.g. "sk-or-v" — safe, identifies format
        looksValid: keyValue.startsWith("sk-or-"),
      }
    : { present: false };

  let liveTest: unknown = "skipped (no key)";
  if (keyValue) {
    // Make one tiny real call to OpenRouter to prove the key actually works.
    try {
      const r = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${keyValue}` },
      });
      liveTest = { status: r.status, ok: r.ok, meaning: r.ok ? "KEY WORKS" : "key rejected by OpenRouter" };
    } catch (e: any) {
      liveTest = { error: String(e?.message || e) };
    }
  }

  return NextResponse.json(
    {
      ok: true,
      runtime: "nodejs",
      node: process.version,
      vercelEnv: process.env.VERCEL_ENV || "(not on vercel?)",
      openrouterVarNamesFound: openrouterNames,
      key: keyReport,
      liveKeyTest: liveTest,
      hint: keyReport.present
        ? "Key is visible to the server. Check liveKeyTest to see if OpenRouter accepts it."
        : "No OpenRouter key is visible to this deployment. It is either not saved, named wrong, or not enabled for the Production environment. After fixing, you MUST redeploy.",
    },
    { status: 200 }
  );
}
