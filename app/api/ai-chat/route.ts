import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  The Greenprint AI engine (server-side).
  The model key lives in the OPENROUTER_API_KEY env var on Vercel, never in the browser.
  Defaults to a free open model so running it costs nothing.
  Streams the reply back to the page.
*/

const DEFAULT_MODEL = process.env.GREENPRINT_AI_MODEL || "deepseek/deepseek-chat-v3-0324:free";

// Read the key tolerantly: accept the main name and a couple of common variants,
// so a small naming slip in Vercel doesn't silently break the engine.
function getKey(): string | undefined {
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_KEY ||
    process.env.OPEN_ROUTER_API_KEY ||
    process.env.NEXT_OPENROUTER_API_KEY ||
    undefined
  );
}

const SYSTEM_PROMPT =
  "You are The Greenprint AI, the in-house AI for The Greenprint, a trading-education brand " +
  "covering day trading, investing, and commercial real estate. You are direct, confident, and practical. " +
  "No hype, no fake enthusiasm, no generic motivational filler. You explain markets and trading clearly. " +
  "Never guarantee or promise trading profits. Never invent live prices or market data; if asked for a live " +
  "price, say you do not have live market data. When you refer to risk control on a trade, always write " +
  "'stop loss' or 'stop losses', never 'stops'. Do not use em dashes or en dashes anywhere in your writing; " +
  "use commas or periods instead. Keep answers useful and to the point.";

type Msg = { role: "user" | "assistant" | "system"; content: string };

export async function POST(req: NextRequest) {
  const key = getKey();
  if (!key) {
    // List which OpenRouter-ish env names ARE present (names only, never values),
    // so configuration problems are obvious instead of silent.
    const seen = Object.keys(process.env).filter((k) => /OPENROUTER|OPEN_ROUTER/i.test(k));
    const hint = seen.length
      ? `Found these related variables but not a usable key: ${seen.join(", ")}. The name must be exactly OPENROUTER_API_KEY and be enabled for Production.`
      : "No OpenRouter key is set. Add an environment variable named exactly OPENROUTER_API_KEY in Vercel (Production), then redeploy.";
    return new Response(JSON.stringify({ error: hint }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { messages?: Msg[]; model?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Bad request." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  // Keep only clean user/assistant turns, cap history so the prompt stays small.
  const history = incoming
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  const messages: Msg[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://thegreenprint.trade",
      "X-Title": "The Greenprint AI",
    },
    body: JSON.stringify({
      model: body.model || DEFAULT_MODEL,
      stream: true,
      messages,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    let detail = "";
    try {
      const j = await upstream.json();
      detail = j?.error?.message || "";
    } catch {}
    return new Response(
      JSON.stringify({ error: `The model did not respond (${upstream.status}). ${detail}`.trim() }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Re-stream OpenRouter's SSE straight through to the browser.
  // Buffer across reads so a data: line split between chunks is never dropped.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  let carry = "";

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        carry += decoder.decode(value, { stream: true });
        const lines = carry.split("\n");
        carry = lines.pop() ?? ""; // keep the last, possibly-incomplete line
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json?.choices?.[0]?.delta?.content || "";
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            // incomplete JSON, should not happen once lines are whole; skip
          }
        }
      } catch (e) {
        controller.close();
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
