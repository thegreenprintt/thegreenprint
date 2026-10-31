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
  const CAPS = ["Websites", "The code behind them", "Go-to-market strategy", "Content that converts", "Trade breakdowns", "Your entire brand"];

  return (
    <div className="gp-root min-h-screen text-text flex flex-col relative">
      <Nav />

      {/* cinematic breathing aurora */}
      <div className="gp-stage pointer-events-none fixed inset-0" aria-hidden>
        <div className="gp-aurora gp-a1" />
        <div className="gp-aurora gp-a2" />
        <div className="gp-aurora gp-a3" />
        <div className="gp-noise" />
        <div className="gp-floor" />
      </div>

      <div className="flex-1 flex pt-16 min-h-0 relative z-10">
        {/* ===== sidebar ===== */}
        <AnimatePresence>
          {railOpen && (
            <motion.div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRailOpen(false)} />
          )}
        </AnimatePresence>
        <aside className={`${railOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static top-16 bottom-0 left-0 z-40 w-[258px] gp-rail flex flex-col transition-transform duration-300`}>
          <div className="p-3">
            <button onClick={newChat} className="gp-newbtn w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] font-semibold transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
              New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-0.5">
            {convos.length === 0 && <div className="text-muted/50 text-[11px] px-3 py-2 tracking-wide">No conversations yet</div>}
            {convos.map((c) => (
              <div key={c.id} onClick={() => loadChat(c.id)}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-[13.5px] cursor-pointer transition-colors ${c.id === currentId ? "gp-convo-on" : "text-muted hover:text-text hover:bg-white/[0.04]"}`}>
                <span className="flex-1 truncate">{c.title || "Untitled"}</span>
                <button onClick={(e) => { e.stopPropagation(); delChat(c.id); }} className="opacity-0 group-hover:opacity-100 text-muted hover:text-red transition" aria-label="Delete">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="px-4 py-3.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] tracking-[0.15em] uppercase text-muted">
            <span className="flex items-center gap-1.5"><span className="gp-dot w-1.5 h-1.5 rounded-full" />Live</span>
            <span className="gp-goldtext">Greenprint</span>
          </div>
        </aside>

        {/* ===== main column ===== */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={riverRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-5 py-8">
              {empty ? (
                <div className="gp-hero flex flex-col items-center text-center">
                  {/* signature intelligence core */}
                  <motion.div className="gp-core" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>
                    <span className="gp-core-ring" />
                    <span className="gp-core-ring gp-core-ring2" />
                    <span className="gp-core-glow" />
                    <span className="gp-core-mark">
                      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#06110a" strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 3 8-9" /><path d="M14 6h6v6" /></svg>
                    </span>
                  </motion.div>

                  <motion.div className="gp-eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}>
                    The Greenprint Intelligence
                  </motion.div>

                  <motion.h1 className="gp-head" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}>
                    Describe it.<br /><span className="gp-head-accent">Watch it build.</span>
                  </motion.h1>

                  <motion.p className="gp-sub" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.38 }}>
                    One prompt becomes a website, the code behind it, a strategy, a campaign, a trade breakdown. The whole operation, built in front of you.
                  </motion.p>

                  {/* always-moving capability marquee */}
                  <motion.div className="gp-marquee" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.6 }}>
                    <div className="gp-marquee-track">
                      {[...CAPS, ...CAPS].map((cap, k) => (
                        <span key={k} className="gp-mq-item"><span className="gp-mq-dot" />{cap}</span>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div className="gp-cards" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.72, ease: [0.16, 1, 0.3, 1] }}>
                    {STARTERS.map((s, idx) => (
                      <button key={s.tag} onClick={() => send(s.text)} className="gp-card group">
                        <span className="gp-card-tag">{s.tag}</span>
                        <span className="gp-card-text">{s.text}</span>
                        <span className="gp-card-go">Build<svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
                      </button>
                    ))}
                  </motion.div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {messages.map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`flex gap-3.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-xl grid place-items-center shrink-0 mt-0.5 ${m.role === "user" ? "gp-ava-user" : "gp-ava-ai"}`}>
                        {m.role === "assistant" ? (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#06110a" strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 3 8-9" /><path d="M14 6h6v6" /></svg>
                        ) : (<span className="text-[9px] font-bold text-muted">YOU</span>)}
                      </div>
                      <div className={`min-w-0 ${m.role === "user" ? "max-w-[82%]" : "flex-1"}`}>
                        {m.role === "user" ? (
                          <div className="gp-user-bubble px-4 py-2.5 text-[15px]">{m.content}</div>
                        ) : (
                          <div className="gp-md text-[15px] leading-[1.65] pt-0.5" dangerouslySetInnerHTML={{ __html: renderMd(extractSite(m.content).chat) + (streaming && i === messages.length - 1 ? '<span class="gp-cursor"></span>' : "") }} />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== composer with live gradient border ===== */}
          <div className="shrink-0 px-5 pb-6 pt-2 gp-composer-wrap">
            <div className="max-w-3xl mx-auto">
              <div className="gp-composer-shell">
                <div className="gp-composer flex items-end gap-2">
                  <textarea ref={taRef} value={input} rows={1}
                    onChange={(e) => { setInput(e.target.value); autosize(); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Describe what you want to build..."
                    className="flex-1 min-w-0 bg-transparent resize-none outline-none border-0 text-[15px] leading-[1.5] py-1.5 max-h-[180px] placeholder:text-muted/55" />
                  <button onClick={() => (streaming ? stop() : send())} disabled={!streaming && !input.trim()} className="gp-send shrink-0 w-9 h-9 rounded-xl grid place-items-center transition-all disabled:opacity-25">
                    {streaming ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== build canvas ===== */}
        {canvasOpen && (
          <motion.div initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col min-w-0 gp-canvas w-full lg:w-[48%] lg:shrink-0 fixed lg:static inset-0 top-16 z-30 lg:z-auto">
            <div className="shrink-0 flex items-center gap-2 px-3.5 py-2.5 gp-canvas-head">
              <div className="flex gap-0.5 gp-tabs rounded-lg p-0.5">
                <button onClick={() => setCanvasTab("preview")} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${canvasTab === "preview" ? "gp-tab-on" : "text-muted"}`}>Preview</button>
                <button onClick={() => setCanvasTab("code")} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${canvasTab === "code" ? "gp-tab-on" : "text-muted"}`}>Code</button>
              </div>
              <span className="text-[12px] text-muted truncate">Website</span>
              <div className="ml-auto flex gap-2">
                <button disabled={!siteHtml} onClick={() => { try { const blob = new Blob([siteHtml], { type: "text/html" }); const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = "greenprint-site.html"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); } catch {} }}
                  className="gp-dl text-[12px] font-semibold inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 disabled:opacity-30 transition-all">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M7 10l5 5 5-5M5 21h14" /></svg>
                  Download
                </button>
                <button onClick={() => setCanvasOpen(false)} className="w-7 h-7 grid place-items-center rounded-lg border border-white/10 text-muted hover:text-text transition-colors" aria-label="Close">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 relative bg-white">
              {!siteHtml ? (
                <div className="absolute inset-0 grid place-items-center gp-canvas-building">
                  <div className="flex flex-col items-center gap-4">
                    <div className="gp-build-core"><span /><span /></div>
                    <span className="text-[12px] text-muted tracking-wide">Building your website</span>
                  </div>
                </div>
              ) : canvasTab === "preview" ? (
                <iframe title="Website preview" srcDoc={siteHtml} className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-forms allow-popups allow-modals" />
              ) : (
                <pre className="absolute inset-0 overflow-auto m-0 p-4 gp-code" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{siteHtml}</pre>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <button onClick={() => setRailOpen(true)} className="lg:hidden fixed bottom-24 left-4 z-30 w-10 h-10 rounded-full gp-fab grid place-items-center text-text" aria-label="Conversations">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap');
        .gp-root { background: #060806; --gold: #d8b25e; --gold-bright: #f0d089; --grn: #00ff85; }

        /* cinematic aurora */
        .gp-stage { z-index: 0; overflow: hidden; }
        .gp-aurora { position: absolute; border-radius: 50%; filter: blur(90px); mix-blend-mode: screen; }
        .gp-a1 { width: 70vw; height: 70vw; top: -30vw; left: -10vw; background: radial-gradient(circle, rgba(0,255,133,0.18), transparent 62%); animation: gp-drift1 24s ease-in-out infinite; }
        .gp-a2 { width: 55vw; height: 55vw; top: -8vw; right: -18vw; background: radial-gradient(circle, rgba(216,178,94,0.16), transparent 62%); animation: gp-drift2 30s ease-in-out infinite; }
        .gp-a3 { width: 60vw; height: 60vw; bottom: -34vw; left: 25vw; background: radial-gradient(circle, rgba(0,200,120,0.12), transparent 62%); animation: gp-drift3 34s ease-in-out infinite; }
        @keyframes gp-drift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(8vw,6vw) scale(1.15); } }
        @keyframes gp-drift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-7vw,5vw) scale(1.2); } }
        @keyframes gp-drift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(6vw,-5vw) scale(1.1); } }
        .gp-noise { position: absolute; inset: 0; opacity: 0.4; background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px); background-size: 3px 3px; }
        .gp-floor { position: absolute; inset: 0; background: radial-gradient(ellipse 100% 70% at 50% 35%, transparent 45%, rgba(6,8,6,0.92) 100%); }

        /* sidebar */
        .gp-rail { background: rgba(9,11,9,0.72); backdrop-filter: blur(20px); border-right: 1px solid rgba(255,255,255,0.055); }
        .gp-newbtn { background: rgba(255,255,255,0.045); border: 1px solid rgba(255,255,255,0.1); color: #f0f2f0; border-radius: 11px; }
        .gp-newbtn:hover { background: rgba(0,255,133,0.06); border-color: rgba(0,255,133,0.3); }
        .gp-convo-on { background: rgba(255,255,255,0.055); color: #f0f2f0; }
        .gp-dot { background: var(--grn); box-shadow: 0 0 7px var(--grn); animation: gp-pulse 2.2s ease-in-out infinite; }
        .gp-goldtext { color: var(--gold); }
        @keyframes gp-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

        /* signature intelligence core */
        .gp-hero { min-height: calc(100dvh - 190px); justify-content: center; padding: 12px 0; }
        .gp-core { position: relative; width: 66px; height: 66px; display: grid; place-items: center; margin-bottom: 16px; }
        .gp-core-ring { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 0deg, transparent, var(--grn), transparent 42%, var(--gold-bright), transparent 72%); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px)); mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px)); animation: gp-rot 6s linear infinite; }
        .gp-core-ring2 { inset: 10px; opacity: 0.5; animation: gp-rot 9s linear infinite reverse; }
        .gp-core-glow { position: absolute; inset: 14px; border-radius: 50%; background: radial-gradient(circle, rgba(0,255,133,0.35), transparent 70%); filter: blur(10px); animation: gp-breathe 3.5s ease-in-out infinite; }
        .gp-core-mark { position: relative; width: 50px; height: 50px; border-radius: 16px; display: grid; place-items: center; background: linear-gradient(150deg, var(--grn), #0a7a39); box-shadow: 0 10px 34px -10px var(--grn); }
        @keyframes gp-rot { to { transform: rotate(360deg); } }
        @keyframes gp-breathe { 0%,100% { opacity: 0.5; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1.08); } }

        /* hero type */
        .gp-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.34em; color: var(--gold); font-weight: 700; margin-bottom: 18px; }
        .gp-head { font-family: 'Bricolage Grotesque', system-ui, sans-serif; font-weight: 800; font-size: clamp(34px, 7vw, 58px); line-height: 0.96; letter-spacing: -0.035em; color: #f6f8f6; }
        .gp-head-accent { background: linear-gradient(100deg, var(--grn) 0%, var(--gold-bright) 60%, var(--grn) 100%); background-size: 220% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: gp-sheen 6s linear infinite; }
        @keyframes gp-sheen { to { background-position: 220% center; } }
        .gp-sub { color: #9aa29a; font-size: clamp(13.5px, 2.2vw, 15.5px); line-height: 1.55; margin: 14px 0 0; max-width: 32rem; }

        /* capability marquee */
        .gp-marquee { margin-top: 18px; width: 100%; max-width: 40rem; -webkit-mask: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); mask: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); overflow: hidden; }
        .gp-marquee-track { display: inline-flex; white-space: nowrap; animation: gp-scroll 24s linear infinite; }
        @keyframes gp-scroll { to { transform: translateX(-50%); } }
        .gp-mq-item { display: inline-flex; align-items: center; gap: 9px; padding: 0 22px; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.18em; color: #c7cdc7; font-weight: 600; }
        .gp-mq-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 6px var(--gold); }

        /* premium prompt cards */
        .gp-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; max-width: 40rem; margin-top: 22px; }
        .gp-card { position: relative; text-align: left; padding: 16px 16px 14px; border-radius: 15px; background: linear-gradient(160deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015)); border: 1px solid rgba(255,255,255,0.08); overflow: hidden; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
        .gp-card::before { content: ""; position: absolute; inset: 0; border-radius: 15px; padding: 1px; background: linear-gradient(140deg, rgba(0,255,133,0.5), transparent 40%, rgba(216,178,94,0.4)); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; opacity: 0; transition: opacity 0.3s; }
        .gp-card:hover { transform: translateY(-3px); background: linear-gradient(160deg, rgba(0,255,133,0.06), rgba(216,178,94,0.03)); box-shadow: 0 20px 50px -20px rgba(0,255,133,0.4); }
        .gp-card:hover::before { opacity: 1; }
        .gp-card-tag { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.22em; color: var(--gold); font-weight: 700; }
        .gp-card-text { display: block; font-size: 13.5px; color: #aab1aa; margin-top: 7px; line-height: 1.4; }
        .gp-card:hover .gp-card-text { color: #e6ebe6; }
        .gp-card-go { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: var(--grn); margin-top: 11px; opacity: 0; transform: translateY(4px); transition: all 0.3s; }
        .gp-card:hover .gp-card-go { opacity: 1; transform: translateY(0); }

        /* messages */
        .gp-ava-ai { background: linear-gradient(150deg, var(--grn), #0a7a39); box-shadow: 0 0 16px -6px var(--grn); }
        .gp-ava-user { background: rgba(255,255,255,0.055); border: 1px solid rgba(255,255,255,0.1); }
        .gp-user-bubble { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 15px; }

        /* composer with live gradient border */
        .gp-composer-wrap { background: linear-gradient(to top, #060806 58%, transparent); }
        .gp-composer-shell { position: relative; border-radius: 17px; padding: 1.5px; background: #15181500; overflow: hidden; }
        .gp-composer-shell::before { content: ""; position: absolute; inset: -60%; background: conic-gradient(from 0deg, transparent, rgba(0,255,133,0.55), transparent 28%, rgba(216,178,94,0.5), transparent 55%); animation: gp-rot 8s linear infinite; opacity: 0.55; }
        .gp-composer { position: relative; z-index: 1; background: #121512; border-radius: 15.5px; padding: 10px 10px 10px 16px; }
        .gp-composer-shell:focus-within::before { opacity: 1; animation-duration: 4s; }
        .gp-send { background: linear-gradient(150deg, var(--grn), #0ad46f); color: #06110a; box-shadow: 0 0 18px -6px var(--grn); }
        .gp-send:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 0 26px -4px var(--grn); }

        /* canvas */
        .gp-canvas { background: rgba(9,11,9,0.92); backdrop-filter: blur(18px); border-left: 1px solid rgba(255,255,255,0.07); }
        .gp-canvas-head { background: rgba(9,11,9,0.9); border-bottom: 1px solid rgba(255,255,255,0.07); }
        .gp-tabs { background: rgba(255,255,255,0.05); }
        .gp-tab-on { background: rgba(0,255,133,0.14); color: var(--grn); }
        .gp-dl { background: linear-gradient(150deg, var(--grn), #0ad46f); color: #06110a; }
        .gp-dl:hover:not(:disabled) { filter: brightness(1.1); }
        .gp-canvas-building { background: #080a08; }
        .gp-build-core { position: relative; width: 46px; height: 46px; }
        .gp-build-core span { position: absolute; inset: 0; border-radius: 50%; border: 2px solid transparent; border-top-color: var(--grn); animation: gp-rot 0.9s linear infinite; }
        .gp-build-core span:nth-child(2) { inset: 9px; border-top-color: var(--gold); animation-duration: 1.4s; animation-direction: reverse; }
        .gp-code { background: #060806; color: #cfe; }
        .gp-fab { background: #121512; border: 1px solid rgba(255,255,255,0.12); }

        /* markdown */
        .gp-md p { margin: 0 0 11px; } .gp-md p:last-child { margin-bottom: 0; }
        .gp-md ul, .gp-md ol { margin: 5px 0 12px; padding-left: 22px; } .gp-md li { margin: 4px 0; }
        .gp-md h1, .gp-md h2, .gp-md h3 { font-family: 'Bricolage Grotesque', system-ui, sans-serif; font-weight: 700; margin: 16px 0 8px; line-height: 1.25; letter-spacing: -0.015em; }
        .gp-md h1 { font-size: 20px; } .gp-md h2 { font-size: 17.5px; } .gp-md h3 { font-size: 15.5px; }
        .gp-md strong { color: #fff; font-weight: 650; } .gp-md a { color: var(--grn); }
        .gp-md code { font-family: "JetBrains Mono", monospace; font-size: 12.5px; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; }
        .gp-md pre { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 12px 14px; overflow-x: auto; margin: 5px 0 12px; }
        .gp-md pre code { background: none; padding: 0; font-size: 12.5px; line-height: 1.55; }
        .gp-cursor { display: inline-block; width: 2px; height: 16px; background: var(--grn); vertical-align: -3px; margin-left: 2px; box-shadow: 0 0 8px var(--grn); animation: gpblink 1s step-end infinite; }
        @keyframes gpblink { 50% { opacity: 0; } }

        @media (max-width: 560px) {
          .gp-card { padding: 12px 12px 11px; }
          .gp-card-text { font-size: 12.5px; }
          .gp-hero { min-height: calc(100dvh - 170px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gp-aurora, .gp-core-ring, .gp-core-ring2, .gp-core-glow, .gp-head-accent, .gp-marquee-track, .gp-composer-shell::before, .gp-dot, .gp-cursor, .gp-build-core span { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
