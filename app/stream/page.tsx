"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const HOST_PEER_ID = "gp-greenprint-live";
const RTDB_URL = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const ICE = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

interface ChatMsg { id: string; name: string; text: string; ts: number; }

function loadPeerJS(cb: () => void) {
  if ((window as any).Peer) { cb(); return; }
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.2/peerjs.min.js";
  s.onload = cb;
  document.body.appendChild(s);
}

function msgId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export default function StreamPage() {
  const [name, setName]           = useState("");
  const [nameSet, setNameSet]     = useState(false);
  const [isLive, setIsLive]       = useState(false);
  const [title, setTitle]         = useState("The Greenprint Live");
  const [connected, setConnected] = useState(false);
  const [viewers, setViewers]     = useState(0);
  const [chat, setChat]           = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [elapsed, setElapsed]     = useState("00:00:00");
  const [muted, setMuted]         = useState(true);

  const videoRef   = useRef<HTMLVideoElement>(null);
  const peerRef    = useRef<any>(null);
  const connRef    = useRef<any>(null);
  const timerRef   = useRef<any>(null);
  const startRef   = useRef<number | null>(null);
  const liveRef    = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const seenIds    = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${RTDB_URL}/livestatus.json`, { cache: "no-store" });
        const d = await r.json();
        if (d?.title) setTitle(d.title);
        const nowLive = !!d?.isLive;
        if (nowLive !== liveRef.current) {
          liveRef.current = nowLive;
          setIsLive(nowLive);
          if (!nowLive) { setConnected(false); setViewers(0); if (videoRef.current) videoRef.current.srcObject = null; }
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
          if (d?.t === "end") { setConnected(false); if (videoRef.current) videoRef.current.srcObject = null; }
          if (d?.t === "vc") setViewers(d.count ?? 0);
          if (d?.t === "chat") {
            // Deduplicate: skip if we already added this message (e.g. our own send)
            const id = d.id ?? (d.name + d.msg + d.ts);
            if (seenIds.current.has(id)) return;
            seenIds.current.add(id);
            setChat(prev => [...prev.slice(-299), { id, name: d.name, text: d.msg, ts: Date.now() }]);
          }
        });
        conn.on("close", () => setConnected(false));
      });

      peer.on("call", (call: any) => {
        call.answer();
        call.on("stream", (stream: MediaStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
            setMuted(true);
          }
          setConnected(true);
          startRef.current = Date.now();
          clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            const s = Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000);
            setElapsed(`${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`);
          }, 1000);
        });
        call.on("close", () => { setConnected(false); clearInterval(timerRef.current); });
      });

      peer.on("error", (e: any) => {
        if (e.type === "peer-unavailable") setTimeout(() => startPeer(), 5000);
      });
    });
  }, [name]);

  useEffect(() => { if (nameSet && isLive) startPeer(); }, [nameSet, isLive, startPeer]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    try { peerRef.current?.destroy(); } catch {}
  }, []);

  function toggleMute() {
    if (!videoRef.current) return;
    const next = !muted;
    videoRef.current.muted = next;
    if (!next) videoRef.current.play().catch(() => {});
    setMuted(next);
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const txt = chatInput.trim();
    if (!txt || !connRef.current) return;
    const id = msgId();
    // Mark as seen BEFORE sending so we don't double-add when broadcaster echoes it back
    seenIds.current.add(id);
    connRef.current.send({ t: "chat", name, msg: txt, id });
    setChat(prev => [...prev.slice(-299), { id, name, text: txt, ts: Date.now() }]);
    setChatInput("");
    inputRef.current?.blur();
  }

  // Name gate
  if (!nameSet) {
    return (
      <div style={{ position:"fixed", inset:0, background:"#080808", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 32px", zIndex:9999 }}>
        <div style={{ width:"100%", maxWidth:320 }}>
          <div style={{ width:52, height:52, borderRadius:16, margin:"0 auto 20px", background:"linear-gradient(135deg,#00FF85,#00cc6a)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 32px rgba(0,255,133,0.35)" }}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M3 14L8 8L12 12L17 5" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p style={{ color:"#fff", fontWeight:900, fontSize:22, textAlign:"center", margin:"0 0 6px" }}>The Greenprint</p>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, textAlign:"center", margin:"0 0 28px" }}>Enter your name to join</p>
          <form onSubmit={e => { e.preventDefault(); if (name.trim()) setNameSet(true); }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoFocus
              style={{ display:"block", width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:14, padding:"13px 16px", fontSize:14, color:"#fff", outline:"none", marginBottom:12 }}/>
            <button type="submit" disabled={!name.trim()}
              style={{ display:"block", width:"100%", padding:"13px", background:"linear-gradient(135deg,#00FF85,#00cc6a)", border:"none", borderRadius:14, fontSize:14, fontWeight:900, color:"#080808", cursor:"pointer", opacity:name.trim()?1:0.3 }}>
              Join Stream
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    // 100dvh = dynamic viewport height — accounts for mobile browser chrome so nothing clips
    <div style={{ position:"fixed", inset:0, height:"100dvh", background:"#0a0a0a", zIndex:9999, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* VIDEO — fills width, 16:9 height, max 45dvh so chat always has room */}
      <div style={{ position:"relative", width:"100%", flexShrink:0, background:"#000", overflow:"hidden", height:"min(56.25vw, 45dvh)" }}>
        <video ref={videoRef} autoPlay playsInline muted
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain", background:"#000", display:connected?"block":"none" }}/>

        {!connected && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
            <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,#00FF85,#00cc6a)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 36px rgba(0,255,133,0.3)", position:"relative" }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M3 14L8 8L12 12L17 5" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {isLive && <div style={{ position:"absolute", top:-4, right:-4, width:12, height:12, background:"#ef4444", borderRadius:"50%", border:"2px solid #000" }}/>}
            </div>
            <p style={{ color:"#fff", fontWeight:800, fontSize:14, margin:0 }}>{isLive?"Connecting...":"Not live yet"}</p>
            <p style={{ color:"rgba(255,255,255,0.35)", fontSize:11, margin:0 }}>{isLive?"Loading stream...":"The Greenprint will go live soon"}</p>
          </div>
        )}

        {/* Top gradient + bar */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:72, background:"linear-gradient(to bottom,rgba(0,0,0,0.82),transparent)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:0, left:0, right:0, display:"flex", alignItems:"center", gap:8, padding:"10px 12px 0", zIndex:10 }}>
          <div style={{ width:30, height:30, borderRadius:"50%", border:"2px solid #00FF85", background:"linear-gradient(135deg,#00FF85,#00cc6a)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ color:"#080808", fontWeight:900, fontSize:11 }}>G</span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ color:"#fff", fontWeight:700, fontSize:12, margin:0, lineHeight:1.2 }}>The Greenprint</p>
            <p style={{ color:"rgba(255,255,255,0.4)", fontSize:9, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</p>
          </div>
          {isLive && connected && (
            <div style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(239,68,68,0.25)", border:"1px solid rgba(239,68,68,0.5)", borderRadius:6, padding:"3px 7px", flexShrink:0 }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#f87171" }}/>
              <span style={{ color:"#f87171", fontSize:9, fontWeight:900, letterSpacing:1.5 }}>LIVE</span>
            </div>
          )}
          {connected && <span style={{ color:"rgba(255,255,255,0.4)", fontSize:10, fontFamily:"monospace", flexShrink:0 }}>{viewers||1} watching</span>}
          {connected && <span style={{ color:"rgba(255,255,255,0.25)", fontSize:9, fontFamily:"monospace", flexShrink:0 }}>{elapsed}</span>}
        </div>

        {/* Tap to unmute */}
        {connected && muted && (
          <button onClick={toggleMute} style={{ position:"absolute", bottom:8, right:8, zIndex:10, display:"flex", alignItems:"center", gap:5, background:"rgba(0,0,0,0.78)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:999, padding:"6px 11px", cursor:"pointer", color:"#fff", fontSize:11, fontWeight:700 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Tap to unmute
          </button>
        )}
        {connected && !muted && (
          <button onClick={toggleMute} style={{ position:"absolute", bottom:8, right:8, zIndex:10, width:30, height:30, borderRadius:"50%", background:"rgba(0,0,0,0.6)", border:"1px solid rgba(255,255,255,0.15)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>

      {/* CHAT — takes all remaining height below video */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0, borderTop:"1px solid rgba(255,255,255,0.07)" }}>

        {/* Header */}
        <div style={{ padding:"9px 14px 7px", borderBottom:"1px solid rgba(255,255,255,0.06)", flexShrink:0, display:"flex", alignItems:"center", gap:7 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:isLive&&connected?"#00FF85":"rgba(255,255,255,0.2)", flexShrink:0 }}/>
          <span style={{ color:"rgba(255,255,255,0.55)", fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase" }}>
            Live Chat{chat.length>0 ? ` (${chat.length})` : ""}
          </span>
        </div>

        {/* All messages, scrollable */}
        <div style={{ flex:1, overflowY:"auto", padding:"10px 14px", display:"flex", flexDirection:"column", gap:10, minHeight:0 }}>
          {chat.length === 0 && (
            <p style={{ color:"rgba(255,255,255,0.18)", fontSize:12, textAlign:"center", marginTop:16 }}>Chat will appear here...</p>
          )}
          {chat.map((m, i) => (
            <div key={m.id || i} style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
              <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0, background:"linear-gradient(135deg,#00FF85,#00cc6a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#080808", marginTop:1 }}>
                {m.name[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1, lineHeight:1.5 }}>
                <span style={{ color:"#00FF85", fontSize:11, fontWeight:700, marginRight:5 }}>{m.name}</span>
                <span style={{ color:"rgba(255,255,255,0.85)", fontSize:13, wordBreak:"break-word" }}>{m.text}</span>
              </div>
            </div>
          ))}
          <div ref={chatEndRef}/>
        </div>

        {/* Input — always visible, never pushed off screen */}
        <form onSubmit={sendChat} style={{ padding:"9px 12px 12px", borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
          <input ref={inputRef} value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Say something..."
            style={{ flex:1, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:999, padding:"10px 15px", fontSize:14, color:"#fff", outline:"none", minWidth:0 }}
            onFocus={e=>(e.currentTarget.style.borderColor="rgba(0,255,133,0.55)")}
            onBlur={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.14)")}/>
          <button type="submit" disabled={!chatInput.trim()}
            style={{ width:42, height:42, borderRadius:"50%", flexShrink:0, background:"linear-gradient(135deg,#00FF85,#00cc6a)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:chatInput.trim()?1:0.3 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h12M7 1l6 6-6 6" stroke="#080808" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </form>
      </div>

    </div>
  );
}
