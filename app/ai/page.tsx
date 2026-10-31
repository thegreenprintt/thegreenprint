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

  return (
    <div className="gp-root min-h-screen text-text flex flex-col relative overflow-hidden">
      <Nav />

      {/* ===== cinematic animated background ===== */}
      <div className="gp-bg pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="gp-grid" />
        <div className="gp-orb gp-orb-1" />
        <div className="gp-orb gp-orb-2" />
        <div className="gp-orb gp-orb-3" />
        <div className="gp-scan" />
        <div className="gp-vignette" />
      </div>

      <div className="flex-1 flex pt-16 min-h-0 relative z-10">
        {/* ===== sidebar ===== */}
        <AnimatePresence>
          {railOpen && (
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRailOpen(false)}
            />
          )}
        </AnimatePresence>
        <aside
          className={`${railOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static top-16 bottom-0 left-0 z-40 w-64 gp-rail flex flex-col transition-transform duration-300`}
        >
          <div className="p-3">
            <button
              onClick={newChat}
              className="gp-newbtn w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all"
            >
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
              New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
            {convos.length === 0 && <div className="text-muted text-[10px] px-3 py-2 uppercase tracking-[0.2em]">No chats yet</div>}
            {convos.map((c) => (
              <div
                key={c.id}
                onClick={() => loadChat(c.id)}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-all ${
                  c.id === currentId ? "gp-convo-on text-text" : "text-muted hover:text-text hover:bg-white/5"
                }`}
              >
                <span className="flex-1 truncate">{c.title || "New chat"}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); delChat(c.id); }}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-red transition"
                  aria-label="Delete chat"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted">
            <span className="gp-pulse w-1.5 h-1.5 rounded-full bg-accent" />
            Greenprint AI
          </div>
        </aside>

        {/* ===== chat column ===== */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={riverRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6">
              {empty ? (
                <motion.div
                  className="flex flex-col items-center text-center gap-6 pt-[7vh]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  <motion.div
                    className="gp-hero-mark"
                    initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#02140a" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 3 8-9" /><path d="M14 6h6v6" /></svg>
                    <span className="gp-hero-ring" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="gp-eyebrow">The Greenprint Intelligence</div>
                    <h1 className="gp-hero-title">
                      Build. Trade. <span className="gp-grad">Dominate.</span>
                    </h1>
                    <p className="text-muted mt-3 max-w-md mx-auto text-[15px] leading-relaxed">
                      Your own AI. Ask about markets, break down a setup, sharpen your brand, or tell it to build a full website, live.
                    </p>
                  </motion.div>
                  <motion.div
                    className="grid sm:grid-cols-2 gap-3 w-full max-w-xl mt-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {STARTERS.map((s, idx) => (
                      <button
                        key={s.tag}
                        onClick={() => send(s.text)}
                        className="gp-starter group text-left rounded-2xl p-4"
                        style={{ animationDelay: `${0.4 + idx * 0.08}s` }}
                      >
                        <span className="gp-starter-tag">{s.tag}</span>
                        <span className="block text-sm text-muted group-hover:text-text transition-colors mt-1.5 leading-snug">{s.text}</span>
                        <span className="gp-starter-arrow">→</span>
                      </button>
                    ))}
                  </motion.div>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-5">
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                      className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-xl grid place-items-center shrink-0 mt-0.5 ${m.role === "user" ? "gp-ava-user" : "gp-ava-ai"}`}>
                        {m.role === "assistant" ? (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#02140a" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 3 8-9" /><path d="M14 6h6v6" /></svg>
                        ) : (
                          <span className="text-[10px] font-bold text-muted">YOU</span>
                        )}
                      </div>
                      <div className={`min-w-0 ${m.role === "user" ? "max-w-[84%]" : "flex-1"}`}>
                        {m.role === "user" ? (
                          <div className="gp-user-bubble rounded-2xl px-4 py-2.5 text-[15px]">{m.content}</div>
                        ) : (
                          <div
                            className="gp-md text-[15px] leading-relaxed pt-1"
                            dangerouslySetInnerHTML={{ __html: renderMd(extractSite(m.content).chat) + (streaming && i === messages.length - 1 ? '<span class="gp-cursor"></span>' : "") }}
                          />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== composer ===== */}
          <div className="shrink-0 px-4 pb-5 pt-1 gp-composer-wrap">
            <div className="max-w-3xl mx-auto">
              <div className="gp-composer flex items-end gap-2 rounded-2xl pl-4 pr-2 py-2 transition-all">
                <textarea
                  ref={taRef}
                  value={input}
                  rows={1}
                  onChange={(e) => { setInput(e.target.value); autosize(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Ask anything, or tell it to build something..."
                  className="flex-1 min-w-0 bg-transparent resize-none outline-none text-[15px] py-1.5 max-h-[170px] placeholder:text-muted"
                />
                <button
                  onClick={() => (streaming ? stop() : send())}
                  disabled={!streaming && !input.trim()}
                  className="gp-send shrink-0 w-10 h-10 rounded-xl grid place-items-center transition-all disabled:opacity-30"
                >
                  {streaming ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                  )}
                </button>
              </div>
              <p className="text-center text-[10.5px] text-muted mt-2.5 tracking-wide">
                The Greenprint AI can make mistakes. Not financial advice. Never a guarantee of profit.
              </p>
            </div>
          </div>
        </div>

        {/* ===== website build canvas ===== */}
        {canvasOpen && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col min-w-0 gp-canvas w-full lg:w-[48%] lg:shrink-0 fixed lg:static inset-0 top-16 z-30 lg:z-auto"
          >
            <div className="shrink-0 flex items-center gap-2 border-b border-white/5 px-3 py-2.5 gp-canvas-head">
              <div className="flex gap-1 gp-tabs rounded-xl p-0.5">
                <button onClick={() => setCanvasTab("preview")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${canvasTab === "preview" ? "gp-tab-on" : "text-muted"}`}>Preview</button>
                <button onClick={() => setCanvasTab("code")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${canvasTab === "code" ? "gp-tab-on" : "text-muted"}`}>Code</button>
              </div>
              <span className="text-xs font-semibold truncate flex items-center gap-1.5"><span className="gp-pulse w-1.5 h-1.5 rounded-full bg-accent" />Website</span>
              <div className="ml-auto flex gap-2">
                <button
                  disabled={!siteHtml}
                  onClick={() => {
                    try {
                      const blob = new Blob([siteHtml], { type: "text/html" });
                      const u = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = u; a.download = "greenprint-site.html";
                      document.body.appendChild(a); a.click(); a.remove();
                      URL.revokeObjectURL(u);
                    } catch {}
                  }}
                  className="gp-dl text-xs font-semibold inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 disabled:opacity-30 transition-all"
                >
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
                    <div className="gp-build-loader" />
                    <span className="text-sm text-muted tracking-wide">Generating your website...</span>
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

      {/* mobile sidebar trigger */}
      <button
        onClick={() => setRailOpen(true)}
        className="lg:hidden fixed bottom-24 left-4 z-30 w-11 h-11 rounded-full gp-fab grid place-items-center text-text"
        aria-label="Conversations"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" /></svg>
      </button>

      <style jsx global>{`
        .gp-root { background: #050705; }
        /* animated background layers */
        .gp-bg { z-index: 0; }
        .gp-grid {
          position: absolute; inset: -2px;
          background-image: linear-gradient(rgba(0,255,133,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,133,0.05) 1px, transparent 1px);
          background-size: 46px 46px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, #000 20%, transparent 75%);
          animation: gp-grid-drift 20s linear infinite;
        }
        @keyframes gp-grid-drift { from { background-position: 0 0, 0 0; } to { background-position: 46px 46px, 46px 46px; } }
        .gp-orb { position: absolute; border-radius: 9999px; filter: blur(110px); opacity: 0.22; }
        .gp-orb-1 { width: 44rem; height: 44rem; top: -16rem; left: -8rem; background: radial-gradient(circle, #00FF85, transparent 70%); animation: gp-float1 18s ease-in-out infinite; }
        .gp-orb-2 { width: 36rem; height: 36rem; top: 20%; right: -12rem; background: radial-gradient(circle, #0a7a39, transparent 70%); animation: gp-float2 22s ease-in-out infinite; }
        .gp-orb-3 { width: 30rem; height: 30rem; bottom: -14rem; left: 30%; background: radial-gradient(circle, #00c46a, transparent 70%); animation: gp-float3 26s ease-in-out infinite; }
        @keyframes gp-float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,40px) scale(1.1); } }
        @keyframes gp-float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,30px) scale(1.15); } }
        @keyframes gp-float3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-50px) scale(1.08); } }
        .gp-scan { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent, rgba(0,255,133,0.025) 50%, transparent); background-size: 100% 8px; opacity: 0.5; animation: gp-scanline 8s linear infinite; }
        @keyframes gp-scanline { from { background-position: 0 0; } to { background-position: 0 100vh; } }
        .gp-vignette { position: absolute; inset: 0; background: radial-gradient(ellipse 100% 100% at 50% 0%, transparent 40%, rgba(5,7,5,0.85) 100%); }

        /* sidebar */
        .gp-rail { background: rgba(10,13,10,0.75); backdrop-filter: blur(16px); border-right: 1px solid rgba(255,255,255,0.06); }
        .gp-newbtn { background: rgba(255,255,255,0.03); border: 1px solid rgba(0,255,133,0.18); color: #F5F5F5; }
        .gp-newbtn:hover { border-color: rgba(0,255,133,0.5); box-shadow: 0 0 20px -6px rgba(0,255,133,0.4); transform: translateY(-1px); }
        .gp-convo-on { background: rgba(0,255,133,0.08); box-shadow: inset 2px 0 0 #00FF85; }
        .gp-pulse { box-shadow: 0 0 8px #00FF85; animation: gp-pulse 2s ease-in-out infinite; }
        @keyframes gp-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

        /* hero */
        .gp-hero-mark { position: relative; width: 4.5rem; height: 4.5rem; border-radius: 1.3rem; display: grid; place-items: center; background: linear-gradient(145deg, #00FF85, #0a7a39); box-shadow: 0 0 60px -10px #00FF85, inset 0 1px 0 rgba(255,255,255,0.3); }
        .gp-hero-ring { position: absolute; inset: -8px; border-radius: 1.6rem; border: 1px solid rgba(0,255,133,0.3); animation: gp-ring 3s ease-in-out infinite; }
        @keyframes gp-ring { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.08); opacity: 0.2; } }
        .gp-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.3em; color: #00FF85; font-weight: 600; margin-bottom: 12px; }
        .gp-hero-title { font-size: clamp(30px, 6vw, 46px); font-weight: 900; letter-spacing: -0.03em; line-height: 1.02; }
        .gp-grad { background: linear-gradient(120deg, #00FF85, #8affc4, #00FF85); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: gp-shine 4s linear infinite; }
        @keyframes gp-shine { to { background-position: 200% center; } }

        /* starter cards */
        .gp-starter { position: relative; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); backdrop-filter: blur(10px); overflow: hidden; transition: all 0.25s cubic-bezier(0.16,1,0.3,1); opacity: 0; transform: translateY(14px); animation: gp-rise 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes gp-rise { to { opacity: 1; transform: translateY(0); } }
        .gp-starter:hover { border-color: rgba(0,255,133,0.4); background: rgba(0,255,133,0.04); transform: translateY(-3px); box-shadow: 0 12px 40px -12px rgba(0,255,133,0.35); }
        .gp-starter-tag { display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #00FF85; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: rgba(0,255,133,0.1); }
        .gp-starter-arrow { position: absolute; top: 14px; right: 14px; color: #00FF85; opacity: 0; transform: translateX(-4px); transition: all 0.25s; font-size: 16px; }
        .gp-starter:hover .gp-starter-arrow { opacity: 1; transform: translateX(0); }

        /* avatars + bubbles */
        .gp-ava-ai { background: linear-gradient(145deg, #00FF85, #0a7a39); box-shadow: 0 0 20px -6px #00FF85; }
        .gp-ava-user { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
        .gp-user-bubble { background: linear-gradient(145deg, rgba(0,255,133,0.14), rgba(0,255,133,0.06)); border: 1px solid rgba(0,255,133,0.2); }

        /* composer */
        .gp-composer-wrap { background: linear-gradient(to top, #050705 55%, transparent); }
        .gp-composer { background: rgba(17,17,17,0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); }
        .gp-composer:focus-within { border-color: rgba(0,255,133,0.5); box-shadow: 0 0 0 3px rgba(0,255,133,0.1), 0 0 40px -10px rgba(0,255,133,0.3); }
        .gp-send { background: linear-gradient(145deg, #00FF85, #0a7a39); color: #02140a; box-shadow: 0 0 20px -6px #00FF85; }
        .gp-send:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 0 28px -4px #00FF85; transform: translateY(-1px); }

        /* canvas */
        .gp-canvas { background: rgba(8,10,8,0.9); backdrop-filter: blur(16px); border-left: 1px solid rgba(255,255,255,0.07); }
        .gp-canvas-head { background: rgba(10,13,10,0.8); }
        .gp-tabs { background: rgba(255,255,255,0.04); }
        .gp-tab-on { background: rgba(0,255,133,0.14); color: #00FF85; }
        .gp-dl { background: linear-gradient(145deg, #00FF85, #0a7a39); color: #02140a; }
        .gp-dl:hover:not(:disabled) { filter: brightness(1.1); }
        .gp-canvas-building { background: #080a08; }
        .gp-build-loader { width: 38px; height: 38px; border-radius: 50%; border: 3px solid rgba(0,255,133,0.15); border-top-color: #00FF85; animation: gp-spin 0.8s linear infinite; box-shadow: 0 0 24px -6px #00FF85; }
        @keyframes gp-spin { to { transform: rotate(360deg); } }
        .gp-code { background: #050705; color: #cfe; }
        .gp-fab { background: rgba(17,17,17,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(0,255,133,0.2); box-shadow: 0 0 20px -8px #00FF85; }

        /* markdown */
        .gp-md p { margin: 0 0 10px; }
        .gp-md p:last-child { margin-bottom: 0; }
        .gp-md ul, .gp-md ol { margin: 4px 0 11px; padding-left: 22px; }
        .gp-md li { margin: 3px 0; }
        .gp-md h1, .gp-md h2, .gp-md h3 { font-weight: 700; margin: 15px 0 7px; line-height: 1.25; letter-spacing: -0.01em; }
        .gp-md h1 { font-size: 19px; } .gp-md h2 { font-size: 17px; } .gp-md h3 { font-size: 15px; }
        .gp-md strong { color: #fff; font-weight: 650; }
        .gp-md a { color: #00FF85; }
        .gp-md code { font-family: "JetBrains Mono", monospace; font-size: 12.5px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 5px; }
        .gp-md pre { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 14px; overflow-x: auto; margin: 4px 0 11px; }
        .gp-md pre code { background: none; border: none; padding: 0; font-size: 12.5px; line-height: 1.5; }
        .gp-cursor { display: inline-block; width: 7px; height: 15px; background: #00FF85; vertical-align: -2px; margin-left: 2px; border-radius: 1px; box-shadow: 0 0 8px #00FF85; animation: gpblink 1s step-end infinite; }
        @keyframes gpblink { 50% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .gp-cursor, .gp-grid, .gp-orb-1, .gp-orb-2, .gp-orb-3, .gp-scan, .gp-hero-ring, .gp-grad, .gp-pulse, .gp-build-loader, .gp-starter { animation: none; }
          .gp-starter { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
