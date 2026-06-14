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
  const [title, setTitle]         = useState("The Greenprint - Live");
  const [connected, setConnected] = useState(false);
  const [status, setStatus]       = useState("Waiting for stream...");
  const [viewers, setViewers]     = useState(0);
  const [chat, setChat]           = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [elapsed, setElapsed]     = useState("00:00:00");

  const videoRef   = useRef<HTMLVideoElement>(null);
  const peerRef    = useRef<any>(null);
  const connRef    = useRef<any>(null);
  const timerRef   = useRef<any>(null);
  const startRef   = useRef<number | null>(null);
  const liveRef    = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
            setStatus("Stream ended. Check back soon.");
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
      setStatus("Connecting...");

      peer.on("open", () => {
        const conn = peer.connect(HOST_PEER_ID, { reliable: true });
        connRef.current = conn;
        conn.on("open", () => {
          conn.send({ t: "join", name });
          setStatus("Connected - waiting for video...");
        });
        conn.on("data", (d: any) => {
          if (d?.t === "live") setStatus("Live!");
          if (d?.t === "end") {
            setConnected(false);
            setStatus("Stream ended.");
            if (videoRef.current) videoRef.current.srcObject = null;
          }
          if (d?.t === "vc") setViewers(d.count ?? 0);
          if (d?.t === "chat") {
            setChat(prev => [...prev.slice(-99), { name: d.name, text: d.msg, ts: Date.now() }]);
          }
        });
        conn.on("close", () => { setConnected(false); setStatus("Disconnected."); });
      });

      peer.on("call", (call: any) => {
        call.answer();
        call.on("stream", (stream: MediaStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setConnected(true);
          setStatus("Live!");
          startRef.current = Date.now();
          clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            const s = Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000);
            setElapsed(
              `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`
            );
          }, 1000);
        });
        call.on("close", () => { setConnected(false); clearInterval(timerRef.current); });
      });

      peer.on("error", (e: any) => {
        if (e.type === "peer-unavailable") {
          setStatus("Broadcaster offline - retrying...");
          setTimeout(() => startPeer(), 5000);
        }
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
    setChat(prev => [...prev.slice(-99), { name, text: txt, ts: Date.now() }]);
    setChatInput("");
  }

  // Name gate
  if (!nameSet) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <div className="w-10 h-10 bg-[#00FF85] rounded-xl flex items-center justify-center mx-auto mb-5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 12L6 7L9 10L13 4" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-white font-bold text-lg text-center mb-1">The Greenprint</h1>
          <p className="text-white/40 text-xs text-center mb-6">Enter your name to watch live</p>
          <form onSubmit={e => { e.preventDefault(); if (name.trim()) setNameSet(true); }} className="space-y-3">
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#00FF85]/50 transition-colors"
            />
            <button type="submit" disabled={!name.trim()}
              className="w-full bg-[#00FF85] text-black font-black py-3 rounded-xl text-sm disabled:opacity-30 hover:bg-[#00e676] transition-colors"
              style={{ boxShadow: "0 0 20px rgba(0,255,133,0.3)" }}>
              Watch Live
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">

      {/* Full-screen video -- covers entire viewport */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "contain", display: connected ? "block" : "none" }}
      />

      {/* Offline / connecting state */}
      {!connected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-2">
            <div className="w-3 h-3 rounded-full bg-white/30 animate-pulse"/>
          </div>
          <p className="text-white/60 font-semibold text-sm">
            {isLive ? "Connecting..." : "No session live right now."}
          </p>
          <p className="text-white/25 text-xs max-w-[240px]">
            {isLive
              ? status
              : "The Greenprint will be live soon. Check back in a moment."}
          </p>
        </div>
      )}

      {/* Top gradient */}
      <div
        className="absolute top-0 left-0 right-0 z-20 pointer-events-none"
        style={{ height: 110, background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)" }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 pt-5">
        <div className="w-7 h-7 bg-[#00FF85] rounded-lg flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M2 12L6 7L9 10L13 4" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate leading-none">{title}</p>
          {connected && <p className="text-white/40 text-[10px] font-mono mt-0.5">{elapsed}</p>}
        </div>
        {isLive && connected && (
          <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 rounded-full px-2.5 py-1 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"/>
            <span className="text-red-400 text-[10px] font-black tracking-widest">LIVE</span>
          </div>
        )}
        {connected && viewers > 0 && (
          <span className="text-white/40 text-[11px] font-mono shrink-0">{viewers} watching</span>
        )}
      </div>

      {/* Bottom gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
        style={{ height: 360, background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 100%)" }}
      />

      {/* Chat + input overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-6">
        {/* Messages */}
        <div className="mb-3 space-y-2 flex flex-col justify-end" style={{ maxHeight: 200, overflow: "hidden" }}>
          {chat.slice(-6).map((m, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-[#00FF85]/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[#00FF85] text-[9px] font-bold">{m.name[0]?.toUpperCase()}</span>
              </div>
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                <span className="text-[#00FF85] text-[11px] font-semibold mr-1.5">{m.name}</span>
                <span className="text-white/85 text-xs">{m.text}</span>
              </div>
            </div>
          ))}
          <div ref={chatEndRef}/>
        </div>

        {/* Input */}
        <form onSubmit={sendChat} className="flex gap-2 items-center">
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Say something..."
            className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#00FF85]/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="w-10 h-10 bg-[#00FF85] rounded-full flex items-center justify-center shrink-0 disabled:opacity-30 hover:bg-[#00e676] transition-colors"
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
