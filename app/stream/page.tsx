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

// ─────────────────────────────────────────────────────────────────────────────
// Layout logic (no rotation ever):
//   Portrait  → video fills width at 16:9 ratio (top), chat fills space below
//   Landscape → video fills height (left), 280px chat panel (right)
// ─────────────────────────────────────────────────────────────────────────────

export default function StreamPage() {
  const [name, setName]           = useState("");
  const [nameSet, setNameSet]     = useState(false);
  const [isLive, setIsLive]       = useState(false);
  const [title, setTitle]         = useState("The Greenprint \u2022 Live");
  const [connected, setConnected] = useState(false);
  const [viewers, setViewers]     = useState(0);
  const [chat, setChat]           = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [elapsed, setElapsed]     = useState("00:00:00");
  const [isLandscape, setIsLandscape] = useState(false);

  const videoRef   = useRef<HTMLVideoElement>(null);
  const peerRef    = useRef<any>(null);
  const connRef    = useRef<any>(null);
  const timerRef   = useRef<any>(null);
  const startRef   = useRef<number | null>(null);
  const liveRef    = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // ── Orientation detection (no lock) ──────────────────────────────────────
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);

    // Hide disclaimer bar + prevent body scroll
    document.body.style.overflow = "hidden";
    const style = document.createElement("style");
    style.id = "__stream-clean";
    style.textContent = `
      [class*="fixed"][class*="bottom-0"][class*="z-50"] { display: none !important; }
      body { overflow: hidden !important; background: #000 !important; }
    `;
    document.head.appendChild(style);

    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
      document.body.style.overflow = "";
      document.getElementById("__stream-clean")?.remove();
    };
  }, []);

  // ── Firebase poll ─────────────────────────────────────────────────────────
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

  // ── PeerJS ────────────────────────────────────────────────────────────────
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

  // ── Name gate ─────────────────────────────────────────────────────────────
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

  // ── Main stream view ───────────────────────────────────────────────────────
  const CHAT_W = 280; // chat panel width in landscape

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000", zIndex: 9999,
      display: "flex",
      flexDirection: isLandscape ? "row" : "column",
      overflow: "hidden",
    }}>

      {/* ── VIDEO SECTION ─────────────────────────────────────────────────── */}
      <div style={{
        position: "relative",
        flexShrink: 0,
        // Landscape: fills remaining width after chat panel, full height
        // Portrait:  full width, 16:9 height
        width:  isLandscape ? `calc(100% - ${CHAT_W}px)` : "100%",
        height: isLandscape ? "100%"                       : undefined,
        aspectRatio: isLandscape ? undefined : "16 / 9",
        background: "#000",
        overflow: "hidden",
      }}>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: "100%", height: "100%",
            objectFit: "contain",
            background: "#000",
            display: connected ? "block" : "none",
          }}
        />

        {/* Offline / connecting state */}
        {!connected && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#00FF85,#00cc6a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(0,255,133,0.3)", position: "relative" }}>
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                <path d="M3 14L8 8L12 12L17 5" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isLive && <div style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, background: "#ef4444", borderRadius: "50%", border: "2px solid #000" }}/>}
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#fff", fontWeight: 900, fontSize: 17, margin: "0 0 6px" }}>
                {isLive ? "Connecting to stream\u2026" : "No live session right now"}
              </p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
                {isLive ? "Loading video, hang tight\u2026" : "The Greenprint will go live soon"}
              </p>
            </div>
          </div>
        )}

        {/* Top gradient */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 90, pointerEvents: "none", background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)" }}/>

        {/* Top bar: avatar, title, LIVE badge, viewers, timer */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", gap: 10, padding: "14px 14px 0" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid #00FF85", background: "linear-gradient(135deg,#00FF85,#00cc6a)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#080808", fontWeight: 900, fontSize: 13 }}>G</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 13, margin: 0, lineHeight: 1.2 }}>The Greenprint</p>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
          </div>
          {isLive && connected && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.5)", borderRadius: 8, padding: "4px 8px", flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f87171" }}/>
              <span style={{ color: "#f87171", fontSize: 10, fontWeight: 900, letterSpacing: 2 }}>LIVE</span>
            </div>
          )}
          {connected && (
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "monospace", flexShrink: 0 }}>
              \u{1F441} {viewers || 1}
            </span>
          )}
          {connected && (
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace", flexShrink: 0 }}>{elapsed}</span>
          )}
        </div>
      </div>

      {/* ── CHAT PANEL ────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        width:      isLandscape ? CHAT_W         : "100%",
        flex:       isLandscape ? undefined       : 1,        // fill remaining height in portrait
        background: "#0a0a0a",
        borderLeft: isLandscape ? "1px solid rgba(255,255,255,0.07)" : "none",
        borderTop:  isLandscape ? "none"          : "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}>
        {/* Header */}
        <div style={{ padding: "11px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: isLive && connected ? "#00FF85" : "rgba(255,255,255,0.2)" }}/>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 700, margin: 0, letterSpacing: 1.5, textTransform: "uppercase" }}>Live Chat</p>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          {chat.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.18)", fontSize: 12, textAlign: "center", marginTop: 24 }}>Chat will appear here\u2026</p>
          )}
          {chat.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#00FF85,#00cc6a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#080808", marginTop: 1 }}>
                {m.name[0]?.toUpperCase()}
              </div>
              <div style={{ lineHeight: 1.45 }}>
                <span style={{ color: "#00FF85", fontSize: 11, fontWeight: 700, marginRight: 6 }}>{m.name}</span>
                <span style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, wordBreak: "break-word" }}>{m.text}</span>
              </div>
            </div>
          ))}
          <div ref={chatEndRef}/>
        </div>

        {/* Input */}
        <form onSubmit={sendChat} style={{ padding: "10px 12px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Say something\u2026"
            style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 999, padding: "9px 14px", fontSize: 13, color: "#fff", outline: "none" }}
            onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,255,133,0.55)")}
            onBlur={e =>  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)")}
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#00FF85,#00cc6a)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: chatInput.trim() ? 1 : 0.3 }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12M7 1l6 6-6 6" stroke="#080808" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      </div>

    </div>
  );
}
