"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Nav } from "@/components/Nav";

/*
  The Greenprint AI — cinematic workspace at /ai
  Talks to /api/ai-chat (server-side engine, key hidden on Vercel).
  Conversations persist in the browser (localStorage).
*/

type Role = "user" | "assistant";
interface Msg {
  role: Role;
  content: string;
}
interface Convo {
  id: string;
  title: string;
  messages: Msg[];
  ts: number;
}

const STARTERS = [
  { tag: "Build", text: "Build me a premium landing page for a new trading course. Dark, high end, with a hero and an email signup." },
  { tag: "Trade", text: "Break down a clean day trading setup with entry, stop loss, and target, and how to size the position." },
  { tag: "Content", text: "Give me 5 content hooks for The Greenprint that don't sound like generic guru hype." },
  { tag: "Strategy", text: "Act as my strategic partner. Ask me 3 sharp questions about The Greenprint before giving advice." },
];

function uid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// minimal safe markdown
function renderMd(src: string): string {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  let s = esc(src);
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _l, c) => `<pre><code>${c.replace(/\n$/, "")}</code></pre>`);
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  s = s.replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^# (.*)$/gm, "<h1>$1</h1>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/(?:^|\n)((?:[-*] .*(?:\n|$))+)/g, (_m, b) => `\n<ul>${b.trim().split("\n").map((l: string) => `<li>${l.replace(/^[-*] /, "")}</li>`).join("")}</ul>`);
  s = s.replace(/(?:^|\n)((?:\d+\. .*(?:\n|$))+)/g, (_m, b) => `\n<ol>${b.trim().split("\n").map((l: string) => `<li>${l.replace(/^\d+\. /, "")}</li>`).join("")}</ol>`);
  s = s.split(/\n{2,}/).map((c) => (/^\s*<(h[1-3]|ul|ol|pre)/.test(c) ? c : `<p>${c.replace(/\n/g, "<br>")}</p>`)).join("\n");
  return s;
}

const SITE_START = "===GREENPRINT_SITE_START===";
const SITE_END = "===GREENPRINT_SITE_END===";

// Pull a generated site out of an assistant message. Returns the HTML (or "")
// and the chat text with the site block replaced by a short placeholder.
// Handles the still-streaming case where only the start marker has arrived.
function extractSite(raw: string): { html: string; chat: string; building: boolean } {
  const i = raw.indexOf(SITE_START);
  if (i === -1) return { html: "", chat: raw, building: false };
  const afterStart = raw.slice(i + SITE_START.length);
  const j = afterStart.indexOf(SITE_END);
  if (j === -1) {
    // site still streaming in
    const intro = raw.slice(0, i).trim();
    const chat = (intro ? intro + "\n\n" : "") + "**Building your website...** it will appear in the panel.";
    return { html: afterStart.trim(), chat, building: true };
  }
  const html = afterStart.slice(0, j).trim();
  const intro = raw.slice(0, i).trim();
  const tail = afterStart.slice(j + SITE_END.length).trim();
  const chat =
    (intro ? intro + "\n\n" : "") +
    "**Your website is ready.** It's in the panel on the right, preview it, check the code, or download it." +
    (tail ? "\n\n" + tail : "");
  return { html, chat, building: false };
}
function cleanSiteHtml(h: string): string {
  // strip accidental markdown code fences around the HTML
  return h.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();
}

export default function GreenprintAI() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [siteHtml, setSiteHtml] = useState("");        // generated website HTML
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasTab, setCanvasTab] = useState<"preview" | "code">("preview");
  const abortRef = useRef<AbortController | null>(null);
  const riverRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // load persisted convos
  useEffect(() => {
    try {
      const raw = localStorage.getItem("gpai_convos");
      if (raw) {
        const list: Convo[] = JSON.parse(raw);
        setConvos(list);
        if (list.length) {
          setCurrentId(list[0].id);
          setMessages(list[0].messages);
        }
      }
    } catch {}
  }, []);

  const persist = useCallback((list: Convo[], id: string | null) => {
    try {
      localStorage.setItem("gpai_convos", JSON.stringify(list));
      if (id) localStorage.setItem("gpai_current", id);
    } catch {}
  }, []);

  const scrollDown = () => {
    requestAnimationFrame(() => {
      if (riverRef.current) riverRef.current.scrollTop = riverRef.current.scrollHeight;
    });
  };

  useEffect(scrollDown, [messages]);

  const autosize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 170) + "px";
  };

  function newChat() {
    if (streaming) abortRef.current?.abort();
    setCurrentId(null);
    setMessages([]);
    setRailOpen(false);
  }

  function loadChat(id: string) {
    if (streaming) abortRef.current?.abort();
    const c = convos.find((x) => x.id === id);
    if (!c) return;
    setCurrentId(id);
    setMessages(c.messages);
    setRailOpen(false);
  }

  function delChat(id: string) {
    const next = convos.filter((c) => c.id !== id);
    setConvos(next);
    if (currentId === id) {
      setCurrentId(next[0]?.id ?? null);
      setMessages(next[0]?.messages ?? []);
    }
    persist(next, next[0]?.id ?? null);
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    const userMsg: Msg = { role: "user", content };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput("");
    autosize();
    setStreaming(true);

    // ensure a conversation exists
    let convoId = currentId;
    let workingConvos = convos;
    if (!convoId) {
      convoId = uid();
      const c: Convo = { id: convoId, title: content.slice(0, 42), messages: nextMsgs, ts: Date.now() };
      workingConvos = [c, ...convos];
      setConvos(workingConvos);
      setCurrentId(convoId);
    }

    const aiMsg: Msg = { role: "assistant", content: "" };
    setMessages([...nextMsgs, aiMsg]);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/chat?kind=ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMsgs }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        let msg = "The AI engine did not respond.";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        aiMsg.content = `**${msg}**`;
        setMessages([...nextMsgs, { ...aiMsg }]);
      } else {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let acc = "";
        let openedCanvas = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          aiMsg.content = acc;
          // As soon as a build starts, open the canvas and show a building state,
          // but DO NOT re-render the iframe on every token (that causes flicker).
          if (!openedCanvas && acc.includes(SITE_START)) {
            setCanvasOpen(true);
            setCanvasTab("preview");
            setSiteHtml(""); // building state; filled once complete
            openedCanvas = true;
          }
          setMessages([...nextMsgs, { ...aiMsg }]);
          scrollDown();
        }
        // Build finished: now render the completed site exactly once.
        const final = extractSite(acc);
        if (final.html && acc.includes(SITE_END)) {
          setSiteHtml(cleanSiteHtml(final.html));
          setCanvasOpen(true);
        }
        if (!acc) {
          aiMsg.content = "(No response. Try again.)";
          setMessages([...nextMsgs, { ...aiMsg }]);
        }
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        aiMsg.content = aiMsg.content || "(Stopped.)";
      } else {
        aiMsg.content = "**Something went wrong reaching the AI engine.** Try again in a moment.";
      }
      setMessages([...nextMsgs, { ...aiMsg }]);
    } finally {
      setStreaming(false);
      abortRef.current = null;
      // persist final state
      const finalMsgs = [...nextMsgs, { ...aiMsg }];
      const updated = workingConvos.map((c) =>
        c.id === convoId ? { ...c, messages: finalMsgs, ts: Date.now(), title: c.title || content.slice(0, 42) } : c
      );
      setConvos(updated);
      persist(updated, convoId);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  const empty = messages.length === 0;

  // Fixed candlestick series plotted in the background (deterministic, no flicker).
  const CANDLES = [
    [34, 58, 30, 62], [60, 40, 36, 66], [38, 56, 34, 60], [54, 30, 26, 64],
    [30, 48, 26, 54], [46, 22, 18, 52], [24, 44, 20, 50], [42, 20, 16, 48],
    [22, 40, 18, 46], [40, 16, 12, 44], [18, 34, 14, 40], [36, 14, 10, 40],
    [16, 30, 12, 36], [32, 12, 8, 36], [14, 26, 10, 32], [28, 10, 6, 32],
  ];

  return (
    <div className="gp-root min-h-screen text-text flex flex-col relative overflow-hidden">
      <Nav />

      {/* ===== living blueprint background ===== */}
      <div className="gp-paper pointer-events-none fixed inset-0" aria-hidden>
        <svg className="gp-schematic" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="gpgrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="rgba(0,255,133,0.06)" strokeWidth="1" />
            </pattern>
            <pattern id="gpgridfine" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M8 0H0V8" fill="none" stroke="rgba(0,255,133,0.03)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="1200" height="800" fill="url(#gpgridfine)" />
          <rect width="1200" height="800" fill="url(#gpgrid)" />

          {/* drafting frame */}
          <rect className="gp-draw" x="40" y="40" width="1120" height="720" fill="none" stroke="rgba(0,255,133,0.22)" strokeWidth="1.5" />
          <rect className="gp-draw gp-d2" x="52" y="52" width="1096" height="696" fill="none" stroke="rgba(0,255,133,0.1)" strokeWidth="1" />

          {/* corner crop marks */}
          <g stroke="rgba(0,255,133,0.5)" strokeWidth="1.5" className="gp-draw gp-d1">
            <path d="M40 76 V40 H76" fill="none" /><path d="M1124 40 H1160 V76" fill="none" />
            <path d="M40 724 V760 H76" fill="none" /><path d="M1124 760 H1160 V724" fill="none" />
          </g>

          {/* center registration crosshair */}
          <g className="gp-reg" stroke="rgba(0,255,133,0.3)" strokeWidth="1">
            <circle cx="600" cy="400" r="26" fill="none" />
            <circle cx="600" cy="400" r="12" fill="none" />
            <path d="M600 360 V440 M560 400 H640" fill="none" />
          </g>

          {/* top dimension line with ticks */}
          <g className="gp-draw gp-d3" stroke="rgba(0,255,133,0.2)" strokeWidth="1">
            <path d="M120 100 H1080" fill="none" />
            {Array.from({ length: 13 }).map((_, k) => (
              <path key={k} d={`M${120 + k * 80} 94 V106`} fill="none" />
            ))}
          </g>

          {/* plotted candlestick series (your market) */}
          <g className="gp-candles">
            {CANDLES.map((c, k) => {
              const x = 180 + k * 54;
              const [open, close, low, high] = c;
              const base = 690;
              const up = close < open;
              const top = base - high * 2.2;
              const bot = base - low * 2.2;
              const ot = base - open * 2.2;
              const ct = base - close * 2.2;
              const y = Math.min(ot, ct);
              const h = Math.max(6, Math.abs(ot - ct));
              const col = up ? "rgba(0,255,133,0.55)" : "rgba(0,255,133,0.22)";
              return (
                <g key={k} className="gp-candle" style={{ animationDelay: `${0.8 + k * 0.05}s` }}>
                  <path d={`M${x + 8} ${top} V${bot}`} stroke={col} strokeWidth="1.2" />
                  <rect x={x} y={y} width="16" height={h} fill={up ? "rgba(0,255,133,0.18)" : "transparent"} stroke={col} strokeWidth="1.2" />
                </g>
              );
            })}
          </g>
        </svg>
        <div className="gp-haze" />
      </div>

      <div className="flex-1 flex pt-16 min-h-0 relative z-10">
        {/* ===== sidebar ===== */}
        <AnimatePresence>
          {railOpen && (
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRailOpen(false)} />
          )}
        </AnimatePresence>
        <aside className={`${railOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static top-16 bottom-0 left-0 z-40 w-64 gp-rail flex flex-col transition-transform duration-300`}>
          <div className="gp-rail-head px-4 py-3">
            <div className="text-[9px] uppercase tracking-[0.25em] text-accent/70">Sheet Index</div>
          </div>
          <div className="p-3 pt-2">
            <button onClick={newChat} className="gp-newbtn w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold transition-all">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
              New draft
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-px">
            {convos.length === 0 && <div className="text-muted/60 text-[10px] px-3 py-2 uppercase tracking-[0.2em]">No sheets yet</div>}
            {convos.map((c, idx) => (
              <div key={c.id} onClick={() => loadChat(c.id)}
                className={`group flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-all border-l-2 ${c.id === currentId ? "gp-convo-on" : "border-transparent text-muted hover:text-text hover:border-accent/30"}`}>
                <span className="text-[9px] text-accent/50 tabular-nums w-5">{String(idx + 1).padStart(2, "0")}</span>
                <span className="flex-1 truncate">{c.title || "Untitled"}</span>
                <button onClick={(e) => { e.stopPropagation(); delChat(c.id); }} className="opacity-0 group-hover:opacity-100 text-muted hover:text-red transition" aria-label="Delete">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-accent/10 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-muted">
            <span className="flex items-center gap-1.5"><span className="gp-pulse w-1.5 h-1.5 rounded-full bg-accent" />Online</span>
            <span className="text-accent/50">REV A</span>
          </div>
        </aside>

        {/* ===== main column ===== */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={riverRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6">
              {empty ? (
                <div className="flex flex-col items-center pt-[6vh] gp-enter">
                  {/* drafting title block */}
                  <div className="gp-titleblock">
                    <div className="gp-tb-main">
                      <div className="gp-tb-eyebrow">The Greenprint</div>
                      <h1 className="gp-tb-title">What's the blueprint?</h1>
                      <p className="gp-tb-sub">Describe it. The terminal drafts it live, websites, code, strategy, content. You hand over the plan, it builds the thing.</p>
                    </div>
                    <div className="gp-tb-meta">
                      <div><span>Drawn by</span><b>You</b></div>
                      <div><span>Scale</span><b className="tabular-nums">1:1</b></div>
                      <div><span>Sheet</span><b className="tabular-nums">01</b></div>
                      <div><span>Status</span><b className="gp-ready">Ready</b></div>
                    </div>
                  </div>

                  {/* callouts */}
                  <div className="grid sm:grid-cols-2 gap-3 w-full max-w-2xl mt-7">
                    {STARTERS.map((s, idx) => (
                      <button key={s.tag} onClick={() => send(s.text)} className="gp-callout group" style={{ animationDelay: `${0.5 + idx * 0.09}s` }}>
                        <span className="gp-callout-num tabular-nums">{String(idx + 1).padStart(2, "0")}</span>
                        <span className="gp-callout-tag">{s.tag}</span>
                        <span className="gp-callout-text">{s.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {messages.map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 grid place-items-center shrink-0 mt-0.5 ${m.role === "user" ? "gp-ava-user" : "gp-ava-ai"}`}>
                        {m.role === "assistant" ? (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#02140a" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 3 8-9" /><path d="M14 6h6v6" /></svg>
                        ) : (<span className="text-[9px] font-bold text-muted tracking-wider">YOU</span>)}
                      </div>
                      <div className={`min-w-0 ${m.role === "user" ? "max-w-[84%]" : "flex-1"}`}>
                        {m.role === "user" ? (
                          <div className="gp-user-bubble px-4 py-2.5 text-[15px]">{m.content}</div>
                        ) : (
                          <div className="gp-md text-[15px] leading-relaxed pt-1" dangerouslySetInnerHTML={{ __html: renderMd(extractSite(m.content).chat) + (streaming && i === messages.length - 1 ? '<span class="gp-cursor"></span>' : "") }} />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== command line ===== */}
          <div className="shrink-0 px-4 pb-5 pt-1 gp-composer-wrap">
            <div className="max-w-3xl mx-auto">
              <div className="gp-composer flex items-end gap-2 pl-3 pr-2 py-2 transition-all">
                <span className="gp-caret">▸</span>
                <textarea ref={taRef} value={input} rows={1}
                  onChange={(e) => { setInput(e.target.value); autosize(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Draft a site, write code, break down a setup..."
                  className="flex-1 min-w-0 bg-transparent resize-none outline-none text-[15px] py-1.5 max-h-[170px] placeholder:text-muted/70" />
                <button onClick={() => (streaming ? stop() : send())} disabled={!streaming && !input.trim()} className="gp-send shrink-0 w-10 h-10 grid place-items-center transition-all disabled:opacity-30">
                  {streaming ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="1" /></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  )}
                </button>
              </div>
              <p className="text-center text-[10px] text-muted/70 mt-2.5 tracking-[0.15em] uppercase">Greenprint AI, drafts can err, not financial advice</p>
            </div>
          </div>
        </div>

        {/* ===== draft canvas ===== */}
        {canvasOpen && (
          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col min-w-0 gp-canvas w-full lg:w-[48%] lg:shrink-0 fixed lg:static inset-0 top-16 z-30 lg:z-auto">
            <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 gp-canvas-head">
              <div className="flex gap-1 gp-tabs p-0.5">
                <button onClick={() => setCanvasTab("preview")} className={`px-3 py-1.5 text-xs font-semibold transition-all ${canvasTab === "preview" ? "gp-tab-on" : "text-muted"}`}>Preview</button>
                <button onClick={() => setCanvasTab("code")} className={`px-3 py-1.5 text-xs font-semibold transition-all ${canvasTab === "code" ? "gp-tab-on" : "text-muted"}`}>Spec</button>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] truncate flex items-center gap-1.5 text-muted"><span className="gp-pulse w-1.5 h-1.5 rounded-full bg-accent" />Draft Sheet</span>
              <div className="ml-auto flex gap-2">
                <button disabled={!siteHtml} onClick={() => { try { const blob = new Blob([siteHtml], { type: "text/html" }); const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = "greenprint-site.html"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); } catch {} }}
                  className="gp-dl text-xs font-semibold inline-flex items-center gap-1.5 px-2.5 py-1.5 disabled:opacity-30 transition-all">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M7 10l5 5 5-5M5 21h14" /></svg>
                  Export
                </button>
                <button onClick={() => setCanvasOpen(false)} className="w-7 h-7 grid place-items-center border border-accent/15 text-muted hover:text-text transition-colors" aria-label="Close">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 relative bg-white">
              {!siteHtml ? (
                <div className="absolute inset-0 grid place-items-center gp-canvas-building">
                  <div className="flex flex-col items-center gap-4">
                    <div className="gp-plotter"><span /><span /><span /></div>
                    <span className="text-[11px] text-muted tracking-[0.25em] uppercase">Plotting draft</span>
                  </div>
                </div>
              ) : canvasTab === "preview" ? (
                <iframe title="Draft preview" srcDoc={siteHtml} className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-forms allow-popups allow-modals" />
              ) : (
                <pre className="absolute inset-0 overflow-auto m-0 p-4 gp-code" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{siteHtml}</pre>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <button onClick={() => setRailOpen(true)} className="lg:hidden fixed bottom-24 left-4 z-30 w-11 h-11 rounded-full gp-fab grid place-items-center text-text" aria-label="Sheets">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      <style jsx global>{`
        .gp-root { background: #060a07; }
        .gp-paper { z-index: 0; }
        .gp-schematic { position: absolute; inset: 0; width: 100%; height: 100%; }
        .gp-haze { position: absolute; inset: 0; background: radial-gradient(ellipse 90% 70% at 50% 42%, transparent 35%, rgba(6,10,7,0.9) 100%); }

        /* self-drawing linework */
        .gp-draw { stroke-dasharray: 4000; stroke-dashoffset: 4000; animation: gp-plot 2.4s cubic-bezier(0.4,0,0.2,1) forwards; }
        .gp-d1 { animation-delay: 0.1s; } .gp-d2 { animation-delay: 0.3s; } .gp-d3 { animation-delay: 0.6s; }
        @keyframes gp-plot { to { stroke-dashoffset: 0; } }
        .gp-reg { opacity: 0; transform-origin: 600px 400px; animation: gp-reg-in 1s ease 1.2s forwards; }
        @keyframes gp-reg-in { from { opacity: 0; transform: scale(0.7) rotate(-20deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
        .gp-reg { animation-name: gp-reg-in, gp-reg-spin; animation-duration: 1s, 40s; animation-delay: 1.2s, 0s; animation-timing-function: ease, linear; animation-iteration-count: 1, infinite; animation-fill-mode: forwards, none; }
        @keyframes gp-reg-spin { to { transform: rotate(360deg); } }
        .gp-candle { opacity: 0; animation: gp-candle-in 0.5s ease forwards; }
        @keyframes gp-candle-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* sidebar */
        .gp-rail { background: rgba(7,11,8,0.82); backdrop-filter: blur(16px); border-right: 1px solid rgba(0,255,133,0.1); }
        .gp-rail-head { border-bottom: 1px solid rgba(0,255,133,0.08); }
        .gp-newbtn { background: transparent; border: 1px solid rgba(0,255,133,0.25); color: #F5F5F5; }
        .gp-newbtn:hover { border-color: #00FF85; background: rgba(0,255,133,0.06); box-shadow: inset 0 0 20px -8px rgba(0,255,133,0.5); }
        .gp-convo-on { border-left-color: #00FF85; background: rgba(0,255,133,0.07); color: #F5F5F5; }
        .gp-pulse { box-shadow: 0 0 8px #00FF85; animation: gp-pulse 2s ease-in-out infinite; }
        @keyframes gp-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

        /* enter */
        .gp-enter { opacity: 0; animation: gp-fade 0.9s ease 0.5s forwards; }
        @keyframes gp-fade { to { opacity: 1; } }

        /* drafting title block */
        .gp-titleblock { width: 100%; max-width: 44rem; border: 1px solid rgba(0,255,133,0.22); background: rgba(8,13,9,0.55); backdrop-filter: blur(8px); box-shadow: 0 30px 80px -30px rgba(0,255,133,0.25); }
        .gp-tb-main { padding: 30px 30px 24px; border-bottom: 1px solid rgba(0,255,133,0.15); }
        .gp-tb-eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 0.4em; color: #00FF85; font-weight: 700; }
        .gp-tb-title { font-size: clamp(28px, 5.5vw, 44px); font-weight: 900; letter-spacing: -0.035em; line-height: 1.0; margin: 14px 0 0; color: #F5F5F5; }
        .gp-tb-sub { color: #9aa79a; font-size: 14.5px; line-height: 1.55; margin: 14px 0 0; max-width: 34rem; }
        .gp-tb-meta { display: grid; grid-template-columns: repeat(4, 1fr); }
        .gp-tb-meta > div { padding: 13px 16px; border-right: 1px solid rgba(0,255,133,0.12); display: flex; flex-direction: column; gap: 3px; }
        .gp-tb-meta > div:last-child { border-right: none; }
        .gp-tb-meta span { font-size: 9px; text-transform: uppercase; letter-spacing: 0.2em; color: #5f6b5f; }
        .gp-tb-meta b { font-size: 13px; font-weight: 700; color: #cdd6cd; }
        .gp-ready { color: #00FF85 !important; display: inline-flex; align-items: center; gap: 5px; }
        .gp-ready::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #00FF85; box-shadow: 0 0 8px #00FF85; animation: gp-pulse 2s ease-in-out infinite; }

        /* callouts */
        .gp-callout { position: relative; text-align: left; padding: 16px 16px 16px 44px; border: 1px solid rgba(0,255,133,0.14); background: rgba(8,13,9,0.4); backdrop-filter: blur(6px); transition: all 0.25s cubic-bezier(0.16,1,0.3,1); opacity: 0; transform: translateY(12px); animation: gp-rise 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes gp-rise { to { opacity: 1; transform: translateY(0); } }
        .gp-callout:hover { border-color: rgba(0,255,133,0.5); background: rgba(0,255,133,0.05); transform: translateY(-2px); box-shadow: 0 16px 40px -16px rgba(0,255,133,0.4); }
        .gp-callout-num { position: absolute; left: 14px; top: 16px; font-size: 11px; font-weight: 800; color: #00FF85; opacity: 0.6; }
        .gp-callout-tag { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.22em; color: #00FF85; font-weight: 700; }
        .gp-callout-text { display: block; font-size: 13.5px; color: #9aa79a; margin-top: 6px; line-height: 1.4; }
        .gp-callout:hover .gp-callout-text { color: #e4ebe4; }

        /* avatars + bubbles */
        .gp-ava-ai { background: linear-gradient(145deg, #00FF85, #0a7a39); box-shadow: 0 0 18px -6px #00FF85; }
        .gp-ava-user { background: rgba(255,255,255,0.04); border: 1px solid rgba(0,255,133,0.15); }
        .gp-user-bubble { background: rgba(0,255,133,0.08); border: 1px solid rgba(0,255,133,0.22); border-left: 2px solid #00FF85; }

        /* command line */
        .gp-composer-wrap { background: linear-gradient(to top, #060a07 55%, transparent); }
        .gp-composer { background: rgba(8,13,9,0.8); backdrop-filter: blur(16px); border: 1px solid rgba(0,255,133,0.2); }
        .gp-composer:focus-within { border-color: rgba(0,255,133,0.6); box-shadow: 0 0 0 3px rgba(0,255,133,0.08), inset 0 0 30px -12px rgba(0,255,133,0.4); }
        .gp-caret { color: #00FF85; font-size: 16px; line-height: 1; padding-bottom: 9px; animation: gp-pulse 1.4s ease-in-out infinite; }
        .gp-send { background: #00FF85; color: #02140a; box-shadow: 0 0 18px -6px #00FF85; }
        .gp-send:hover:not(:disabled) { filter: brightness(1.12); box-shadow: 0 0 26px -4px #00FF85; }

        /* canvas */
        .gp-canvas { background: rgba(6,10,7,0.92); backdrop-filter: blur(16px); border-left: 1px solid rgba(0,255,133,0.12); }
        .gp-canvas-head { background: rgba(8,13,9,0.85); border-bottom: 1px solid rgba(0,255,133,0.1); }
        .gp-tabs { background: rgba(0,255,133,0.05); }
        .gp-tab-on { background: rgba(0,255,133,0.16); color: #00FF85; }
        .gp-dl { background: #00FF85; color: #02140a; }
        .gp-dl:hover:not(:disabled) { filter: brightness(1.12); }
        .gp-canvas-building { background: #070b08; }
        .gp-plotter { display: flex; gap: 6px; }
        .gp-plotter span { width: 6px; height: 28px; background: #00FF85; opacity: 0.3; animation: gp-plot-bar 1s ease-in-out infinite; }
        .gp-plotter span:nth-child(2) { animation-delay: 0.15s; } .gp-plotter span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes gp-plot-bar { 0%,100% { transform: scaleY(0.4); opacity: 0.3; } 50% { transform: scaleY(1); opacity: 1; } }
        .gp-code { background: #060a07; color: #bfe; }
        .gp-fab { background: rgba(8,13,9,0.9); backdrop-filter: blur(12px); border: 1px solid rgba(0,255,133,0.25); box-shadow: 0 0 20px -8px #00FF85; }

        /* markdown */
        .gp-md p { margin: 0 0 10px; } .gp-md p:last-child { margin-bottom: 0; }
        .gp-md ul, .gp-md ol { margin: 4px 0 11px; padding-left: 22px; } .gp-md li { margin: 3px 0; }
        .gp-md h1, .gp-md h2, .gp-md h3 { font-weight: 800; margin: 15px 0 7px; line-height: 1.25; letter-spacing: -0.015em; }
        .gp-md h1 { font-size: 19px; } .gp-md h2 { font-size: 17px; } .gp-md h3 { font-size: 15px; }
        .gp-md strong { color: #fff; font-weight: 650; } .gp-md a { color: #00FF85; }
        .gp-md code { font-family: "JetBrains Mono", monospace; font-size: 12.5px; background: rgba(0,255,133,0.06); border: 1px solid rgba(0,255,133,0.12); padding: 1px 5px; border-radius: 3px; }
        .gp-md pre { background: rgba(0,0,0,0.45); border: 1px solid rgba(0,255,133,0.12); padding: 12px 14px; overflow-x: auto; margin: 4px 0 11px; }
        .gp-md pre code { background: none; border: none; padding: 0; font-size: 12.5px; line-height: 1.5; }
        .gp-cursor { display: inline-block; width: 8px; height: 15px; background: #00FF85; vertical-align: -2px; margin-left: 2px; box-shadow: 0 0 8px #00FF85; animation: gpblink 1s step-end infinite; }
        @keyframes gpblink { 50% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .gp-draw, .gp-reg, .gp-candle, .gp-enter, .gp-callout, .gp-cursor, .gp-pulse, .gp-caret, .gp-plotter span, .gp-ready::before { animation: none !important; }
          .gp-draw { stroke-dashoffset: 0; } .gp-reg, .gp-candle, .gp-enter, .gp-callout { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
