"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { ReactNode, ClipboardEvent, MouseEvent as RMouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Nav } from "@/components/Nav";
import {
  Msg, Convo, ModeId, MODES, STARTERS, COMMANDS, Command, uid, SITE_START, SITE_END, extractSite, cleanSiteHtml,
  splitFollowups, displayText, renderMd, groupConvos, convoToMarkdown, downloadText, extractFileText, wireContent,
  FILE_ACCEPT, MAX_FILE_CHARS,
} from "./lib";
import { TradingTools, ToolTab } from "./Tools";
import { TalkMode, speak } from "./TalkMode";

/*
  The Greenprint AI — cinematic workspace at /ai
  Talks to /api/chat?kind=ai (server-side engine, key hidden on Vercel).
  Conversations, memory, settings and tools persist in the browser (localStorage).
*/

interface Settings { instructions: string; followups: boolean; autoSpeak: boolean; enterSends: boolean }
const DEFAULT_SETTINGS: Settings = { instructions: "", followups: true, autoSpeak: false, enterSends: true };

const MODELS = [
  { id: "", label: "Auto", note: "Free, fast", soon: false },
  { id: "anthropic/claude-sonnet-5.5", label: "Claude 5.5", note: "Coming soon", soon: true },
  { id: "openai/gpt-5.6-terra-pro", label: "GPT-5.6", note: "Coming soon", soon: true },
  { id: "google/gemini-3.8-flash", label: "Gemini 3.8", note: "Coming soon", soon: true },
  { id: "x-ai/grok-4.7", label: "Grok 4.7", note: "Coming soon", soon: true },
];

const Ico = {
  x: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
  copy: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>,
  check: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>,
  redo: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" /><path d="M21 3v5h-5" /></svg>,
  edit: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
  speaker: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></svg>,
  stopSq: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>,
  site: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></svg>,
  plus: <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>,
  clip: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" /></svg>,
  calc: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8" /></svg>,
  wave: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 10v4M7.5 6v12M12 3v18M16.5 7v10M21 10v4" /></svg>,
  globe: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>,
  image: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>,
  research: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M8 11h6M11 8v6" /></svg>,
  gear: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z" /><circle cx="12" cy="12" r="3" /></svg>,
  dots: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>,
  search: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
  down: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>,
  export: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 21h14" /></svg>,
  logo: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#06110a" strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 3 8-9" /><path d="M14 6h6v6" /></svg>,
  doc: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>,
};

function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center p-4 sm:p-5 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className={`gp-memcard w-full ${wide ? "max-w-lg" : "max-w-md"} max-h-[88dvh] overflow-y-auto`} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.25 }} onClick={(e) => e.stopPropagation()}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
function ModalHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <h3 className="gp-memtitle">{title}</h3>
      <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-lg border border-white/10 text-muted hover:text-text transition-colors" aria-label="Close">{Ico.x}</button>
    </div>
  );
}
function Toggle({ on, set, label, sub }: { on: boolean; set: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button type="button" onClick={() => set(!on)} className="gp-toggle-row">
      <span className="flex-1 text-left"><span className="block text-[13.5px] text-text">{label}</span>{sub && <span className="block text-[11.5px] text-muted mt-0.5">{sub}</span>}</span>
      <span className={`gp-toggle ${on ? "gp-toggle-on" : ""}`}><span /></span>
    </button>
  );
}

export default function GreenprintAI() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [siteHtml, setSiteHtml] = useState("");
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasTab, setCanvasTab] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"desk" | "tab" | "phone">("desk");
  const [frameKey, setFrameKey] = useState(0);
  const [listening, setListening] = useState(false);
  const [voiceOk, setVoiceOk] = useState(false);
  const [ttsOk, setTtsOk] = useState(false);
  const [memory, setMemory] = useState<string[]>([]);
  const [memOpen, setMemOpen] = useState(false);
  const [model, setModel] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [connOpen, setConnOpen] = useState(false);
  const [attached, setAttached] = useState<string[]>([]);
  const [files, setFiles] = useState<{ name: string; text: string }[]>([]);
  const [fileBusy, setFileBusy] = useState(0);
  const [mode, setModeState] = useState<ModeId>("");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftInstr, setDraftInstr] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolTab, setToolTab] = useState<ToolTab>("size");
  const [talkOpen, setTalkOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showDown, setShowDown] = useState(false);
  const [toast, setToast] = useState("");
  const [slashSel, setSlashSel] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const memRef = useRef<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const riverRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const recogRef = useRef<any>(null);
  const currentIdRef = useRef<string | null>(null);
  const stickRef = useRef(true);
  const toastTimer = useRef<any>(null);
  currentIdRef.current = currentId;

  function flash(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }

  // ---------- load persisted state ----------
  useEffect(() => {
    try { const m = localStorage.getItem("gpai_model"); if (m !== null && !MODELS.find((x) => x.id === m)?.soon) setModel(m); } catch {}
    try { const m = localStorage.getItem("gpai_memory"); if (m) { const a = JSON.parse(m); if (Array.isArray(a)) { setMemory(a); memRef.current = a; } } } catch {}
    try { const s = localStorage.getItem("gpai_settings"); if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) }); } catch {}
    try { const md = localStorage.getItem("gpai_mode") as ModeId | null; if (md !== null && MODES.some((x) => x.id === md)) setModeState(md); } catch {}
    try {
      const raw = localStorage.getItem("gpai_convos");
      if (raw) {
        const list: Convo[] = JSON.parse(raw);
        setConvos(list);
        const cur = localStorage.getItem("gpai_current");
        const c = list.find((x) => x.id === cur) || list[0];
        if (c) { setCurrentId(c.id); setMessages(c.messages); if (c.mode !== undefined) setModeState(c.mode); setSiteHtml(latestSite(c.messages)); }
      }
    } catch {}
    try { setTtsOk("speechSynthesis" in window); } catch {}
  }, []);

  function latestSite(msgs: Msg[]): string {
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (m.role === "assistant" && m.content.includes(SITE_END)) { const h = extractSite(m.content).html; if (h) return cleanSiteHtml(h); }
    }
    return "";
  }
  const siteVersions = useMemo(
    () => messages.filter((m) => m.role === "assistant" && m.content.includes(SITE_END)).map((m) => cleanSiteHtml(extractSite(m.content).html)).filter(Boolean),
    [messages]
  );
  const verIdx = siteVersions.indexOf(siteHtml);

  const persist = useCallback((list: Convo[], id: string | null) => {
    try {
      localStorage.setItem("gpai_convos", JSON.stringify(list));
      if (id) localStorage.setItem("gpai_current", id);
    } catch {
      // storage full: drop the oldest unpinned chats and try again
      try {
        const trimmed = list.filter((c, i) => c.pinned || i < Math.max(5, Math.floor(list.length / 2)));
        localStorage.setItem("gpai_convos", JSON.stringify(trimmed));
      } catch {}
    }
  }, []);
  function updateConvos(fn: (p: Convo[]) => Convo[], id?: string | null) {
    setConvos((p) => { const n = fn(p); persist(n, id === undefined ? currentIdRef.current : id); return n; });
  }

  function saveSettings(s: Settings) { setSettings(s); try { localStorage.setItem("gpai_settings", JSON.stringify(s)); } catch {} }
  function setMode(m: ModeId) {
    setModeState(m);
    try { localStorage.setItem("gpai_mode", m); } catch {}
    if (currentIdRef.current) updateConvos((p) => p.map((c) => (c.id === currentIdRef.current ? { ...c, mode: m } : c)));
  }
  function pickModel(id: string) { setModel(id); try { localStorage.setItem("gpai_model", id); } catch {} }
  function saveMemory(a: string[]) { setMemory(a); memRef.current = a; try { localStorage.setItem("gpai_memory", JSON.stringify(a)); } catch {} }
  async function updateMemory(exchange: { role: string; content: string }[]) {
    try {
      const r = await fetch("/api/chat?kind=mem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memory: memRef.current, exchange }) });
      if (!r.ok) return;
      const j = await r.json();
      if (j && Array.isArray(j.memory)) saveMemory(j.memory);
    } catch {}
  }

  // ---------- voice dictation ----------
  useEffect(() => {
    const SR = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) { setVoiceOk(false); return; }
    setVoiceOk(true);
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    let baseText = "";
    r.onstart = () => { baseText = (taRef.current?.value || "").trim(); };
    r.onresult = (e: any) => {
      let heard = "";
      for (let k = 0; k < e.results.length; k++) heard += e.results[k][0].transcript;
      setInput((baseText ? baseText + " " : "") + heard.trim());
      requestAnimationFrame(autosize);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recogRef.current = r;
    return () => { try { r.stop(); } catch {} };
  }, []);
  function toggleVoice() {
    const r = recogRef.current;
    if (!r) return;
    if (listening) { try { r.stop(); } catch {} setListening(false); return; }
    try { r.start(); setListening(true); taRef.current?.focus(); } catch {}
  }

  // ---------- scrolling ----------
  const scrollDown = (force = false) => {
    requestAnimationFrame(() => {
      const el = riverRef.current;
      if (el && (force || stickRef.current)) el.scrollTop = el.scrollHeight;
    });
  };
  useEffect(() => scrollDown(), [messages]);
  function onRiverScroll() {
    const el = riverRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickRef.current = gap < 140;
    setShowDown(gap > 320);
  }

  const autosize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  };

  // ---------- conversations ----------
  function newChat() {
    if (streaming) abortRef.current?.abort();
    setCurrentId(null); currentIdRef.current = null;
    setMessages([]); setSiteHtml(""); setCanvasOpen(false);
    setEditIdx(null); setRailOpen(false); setMenuFor(null);
    try { window.speechSynthesis?.cancel(); } catch {}
    setTimeout(() => taRef.current?.focus(), 50);
  }
  function loadChat(id: string) {
    if (streaming) abortRef.current?.abort();
    const c = convos.find((x) => x.id === id);
    if (!c) return;
    setCurrentId(id); currentIdRef.current = id;
    setMessages(c.messages);
    if (c.mode !== undefined) setModeState(c.mode);
    setSiteHtml(latestSite(c.messages)); setCanvasOpen(false);
    setEditIdx(null); setRailOpen(false); setMenuFor(null);
    try { localStorage.setItem("gpai_current", id); } catch {}
    stickRef.current = true; scrollDown(true);
  }
  function delChat(id: string) {
    const next = convos.filter((c) => c.id !== id);
    if (currentId === id) { setCurrentId(null); currentIdRef.current = null; setMessages([]); setSiteHtml(""); setCanvasOpen(false); }
    updateConvos(() => next, currentId === id ? null : currentId);
    setMenuFor(null);
  }
  function togglePin(id: string) { updateConvos((p) => p.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))); setMenuFor(null); }
  function startRename(c: Convo) { setRenaming(c.id); setRenameVal(c.title || ""); setMenuFor(null); }
  function commitRename() {
    const id = renaming; if (!id) return;
    const t = renameVal.trim();
    if (t) updateConvos((p) => p.map((c) => (c.id === id ? { ...c, title: t.slice(0, 80) } : c)));
    setRenaming(null);
  }
  function exportChat(id: string) {
    const c = convos.find((x) => x.id === id);
    if (!c) return;
    downloadText(`${(c.title || "greenprint-chat").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "greenprint-chat"}.md`, convoToMarkdown(c));
    setMenuFor(null);
    flash("Chat exported");
  }
  const groups = useMemo(() => groupConvos(convos, search), [convos, search]);
  const current = convos.find((c) => c.id === currentId) || null;

  // ---------- attachments ----------
  async function onPickFiles(list: FileList | File[] | null) {
    if (!list) return;
    const arr = Array.from(list).slice(0, 8);
    for (const f of arr) {
      if (f.type.startsWith("image/")) {
        if (f.size > 6 * 1024 * 1024) { flash(`${f.name} is over 6 MB`); continue; }
        await new Promise<void>((res) => {
          const r = new FileReader();
          r.onload = () => { setAttached((a) => (a.length >= 4 ? a : [...a, String(r.result)])); res(); };
          r.onerror = () => res();
          r.readAsDataURL(f);
        });
      } else {
        if (f.size > 15 * 1024 * 1024) { flash(`${f.name} is over 15 MB`); continue; }
        setFileBusy((n) => n + 1);
        try {
          const text = await extractFileText(f);
          setFiles((fs) => {
            if (fs.length >= 3) { flash("Up to 3 files per message"); return fs; }
            const used = fs.reduce((n, x) => n + x.text.length, 0);
            const room = MAX_FILE_CHARS - used;
            if (room < 500) { flash("That's as much text as one message can hold"); return fs; }
            if (text.length > room) flash(`${f.name} was long, so only the first part was read`);
            return [...fs, { name: f.name, text: text.slice(0, room) }];
          });
        } catch (e: any) {
          flash(e?.message || `Couldn't read ${f.name}`);
        } finally {
          setFileBusy((n) => n - 1);
        }
      }
    }
  }
  function onPaste(e: ClipboardEvent) {
    const imgs = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith("image/"));
    if (imgs.length) { e.preventDefault(); onPickFiles(imgs); }
  }

  // ---------- sending ----------
  async function run(base: Msg[], userMsg: Msg, imgs: string[]): Promise<string> {
    const nextMsgs = [...base, userMsg];
    stickRef.current = true;
    setMessages(nextMsgs);
    setStreaming(true);
    try { window.speechSynthesis?.cancel(); } catch {}
    setSpeakingIdx(null);

    let convoId = currentIdRef.current;
    if (!convoId) {
      convoId = uid();
      const id = convoId;
      const title = (userMsg.content || userMsg.files?.[0]?.name || "New chat").replace(/\s+/g, " ").slice(0, 48);
      const c: Convo = { id, title, messages: nextMsgs, ts: Date.now(), mode };
      updateConvos((p) => [c, ...p], id);
      setCurrentId(id); currentIdRef.current = id;
    } else {
      const id = convoId;
      updateConvos((p) => p.map((c) => (c.id === id ? { ...c, messages: nextMsgs, ts: Date.now() } : c)), id);
    }
    const show = (m: Msg[]) => { if (currentIdRef.current === convoId) setMessages(m); };

    const aiMsg: Msg = { role: "assistant", content: "" };
    show([...nextMsgs, aiMsg]);
    const ac = new AbortController();
    abortRef.current = ac;
    const wantFollowups = settings.followups && mode !== "builder";

    try {
      const res = await fetch("/api/chat?kind=ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMsgs.map((m) => ({
            role: m.role,
            content: m.role === "user" ? wireContent(m).replace(/\s*\u{1F5BC}️$/u, "") : displayText(m.content) || "(website built)",
          })),
          memory: memRef.current,
          model: model || undefined,
          mode: mode || undefined,
          instructions: settings.instructions || undefined,
          followups: wantFollowups || undefined,
          currentSite: siteHtml || undefined,
          images: imgs.length ? imgs : undefined,
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        let msg = "The AI engine did not respond.";
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        aiMsg.content = `**${msg}**`;
        show([...nextMsgs, { ...aiMsg }]);
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
          if (!openedCanvas && acc.includes(SITE_START) && currentIdRef.current === convoId) {
            setCanvasOpen(true); setCanvasTab("preview"); setSiteHtml("");
            openedCanvas = true;
          }
          show([...nextMsgs, { ...aiMsg }]);
        }
        const final = extractSite(acc);
        if (final.html && acc.includes(SITE_END) && currentIdRef.current === convoId) {
          setSiteHtml(cleanSiteHtml(final.html));
          setCanvasOpen(true);
          setFrameKey((k) => k + 1);
        }
        if (!acc) { aiMsg.content = "(No response. Try again.)"; show([...nextMsgs, { ...aiMsg }]); }
      }
    } catch (e: any) {
      if (e?.name === "AbortError") aiMsg.content = aiMsg.content || "(Stopped.)";
      else aiMsg.content = "**Something went wrong reaching the AI engine.** Try again in a moment.";
      show([...nextMsgs, { ...aiMsg }]);
    } finally {
      setStreaming(false);
      abortRef.current = null;
      const finalMsgs = [...nextMsgs, { ...aiMsg }];
      const id = convoId;
      updateConvos((p) => p.map((c) => (c.id === id ? { ...c, messages: finalMsgs, ts: Date.now() } : c)), id);
      if (aiMsg.content && !aiMsg.content.startsWith("(") && userMsg.content) {
        updateMemory([{ role: "user", content: userMsg.content.slice(0, 1200) }, { role: "assistant", content: displayText(aiMsg.content).slice(0, 1200) }]);
      }
      if (settings.autoSpeak && !talkOpenRef.current && aiMsg.content && !aiMsg.content.startsWith("(")) {
        setSpeakingIdx(finalMsgs.length - 1);
        speak(aiMsg.content, () => setSpeakingIdx(null));
      }
    }
    return aiMsg.content;
  }

  async function send(text?: string): Promise<string> {
    if (streaming) return "";
    const imgs = attached.slice();
    const fls = files.slice();
    const typed = (text ?? input).trim();
    if (!typed && !imgs.length && !fls.length) return "";
    if (fileBusy > 0) { flash("Still reading your file..."); return ""; }
    const content = typed || (fls.length ? "Summarize this and pull out the key points." : "What do you make of this?");
    let base = messages;
    let keepFiles = fls;
    if (editIdx !== null && text === undefined) {
      base = messages.slice(0, editIdx);
      if (!fls.length && messages[editIdx]?.files) keepFiles = messages[editIdx].files || [];
    }
    const userMsg: Msg = { role: "user", content, ...(keepFiles.length ? { files: keepFiles } : {}), ...(imgs.length ? { imgs: imgs.length } : {}) };
    setInput(""); setAttached([]); setFiles([]); setEditIdx(null);
    requestAnimationFrame(autosize);
    return run(base, userMsg, imgs);
  }
  const sendRef = useRef(send);
  sendRef.current = send;
  const talkOpenRef = useRef(false);
  talkOpenRef.current = talkOpen;
  const talkSend = useCallback((t: string) => sendRef.current(t), []);

  function regenerate() {
    if (streaming) return;
    let li = -1;
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "user") { li = i; break; }
    if (li < 0) return;
    run(messages.slice(0, li), messages[li], []);
  }
  function startEdit(i: number) {
    setEditIdx(i);
    setInput(messages[i].content);
    setTimeout(() => { autosize(); taRef.current?.focus(); }, 30);
  }
  function stop() { abortRef.current?.abort(); }

  function copyText(key: string, text: string) {
    try { navigator.clipboard?.writeText(text); } catch {}
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400);
  }
  function toggleSpeak(i: number) {
    if (speakingIdx === i) { try { window.speechSynthesis.cancel(); } catch {} setSpeakingIdx(null); return; }
    setSpeakingIdx(i);
    speak(messages[i].content, () => setSpeakingIdx((s) => (s === i ? null : s)));
  }
  function openVersion(html: string) {
    setSiteHtml(html); setCanvasOpen(true); setCanvasTab("preview"); setFrameKey((k) => k + 1);
  }

  // copy buttons inside rendered code blocks
  function onRiverClick(e: RMouseEvent) {
    const btn = (e.target as HTMLElement).closest("[data-copy]") as HTMLElement | null;
    if (!btn) return;
    const code = btn.closest(".gp-codeblk")?.querySelector("pre")?.textContent || "";
    try { navigator.clipboard?.writeText(code); } catch {}
    btn.textContent = "Copied";
    setTimeout(() => { btn.textContent = "Copy"; }, 1300);
  }

  // ---------- slash commands ----------
  const slashOpen = input.startsWith("/") && !input.includes(" ") && !input.includes("\n");
  const slashList = slashOpen ? COMMANDS.filter((c) => c.cmd.startsWith(input.toLowerCase()) || c.label.toLowerCase().includes(input.slice(1).toLowerCase())) : [];
  useEffect(() => setSlashSel(0), [input]);
  function runCommand(c: Command) {
    if (c.mode !== undefined) setMode(c.mode);
    if (c.fill) { setInput(c.fill); setTimeout(() => { const ta = taRef.current; if (ta) { ta.focus(); ta.setSelectionRange(c.fill!.length, c.fill!.length); autosize(); } }, 20); return; }
    setInput("");
    if (c.action === "size" || c.action === "rr") { setToolTab(c.action); setToolsOpen(true); }
    else if (c.action === "talk") openTalk();
    else if (c.action === "new") newChat();
    else if (c.action === "settings") openSettings();
  }

  function openSettings() { setDraftInstr(settings.instructions); setSettingsOpen(true); setConfirmWipe(false); }
  function openTalk() {
    if (!voiceOk || !ttsOk) { flash("Talk mode needs a browser with voice support, like Chrome or Safari"); return; }
    setTalkOpen(true);
  }

  // ---------- keyboard shortcuts ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setRailOpen(true); setTimeout(() => searchRef.current?.focus(), 60); }
      else if (mod && e.shiftKey && e.key.toLowerCase() === "o") { e.preventDefault(); newChat(); }
      else if (e.key === "Escape") {
        if (talkOpen) setTalkOpen(false);
        else if (settingsOpen || toolsOpen || memOpen || connOpen) { setSettingsOpen(false); setToolsOpen(false); setMemOpen(false); setConnOpen(false); }
        else if (plusOpen || modelOpen || menuFor) { setPlusOpen(false); setModelOpen(false); setMenuFor(null); }
        else if (editIdx !== null) { setEditIdx(null); setInput(""); }
        else if (streaming) stop();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const empty = messages.length === 0;
  const CAPS = ["Websites", "The code behind them", "Trade breakdowns", "Content that converts", "Position sizing", "Go-to-market strategy", "Your files and PDFs", "Your entire brand"];
  const modeInfo = MODES.find((m) => m.id === mode) || MODES[0];
  const lastAssistant = (() => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "assistant") return i; return -1; })();
  const canSend = !!(input.trim() || attached.length || files.length);
  const deviceW = device === "phone" ? 390 : device === "tab" ? 820 : 0;

  return (
    <div className="gp-root h-[100dvh] overflow-hidden text-text flex flex-col relative">
      <div className="hidden lg:block"><Nav /></div>

      <div className="gp-stage pointer-events-none fixed inset-0" aria-hidden>
        <div className="gp-aurora gp-a1" />
        <div className="gp-aurora gp-a2" />
        <div className="gp-aurora gp-a3" />
        <div className="gp-noise" />
        <div className="gp-floor" />
      </div>

      <div className="flex-1 flex pt-0 lg:pt-16 min-h-0 relative z-10">
        {/* ===== sidebar ===== */}
        <AnimatePresence>
          {railOpen && (
            <motion.div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRailOpen(false)} />
          )}
        </AnimatePresence>
        <aside className={`${railOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static top-0 lg:top-16 bottom-0 left-0 z-40 w-[268px] gp-rail flex flex-col transition-transform duration-300`}>
          <div className="p-3 pb-2 flex flex-col gap-2">
            <button onClick={newChat} className="gp-newbtn w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] font-semibold transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
              New chat
              <span className="ml-auto text-[10px] text-muted/60 font-medium hidden lg:inline">⌘⇧O</span>
            </button>
            <label className="gp-search">
              {Ico.search}
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats" />
              {search ? <button onClick={() => setSearch("")} aria-label="Clear search">{Ico.x}</button> : <span className="text-[10px] text-muted/50 hidden lg:inline">⌘K</span>}
            </label>
          </div>
          <div className="flex-1 overflow-y-auto px-2.5 pb-3" onClick={() => setMenuFor(null)}>
            {convos.length === 0 && <div className="text-muted/50 text-[11px] px-3 py-2 tracking-wide">No conversations yet</div>}
            {convos.length > 0 && groups.length === 0 && <div className="text-muted/60 text-[12px] px-3 py-2">No chats match &ldquo;{search}&rdquo;</div>}
            {groups.map((g) => (
              <div key={g.label} className="mb-2">
                <div className="gp-grouplabel">{g.label}</div>
                {g.items.map((c) => (
                  <div key={c.id} className="relative">
                    <div onClick={() => renaming !== c.id && loadChat(c.id)}
                      className={`group flex items-center gap-1.5 rounded-lg pl-3 pr-1.5 py-2 text-[13.5px] cursor-pointer transition-colors ${c.id === currentId ? "gp-convo-on" : "text-muted hover:text-text hover:bg-white/[0.04]"}`}>
                      {c.pinned && <span className="gp-pin" aria-hidden />}
                      {renaming === c.id ? (
                        <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onBlur={commitRename} onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(null); }} className="gp-rename" />
                      ) : (
                        <span className="flex-1 truncate">{c.title || "Untitled"}</span>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === c.id ? null : c.id); }} className={`gp-rowdots ${c.id === currentId || menuFor === c.id ? "gp-rowdots-on" : ""}`} aria-label="Chat options">{Ico.dots}</button>
                    </div>
                    <AnimatePresence>
                      {menuFor === c.id && (
                        <motion.div className="gp-rowmenu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => togglePin(c.id)}>{c.pinned ? "Unpin" : "Pin to top"}</button>
                          <button onClick={() => startRename(c)}>Rename</button>
                          <button onClick={() => exportChat(c.id)}>Export as file</button>
                          <button className="gp-danger" onClick={() => delChat(c.id)}>Delete</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="px-2.5 pb-1 grid grid-cols-2 gap-1.5">
            <button onClick={() => { setToolsOpen(true); setRailOpen(false); }} className="gp-membtn flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] transition-colors">{Ico.calc}<span>Tools</span></button>
            <button onClick={() => { openSettings(); setRailOpen(false); }} className="gp-membtn flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] transition-colors">{Ico.gear}<span>Settings</span></button>
          </div>
          <button onClick={() => setConnOpen(true)} className="gp-membtn mx-2.5 mb-1 mt-0.5 flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.1 1.1M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.1-1.1" /></svg>
            <span className="flex-1 text-left">Connections</span>
            <span className="gp-soonbadge" style={{ marginLeft: 0 }}>Soon</span>
          </button>
          <button onClick={() => setMemOpen(true)} className="gp-membtn mx-2.5 mb-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a5 5 0 0 0-5 5v1a4 4 0 0 0-1 7.9V17a3 3 0 0 0 6 0M12 2a5 5 0 0 1 5 5v1a4 4 0 0 1 1 7.9V17a3 3 0 0 1-6 0M12 2v18" /></svg>
            <span className="flex-1 text-left">Memory</span>
            <span className="gp-membadge">{memory.length}</span>
          </button>
          <div className="px-4 py-3.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] tracking-[0.15em] uppercase text-muted">
            <span className="flex items-center gap-1.5"><span className="gp-dot w-1.5 h-1.5 rounded-full" />Live</span>
            <span className="gp-goldtext">Greenprint</span>
          </div>
        </aside>

        {/* ===== modals ===== */}
        <Modal open={memOpen} onClose={() => setMemOpen(false)}>
          <ModalHead title="What it remembers about you" onClose={() => setMemOpen(false)} />
          <div className="px-5 pb-3 max-h-[46vh] overflow-y-auto">
            {memory.length === 0 ? (
              <p className="text-muted text-[13.5px] leading-relaxed">Nothing yet. As you chat, it quietly learns durable facts about you and your business, and uses them to help. You stay in control, everything&apos;s listed here and you can remove anything anytime.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {memory.map((f, k) => (
                  <li key={k} className="gp-memitem group flex items-start gap-2.5 text-[13.5px]">
                    <span className="gp-memdot" /><span className="flex-1">{f}</span>
                    <button onClick={() => saveMemory(memory.filter((_, j) => j !== k))} className="gp-memdel" aria-label="Forget this">{Ico.x}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-white/[0.07]">
            <span className="text-[11px] text-muted">Stored on this device only.</span>
            {memory.length > 0 && <button onClick={() => saveMemory([])} className="gp-memclear text-[12px] font-semibold px-3 py-1.5 rounded-lg">Clear all</button>}
          </div>
        </Modal>

        <Modal open={connOpen} onClose={() => setConnOpen(false)}>
          <ModalHead title="Connections" onClose={() => setConnOpen(false)} />
          <div className="px-5 pb-4 flex flex-col gap-2">
            {["GitHub", "Buffer", "Canva", "Google Drive", "Notion"].map((n) => (
              <div key={n} className="gp-conn-item gp-conn-locked flex items-center gap-2.5">
                <span className="font-semibold text-[14px] flex-1">{n}</span>
                <span className="gp-soonbadge gp-soonbadge-lg">Coming soon</span>
              </div>
            ))}
            <div className="gp-conn-soon">Connections are on the way. Everything available now is free to use.</div>
          </div>
        </Modal>

        <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} wide>
          <ModalHead title="Settings" onClose={() => setSettingsOpen(false)} />
          <div className="px-5 pb-2">
            <div className="text-[12px] font-semibold text-text mb-1.5">Custom instructions</div>
            <p className="text-[11.5px] text-muted mb-2">How should it respond? It follows this in every chat.</p>
            <textarea value={draftInstr} onChange={(e) => setDraftInstr(e.target.value.slice(0, 1500))} rows={5}
              placeholder={"e.g. Keep answers short. I trade futures, mostly NQ, on the 5 minute chart. Talk to me like a business partner."}
              className="gp-conn-input resize-none leading-relaxed" />
            <div className="text-right text-[10.5px] text-muted/70 mt-1">{draftInstr.length}/1500</div>
          </div>
          <div className="px-5 pb-2 flex flex-col">
            <Toggle on={settings.followups} set={(v) => saveSettings({ ...settings, followups: v })} label="Suggested follow-ups" sub="Show quick next questions under answers" />
            {ttsOk && <Toggle on={settings.autoSpeak} set={(v) => saveSettings({ ...settings, autoSpeak: v })} label="Read replies out loud" sub="Speaks every answer automatically" />}
            <Toggle on={settings.enterSends} set={(v) => saveSettings({ ...settings, enterSends: v })} label="Enter sends the message" sub="Off: Enter adds a new line, Ctrl or ⌘ + Enter sends" />
          </div>
          <div className="px-5 py-3 border-t border-white/[0.07] flex flex-wrap items-center gap-2">
            <button onClick={() => { downloadText("greenprint-ai-chats.md", convos.map(convoToMarkdown).join("\n\n---\n\n")); flash("All chats exported"); }} disabled={!convos.length} className="gp-ghostbtn">Export all chats</button>
            {!confirmWipe ? (
              <button onClick={() => setConfirmWipe(true)} disabled={!convos.length} className="gp-ghostbtn gp-danger">Delete all chats</button>
            ) : (
              <button onClick={() => { updateConvos(() => [], null); newChat(); setConfirmWipe(false); flash("All chats deleted"); }} className="gp-memclear text-[12px] font-semibold px-3 py-1.5 rounded-lg">Tap again to delete everything</button>
            )}
            <button onClick={() => { saveSettings({ ...settings, instructions: draftInstr.trim() }); setSettingsOpen(false); flash("Settings saved"); }} className="gp-savebtn ml-auto">Save</button>
          </div>
        </Modal>

        <Modal open={toolsOpen} onClose={() => setToolsOpen(false)} wide>
          <TradingTools tab={toolTab} setTab={setToolTab} onClose={() => setToolsOpen(false)} onAsk={(p) => { setToolsOpen(false); setMode("coach"); setTimeout(() => sendRef.current(p), 30); }} />
        </Modal>

        <AnimatePresence>{talkOpen && <TalkMode onSend={talkSend} onClose={() => setTalkOpen(false)} />}</AnimatePresence>

        {/* ===== main column ===== */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative"
          onDragOver={(e) => { if (e.dataTransfer?.types?.includes("Files")) { e.preventDefault(); setDragging(true); } }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
          onDrop={(e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); setDragging(false); onPickFiles(e.dataTransfer.files); } }}>
          {dragging && <div className="gp-drop" onDragLeave={() => setDragging(false)}><div>Drop files or images to attach</div></div>}

          {/* mobile app bar */}
          <div className="gp-mbar lg:hidden">
            <button onClick={() => setRailOpen(true)} className="gp-mbar-btn" aria-label="History">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="gp-mbar-title truncate">{current && !empty ? current.title : "Greenprint AI"}</span>
            <button onClick={() => { if (streaming) stop(); newChat(); }} className="gp-mbar-btn" aria-label="New chat">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>

          {/* desktop chat header */}
          {!empty && (
            <div className="gp-chathead hidden lg:flex">
              <span className="truncate text-[13.5px] font-semibold text-text/90">{current?.title || "New chat"}</span>
              <span className="gp-modetag">{modeInfo.label}</span>
              <div className="ml-auto flex items-center gap-1">
                {siteVersions.length > 0 && !canvasOpen && <button onClick={() => openVersion(siteHtml || siteVersions[siteVersions.length - 1])} className="gp-headbtn" title="Open website">{Ico.site}<span>Website</span></button>}
                <button onClick={() => setToolsOpen(true)} className="gp-headbtn" title="Trading tools">{Ico.calc}</button>
                {voiceOk && ttsOk && <button onClick={openTalk} className="gp-headbtn" title="Talk mode">{Ico.wave}</button>}
                {current && <button onClick={() => exportChat(current.id)} className="gp-headbtn" title="Export chat">{Ico.export}</button>}
              </div>
            </div>
          )}

          <div ref={riverRef} onScroll={onRiverScroll} onClick={onRiverClick} className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-5 py-8">
              {empty ? (
                <div className="gp-hero flex flex-col items-center text-center">
                  <motion.div className="gp-core" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>
                    <span className="gp-core-ring" /><span className="gp-core-ring gp-core-ring2" /><span className="gp-core-glow" />
                    <span className="gp-core-mark"><svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#06110a" strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 3 8-9" /><path d="M14 6h6v6" /></svg></span>
                  </motion.div>
                  <motion.div className="gp-eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}>
                    {mode ? modeInfo.label : "The Greenprint Intelligence"}
                  </motion.div>
                  <motion.h1 className="gp-head" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}>
                    Describe it.<br /><span className="gp-head-accent">Watch it build.</span>
                  </motion.h1>
                  <motion.p className="gp-sub" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.38 }}>
                    Websites, trade breakdowns, content, strategy, your files and PDFs. Type, talk, or drop something in. Type <b>/</b> for shortcuts.
                  </motion.p>
                  <motion.div className="gp-marquee" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.6 }}>
                    <div className="gp-marquee-track">
                      {[...CAPS, ...CAPS].map((cap, k) => (<span key={k} className="gp-mq-item"><span className="gp-mq-dot" />{cap}</span>))}
                    </div>
                  </motion.div>
                  <motion.div key={mode} className="gp-cards" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
                    {(STARTERS[mode] || STARTERS[""]).map((s) => (
                      <button key={s.tag} onClick={() => send(s.text)} className="gp-card group">
                        <span className="gp-card-tag">{s.tag}</span>
                        <span className="gp-card-text">{s.text}</span>
                        <span className="gp-card-go">Go<svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
                      </button>
                    ))}
                  </motion.div>
                  <motion.div className="gp-quick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.9 }}>
                    <button onClick={() => { setToolTab("size"); setToolsOpen(true); }}>{Ico.calc}Position size</button>
                    <button onClick={() => { setToolTab("rr"); setToolsOpen(true); }}>{Ico.calc}Risk / reward</button>
                    {voiceOk && ttsOk && <button onClick={openTalk}>{Ico.wave}Talk mode</button>}
                    <button onClick={() => fileRef.current?.click()}>{Ico.clip}Upload a file</button>
                  </motion.div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {messages.map((m, i) => {
                    const isLast = i === messages.length - 1;
                    const live = streaming && isLast && m.role === "assistant";
                    const { text, followups } = m.role === "assistant" ? splitFollowups(extractSite(m.content).chat) : { text: m.content, followups: [] as string[] };
                    const siteHere = m.role === "assistant" && m.content.includes(SITE_END) ? cleanSiteHtml(extractSite(m.content).html) : "";
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`gp-msg flex gap-3 sm:gap-3.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-xl grid place-items-center shrink-0 mt-0.5 ${m.role === "user" ? "gp-ava-user" : "gp-ava-ai"}`}>
                          {m.role === "assistant" ? Ico.logo : (<span className="text-[9px] font-bold text-muted">YOU</span>)}
                        </div>
                        <div className={`min-w-0 ${m.role === "user" ? "max-w-[84%] flex flex-col items-end" : "flex-1"}`}>
                          {m.role === "user" ? (
                            <>
                              {(m.files?.length || m.imgs) ? (
                                <div className="flex flex-wrap justify-end gap-1.5 mb-1.5">
                                  {m.files?.map((f, k) => <span key={k} className="gp-filechip">{Ico.doc}{f.name}</span>)}
                                  {m.imgs ? <span className="gp-filechip">{Ico.image}{m.imgs} image{m.imgs > 1 ? "s" : ""}</span> : null}
                                </div>
                              ) : null}
                              <div className={`gp-user-bubble px-4 py-2.5 text-[15px] whitespace-pre-wrap break-words ${editIdx === i ? "gp-editing" : ""}`}>{m.content.replace(/\s*\u{1F5BC}️$/u, "")}</div>
                              {!streaming && (
                                <div className="gp-acts gp-acts-user">
                                  <button onClick={() => startEdit(i)} title="Edit and resend">{Ico.edit}</button>
                                  <button onClick={() => copyText("u" + i, m.content)} title="Copy">{copied === "u" + i ? Ico.check : Ico.copy}</button>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {live && !m.content ? (
                                <div className="gp-thinking"><span /><span /><span /><em>Thinking</em></div>
                              ) : (
                                <div className="gp-md text-[15px] leading-[1.65] pt-0.5" dangerouslySetInnerHTML={{ __html: renderMd(text) + (live ? '<span class="gp-cursor"></span>' : "") }} />
                              )}
                              {siteHere && !live && (
                                <button onClick={() => openVersion(siteHere)} className="gp-sitecard">
                                  <span className="gp-sitecard-ico">{Ico.site}</span>
                                  <span className="flex-1 text-left"><b>Website{siteVersions.length > 1 ? ` v${siteVersions.indexOf(siteHere) + 1}` : ""}</b><em>Tap to open in the canvas</em></span>
                                  <span className="gp-sitecard-go">Open</span>
                                </button>
                              )}
                              {!live && m.content && (
                                <div className="gp-acts">
                                  <button onClick={() => copyText("a" + i, displayText(m.content))} title="Copy">{copied === "a" + i ? Ico.check : Ico.copy}</button>
                                  {ttsOk && <button onClick={() => toggleSpeak(i)} title={speakingIdx === i ? "Stop reading" : "Read aloud"} className={speakingIdx === i ? "gp-act-on" : ""}>{speakingIdx === i ? Ico.stopSq : Ico.speaker}</button>}
                                  {i === lastAssistant && !streaming && <button onClick={regenerate} title="Regenerate">{Ico.redo}</button>}
                                </div>
                              )}
                              {i === lastAssistant && !streaming && followups.length > 0 && (
                                <div className="gp-follow">
                                  {followups.map((f, k) => (
                                    <button key={k} onClick={() => send(f)}><span>{f}</span><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* jump to latest */}
          <AnimatePresence>
            {showDown && !empty && (
              <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} onClick={() => { stickRef.current = true; scrollDown(true); }} className="gp-downbtn" aria-label="Jump to latest">{Ico.down}</motion.button>
            )}
          </AnimatePresence>

          {/* ===== composer ===== */}
          <div className="shrink-0 px-3 sm:px-5 pb-6 pt-2 gp-composer-wrap">
            <div className="max-w-3xl mx-auto relative">
              {/* slash command menu */}
              <AnimatePresence>
                {slashOpen && slashList.length > 0 && (
                  <motion.div className="gp-slash" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}>
                    {slashList.map((c, k) => (
                      <button key={c.cmd} onMouseEnter={() => setSlashSel(k)} onClick={() => runCommand(c)} className={k === slashSel ? "gp-slash-on" : ""}>
                        <b>{c.cmd}</b><span>{c.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

                    <AnimatePresence>
                      {plusOpen && (
                        <>
                          <div className="fixed inset-0 z-[26]" onClick={() => setPlusOpen(false)} />
                          <motion.div className="gp-pop gp-pop-plus" initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}>
                            <button onClick={() => { setPlusOpen(false); fileRef.current?.click(); }}>{Ico.clip}<span className="flex-1 text-left">Upload files or images<em>PDF, docs, CSV, code, charts</em></span></button>
                            <button onClick={() => { setPlusOpen(false); setToolTab("size"); setToolsOpen(true); }}>{Ico.calc}<span className="flex-1 text-left">Trading tools<em>Position size, risk / reward</em></span></button>
                            {voiceOk && ttsOk && <button onClick={() => { setPlusOpen(false); openTalk(); }}>{Ico.wave}<span className="flex-1 text-left">Talk mode<em>Hands-free voice conversation</em></span></button>}
                            <div className="gp-pop-sep" />
                            <button disabled>{Ico.globe}<span className="flex-1 text-left">Web search<em>Live answers from the web</em></span><span className="gp-soonbadge">Soon</span></button>
                            <button disabled>{Ico.image}<span className="flex-1 text-left">Create images<em>Generate graphics and thumbnails</em></span><span className="gp-soonbadge">Soon</span></button>
                            <button disabled>{Ico.research}<span className="flex-1 text-left">Deep research<em>Multi-source reports</em></span><span className="gp-soonbadge">Soon</span></button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
              <div className="gp-modelrow">
                {MODES.map((m) => (
                  <button key={m.id || "chat"} onClick={() => setMode(m.id)} className={`gp-modelchip ${mode === m.id ? "gp-modelchip-on" : ""}`} title={m.blurb}>{m.label}</button>
                ))}
                <span className="gp-rowsep" />
                <div className="relative">
                  <button onClick={() => setModelOpen((o) => !o)} className="gp-modelchip gp-modelpick">
                    {MODELS.find((x) => x.id === model)?.label || "Auto"}
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {modelOpen && (
                  <motion.div className="gp-pop gp-pop-model" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}>
                    {MODELS.map((m) => (
                      <button key={m.id || "auto"} disabled={m.soon} onClick={() => { pickModel(m.id); setModelOpen(false); }} className={model === m.id && !m.soon ? "gp-pop-on" : ""}>
                        <span className="flex-1 text-left">{m.label}<em>{m.soon ? "Premium model" : "Free, fast, always on"}</em></span>
                        {m.soon ? <span className="gp-soonbadge">Soon</span> : model === m.id ? Ico.check : null}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {editIdx !== null && (
                <div className="gp-editbar"><span>{Ico.edit}Editing your message. Sending replaces everything after it.</span><button onClick={() => { setEditIdx(null); setInput(""); }}>Cancel</button></div>
              )}

              {(attached.length > 0 || files.length > 0 || fileBusy > 0) && (
                <div className="gp-thumbs">
                  {attached.map((src, i) => (
                    <div key={i} className="gp-thumb">
                      <img src={src} alt="attachment" />
                      <button onClick={() => setAttached((a) => a.filter((_, k) => k !== i))} aria-label="Remove"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
                    </div>
                  ))}
                  {files.map((f, i) => (
                    <div key={i} className="gp-filepill">
                      <span className="gp-filepill-ico">{Ico.doc}</span>
                      <span className="min-w-0"><b>{f.name}</b><em>{Math.max(1, Math.round(f.text.length / 1000))}k characters</em></span>
                      <button onClick={() => setFiles((a) => a.filter((_, k) => k !== i))} aria-label="Remove">{Ico.x}</button>
                    </div>
                  ))}
                  {fileBusy > 0 && <div className="gp-filepill gp-filepill-busy"><span className="gp-spin" /><span><b>Reading file</b><em>One moment</em></span></div>}
                </div>
              )}

              <div className="gp-composer-shell">
                <div className="gp-composer flex items-end gap-2">
                  <input ref={fileRef} type="file" accept={FILE_ACCEPT} multiple hidden onChange={(e) => { onPickFiles(e.target.files); if (e.target) e.target.value = ""; }} />
                  <div className="relative shrink-0">
                    <button onClick={() => setPlusOpen((o) => !o)} title="Add" className={`gp-attach w-9 h-9 rounded-xl grid place-items-center transition-all ${plusOpen ? "gp-attach-on" : ""}`}>{Ico.plus}</button>
                  </div>
                  <textarea ref={taRef} value={input} rows={1}
                    onChange={(e) => { setInput(e.target.value); autosize(); }}
                    onPaste={onPaste}
                    onKeyDown={(e) => {
                      if (slashOpen && slashList.length) {
                        if (e.key === "ArrowDown") { e.preventDefault(); setSlashSel((s) => (s + 1) % slashList.length); return; }
                        if (e.key === "ArrowUp") { e.preventDefault(); setSlashSel((s) => (s - 1 + slashList.length) % slashList.length); return; }
                        if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); runCommand(slashList[Math.min(slashSel, slashList.length - 1)]); return; }
                      }
                      const isMod = e.metaKey || e.ctrlKey;
                      if (e.key === "Enter" && !e.shiftKey && (settings.enterSends || isMod)) { e.preventDefault(); send(); }
                    }}
                    placeholder={mode === "coach" ? "Ask about a setup or risk..." : mode === "content" ? "What are we posting?" : mode === "builder" ? "Describe the site to build..." : mode === "strategist" ? "What's the decision?" : "Ask anything, or type /"}
                    className="flex-1 min-w-0 bg-transparent resize-none outline-none border-0 text-[15px] leading-[1.5] py-1.5 max-h-[180px] placeholder:text-muted/55" />
                  {voiceOk && (
                    <button onClick={toggleVoice} title={listening ? "Stop listening" : "Dictate"} className={`gp-mic shrink-0 w-9 h-9 rounded-xl grid place-items-center transition-all ${listening ? "gp-mic-on" : ""}`}>
                      {listening ? (<span className="gp-mic-wave"><span /><span /><span /></span>) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></svg>
                      )}
                    </button>
                  )}
                  {!canSend && !streaming && voiceOk && ttsOk ? (
                    <button onClick={openTalk} title="Talk mode" className="gp-send shrink-0 w-9 h-9 rounded-xl grid place-items-center transition-all">{Ico.wave}</button>
                  ) : (
                    <button onClick={() => (streaming ? stop() : send())} disabled={!streaming && !canSend} className="gp-send shrink-0 w-9 h-9 rounded-xl grid place-items-center transition-all disabled:opacity-25" title={streaming ? "Stop" : "Send"}>
                      {streaming ? (<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="gp-foot">Free and always on. It can make mistakes. Not financial advice.</div>
            </div>
          </div>
        </div>

        {/* ===== build canvas ===== */}
        {canvasOpen && (
          <motion.div initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col min-w-0 gp-canvas w-full lg:w-[48%] lg:shrink-0 fixed lg:static inset-0 top-0 lg:top-16 z-30 lg:z-auto">
            <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 gp-canvas-head flex-wrap">
              <div className="flex gap-0.5 gp-tabs rounded-lg p-0.5">
                <button onClick={() => setCanvasTab("preview")} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${canvasTab === "preview" ? "gp-tab-on" : "text-muted"}`}>Preview</button>
                <button onClick={() => setCanvasTab("code")} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${canvasTab === "code" ? "gp-tab-on" : "text-muted"}`}>Code</button>
              </div>
              {canvasTab === "preview" && (
                <div className="hidden sm:flex gap-0.5 gp-tabs rounded-lg p-0.5">
                  {([["desk", "Desktop", <svg key="d" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>],
                    ["tab", "Tablet", <svg key="t" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M11 18h2" /></svg>],
                    ["phone", "Phone", <svg key="p" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>]] as const).map(([id, label, icon]) => (
                    <button key={id} title={label} onClick={() => setDevice(id as any)} className={`w-8 h-7 grid place-items-center rounded-md transition-all ${device === id ? "gp-tab-on" : "text-muted"}`}>{icon}</button>
                  ))}
                </div>
              )}
              {siteVersions.length > 1 && (
                <div className="gp-vers">
                  <button disabled={verIdx <= 0} onClick={() => openVersion(siteVersions[verIdx - 1])} aria-label="Previous version">‹</button>
                  <span>v{verIdx + 1 || siteVersions.length} of {siteVersions.length}</span>
                  <button disabled={verIdx < 0 || verIdx >= siteVersions.length - 1} onClick={() => openVersion(siteVersions[verIdx + 1])} aria-label="Next version">›</button>
                </div>
              )}
              <div className="ml-auto flex gap-1.5">
                <button disabled={!siteHtml} title="Reload preview" onClick={() => setFrameKey((k) => k + 1)} className="gp-canvas-ico" aria-label="Reload">{Ico.redo}</button>
                <button disabled={!siteHtml} title="Open full screen in a new tab" onClick={() => { try { const w = window.open("", "_blank"); if (w) { w.document.open(); w.document.write(siteHtml); w.document.close(); } } catch {} }} className="gp-canvas-ico" aria-label="Open in new tab">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                </button>
                <button disabled={!siteHtml} title="Copy the code" onClick={() => { copyText("site", siteHtml); flash("Code copied"); }} className="gp-canvas-ico" aria-label="Copy code">{copied === "site" ? Ico.check : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>}</button>
                <button disabled={!siteHtml} onClick={() => downloadText("greenprint-site.html", siteHtml, "text/html")} className="gp-dl text-[12px] font-semibold inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 disabled:opacity-30 transition-all">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M7 10l5 5 5-5M5 21h14" /></svg>
                  Download
                </button>
                <button onClick={() => setCanvasOpen(false)} className="w-7 h-7 grid place-items-center rounded-lg border border-white/10 text-muted hover:text-text transition-colors" aria-label="Close">{Ico.x}</button>
              </div>
            </div>
            <div className={`flex-1 min-h-0 relative ${deviceW && canvasTab === "preview" && siteHtml ? "gp-devstage" : "bg-white"}`}>
              {!siteHtml ? (
                <div className="absolute inset-0 grid place-items-center gp-canvas-building">
                  <div className="flex flex-col items-center gap-4">
                    <div className="gp-build-core"><span /><span /></div>
                    <span className="text-[12px] text-muted tracking-wide">Building your website</span>
                  </div>
                </div>
              ) : canvasTab === "preview" ? (
                deviceW ? (
                  <div className="absolute inset-0 overflow-auto flex justify-center py-5">
                    <div className="gp-devframe" style={{ width: deviceW }}>
                      <iframe key={frameKey} title="Website preview" srcDoc={siteHtml} className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-forms allow-popups allow-modals" />
                    </div>
                  </div>
                ) : (
                  <iframe key={frameKey} title="Website preview" srcDoc={siteHtml} className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-forms allow-popups allow-modals" />
                )
              ) : (
                <pre className="absolute inset-0 overflow-auto m-0 p-4 gp-code" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{siteHtml}</pre>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div className="gp-toast" initial={{ opacity: 0, y: 10, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 10, x: "-50%" }}>{toast}</motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap');
        .gp-root { background: #060806; --gold: #d8b25e; --gold-bright: #f0d089; --grn: #00ff85; }
        .gp-root textarea { -webkit-tap-highlight-color: transparent; }
        .gp-composer textarea:focus { outline: none; box-shadow: none; }

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
        .gp-membtn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #b7bdb7; }
        .gp-membtn:hover { color: #fff; border-color: rgba(0,255,133,0.3); background: rgba(0,255,133,0.05); }
        .gp-membtn svg { color: var(--gold); }
        .gp-membadge { font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; display: inline-grid; place-items: center; background: rgba(0,255,133,0.15); color: var(--grn); }
        .gp-memcard { background: #0e110e; border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; box-shadow: 0 40px 100px -30px rgba(0,0,0,0.7); }
        .gp-memtitle { font-family: 'Bricolage Grotesque', system-ui, sans-serif; font-weight: 700; font-size: 17px; letter-spacing: -0.015em; color: #f3f5f3; }
        .gp-memitem { color: #cdd4cd; line-height: 1.5; }
        .gp-memdot { width: 6px; height: 6px; border-radius: 50%; background: var(--gold); margin-top: 7px; flex: 0 0 auto; box-shadow: 0 0 6px var(--gold); }
        .gp-memclear { background: rgba(255,80,80,0.12); color: #ff6b6b; border: 1px solid rgba(255,80,80,0.25); }
        .gp-memclear:hover { background: rgba(255,80,80,0.2); }
        .gp-modelrow { display: flex; gap: 6px; overflow-x: auto; padding: 0 2px 8px; scrollbar-width: none; }
        .gp-modelrow::-webkit-scrollbar { display: none; }
        .gp-modelchip { flex: 0 0 auto; font-size: 11.5px; font-weight: 600; padding: 5px 11px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: #9aa29a; transition: all 0.15s ease; white-space: nowrap; }
        .gp-modelchip:hover { color: #fff; border-color: rgba(255,255,255,0.18); }
        .gp-modelchip-on { background: rgba(0,255,133,0.14); border-color: rgba(0,255,133,0.45); color: var(--grn); }
        .gp-modelchip-soon { opacity: 0.55; cursor: default; }
        .gp-modelchip-soon:hover { color: #9aa29a; border-color: rgba(255,255,255,0.1); }
        .gp-soonbadge { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: var(--gold); background: rgba(216,178,94,0.16); padding: 1px 5px; border-radius: 5px; margin-left: 6px; vertical-align: middle; }
        .gp-soonbadge-lg { font-size: 9.5px; padding: 3px 8px; margin-left: 0; }
        .gp-conn-locked { opacity: 0.8; }
        /* mobile app bar */
        .gp-mbar { display: none; }
        @media (max-width: 1023px) {
          .gp-mbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; padding-top: max(8px, env(safe-area-inset-top)); border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(6,8,6,0.8); backdrop-filter: blur(14px); position: sticky; top: 0; z-index: 20; }
          .gp-mbar-btn { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 11px; color: #cdd4cd; background: transparent; }
          .gp-mbar-btn:active { background: rgba(255,255,255,0.06); }
          .gp-mbar-title { font-family: 'Bricolage Grotesque', system-ui, sans-serif; font-weight: 700; font-size: 15px; letter-spacing: -0.01em; color: #f3f5f3; }
          /* roomier touch targets + comfortable chat on phones */
          .gp-composer { padding: 12px 12px 12px 16px; border-radius: 17px; }
          .gp-send, .gp-mic, .gp-attach { width: 40px; height: 40px; }
          .gp-modelchip { padding: 7px 13px; font-size: 12px; }
          .gp-rail { width: 84vw; max-width: 320px; }
        }
        .gp-conn-item { border: 1px solid rgba(255,255,255,0.09); border-radius: 13px; padding: 14px; background: rgba(255,255,255,0.02); }
        .gp-conn-live { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; color: var(--grn); background: rgba(0,255,133,0.14); padding: 2px 7px; border-radius: 6px; }
        .gp-conn-input { width: 100%; background: #0a0c0a; border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 9px 11px; font-size: 13px; color: #ededed; outline: none; }
        .gp-conn-input:focus { border-color: rgba(0,255,133,0.4); }
        .gp-conn-soon { margin-top: 12px; text-align: center; font-size: 11.5px; color: #6b746b; }
        @keyframes gp-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

        /* signature intelligence core */
        .gp-hero { min-height: calc(100dvh - 230px); justify-content: flex-start; padding: 12px 0; }
        .gp-hero > :first-child { margin-top: auto; } .gp-hero > :last-child { margin-bottom: auto; }
        .gp-core { position: relative; width: 66px; height: 66px; display: grid; place-items: center; margin-bottom: 16px; }
        .gp-core-ring { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 0deg, transparent, var(--grn), transparent 42%, var(--gold-bright), transparent 72%); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px)); mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px)); animation: gp-rot 6s linear infinite; }
        .gp-core-ring2 { inset: 10px; opacity: 0.5; animation: gp-rot 9s linear infinite reverse; }
        .gp-core-glow { position: absolute; inset: 14px; border-radius: 50%; background: radial-gradient(circle, rgba(0,255,133,0.35), transparent 70%); filter: blur(10px); animation: gp-breathe 3.5s ease-in-out infinite; }
        .gp-core-mark { position: relative; width: 74%; height: 74%; border-radius: 28%; display: grid; place-items: center; background: linear-gradient(150deg, var(--grn), #0a7a39); box-shadow: 0 10px 34px -10px var(--grn); }
        .gp-core-mark svg { width: 46%; height: 46%; }
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
        .gp-composer-wrap { background: linear-gradient(to top, #060806 58%, transparent); padding-bottom: max(24px, env(safe-area-inset-bottom)); }
        .gp-composer-shell { position: relative; border-radius: 17px; padding: 1.5px; overflow: hidden; }
        .gp-composer-shell::before { content: ""; position: absolute; inset: -60%; background: conic-gradient(from 0deg, transparent, rgba(0,255,133,0.55), transparent 28%, rgba(216,178,94,0.5), transparent 55%); animation: gp-rot 8s linear infinite; opacity: 0.55; }
        .gp-composer { position: relative; z-index: 1; background: #121512; border-radius: 15.5px; padding: 10px 10px 10px 16px; }
        .gp-composer-shell:focus-within::before { opacity: 1; animation-duration: 4s; }
        .gp-send { background: linear-gradient(150deg, var(--grn), #0ad46f); color: #06110a; box-shadow: 0 0 18px -6px var(--grn); }
        .gp-send:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 0 26px -4px var(--grn); }
        .gp-attach { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #c7cdc7; }
        .gp-attach:hover { color: #fff; border-color: rgba(0,255,133,0.35); }
        .gp-thumbs { display: flex; gap: 8px; padding: 0 2px 8px; flex-wrap: wrap; }
        .gp-thumb { position: relative; width: 60px; height: 60px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.12); }
        .gp-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .gp-thumb button { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; background: rgba(0,0,0,0.65); color: #fff; display: grid; place-items: center; }
        .gp-mic { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #c7cdc7; }
        .gp-mic:hover { color: #fff; border-color: rgba(0,255,133,0.35); }
        .gp-mic-on { background: rgba(0,255,133,0.14); border-color: rgba(0,255,133,0.5); color: var(--grn); box-shadow: 0 0 20px -6px var(--grn); animation: gp-mic-pulse 1.4s ease-in-out infinite; }
        @keyframes gp-mic-pulse { 0%,100% { box-shadow: 0 0 16px -8px var(--grn); } 50% { box-shadow: 0 0 26px -4px var(--grn); } }
        .gp-mic-wave { display: inline-flex; align-items: center; gap: 2.5px; height: 16px; }
        .gp-mic-wave span { width: 2.5px; height: 6px; background: var(--grn); border-radius: 2px; animation: gp-wave 0.9s ease-in-out infinite; }
        .gp-mic-wave span:nth-child(2) { animation-delay: 0.15s; } .gp-mic-wave span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes gp-wave { 0%,100% { height: 6px; } 50% { height: 15px; } }

        /* canvas */
        .gp-canvas { background: rgba(9,11,9,0.92); backdrop-filter: blur(18px); border-left: 1px solid rgba(255,255,255,0.07); }
        .gp-canvas-head { background: rgba(9,11,9,0.9); border-bottom: 1px solid rgba(255,255,255,0.07); }
        .gp-tabs { background: rgba(255,255,255,0.05); }
        .gp-tab-on { background: rgba(0,255,133,0.14); color: var(--grn); }
        .gp-dl { background: linear-gradient(150deg, var(--grn), #0ad46f); color: #06110a; }
        .gp-canvas-ico { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); color: #c7cdc7; background: rgba(255,255,255,0.04); transition: all 0.15s ease; }
        .gp-canvas-ico:hover:not(:disabled) { color: #fff; border-color: rgba(0,255,133,0.35); }
        .gp-canvas-ico:disabled { opacity: 0.3; }
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
          .gp-hero { min-height: calc(100dvh - 210px); padding: 6px 0; }
        }
        /* keep the intro on one screen on shorter viewports */
        @media (max-height: 820px) {
          .gp-sub { display: none; }
          .gp-core { width: 58px; height: 58px; margin-bottom: 12px; }
          .gp-eyebrow { margin-bottom: 10px; }
          .gp-marquee { margin-top: 14px; }
          .gp-cards { margin-top: 16px; }
        }
        @media (max-height: 680px) {
          .gp-marquee { display: none; }
          .gp-head { font-size: clamp(30px, 7vw, 44px); }
          .gp-core { width: 50px; height: 50px; margin-bottom: 10px; }
          .gp-cards { gap: 8px; margin-top: 14px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gp-aurora, .gp-core-ring, .gp-core-ring2, .gp-core-glow, .gp-head-accent, .gp-marquee-track, .gp-composer-shell::before, .gp-dot, .gp-cursor, .gp-build-core span { animation: none !important; }
        }

        /* ===== v2 upgrade ===== */
        .gp-search { display: flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); color: #7f887f; }
        .gp-search:focus-within { border-color: rgba(0,255,133,0.3); color: #cdd4cd; }
        .gp-search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: none; font-size: 12.5px; color: #e6ebe6; }
        .gp-search input::placeholder { color: #6b746b; }
        .gp-search button { color: #7f887f; }
        .gp-grouplabel { font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em; color: #5f685f; font-weight: 700; padding: 8px 12px 4px; }
        .gp-pin { width: 5px; height: 5px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 6px var(--gold); flex: 0 0 auto; }
        .gp-rowdots { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 7px; color: #8a938a; opacity: 0; transition: opacity 0.15s, background 0.15s; flex: 0 0 auto; }
        .group:hover .gp-rowdots, .gp-rowdots-on { opacity: 1; }
        .gp-rowdots:hover { background: rgba(255,255,255,0.07); color: #fff; }
        @media (hover: none) { .gp-rowdots { opacity: 0.7; } }
        .gp-rowmenu { position: absolute; right: 6px; top: 36px; z-index: 30; min-width: 164px; padding: 5px; border-radius: 12px; background: #121612; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 50px -14px rgba(0,0,0,0.8); display: flex; flex-direction: column; }
        .gp-rowmenu button { text-align: left; font-size: 12.5px; color: #d6dcd6; padding: 8px 10px; border-radius: 8px; }
        .gp-rowmenu button:hover { background: rgba(255,255,255,0.06); }
        .gp-danger { color: #ff7a7a !important; }
        .gp-rename { flex: 1; min-width: 0; background: #0a0c0a; border: 1px solid rgba(0,255,133,0.4); border-radius: 6px; padding: 2px 6px; font-size: 13px; color: #fff; outline: none; }
        .gp-memdel { opacity: 0; color: #7f887f; transition: opacity 0.15s; padding: 2px; border-radius: 6px; }
        .gp-memitem:hover .gp-memdel { opacity: 1; }
        .gp-memdel:hover { color: #ff7a7a; }
        @media (hover: none) { .gp-memdel { opacity: 0.7; } }

        .gp-chathead { align-items: center; gap: 10px; padding: 10px 18px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(6,8,6,0.35); backdrop-filter: blur(10px); }
        .gp-modetag { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700; color: var(--gold); background: rgba(216,178,94,0.12); border: 1px solid rgba(216,178,94,0.25); padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
        .gp-headbtn { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 8px; border-radius: 8px; color: #9aa29a; font-size: 12px; font-weight: 600; transition: all 0.15s; }
        .gp-headbtn:hover { color: #fff; background: rgba(255,255,255,0.06); }

        .gp-acts { display: flex; gap: 2px; margin-top: 8px; opacity: 0.0; transition: opacity 0.2s; }
        .gp-msg:hover .gp-acts, .gp-msg:last-child .gp-acts { opacity: 1; }
        @media (hover: none) { .gp-acts { opacity: 0.85; } }
        .gp-acts button { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; color: #7f887f; transition: all 0.15s; }
        .gp-acts button:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .gp-acts .gp-act-on { color: var(--grn); background: rgba(0,255,133,0.1); }
        .gp-acts-user { justify-content: flex-end; margin-top: 4px; }
        .gp-editing { border-color: rgba(0,255,133,0.45) !important; box-shadow: 0 0 0 3px rgba(0,255,133,0.08); }
        .gp-filechip { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: #c7cdc7; padding: 4px 9px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .gp-filechip svg { color: var(--gold); flex: 0 0 auto; }

        .gp-thinking { display: inline-flex; align-items: center; gap: 5px; padding-top: 8px; }
        .gp-thinking span { width: 6px; height: 6px; border-radius: 50%; background: var(--grn); opacity: 0.4; animation: gp-think 1.1s ease-in-out infinite; }
        .gp-thinking span:nth-child(2) { animation-delay: 0.15s; } .gp-thinking span:nth-child(3) { animation-delay: 0.3s; }
        .gp-thinking em { font-style: normal; font-size: 12px; color: #7f887f; margin-left: 6px; letter-spacing: 0.04em; }
        @keyframes gp-think { 0%,100% { opacity: 0.25; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } }

        .gp-sitecard { margin-top: 12px; display: flex; align-items: center; gap: 12px; width: 100%; max-width: 380px; padding: 11px 12px; border-radius: 13px; background: linear-gradient(160deg, rgba(0,255,133,0.07), rgba(216,178,94,0.04)); border: 1px solid rgba(0,255,133,0.22); transition: all 0.2s; }
        .gp-sitecard:hover { border-color: rgba(0,255,133,0.45); transform: translateY(-1px); }
        .gp-sitecard-ico { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: rgba(0,255,133,0.14); color: var(--grn); }
        .gp-sitecard b { display: block; font-size: 13.5px; color: #fff; }
        .gp-sitecard em { display: block; font-style: normal; font-size: 11.5px; color: #8a938a; }
        .gp-sitecard-go { font-size: 11.5px; font-weight: 700; color: #06110a; background: var(--grn); padding: 5px 10px; border-radius: 8px; }

        .gp-follow { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
        .gp-follow button { display: flex; align-items: center; gap: 10px; text-align: left; font-size: 13.5px; color: #c7cdc7; padding: 9px 13px; border-radius: 11px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); transition: all 0.18s; width: fit-content; max-width: 100%; }
        .gp-follow button span { flex: 1; }
        .gp-follow button svg { color: var(--grn); opacity: 0; transform: translateX(-4px); transition: all 0.18s; flex: 0 0 auto; }
        .gp-follow button:hover { color: #fff; border-color: rgba(0,255,133,0.35); background: rgba(0,255,133,0.05); }
        .gp-follow button:hover svg { opacity: 1; transform: translateX(0); }

        .gp-downbtn { position: absolute; left: 50%; margin-left: -18px; bottom: 196px; z-index: 15; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: #151915; border: 1px solid rgba(255,255,255,0.14); color: #dfe5df; box-shadow: 0 10px 30px -8px rgba(0,0,0,0.8); }
        .gp-downbtn:hover { border-color: rgba(0,255,133,0.45); color: var(--grn); }

        .gp-rowsep { width: 1px; align-self: stretch; margin: 4px 2px; background: rgba(255,255,255,0.1); flex: 0 0 auto; }
        .gp-modelpick { display: inline-flex; align-items: center; gap: 5px; }
        .gp-pop { position: absolute; z-index: 25; padding: 6px; border-radius: 14px; background: #121612; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 24px 60px -16px rgba(0,0,0,0.85); display: flex; flex-direction: column; min-width: 250px; }
        .gp-pop button { display: flex; align-items: center; gap: 11px; padding: 9px 10px; border-radius: 9px; font-size: 13px; color: #e2e7e2; transition: background 0.15s; }
        .gp-pop button svg { color: var(--gold); flex: 0 0 auto; }
        .gp-pop button:hover:not(:disabled) { background: rgba(255,255,255,0.06); }
        .gp-pop button:disabled { opacity: 0.55; cursor: default; }
        .gp-pop button em { display: block; font-style: normal; font-size: 11px; color: #7f887f; margin-top: 1px; }
        .gp-pop .gp-pop-on { background: rgba(0,255,133,0.08); }
        .gp-pop .gp-pop-on svg { color: var(--grn); }
        .gp-pop-sep { height: 1px; background: rgba(255,255,255,0.07); margin: 4px 6px; }
        .gp-pop-plus { bottom: 100%; left: 0; margin-bottom: -38px; z-index: 27; }
        .gp-pop-model { bottom: 100%; right: 0; margin-bottom: -4px; }
        .gp-attach-on { color: var(--grn) !important; border-color: rgba(0,255,133,0.45) !important; transform: rotate(45deg); }

        .gp-slash { position: absolute; left: 0; right: 0; bottom: 100%; margin-bottom: 8px; z-index: 26; max-height: 320px; overflow-y: auto; padding: 6px; border-radius: 14px; background: #121612; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 24px 60px -16px rgba(0,0,0,0.85); }
        .gp-slash button { width: 100%; display: flex; align-items: baseline; gap: 12px; padding: 8px 10px; border-radius: 9px; text-align: left; }
        .gp-slash b { font-size: 13px; color: var(--grn); font-weight: 700; min-width: 74px; }
        .gp-slash span { font-size: 13px; color: #c7cdc7; }
        .gp-slash .gp-slash-on { background: rgba(0,255,133,0.08); }

        .gp-editbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; color: #c7cdc7; padding: 7px 12px; margin-bottom: 8px; border-radius: 10px; background: rgba(0,255,133,0.06); border: 1px solid rgba(0,255,133,0.22); }
        .gp-editbar span { display: inline-flex; align-items: center; gap: 7px; }
        .gp-editbar svg { color: var(--grn); }
        .gp-editbar button { font-weight: 700; color: #fff; }

        .gp-filepill { display: flex; align-items: center; gap: 9px; max-width: 250px; padding: 7px 8px 7px 9px; border-radius: 11px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); }
        .gp-filepill-ico { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; background: rgba(216,178,94,0.14); color: var(--gold); flex: 0 0 auto; }
        .gp-filepill b { display: block; font-size: 12px; color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gp-filepill em { display: block; font-style: normal; font-size: 10.5px; color: #7f887f; }
        .gp-filepill > button { color: #7f887f; padding: 3px; border-radius: 6px; flex: 0 0 auto; }
        .gp-filepill > button:hover { color: #fff; background: rgba(255,255,255,0.08); }
        .gp-spin { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(0,255,133,0.2); border-top-color: var(--grn); animation: gp-rot 0.8s linear infinite; margin: 0 6px; flex: 0 0 auto; }

        .gp-foot { text-align: center; font-size: 10.5px; color: #5c655c; margin-top: 8px; letter-spacing: 0.01em; }

        .gp-drop { position: absolute; inset: 10px; z-index: 50; border-radius: 22px; border: 2px dashed rgba(0,255,133,0.5); background: rgba(6,10,6,0.82); backdrop-filter: blur(6px); display: grid; place-items: center; font-family: 'Bricolage Grotesque', system-ui, sans-serif; font-weight: 700; font-size: 20px; color: var(--grn); }

        .gp-quick { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 16px; }
        .gp-quick button { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: #b7bdb7; padding: 7px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.025); transition: all 0.2s; }
        .gp-quick button svg { color: var(--gold); width: 14px; height: 14px; }
        .gp-quick button:hover { color: #fff; border-color: rgba(0,255,133,0.35); }
        .gp-sub b { color: var(--grn); }

        .gp-toggle-row { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-top: 1px solid rgba(255,255,255,0.05); }
        .gp-toggle { width: 38px; height: 22px; border-radius: 999px; background: rgba(255,255,255,0.12); position: relative; transition: background 0.2s; flex: 0 0 auto; }
        .gp-toggle span { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform 0.2s; }
        .gp-toggle-on { background: var(--grn); }
        .gp-toggle-on span { transform: translateX(16px); background: #06110a; }
        .gp-ghostbtn { font-size: 12px; font-weight: 600; color: #c7cdc7; padding: 7px 11px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.1); }
        .gp-ghostbtn:hover:not(:disabled) { color: #fff; border-color: rgba(255,255,255,0.2); }
        .gp-ghostbtn:disabled { opacity: 0.4; }
        .gp-savebtn { font-size: 12.5px; font-weight: 700; color: #06110a; background: linear-gradient(150deg, var(--grn), #0ad46f); padding: 8px 16px; border-radius: 9px; }

        /* tools */
        .gp-tf { display: flex; flex-direction: column; gap: 5px; }
        .gp-tf-l { font-size: 11px; font-weight: 600; color: #9aa29a; }
        .gp-tf-l em { font-style: normal; font-weight: 500; color: #6b746b; margin-left: 6px; }
        .gp-tf-box { display: flex; align-items: center; background: #0a0c0a; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0 10px; }
        .gp-tf-box:focus-within { border-color: rgba(0,255,133,0.45); }
        .gp-tf-box input { flex: 1; min-width: 0; background: transparent; border: 0; outline: none; padding: 10px 0; font-size: 15px; color: #fff; font-variant-numeric: tabular-nums; }
        .gp-tf-fix { font-size: 13px; color: #6b746b; padding: 0 3px; }
        .gp-tout { margin-top: 14px; border-radius: 14px; border: 1px solid rgba(0,255,133,0.18); background: linear-gradient(160deg, rgba(0,255,133,0.05), rgba(216,178,94,0.03)); padding: 6px 14px; }
        .gp-tout-big { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .gp-tout-big span { font-size: 12px; color: #9aa29a; }
        .gp-tout-big b { font-family: 'Bricolage Grotesque', system-ui, sans-serif; font-size: 22px; color: var(--grn); letter-spacing: -0.02em; text-align: right; }
        .gp-tout-row { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; font-size: 13px; color: #9aa29a; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .gp-tout-row:last-child { border-bottom: 0; }
        .gp-tout-row b { color: #fff; font-weight: 600; font-variant-numeric: tabular-nums; }
        .gp-tout-warn { font-size: 12px; color: #ffb36b; padding: 8px 0; }
        .gp-tools-ask { margin-top: 12px; width: 100%; font-size: 13px; font-weight: 700; color: #06110a; background: linear-gradient(150deg, var(--grn), #0ad46f); padding: 11px; border-radius: 11px; transition: filter 0.15s; }
        .gp-tools-ask:disabled { opacity: 0.3; }
        .gp-tools-ask:hover:not(:disabled) { filter: brightness(1.08); }

        /* talk mode */
        .gp-talk { position: fixed; inset: 0; z-index: 80; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 24px; background: radial-gradient(ellipse at 50% 42%, rgba(0,255,133,0.12), transparent 55%), rgba(4,6,4,0.96); backdrop-filter: blur(14px); }
        .gp-talk-top { position: absolute; top: max(16px, env(safe-area-inset-top)); left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: center; }
        .gp-talk-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.22em; font-weight: 700; color: var(--gold); }
        .gp-talk-x { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); }
        .gp-orb { position: relative; width: 200px; height: 200px; display: grid; place-items: center; }
        .gp-orb-ring { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 0deg, transparent, var(--grn), transparent 40%, var(--gold-bright), transparent 72%); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px)); mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px)); animation: gp-rot 5s linear infinite; }
        .gp-orb-ring2 { inset: 22px; opacity: 0.55; animation-duration: 8s; animation-direction: reverse; }
        .gp-orb-core { width: 104px; height: 104px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #7dffbf, var(--grn) 40%, #08703a 100%); box-shadow: 0 0 80px -10px var(--grn); transition: transform 0.4s; }
        .gp-orb-listening .gp-orb-core { animation: gp-breathe 1.8s ease-in-out infinite; }
        .gp-orb-thinking .gp-orb-ring { animation-duration: 1.2s; }
        .gp-orb-thinking .gp-orb-core { transform: scale(0.82); filter: saturate(0.7); }
        .gp-orb-speaking .gp-orb-core { animation: gp-speak 0.5s ease-in-out infinite alternate; }
        .gp-orb-paused .gp-orb-core { transform: scale(0.75); filter: grayscale(0.6) brightness(0.7); }
        .gp-orb-paused .gp-orb-ring { animation-play-state: paused; opacity: 0.4; }
        @keyframes gp-speak { from { transform: scale(0.94); } to { transform: scale(1.08); } }
        .gp-orb-bars { position: absolute; display: flex; gap: 5px; align-items: center; height: 40px; }
        .gp-orb-bars i { width: 5px; height: 12px; border-radius: 3px; background: #06110a; animation: gp-wave 0.7s ease-in-out infinite; }
        .gp-talk-label { font-family: 'Bricolage Grotesque', system-ui, sans-serif; font-weight: 700; font-size: 26px; letter-spacing: -0.02em; color: #fff; margin-top: 10px; }
        .gp-talk-sub { max-width: 34rem; text-align: center; font-size: 16px; line-height: 1.5; color: #b7bdb7; min-height: 48px; }
        .gp-talk-hint { font-size: 11.5px; color: #6b746b; letter-spacing: 0.04em; }

        /* canvas devices + versions */
        .gp-devstage { background: radial-gradient(ellipse at 50% 0%, rgba(0,255,133,0.06), transparent 60%), #0b0e0b; }
        .gp-devframe { height: 100%; min-height: 560px; border-radius: 18px; overflow: hidden; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 30px 80px -30px rgba(0,0,0,0.9); background: #fff; flex: 0 0 auto; }
        .gp-vers { display: inline-flex; align-items: center; gap: 2px; font-size: 11.5px; font-weight: 600; color: #c7cdc7; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 2px; }
        .gp-vers span { padding: 0 6px; white-space: nowrap; }
        .gp-vers button { width: 24px; height: 24px; border-radius: 6px; font-size: 16px; line-height: 1; color: #fff; }
        .gp-vers button:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
        .gp-vers button:disabled { opacity: 0.3; }

        /* richer markdown */
        .gp-md blockquote { margin: 6px 0 12px; padding: 4px 0 4px 14px; border-left: 2px solid var(--gold); color: #c7cdc7; }
        .gp-md hr { border: 0; height: 1px; background: rgba(255,255,255,0.1); margin: 16px 0; }
        .gp-tblwrap { overflow-x: auto; margin: 6px 0 14px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
        .gp-md table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
        .gp-md th { text-align: left; font-weight: 650; color: #fff; background: rgba(255,255,255,0.04); padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); white-space: nowrap; }
        .gp-md td { padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #d6dcd6; vertical-align: top; }
        .gp-md tr:last-child td { border-bottom: 0; }
        .gp-codeblk { margin: 6px 0 14px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; background: rgba(0,0,0,0.42); }
        .gp-codehd { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px 6px 14px; background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .gp-codehd span { font-size: 11px; color: #8a938a; text-transform: lowercase; letter-spacing: 0.04em; }
        .gp-codehd button { font-size: 11px; font-weight: 600; color: #c7cdc7; padding: 3px 9px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); }
        .gp-codehd button:hover { color: #fff; border-color: rgba(0,255,133,0.4); }
        .gp-codeblk pre { margin: 0 !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; }

        .gp-toast { position: fixed; left: 50%; bottom: 110px; z-index: 90; font-size: 13px; font-weight: 600; color: #06110a; background: var(--grn); padding: 9px 16px; border-radius: 999px; box-shadow: 0 12px 40px -10px rgba(0,255,133,0.6); white-space: nowrap; }

        @media (max-width: 1023px) {
          .gp-downbtn { bottom: 206px; }
          .gp-pop-model { right: auto; left: 0; }
          .gp-acts button { width: 34px; height: 34px; }
          .gp-follow button { font-size: 14px; padding: 11px 14px; }
        }
        @media (max-height: 940px) { .gp-sub { display: none; } }
        @media (max-height: 860px) { .gp-quick { display: none; } }
        @media (prefers-reduced-motion: reduce) { .gp-orb-ring, .gp-orb-core, .gp-thinking span, .gp-spin { animation: none !important; } }
      `}</style>
    </div>
  );
}
