"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const HOST_PEER_ID = "gp-greenprint-live";
const RTDB_URL = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const ICE = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

interface ChatMsg { name: string; text: string; ts: number; }

function loadPeerJS(cb: () => void) {
  if ((window as any).Peer) { cb(); return; }
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.2/peerjs.min.js";
  s.onload = cb;
  document.body.appendChild(s);
}

export default function StreamPage() {
  const [name, setName]           = useState("");
  const [nameSet, setNameSet]     = useState(false);
  const [isLive, setIsLive]       = useState(false);
  const [title, setTitle]         = useState("The Greenprint — Live");
  const [connected, setConnected] = useState(false);
  const [viewers, setViewers]     = useState(0);
  const [chat, setChat]           = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [elapsed, setElapsed]     = useState("00:00:00");
  const [chatOpen, setChatOpen]   = useState(true);

  const videoRef   = useRef<HTMLVideoElement>(null);
  const peerRef    = useRef<any>(null);
  const connRef    = useRef<any>(null);
  const timerRef   = useRef<any>(null);
  const startRef   = useRef<number | null>(null);
  const liveRef    = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // Lock body scroll + hide global chrome
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Hide DisclaimerBar and any nav rendered by global layout
    const style = document.createElement("style");
    style.id = "__stream-overrides";
    style.textContent = `
      body > *:not(#__stream-root) { display: none !important; }
    `;
    // Instead just blast the disclaimer bar specifically
    style.textContent = `
      [class*="fixed"][class*="bottom-0"][class*="z-50"] { display: none !important; }
    `;
    document.head.appendChild(style);
    return () => {
      document.body.style.overflow = prev;
      document.getElementById("__stream-overrides")?.remove();
      style.remove();
    };
  }, []);

  // Poll Firebase for live status
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${RTDB_URL}/livestatus.json`, { cache: "no-store" });
        const d = await r.json();
        const nowLive = !!d?.isLive;
        if (d?.title) setTitle(d.title);
        if (nowLive !== liveRef.current) {
          liveRef.current = nowLive;
          setIsLive(nowLive);
          if (!nowLive) {
            setConnected(false);
            setViewers(0);
            if (videoRef.current) videoRef.current.srcObject = null;
          }
        }
      } catch {}
    };
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, []);

  const startPeer = useCallback(() => {
    loadPeerJS(() => {
      const PeerJS = (window as any).Peer;
      if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }
      const peer = new PeerJS(undefined, { debug: 0, config: { iceServers: ICE } });
      peerRef.current = peer;

      peer.on("open", () => {
        const conn = peer.connect(HOST_PEER_ID, { reliable: true });
        connRef.current = conn;
        conn.on("open", () => conn.send({ t: "join", name }));
        conn.on("data", (d: any) => {
          if (d?.t === "end") {
            setConnected(false);
            if (videoRef.current) videoRef.current.srcObject = null;
          }
          if (d?.t === "vc") setViewers(d.count ?? 0);
          if (d?.t === "chat") {
            setChat(prev => [...prev.slice(-79), { name: d.name, text: d.msg, ts: Date.now() }]);
          }
        });
        conn.on("close", () => setConnected(false));
      });

      peer.on("call", (call: any) => {
        call.answer();
        call.on("stream", (stream: MediaStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setConnected(true);
          startRef.current = Date.now();
          clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            const s = Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000);
            setElapsed(
              `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
            );
          }, 1000);
        });
        call.on("close", () => { setConnected(false); clearInterval(timerRef.current); });
      });

      peer.on("error", (e: any) => {
        if (e.type === "peer-unavailable") setTimeout(() => startPeer(), 5000);
      });
    });
  }, [name]);

  useEffect(() => {
    if (nameSet && isLive) startPeer();
  }, [nameSet, isLive, startPeer]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    try { peerRef.current?.destroy(); } catch {}
  }, []);

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const txt = chatInput.trim();
    if (!txt || !connRef.current) return;
    connRef.current.send({ t: "chat", name, msg: txt });
    setChat(prev => [...prev.slice(-79), { name, text: txt, ts: Date.now() }]);
    setChatInput("");
    inputRef.current?.blur();
  }

  // ── Name gate ──────────────────────────────────────────────────────────────
  if (!nameSet) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "linear-gradient(135deg,#00FF85,#00cc6a)" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 14L8 8L12 12L17 5" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-white font-black text-xl text-center mb-1">The Greenprint</p>
          <p className="text-white/40 text-xs text-center mb-7">Enter your name to join the stream</p>
          <form onSubmit={e => { e.preventDefault(); if (name.trim()) setNameSet(true); }} className="space-y-3">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full bg-white/8 border border-white/12 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00FF85]/60 transition-colors"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full font-black py-3.5 rounded-2xl text-sm text-black disabled:opacity-25 transition-all"
              style={{ background: "linear-gradient(135deg,#00FF85,#00cc6a)", boxShadow: "0 0 30px rgba(0,255,133,0.25)" }}
            >
              Join Stream
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main stream view ────────────────────────────────────────────────────────
  return (
    <div
      id="__stream-root"
      className="fixed inset-0 bg-black overflow-hidden"
      style={{ zIndex: 9999 }}
    >
      {/* VIDEO — fills entire screen, cover crops edges */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "cover", display: connected ? "block" : "none" }}
      />

      {/* Offline / waiting state */}
      {!connected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#00FF85,#00cc6a)", boxShadow: "0 0 40px rgba(0,255,133,0.3)" }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <path d="M3 14L8 8L12 12L17 5" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {isLive && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black animate-pulse"/>
            )}
          </div>
          <div>
            <p className="text-white font-black text-lg mb-1">
              {isLive ? "Connecting to stream…" : "No live session right now"}
            </p>
            <p className="text-white/40 text-sm">
              {isLive ? "Hang tight, loading video…" : "The Greenprint will go live soon"}
            </p>
          </div>
        </div>
      )}

      {/* TOP GRADIENT */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{
        height: 120,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.80) 0%, transparent 100%)",
        zIndex: 10,
      }}/>

      {/* TOP BAR */}
      <div className="absolute top-0 left-0 right-0 flex items-center px-4 pt-12 pb-3 gap-3" style={{ zIndex: 20 }}>
        {/* Avatar + name */}
        <div className="w-9 h-9 rounded-full border-2 border-[#00FF85] shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#00FF85,#00cc6a)" }}>
          <span className="text-black font-black text-sm">G</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-none truncate">The Greenprint</p>
          <p className="text-white/50 text-[10px] mt-0.5 truncate">{title}</p>
        </div>
        {/* LIVE badge */}
        {isLive && connected && (
          <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 shrink-0"
            style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.5)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"/>
            <span className="text-red-400 text-[10px] font-black tracking-widest">LIVE</span>
          </div>
        )}
        {/* Viewer count */}
        {connected && (
          <div className="flex items-center gap-1 shrink-0">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-4 5c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="text-white/50 text-[11px] font-mono">{viewers || 1}</span>
          </div>
        )}
        {/* Timer */}
        {connected && (
          <span className="text-white/30 text-[10px] font-mono shrink-0">{elapsed}</span>
        )}
      </div>

      {/* CHAT TOGGLE BUTTON (right side, middle) */}
      <button
        onClick={() => setChatOpen(o => !o)}
        className="absolute right-3 flex items-center justify-center w-9 h-9 rounded-full"
        style={{
          top: "50%", transform: "translateY(-50%)",
          background: "rgba(0,0,0,0.50)",
          border: "1px solid rgba(255,255,255,0.12)",
          zIndex: 20,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d={chatOpen ? "M9 2L4 7l5 5" : "M5 2l5 5-5 5"} stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* BOTTOM GRADIENT */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
        height: 380,
        background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 50%, transparent 100%)",
        zIndex: 10,
      }}/>

      {/* CHAT + INPUT */}
      <div
        className="absolute bottom-0 left-0 right-0 px-3"
        style={{
          zIndex: 20,
          paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))",
          transform: chatOpen ? "translateX(0)" : "translateX(-110%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Messages */}
        <div className="mb-3 flex flex-col gap-1.5" style={{ maxHeight: 220, overflowY: "auto" }}>
          {chat.slice(-8).map((m, i) => (
            <div key={i} className="flex items-start gap-2 w-fit max-w-[82%]">
              <div className="w-6 h-6 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[9px] font-black text-black"
                style={{ background: "linear-gradient(135deg,#00FF85,#00cc6a)" }}>
                {m.name[0]?.toUpperCase()}
              </div>
              <div className="rounded-2xl rounded-tl-sm px-3 py-2"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-[#00FF85] text-[11px] font-bold mr-1.5">{m.name}</span>
                <span className="text-white/85 text-xs">{m.text}</span>
              </div>
            </div>
          ))}
          <div ref={chatEndRef}/>
        </div>

        {/* Input row */}
        <form onSubmit={sendChat} className="flex gap-2 items-center">
          <input
            ref={inputRef}
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Say something..."
            className="flex-1 text-sm text-white placeholder:text-white/35 focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 999,
              padding: "10px 18px",
              transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(0,255,133,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center disabled:opacity-30 transition-transform active:scale-90"
            style={{ background: "linear-gradient(135deg,#00FF85,#00cc6a)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12M7 1l6 6-6 6" stroke="#080808" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
