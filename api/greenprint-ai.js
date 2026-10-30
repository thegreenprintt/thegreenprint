// ─── THE GREENPRINT AI ENGINE (classic serverless function) ──────────────────
//   POST /api/greenprint-ai { messages:[{role,content}], model? }  -> streams reply text
//   GET  /api/greenprint-ai                                        -> health/config check
// Matches the project's proven function style (module.exports handler, req/res).
// The model key lives in OPENROUTER_API_KEY (Vercel env), never in the browser.
// Defaults to a free open model so running it costs nothing.

const DEFAULT_MODEL = process.env.GREENPRINT_AI_MODEL || "deepseek/deepseek-chat-v3-0324:free";

function getKey() {
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_KEY ||
    process.env.OPEN_ROUTER_API_KEY ||
    process.env.NEXT_OPENROUTER_API_KEY ||
    ""
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

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const key = getKey();

  // Health check: GET reports config WITHOUT exposing the key value.
  if (req.method === "GET") {
    const seen = Object.keys(process.env).filter((k) => /OPENROUTER|OPEN_ROUTER/i.test(k));
    let liveKeyTest = "skipped (no key)";
    if (key) {
      try {
        const r = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: "Bearer " + key },
        });
        liveKeyTest = { status: r.status, ok: r.ok, meaning: r.ok ? "KEY WORKS" : "key rejected by OpenRouter" };
      } catch (e) {
        liveKeyTest = { error: String((e && e.message) || e) };
      }
    }
    return res.status(200).json({
      engine: "greenprint-ai",
      alive: true,
      keyPresent: !!key,
      keyStartsWith: key ? key.slice(0, 7) : null,
      openrouterVarNamesFound: seen,
      liveKeyTest,
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!key) {
    const seen = Object.keys(process.env).filter((k) => /OPENROUTER|OPEN_ROUTER/i.test(k));
    const hint = seen.length
      ? "Found related variables but not a usable key: " + seen.join(", ") + ". The name must be exactly OPENROUTER_API_KEY, enabled for Production, then redeploy."
      : "No OpenRouter key is set. Add an environment variable named exactly OPENROUTER_API_KEY in Vercel (Production), then redeploy.";
    return res.status(503).json({ error: hint });
  }

  // Parse body (string or object, matching the other functions here).
  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: "Bad request body." });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const history = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  const messages = [{ role: "system", content: SYSTEM_PROMPT }].concat(history);

  let upstream;
  try {
    upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key,
        "HTTP-Referer": "https://thegreenprint.trade",
        "X-Title": "The Greenprint AI",
      },
      body: JSON.stringify({ model: body.model || DEFAULT_MODEL, stream: true, messages }),
    });
  } catch (e) {
    return res.status(502).json({ error: "Could not reach the model service." });
  }

  if (!upstream.ok || !upstream.body) {
    let detail = "";
    try {
      const j = await upstream.json();
      detail = (j && j.error && j.error.message) || "";
    } catch (e) {}
    return res.status(502).json({ error: "The model did not respond (" + upstream.status + "). " + detail });
  }

  // Stream plain text tokens to the browser as they arrive.
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let carry = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      carry += decoder.decode(value, { stream: true });
      const lines = carry.split("\n");
      carry = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.indexOf) continue;
        if (t.indexOf("data:") !== 0) continue;
        const data = t.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const delta = json && json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content;
          if (delta) res.write(delta);
        } catch (e) {
          // incomplete JSON line, skip
        }
      }
    }
  } catch (e) {
    // stream interrupted; end gracefully
  }
  res.end();
};
