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
  const [title, setTitle]         = useState("The Greenprint • Live");
  const [connected, setConnected] = useState(false);
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
  const inputRef   = useRef<HTMLInputElement>(null);

  // Hide global chrome (disclaimer bar etc.)
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const style = document.createElement("style");
    style.id = "__stream-clean";
    style.textContent = `
      [class*="fixed"][class*="bottom-0"][class*="z-50"] { display: none !important; }
      body { overflow: hidden !important; background: #000 !important; }
    `;
    document.head.appendChild(style);
    return () => {
      document.body.style.overflow = "";
      document.getElementById("__stream-clean")?.remove();
    };
  }, []);

  // Firebase poll
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

  // PeerJS
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
              `${String(Math.floor(s / 3600)).padStart(2, "0")}:` +
              `${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:` +
              `${String(s % 60).padStart(2, "0")}`
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

  // Name gate
  if (!nameSet) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 32px", zIndex: 9999 }}>
        <div style={{ width: "100%", maxWidth: 320 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, margin: "0 auto 20px", background: "linear-gradient(135deg,#00FF85,#00cc6a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 32px rgba(0,255,133,0.35)" }}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <path d="M3 14L8 8L12 12L17 5" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ color: "#fff", fontWeight: 900, fontSize: 22, textAlign: "center", margin: "0 0 6px" }}>The Greenprint</p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", margin: "0 0 28px" }}>Enter your name to join</p>
          <form onSubmit={e => { e.preventDefault(); if (name.trim()) setNameSet(true); }}>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name" autoFocus
              style={{ display: "block", width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "13px 16px", fontSize: 14, color: "#fff", outline: "none", marginBottom: 12 }}
            />
            <button type="submit" disabled={!name.trim()} style={{ display: "block", width: "100%", padding: "13px", background: "linear-gradient(135deg,#00FF85,#00cc6a)", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 900, color: "#080808", cursor: "pointer", opacity: name.trim() ? 1 : 0.3 }}>
              Join Stream
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── MAIN VIEW ─────────────────────────────────────────────────────────────
  // Video fills entire fixed canvas (objectFit: contain = full 16:9 content, no cropping)
  // Overlays sit on top: top-bar over the top letterbox area, chat over the bottom area
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999, overflow: "hidden" }}>

      {/* VIDEO — full screen background, content always fully visible */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "contain",
          background: "#000",
          display: connected ? "block" : "none",
        }}
      />

      {/* OFFLINE STATE */}
      {!connected && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: "linear-gradient(135deg,#00FF85,#00cc6a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 48px rgba(0,255,133,0.35)", position: "relative" }}>
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
              <path d="M3 14L8 8L12 12L17 5" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {isLive && (
              <div style={{ position: "absolute", top: -5, right: -5, width: 16, height: 16, background: "#ef4444", borderRadius: "50%", border: "2.5px solid #000" }}/>
            )}
          </div>
          <div style={{ textAlign: "center", padding: "0 32px" }}>
            <p style={{ color: "#fff", fontWeight: 900, fontSize: 18, margin: "0 0 8px" }}>
              {isLive ? "Connecting to stream…" : "No live session right now"}
            </p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, margin: 0 }}>
              {isLive ? "Loading video, hang tight…" : "The Greenprint will go live soon"}
            </p>
          </div>
        </div>
      )}

      {/* TOP GRADIENT (blends into content) */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 110, pointerEvents: "none", background: "linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, transparent 100%)" }}/>

      {/* TOP BAR — sits in the dark area above the 16:9 video on portrait phones */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 0", zIndex: 20 }}>
        {/* Avatar */}
        <div style={{ width: 38, height: 38, borderRadius: "50%", border: "2.5px solid #00FF85", background: "linear-gradient(135deg,#00FF85,#00cc6a)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "#080808", fontWeight: 900, fontSize: 14 }}>G</span>
        </div>
        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0, lineHeight: 1.2 }}>The Greenprint</p>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
        </div>
        {/* LIVE badge */}
        {isLive && connected && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.5)", borderRadius: 8, padding: "4px 9px", flexShrink: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#f87171" }}/>
            <span style={{ color: "#f87171", fontSize: 11, fontWeight: 900, letterSpacing: 2 }}>LIVE</span>
          </div>
        )}
        {/* Viewers */}
        {connected && (
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "monospace", flexShrink: 0 }}>
            👁 {viewers || 1}
          </span>
        )}
        {/* Timer */}
        {connected && (
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "monospace", flexShrink: 0 }}>{elapsed}</span>
        )}
      </div>

      {/* BOTTOM GRADIENT */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 320, pointerEvents: "none", background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)" }}/>

      {/* CHAT + INPUT — overlaid at bottom, sits in the dark gradient area */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20, padding: "0 14px 18px" }}>
        {/* Messages */}
        <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 7, maxHeight: 200, overflowY: "auto" }}>
          {chat.slice(-7).map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, maxWidth: "85%" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#00FF85,#00cc6a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#080808", marginTop: 2 }}>
                {m.name[0]?.toUpperCase()}
              </div>
              <div style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px 14px 14px 3px", padding: "7px 11px" }}>
                <span style={{ color: "#00FF85", fontSize: 11, fontWeight: 700, marginRight: 6 }}>{m.name}</span>
                <span style={{ color: "rgba(255,255,255,0.88)", fontSize: 12 }}>{m.text}</span>
              </div>
            </div>
          ))}
          <div ref={chatEndRef}/>
        </div>

        {/* Input row */}
        <form onSubmit={sendChat} style={{ display: "flex", gap: 9, alignItems: "center" }}>
          <input
            ref={inputRef}
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Say something…"
            style={{
              flex: 1, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999,
              padding: "11px 16px", fontSize: 14, color: "#fff", outline: "none",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,255,133,0.6)")}
            onBlur={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)")}
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg,#00FF85,#00cc6a)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: chatInput.trim() ? 1 : 0.3,
              boxShadow: chatInput.trim() ? "0 0 16px rgba(0,255,133,0.4)" : "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12M7 1l6 6-6 6" stroke="#080808" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      </div>

    </div>
  );
}
