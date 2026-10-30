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

export default function GreenprintAI() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
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
      const res = await fetch("/greenprint-engine", {
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
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          aiMsg.content = acc;
          setMessages([...nextMsgs, { ...aiMsg }]);
          scrollDown();
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
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <Nav />

      {/* ambient cinematic glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/4 w-[40rem] h-[40rem] rounded-full blur-[120px] opacity-[0.07]" style={{ background: "#00FF85" }} />
        <div className="absolute top-1/3 -right-40 w-[32rem] h-[32rem] rounded-full blur-[120px] opacity-[0.05]" style={{ background: "#00FF85" }} />
      </div>

      <div className="flex-1 flex pt-16 min-h-0 relative">
        {/* sidebar */}
        <AnimatePresence>
          {railOpen && (
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRailOpen(false)}
            />
          )}
        </AnimatePresence>
        <aside
          className={`${railOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static top-16 bottom-0 left-0 z-40 w-64 bg-surface border-r border-border flex flex-col transition-transform duration-300`}
        >
          <div className="p-3">
            <button
              onClick={newChat}
              className="w-full flex items-center gap-2 rounded-btn border border-border bg-surface2 hover:border-accent/50 text-text px-3 py-2.5 text-sm font-semibold transition-colors"
            >
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
              New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
            {convos.length === 0 && <div className="text-muted text-xs px-3 py-2 uppercase tracking-widest">No chats yet</div>}
            {convos.map((c) => (
              <div
                key={c.id}
                onClick={() => loadChat(c.id)}
                className={`group flex items-center gap-2 rounded-btn px-3 py-2 text-sm cursor-pointer transition-colors ${
                  c.id === currentId ? "bg-surface2 text-text" : "text-muted hover:bg-surface2 hover:text-text"
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
          <div className="px-4 py-3 border-t border-border flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" style={{ boxShadow: "0 0 7px #00FF85" }} />
            Greenprint AI
          </div>
        </aside>

        {/* chat column */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={riverRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6">
              {empty ? (
                <motion.div
                  className="flex flex-col items-center text-center gap-5 pt-[8vh]"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="w-16 h-16 rounded-2xl grid place-items-center" style={{ background: "linear-gradient(145deg,#00FF85,#0a7a39)", boxShadow: "0 14px 40px -12px #00FF85" }}>
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#041" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 3 8-9" /><path d="M14 6h6v6" /></svg>
                  </div>
                  <div>
                    <h1 className="font-sans font-extrabold text-3xl tracking-tight">
                      The <span className="text-accent">Greenprint</span> AI
                    </h1>
                    <p className="text-muted mt-2 max-w-md mx-auto text-sm">
                      Your own AI. Ask about markets, a setup, your brand, content, or tell it to build something. Runs on The Greenprint.
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2.5 w-full max-w-xl mt-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s.tag}
                        onClick={() => send(s.text)}
                        className="text-left rounded-card border border-border bg-surface hover:border-accent/40 hover:-translate-y-0.5 transition-all p-3"
                      >
                        <span className="block text-[11px] uppercase tracking-widest text-accent font-semibold mb-1">{s.tag}</span>
                        <span className="text-sm text-muted">{s.text}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-5">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 mt-0.5 ${m.role === "user" ? "bg-surface2 border border-border" : ""}`} style={m.role === "assistant" ? { background: "linear-gradient(145deg,#00FF85,#0a7a39)" } : {}}>
                        {m.role === "assistant" ? (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#041" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 3 8-9" /><path d="M14 6h6v6" /></svg>
                        ) : (
                          <span className="text-[10px] font-semibold text-muted">You</span>
                        )}
                      </div>
                      <div className={`min-w-0 ${m.role === "user" ? "max-w-[84%]" : "flex-1"}`}>
                        {m.role === "user" ? (
                          <div className="rounded-card border border-border px-3.5 py-2.5 text-[15px]" style={{ background: "#13301d" }}>
                            {m.content}
                          </div>
                        ) : (
                          <div
                            className="gp-md text-[15px] leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: renderMd(m.content) + (streaming && i === messages.length - 1 ? '<span class="gp-cursor"></span>' : "") }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* composer */}
          <div className="shrink-0 px-4 pb-5 pt-1 bg-gradient-to-t from-bg to-transparent">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2 bg-surface border border-border rounded-2xl pl-4 pr-2 py-2 focus-within:border-accent/60 transition-colors">
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
                  className="shrink-0 w-9 h-9 rounded-xl grid place-items-center transition-all disabled:opacity-35 bg-accent text-bg hover:brightness-110"
                >
                  {streaming ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                  )}
                </button>
              </div>
              <p className="text-center text-[10.5px] text-muted mt-2">
                The Greenprint AI can make mistakes. Not financial advice. Never a guarantee of profit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* mobile sidebar trigger */}
      <button
        onClick={() => setRailOpen(true)}
        className="lg:hidden fixed bottom-24 left-4 z-30 w-11 h-11 rounded-full bg-surface2 border border-border grid place-items-center text-muted"
        aria-label="Conversations"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" /></svg>
      </button>

      <style jsx global>{`
        .gp-md p { margin: 0 0 10px; }
        .gp-md p:last-child { margin-bottom: 0; }
        .gp-md ul, .gp-md ol { margin: 4px 0 11px; padding-left: 22px; }
        .gp-md li { margin: 3px 0; }
        .gp-md h1, .gp-md h2, .gp-md h3 { font-weight: 700; margin: 15px 0 7px; line-height: 1.25; letter-spacing: -0.01em; }
        .gp-md h1 { font-size: 19px; } .gp-md h2 { font-size: 17px; } .gp-md h3 { font-size: 15px; }
        .gp-md strong { color: #fff; font-weight: 650; }
        .gp-md a { color: #00FF85; }
        .gp-md code { font-family: "JetBrains Mono", monospace; font-size: 12.5px; background: #1A1A1A; border: 1px solid #1E1E1E; padding: 1px 5px; border-radius: 5px; }
        .gp-md pre { background: #111; border: 1px solid #1E1E1E; border-radius: 10px; padding: 12px 14px; overflow-x: auto; margin: 4px 0 11px; }
        .gp-md pre code { background: none; border: none; padding: 0; font-size: 12.5px; line-height: 1.5; }
        .gp-cursor { display: inline-block; width: 7px; height: 15px; background: #00FF85; vertical-align: -2px; margin-left: 2px; border-radius: 1px; animation: gpblink 1s step-end infinite; }
        @keyframes gpblink { 50% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .gp-cursor { animation: none; } }
      `}</style>
    </div>
  );
}
