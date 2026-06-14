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
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function loadPeerJS(cb: () => void) {
  if ((window as any).Peer) { cb(); return; }
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.2/peerjs.min.js";
  s.onload = cb; document.body.appendChild(s);
}

export default function StreamPage() {
  const [name, setName]           = useState("");
  const [nameSet, setNameSet]     = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLive, setIsLive]       = useState(false);
  const [title, setTitle]         = useState("The Greenprint Live");
  const [connected, setConnected] = useState(false);
  const [viewers, setViewers]     = useState(0);
  const [chat, setChat]           = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [elapsed, setElapsed]     = useState("00:00:00");
  const [leads, setLeads] = useState<{name:string;email:string;phone:string;ts:number}[]>([]);
  const [showLeads, setShowLeads] = useState(false);
  const isHost = new URLSearchParams(window.location.search).has("host");
  const [muted, setMuted]         = useState(true);
  const [desktop, setDesktop]     = useState(false);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const bgVideoRef  = useRef<HTMLVideoElement>(null);
  const peerRef     = useRef<any>(null);
  const connRef     = useRef<any>(null);
  const timerRef    = useRef<any>(null);
  const startRef    = useRef<number | null>(null);
  const liveRef     = useRef(false);
  const chatEndRef  = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const seenIds     = useRef<Set<string>>(new Set());

  // Responsive: desktop = side-by-side, mobile = stacked
  useEffect(() => {
    const check = () => setDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const style = document.createElement("style");
    style.id = "__sc";
    style.textContent = `[class*="fixed"][class*="bottom-0"][class*="z-50"]{display:none!important}body{overflow:hidden!important;background:#000!important}`;
    document.head.appendChild(style);
    return () => { document.body.style.overflow = ""; document.getElementById("__sc")?.remove(); };
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${RTDB_URL}/livestatus.json`, { cache: "no-store" });
        const d = await r.json();
        if (d?.title) setTitle(d.title);
        const nowLive = !!d?.isLive;
        if (nowLive !== liveRef.current) {
          liveRef.current = nowLive; setIsLive(nowLive);
          if (!nowLive) { setConnected(false); setViewers(0); if (videoRef.current) videoRef.current.srcObject = null; }
        }
      } catch {}
    };
    check(); const iv = setInterval(check, 5000); return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!isHost) return;
    const load = async () => {
      try {
        const r = await fetch(`${RTDB_URL}/leads.json`);
        const d = await r.json();
        if (d) setLeads(Object.values(d).sort((a: any, b: any) => b.ts - a.ts) as any);
      } catch {}
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [isHost]);

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
            const id = d.id ?? uid();
            if (seenIds.current.has(id) || (!d.id && d.name === name)) return;
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
          }
          if (bgVideoRef.current) {
            bgVideoRef.current.srcObject = stream;
            bgVideoRef.current.muted = true;
            bgVideoRef.current.play().catch(() => {});
          }
          setConnected(true); setMuted(true);
          startRef.current = Date.now();
          clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            const s = Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000);
            setElapsed(`${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`);
          }, 1000);
        });
        call.on("close", () => { setConnected(false); clearInterval(timerRef.current); });
      });
      peer.on("error", (e: any) => { if (e.type === "peer-unavailable") setTimeout(() => startPeer(), 5000); });
    });
  }, [name]);

  useEffect(() => { if (nameSet && isLive) startPeer(); }, [nameSet, isLive, startPeer]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);
  useEffect(() => () => { clearInterval(timerRef.current); try { peerRef.current?.destroy(); } catch {} }, []);

  useEffect(() => {
    if (!connected) return;
    let wl: any = null;
    (navigator as any).wakeLock?.request("screen").then((l: any) => { wl = l; }).catch(() => {});
    return () => { wl?.release().catch(() => {}); };
  }, [connected]);

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
    const id = uid();
    seenIds.current.add(id);
    connRef.current.send({ t: "chat", name, msg: txt, id });
    setChat(prev => [...prev.slice(-299), { id, name, text: txt, ts: Date.now() }]);
    setChatInput(""); inputRef.current?.blur();
  }

  if (!nameSet) return (
    <div style={{ position:"fixed", inset:0, background:"#080808", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 32px", zIndex:9999 }}>
      <div style={{ width:"100%", maxWidth:340 }}>
        <div style={{ width:56, height:56, borderRadius:18, margin:"0 auto 22px", background:"linear-gradient(135deg,#00FF85,#00cc6a)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 40px rgba(0,255,133,0.4)" }}>
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M3 14L8 8L12 12L17 5" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <p style={{ color:"#fff", fontWeight:900, fontSize:24, textAlign:"center", margin:"0 0 6px" }}>The Greenprint</p>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:14, textAlign:"center", margin:"0 0 32px" }}>Enter your info to join the stream</p>
        <form onSubmit={e=>{e.preventDefault(); if(!name.trim()||!email.trim()) return; fetch(`${RTDB_URL}/leads/${Date.now()}.json`,{method:"PUT",body:JSON.stringify({name:name.trim(),email:email.trim(),phone:phone.trim(),ts:Date.now()})}); setNameSet(true);}}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" autoFocus
            style={{ display:"block", width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:14, padding:"14px 18px", fontSize:15, color:"#fff", outline:"none", marginBottom:12 }}/>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email" type="email"
            style={{ display:"block", width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:14, padding:"14px 18px", fontSize:15, color:"#fff", outline:"none", marginBottom:12 }}/>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone number (optional)" type="tel"
            style={{ display:"block", width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:14, padding:"14px 18px", fontSize:15, color:"#fff", outline:"none", marginBottom:12 }}/>
          <button type="submit" disabled={!name.trim()||!email.trim()}
            style={{ display:"block", width:"100%", padding:"14px", background:"linear-gradient(135deg,#00FF85,#00cc6a)", border:"none", borderRadius:14, fontSize:15, fontWeight:900, color:"#080808", cursor:"pointer", opacity:(name.trim()&&email.trim())?1:0.3 }}>
            Join Stream
          </button>
        </form>
      </div>
    </div>
  )

  // Ã¢ÂÂÃ¢ÂÂ VIDEO SECTION (shared between layouts) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const videoSection = (
    <div style={{ position:"relative", width:"100%", height:"100%", background:"#000", overflow:"hidden", flexShrink:0 }}>

      {/* Blurred background fill Ã¢ÂÂ eliminates black bars by showing blurred stream behind */}
      {connected && (
        <video ref={bgVideoRef} autoPlay playsInline muted
          style={{ position:"absolute", inset:"-5%", width:"110%", height:"110%", objectFit:"cover", filter:"blur(28px) brightness(0.35)", pointerEvents:"none" }}/>
      )}

      {/* Main crisp video */}
      <video ref={videoRef} autoPlay playsInline muted
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain", display:connected?"block":"none", zIndex:1 }}/>

      {/* Offline */}
      {!connected && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, zIndex:2 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:"linear-gradient(135deg,#00FF85,#00cc6a)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 48px rgba(0,255,133,0.35)", position:"relative" }}>
            <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><path d="M3 14L8 8L12 12L17 5" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {isLive && <div style={{ position:"absolute", top:-4, right:-4, width:14, height:14, background:"#ef4444", borderRadius:"50%", border:"2.5px solid #000" }}/>}
          </div>
          <div style={{ textAlign:"center" }}>
            <p style={{ color:"#fff", fontWeight:800, fontSize:16, margin:"0 0 6px" }}>{isLive?"Connecting to stream...":"Stream is offline"}</p>
            <p style={{ color:"rgba(255,255,255,0.35)", fontSize:13, margin:0 }}>{isLive?"Loading video, hang tight...":"The Greenprint will go live soon"}</p>
          </div>
        </div>
      )}

      {/* Top gradient */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"calc(90px + env(safe-area-inset-top, 0px))", background:"linear-gradient(to bottom,rgba(0,0,0,0.85),transparent)", pointerEvents:"none", zIndex:2 }}/>

      {/* Top bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, display:"flex", alignItems:"center", gap:10, padding:"calc(16px + env(safe-area-inset-top, 0px)) 18px 0", zIndex:3 }}>
        <div style={{ width:36, height:36, borderRadius:"50%", border:"2.5px solid #00FF85", background:"linear-gradient(135deg,#00FF85,#00cc6a)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ color:"#080808", fontWeight:900, fontSize:14 }}>G</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ color:"#fff", fontWeight:700, fontSize:14, margin:0, lineHeight:1.2 }}>The Greenprint</p>
          <p style={{ color:"rgba(255,255,255,0.45)", fontSize:11, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</p>
        </div>
        {isLive && connected && (
          <div style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(239,68,68,0.22)", border:"1px solid rgba(239,68,68,0.5)", borderRadius:7, padding:"4px 10px", flexShrink:0 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#f87171" }}/>
            <span style={{ color:"#f87171", fontSize:10, fontWeight:900, letterSpacing:2 }}>LIVE</span>
          </div>
        )}
        {connected && <span style={{ color:"rgba(255,255,255,0.45)", fontSize:11, fontFamily:"monospace", flexShrink:0 }}>{viewers||1} watching</span>}
        {connected && <span style={{ color:"rgba(255,255,255,0.3)", fontSize:10, fontFamily:"monospace", flexShrink:0 }}>{elapsed}</span>}
      </div>

      {/* Unmute */}
      {connected && muted && (
        <button onClick={toggleMute} style={{ position:"absolute", bottom:14, left:14, zIndex:3, display:"flex", alignItems:"center", gap:6, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:999, padding:"8px 14px", cursor:"pointer", color:"#fff", fontSize:13, fontWeight:700 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          Tap to unmute
        </button>
      )}
      {connected && !muted && (
        <button onClick={toggleMute} style={{ position:"absolute", bottom:14, left:14, zIndex:3, width:36, height:36, borderRadius:"50%", background:"rgba(0,0,0,0.65)", border:"1px solid rgba(255,255,255,0.15)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      )}
    </div>
  );

  // Ã¢ÂÂÃ¢ÂÂ CHAT SECTION (shared) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const chatSection = (
    <div style={{ display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0, height:"100%",
      background: desktop ? "rgba(10,10,12,0.97)" : "#0a0a0a",
      borderLeft: desktop ? "1px solid rgba(255,255,255,0.08)" : "none",
      borderTop:  desktop ? "none" : "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ padding:"12px 16px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)", flexShrink:0, display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:7, height:7, borderRadius:"50%", background:isLive&&connected?"#00FF85":"rgba(255,255,255,0.2)" }}/>
        <span style={{ color:"rgba(255,255,255,0.6)", fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase" }}>
          Live Chat{chat.length>0?` (${chat.length})`:""}
        </span>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:12, minHeight:0 }}>
        {chat.length===0 && (
          <p style={{ color:"rgba(255,255,255,0.18)", fontSize:13, textAlign:"center", marginTop:24 }}>Chat will appear here...</p>
        )}
        {chat.map((m,i) => (
          <div key={m.id||i} style={{ display:"flex", alignItems:"flex-start", gap:9 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0, background:"linear-gradient(135deg,#00FF85,#00cc6a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:"#080808", marginTop:1 }}>
              {m.name[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, lineHeight:1.5 }}>
              <span style={{ color:"#00FF85", fontSize:12, fontWeight:700, marginRight:6 }}>{m.name}</span>
              <span style={{ color:"rgba(255,255,255,0.85)", fontSize:13, wordBreak:"break-word" }}>{m.text}</span>
            </div>
          </div>
        ))}
        <div ref={chatEndRef}/>
      </div>

      <form onSubmit={sendChat} style={{ padding:"10px 14px calc(16px + env(safe-area-inset-bottom, 0px))", borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
        <input ref={inputRef} value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Say something..."
          style={{ flex:1, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:999, padding:"10px 16px", fontSize:14, color:"#fff", outline:"none", minWidth:0 }}
          onFocus={e=>(e.currentTarget.style.borderColor="rgba(0,255,133,0.55)")}
          onBlur={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.14)")}/>
        <button type="submit" disabled={!chatInput.trim()}
          style={{ width:42, height:42, borderRadius:"50%", flexShrink:0, background:"linear-gradient(135deg,#00FF85,#00cc6a)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:chatInput.trim()?1:0.3 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h12M7 1l6 6-6 6" stroke="#080808" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </form>
    </div>
  );

  // Ã¢ÂÂÃ¢ÂÂ DESKTOP: video fills screen, chat sidebar right Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const leadsPanel = showLeads ? (
    <div style={{ position:"fixed", inset:0, zIndex:99999, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={()=>setShowLeads(false)}>
      <div style={{ background:"#111", border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:24, width:"100%", maxWidth:560, maxHeight:"80dvh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <p style={{ color:"#fff", fontWeight:800, fontSize:18, margin:0 }}>Leads ({leads.length})</p>
          <button onClick={()=>setShowLeads(false)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:22, cursor:"pointer", lineHeight:1, padding:0 }}>✕</button>
        </div>
        {leads.length === 0 ? (
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:14, margin:0 }}>No leads yet — share the stream link!</p>
        ) : leads.map((l, i) => (
          <div key={i} style={{ padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ color:"#00FF85", fontWeight:700, width:120, flexShrink:0, fontSize:14 }}>{l.name}</span>
            <span style={{ color:"#fff", flex:1, minWidth:150, fontSize:14 }}>{l.email}</span>
            {l.phone && <span style={{ color:"rgba(255,255,255,0.4)", fontSize:12 }}>{l.phone}</span>}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  if (desktop) return (<>
    <div style={{ position:"fixed", inset:0, background:"#000", zIndex:9999, display:"flex", flexDirection:"row", overflow:"hidden" }}>
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>{videoSection}</div>
      <div style={{ width:320, flexShrink:0, display:"flex", flexDirection:"column" }}>{chatSection}</div>
    </div>
      {isHost && <button onClick={()=>setShowLeads(v=>!v)} style={{ position:"fixed", top:14, left:14, zIndex:99998, background:"#00FF85", border:"none", borderRadius:10, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer", color:"#080808", boxShadow:"0 4px 16px rgba(0,255,133,0.35)" }}>Leads ({leads.length})</button>}
      {leadsPanel}
    </>
  );

  // Ã¢ÂÂÃ¢ÂÂ MOBILE: video 16:9 on top, chat fills rest Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  return (<>
    <div style={{ position:"fixed", inset:0, height:"100dvh", background:"#0a0a0a", zIndex:9999, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ position:"relative", width:"100%", height:"min(56.25vw, 36dvh)", flexShrink:0, overflow:"hidden" }}>{videoSection}</div>
      <div style={{ flex:1, minHeight:0 }}>{chatSection}</div>
    </div>
      {isHost && <button onClick={()=>setShowLeads(v=>!v)} style={{ position:"fixed", top:14, left:14, zIndex:99998, background:"#00FF85", border:"none", borderRadius:10, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer", color:"#080808", boxShadow:"0 4px 16px rgba(0,255,133,0.35)" }}>Leads ({leads.length})</button>}
      {leadsPanel}
    </>
  );
}
