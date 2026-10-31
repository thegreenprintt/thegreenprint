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
    <div className="gp-root min-h-screen text-text flex flex-col relative">
      <Nav />

      {/* calm ambient depth, one soft light, no motion clutter */}
      <div className="gp-amb pointer-events-none fixed inset-0" aria-hidden />

      <div className="flex-1 flex pt-16 min-h-0 relative z-10">
        {/* ===== sidebar ===== */}
        <AnimatePresence>
          {railOpen && (
            <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRailOpen(false)} />
          )}
        </AnimatePresence>
        <aside className={`${railOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static top-16 bottom-0 left-0 z-40 w-[260px] gp-rail flex flex-col transition-transform duration-300`}>
          <div className="p-3">
            <button onClick={newChat} className="gp-newbtn w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
              New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-0.5">
            {convos.length === 0 && <div className="text-muted/50 text-[11px] px-3 py-2">No conversations yet</div>}
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
          <div className="px-4 py-3.5 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-muted">
            <span className="gp-dot w-1.5 h-1.5 rounded-full bg-accent" />
            Greenprint AI
          </div>
        </aside>

        {/* ===== main column ===== */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={riverRef} className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-5 py-8">
              {empty ? (
                <motion.div className="flex flex-col items-center text-center pt-[14vh]" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                  <div className="gp-mono">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#02140a" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 3 8-9" /><path d="M14 6h6v6" /></svg>
                  </div>
                  <h1 className="gp-title">What do you want to make?</h1>
                  <p className="gp-sub">Ask anything, work through a trade, or describe a website and watch it build. Your AI, on The Greenprint.</p>
                  <div className="gp-chips">
                    {STARTERS.map((s) => (
                      <button key={s.tag} onClick={() => send(s.text)} className="gp-chip">{s.text}</button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-6">
                  {messages.map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`flex gap-3.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 mt-0.5 ${m.role === "user" ? "gp-ava-user" : "gp-ava-ai"}`}>
                        {m.role === "assistant" ? (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="#02140a" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 3 8-9" /><path d="M14 6h6v6" /></svg>
                        ) : (<span className="text-[9px] font-semibold text-muted">YOU</span>)}
                      </div>
                      <div className={`min-w-0 ${m.role === "user" ? "max-w-[82%]" : "flex-1"}`}>
                        {m.role === "user" ? (
                          <div className="gp-user-bubble px-3.5 py-2.5 text-[15px]">{m.content}</div>
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

          {/* ===== composer: one clean bar ===== */}
          <div className="shrink-0 px-5 pb-6 pt-2 gp-composer-wrap">
            <div className="max-w-2xl mx-auto">
              <div className="gp-composer flex items-end gap-2">
                <textarea ref={taRef} value={input} rows={1}
                  onChange={(e) => { setInput(e.target.value); autosize(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Message Greenprint AI"
                  className="flex-1 min-w-0 bg-transparent resize-none outline-none border-0 text-[15px] leading-[1.5] py-1 max-h-[180px] placeholder:text-muted/60" />
                <button onClick={() => (streaming ? stop() : send())} disabled={!streaming && !input.trim()} className="gp-send shrink-0 w-8 h-8 rounded-lg grid place-items-center transition-all disabled:opacity-25">
                  {streaming ? (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                  )}
                </button>
              </div>
              <p className="text-center text-[11px] text-muted/55 mt-3">Greenprint AI can make mistakes. Not financial advice.</p>
            </div>
          </div>
        </div>

        {/* ===== build canvas ===== */}
        {canvasOpen && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col min-w-0 gp-canvas w-full lg:w-[48%] lg:shrink-0 fixed lg:static inset-0 top-16 z-30 lg:z-auto">
            <div className="shrink-0 flex items-center gap-2 px-3.5 py-2.5 gp-canvas-head">
              <div className="flex gap-0.5 gp-tabs rounded-lg p-0.5">
                <button onClick={() => setCanvasTab("preview")} className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${canvasTab === "preview" ? "gp-tab-on" : "text-muted"}`}>Preview</button>
                <button onClick={() => setCanvasTab("code")} className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${canvasTab === "code" ? "gp-tab-on" : "text-muted"}`}>Code</button>
              </div>
              <span className="text-[12px] text-muted truncate">Website</span>
              <div className="ml-auto flex gap-2">
                <button disabled={!siteHtml} onClick={() => { try { const blob = new Blob([siteHtml], { type: "text/html" }); const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = "greenprint-site.html"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); } catch {} }}
                  className="gp-dl text-[12px] font-medium inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 disabled:opacity-30 transition-all">
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
                  <div className="flex flex-col items-center gap-3.5">
                    <div className="gp-spin" />
                    <span className="text-[12px] text-muted">Building your website</span>
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
        .gp-root { background: #0a0c0b; }
        .gp-amb { z-index: 0; background: radial-gradient(900px 500px at 50% -8%, rgba(0,255,133,0.05), transparent 60%); }

        /* sidebar */
        .gp-rail { background: #0c0e0d; border-right: 1px solid rgba(255,255,255,0.06); }
        .gp-newbtn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); color: #ededed; }
        .gp-newbtn:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.14); }
        .gp-convo-on { background: rgba(255,255,255,0.06); color: #ededed; }
        .gp-dot { box-shadow: 0 0 7px rgba(0,255,133,0.8); }

        /* empty state */
        .gp-mono { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; background: #00FF85; box-shadow: 0 8px 30px -10px rgba(0,255,133,0.6); margin-bottom: 24px; }
        .gp-title { font-size: clamp(26px, 4.5vw, 34px); font-weight: 700; letter-spacing: -0.025em; line-height: 1.1; color: #f3f5f3; }
        .gp-sub { color: #8a8f8a; font-size: 15px; line-height: 1.6; margin: 14px 0 0; max-width: 28rem; }
        .gp-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 9px; margin-top: 30px; max-width: 40rem; }
        .gp-chip { font-size: 13px; color: #b7bdb7; text-align: left; padding: 9px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.025); transition: all 0.18s ease; max-width: 100%; }
        .gp-chip:hover { border-color: rgba(0,255,133,0.35); color: #ededed; background: rgba(0,255,133,0.05); }

        /* avatars + bubbles */
        .gp-ava-ai { background: #00FF85; }
        .gp-ava-user { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); }
        .gp-user-bubble { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; }

        /* composer: single clean bar, soft OUTER focus ring only */
        .gp-composer-wrap { background: linear-gradient(to top, #0a0c0b 60%, transparent); }
        .gp-composer { background: #141715; border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; padding: 9px 9px 9px 15px; }
        .gp-composer:focus-within { border-color: rgba(0,255,133,0.4); box-shadow: 0 0 0 3px rgba(0,255,133,0.08); }
        .gp-composer textarea { box-shadow: none; }
        .gp-send { background: #00FF85; color: #02140a; }
        .gp-send:hover:not(:disabled) { filter: brightness(1.08); }

        /* canvas */
        .gp-canvas { background: #0c0e0d; border-left: 1px solid rgba(255,255,255,0.07); }
        .gp-canvas-head { background: #0c0e0d; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .gp-tabs { background: rgba(255,255,255,0.05); }
        .gp-tab-on { background: rgba(255,255,255,0.09); color: #ededed; }
        .gp-dl { background: #00FF85; color: #02140a; }
        .gp-dl:hover:not(:disabled) { filter: brightness(1.08); }
        .gp-canvas-building { background: #0b0d0c; }
        .gp-spin { width: 30px; height: 30px; border-radius: 50%; border: 2.5px solid rgba(0,255,133,0.18); border-top-color: #00FF85; animation: gp-spin-k 0.75s linear infinite; }
        @keyframes gp-spin-k { to { transform: rotate(360deg); } }
        .gp-code { background: #0a0c0b; color: #cfe; }
        .gp-fab { background: #141715; border: 1px solid rgba(255,255,255,0.12); }

        /* markdown */
        .gp-md p { margin: 0 0 11px; } .gp-md p:last-child { margin-bottom: 0; }
        .gp-md ul, .gp-md ol { margin: 5px 0 12px; padding-left: 22px; } .gp-md li { margin: 4px 0; }
        .gp-md h1, .gp-md h2, .gp-md h3 { font-weight: 700; margin: 16px 0 8px; line-height: 1.3; letter-spacing: -0.01em; }
        .gp-md h1 { font-size: 19px; } .gp-md h2 { font-size: 17px; } .gp-md h3 { font-size: 15px; }
        .gp-md strong { color: #fff; font-weight: 600; } .gp-md a { color: #00FF85; }
        .gp-md code { font-family: "JetBrains Mono", monospace; font-size: 12.5px; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; }
        .gp-md pre { background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 12px 14px; overflow-x: auto; margin: 5px 0 12px; }
        .gp-md pre code { background: none; padding: 0; font-size: 12.5px; line-height: 1.55; }
        .gp-cursor { display: inline-block; width: 2px; height: 16px; background: #00FF85; vertical-align: -3px; margin-left: 2px; animation: gpblink 1s step-end infinite; }
        @keyframes gpblink { 50% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .gp-cursor, .gp-spin, .gp-dot { animation: none; } }
      `}</style>
    </div>
  );
}
