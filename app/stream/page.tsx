"use client";
import { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, RemoteTrack, RemoteTrackPublication } from "livekit-client";

// ─── BRANDED EMOJI CONFIG ────────────────────────────────────────────────────
// To revert to standard emojis: change USE_BRANDED to false and re-commit
const USE_BRANDED = true;
const STANDARD_EMOJIS = ["🔥","❤️","😂","👏","💯","🚀"];
const GP_REACTIONS = [
  { id:"chart",   send:"📈", label:"UP"    },
  { id:"diamond", send:"💎", label:"DIAM"  },
  { id:"rocket",  send:"🚀", label:"MOON"  },
  { id:"leaf",    send:"🌿", label:"GP"    },
  { id:"fire",    send:"🔥", label:"FIRE"  },
  { id:"money",   send:"💰", label:"$$$"   },
];
// ─────────────────────────────────────────────────────────────────────────────

const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const JOIN_URL = "https://subscribe.1houseglobal.com/jay";
const get = async (p: string) => { try { const r = await fetch(`${FB}/${p}.json`,{cache:"no-store"}); return await r.json(); } catch { return null; } };
const push = async (p: string, d: unknown) => { try { await fetch(`${FB}/${p}.json`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}); } catch {} };

type CM = { name: string; msg: string; ts: number };
type FE = { id: string; emoji: string; x: number };
const COLORS = ["#00ff87","#ff6b6b","#ffd93d","#6bcbff","#c77dff","#ff9f43","#48dbfb","#ff6b9d"];
const nc = (n: string) => COLORS[n.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%COLORS.length];
const fmt = (s: number) => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

// ── Branded SVG emoji icons (The Greenprint style) ───────────────────────────
function GpIcon({ id, size=28 }: { id:string; size?:number }) {
  const s = size;
  if (id==="chart") return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="rgba(0,255,135,.1)"/>
      <rect x="5" y="21" width="4" height="6" rx="1.2" fill="#00ff87" opacity=".5"/>
      <rect x="11" y="16" width="4" height="11" rx="1.2" fill="#00ff87" opacity=".75"/>
      <rect x="17" y="11" width="4" height="16" rx="1.2" fill="#00ff87"/>
      <path d="M19 10L23 6M23 6H19M23 6V10" stroke="#00ff87" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>);
  if (id==="diamond") return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="rgba(0,255,135,.1)"/>
      <path d="M16 7L8 15L16 26L24 15L16 7Z" fill="#00ff87" opacity=".85"/>
      <path d="M16 7L12 15L16 26L20 15Z" fill="rgba(255,255,255,.18)"/>
      <path d="M8 15H24" stroke="rgba(0,0,0,.25)" strokeWidth=".8"/>
    </svg>);
  if (id==="rocket") return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="rgba(0,255,135,.1)"/>
      <path d="M16 5C16 5 20.5 9 20.5 15.5C20.5 19 19 21.5 19 21.5H13C13 21.5 11.5 19 11.5 15.5C11.5 9 16 5 16 5Z" fill="#00ff87"/>
      <ellipse cx="16" cy="15" rx="2.5" ry="2.5" fill="#050505" opacity=".45"/>
      <path d="M13 21.5L10.5 25.5L16 23L21.5 25.5L19 21.5" fill="#00c864" opacity=".75"/>
      <path d="M10 18C9 17.5 8 17.5 8 17.5M22 18C23 17.5 24 17.5 24 17.5" stroke="#00ff87" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>);
  if (id==="leaf") return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="rgba(0,255,135,.1)"/>
      <path d="M16 6C16 6 7 10.5 7 18C7 23 11 26 16 26C21 26 25 23 25 18C25 10.5 16 6 16 6Z" fill="#00ff87" opacity=".9"/>
      <line x1="16" y1="26" x2="16" y2="14" stroke="#050505" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M16 18C13.5 16 10 15 10 15" stroke="#050505" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>);
  if (id==="fire") return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="rgba(0,255,135,.1)"/>
      <path d="M16 5C16 5 10.5 10.5 10.5 17.5C10.5 21.5 13 25 16 25C19 25 21.5 21.5 21.5 17.5C21.5 14 19.5 11.5 19.5 11.5C19.5 11.5 18.5 14.5 17 15.5C17 15.5 17.8 11 16 5Z" fill="#00ff87"/>
      <ellipse cx="16" cy="20" rx="2.2" ry="3" fill="#050505" opacity=".3"/>
    </svg>);
  if (id==="money") return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="rgba(0,255,135,.1)"/>
      <circle cx="16" cy="16" r="9" stroke="#00ff87" strokeWidth="1.5" opacity=".6"/>
      <text x="16" y="21" textAnchor="middle" fill="#00ff87" fontSize="13" fontWeight="900" fontFamily="system-ui,sans-serif">$</text>
    </svg>);
  return <span style={{fontSize:s*.7}}>🟢</span>;
}

// ── Chat avatar: colored circle with initial ─────────────────────────────────
function Avatar({ name, isHost=false }: { name:string; isHost?:boolean }) {
  const color = isHost ? "#ff9900" : nc(name);
  return (
    <div style={{
      width:22, height:22, borderRadius:"50%",
      background:color+"20", border:"1.5px solid "+color,
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      fontSize:10, fontWeight:900, color, flexShrink:0, lineHeight:1,
    }}>
      {isHost ? "G" : name.charAt(0).toUpperCase()}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function StreamPage() {
  const [isLive, setIsLive] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [statusText, setStatusText] = useState("Checking stream...");
  const [chat, setChat] = useState<CM[]>([]);
  const [chatMsg, setChatMsg] = useState("");
  const [viewers, setViewers] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasCam, setHasCam] = useState(false);
  const [needsClick, setNeedsClick] = useState(false);
  const [floats, setFloats] = useState<FE[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [dur, setDur] = useState(0);

  const screenRef = useRef<HTMLVideoElement>(null);
  const camRef = useRef<HTMLVideoElement>(null);
  const pipRef = useRef<HTMLVideoElement>(null);
  const pendingCamTrack = useRef<RemoteTrack|null>(null);
  const camTrackRef = useRef<RemoteTrack|null>(null);
  const roomRef = useRef<Room|null>(null);
  const pendingScreenRef = useRef<RemoteTrack|null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastSendRef = useRef(0);
  const seenR = useRef(new Set<string>());
  const startRef = useRef(0);

  // ─── RETURNING VIEWER (localStorage) ───────────────────────
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gp_viewer') || 'null');
      if (saved?.name) setName(saved.name);
      if (saved?.email) setEmail(saved.email);
    } catch {}
    // Check host status
    if (typeof window !== 'undefined' && localStorage.getItem('gp_host') === 'true') {
      setIsHost(true);
    }
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [chat]);
  useEffect(() => {
    if (!joined) return;
    startRef.current = Date.now();
    const id = setInterval(() => setDur(Math.floor((Date.now()-startRef.current)/1000)), 1000);
    return () => clearInterval(id);
  }, [joined]);
  useEffect(() => {
    get("livestatus").then(d => setIsLive(!!d?.live));
    const es = new EventSource(`${FB}/livestatus.json`);
    es.addEventListener("put", (e: MessageEvent) => { try { const d=JSON.parse(e.data); setIsLive(!!d?.data?.live); } catch {} });
    const poll = setInterval(() => get("livestatus").then(d => setIsLive(!!d?.live)), 3000);
    return () => { es.close(); clearInterval(poll); };
  }, []);
  useEffect(() => {
    if (!joined) return;
    if (screenRef.current && pendingScreenRef.current) {
      pendingScreenRef.current.attach(screenRef.current);
      screenRef.current.play().catch(() => setNeedsClick(true));
      setHasVideo(true); pendingScreenRef.current = null;
    }
    if (pipRef.current && (pendingCamTrack.current || camTrackRef.current)) {
      const track = pendingCamTrack.current || camTrackRef.current!;
      track.attach(pipRef.current); pipRef.current.play().catch(()=>{}); pendingCamTrack.current = null;
    }
  }, [joined]);
  useEffect(() => {
    if (!joined) return;
    const poll = async () => {
      const data = await get("live/chat");
      if (!data||typeof data!=="object") return;
      setChat((Object.values(data) as CM[]).filter(m=>m?.msg&&m?.name).sort((a,b)=>a.ts-b.ts).slice(-50));
    };
    poll(); const id = setInterval(poll,2000); return () => clearInterval(id);
  }, [joined]);
  useEffect(() => {
    if (!joined) return;
    const poll = async () => {
      const data = await get("live/reactions");
      if (!data) return;
      const now = Date.now();
      Object.entries(data as Record<string,any>).forEach(([key,val]) => {
        if (now-val.ts>4000||seenR.current.has(key)) return;
        seenR.current.add(key);
        const id=key;
        setFloats(p=>[...p,{id,emoji:val.emoji,x:val.x??Math.random()}]);
        setTimeout(()=>setFloats(p=>p.filter(r=>r.id!==id)),2500);
      });
    };
    const id = setInterval(poll,500); return () => clearInterval(id);
  }, [joined]);

  const attachScreen = (track: RemoteTrack) => {
    if (screenRef.current) { track.attach(screenRef.current); screenRef.current.play().catch(()=>setNeedsClick(true)); setHasVideo(true); }
    else { pendingScreenRef.current = track; }
  };
  const attachCam = (track: RemoteTrack) => {
    camTrackRef.current = track;
    if (camRef.current) track.attach(camRef.current);
    if (pipRef.current) { track.attach(pipRef.current); pipRef.current.play().catch(()=>{}); }
    else { pendingCamTrack.current = track; }
    setHasCam(true);
  };
  const joinStream = async () => {
    if (!name.trim()) { alert("Enter your name"); return; }
    setConnecting(true); setStatusText("Connecting...");
    try {
      const {token,url} = await fetch("/api/lk-token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name.trim(),isHost:false})}).then(r=>r.json());
      if (!url) { setStatusText("Stream unavailable."); setConnecting(false); return; }
      const room = new Room({adaptiveStream:true}); roomRef.current = room;
      room.on(RoomEvent.TrackSubscribed,(track:RemoteTrack,pub:RemoteTrackPublication)=>{
        if (track.kind===Track.Kind.Video) pub.source===Track.Source.Camera ? attachCam(track) : (attachScreen(track),setStatusText("Live"));
        if (track.kind===Track.Kind.Audio) { const el=track.attach(); el.autoplay=true; document.body.appendChild(el); }
      });
      room.on(RoomEvent.TrackUnsubscribed,(track:RemoteTrack,pub:RemoteTrackPublication)=>{
        track.detach();
        if (track.kind===Track.Kind.Video) { if(pub.source===Track.Source.Camera){setHasCam(false);camTrackRef.current=null;}else setHasVideo(false); }
      });
      room.on(RoomEvent.ParticipantConnected,()=>setViewers(room.remoteParticipants.size));
      room.on(RoomEvent.ParticipantDisconnected,()=>setViewers(room.remoteParticipants.size));
      room.on(RoomEvent.Disconnected,()=>{setStatusText("Disconnected.");setJoined(false);setConnecting(false);setHasVideo(false);setHasCam(false);});
      await room.connect(url,token);
      // ─── LEAD CAPTURE ─────────────────────────────────────────
      try {
        const cleanEmail = (email || '').toLowerCase().replace(/[^a-z0-9]/g, '_') || 'no_email';
        const leadRef = 'https://the-greenprint-53d98-default-rtdb.firebaseio.com/live/leads/' + cleanEmail + '.json';
        const existing = await fetch(leadRef).then(r=>r.json()).catch(()=>null);
        await fetch(leadRef, {
          method: 'PUT',
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            firstSeen: existing?.firstSeen || new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            joinCount: (existing?.joinCount || 0) + 1,
          }),
        });
        localStorage.setItem('gp_viewer', JSON.stringify({ name: name.trim(), email: email.trim() }));
      } catch {}
      setJoined(true); setConnecting(false); setViewers(room.remoteParticipants.size);
      room.remoteParticipants.forEach(p=>{
        p.trackPublications.forEach(pub=>{
          if (!pub.track) return;
          if (pub.track.kind===Track.Kind.Video) pub.source===Track.Source.Camera ? attachCam(pub.track) : (attachScreen(pub.track),setStatusText("Live"));
          if (pub.track.kind===Track.Kind.Audio) { const el=pub.track.attach(); el.autoplay=true; document.body.appendChild(el); }
        });
      });
    } catch(err:any) { setStatusText("Error: "+(err.message||String(err))); setConnecting(false); }
  };
  const sendReaction = async (emoji: string) => {
    const x=Math.random(),ts=Date.now(),id="v_"+ts;
    seenR.current.add(id); setFloats(p=>[...p,{id,emoji,x}]);
    setTimeout(()=>setFloats(p=>p.filter(r=>r.id!==id)),2500);
    await push("live/reactions",{emoji,x,ts});
  };
  const sendChat = async () => {
    const text=chatMsg.trim(); if (!text) return;
    const now=Date.now(); if (now-lastSendRef.current<1500) return;
    lastSendRef.current=now; setChatMsg("");
    await push("live/chat",{name:name||"Viewer",msg:text,ts:now});
  };

  // Active reaction set
  const reactions = USE_BRANDED ? GP_REACTIONS : STANDARD_EMOJIS.map(e=>({id:e,send:e,label:e}));

  return (
    <>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.95)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(0,255,135,.3)}50%{box-shadow:0 0 40px rgba(0,255,135,.6)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-200px) scale(2.2)}}
        @keyframes joinPulse{0%,100%{opacity:1}50%{opacity:.85}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:4px}
        .eb{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:50%;padding:5px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;position:relative;}
        .eb:hover{background:rgba(0,255,135,.15);border-color:rgba(0,255,135,.4);transform:scale(1.18);}
        .eb:active{transform:scale(.9);}
        .eb-label{position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);font-size:8px;font-weight:900;color:rgba(255,255,255,.4);letter-spacing:.5px;white-space:nowrap;}
        .ci{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;padding:9px 13px;font-size:14px;outline:none;width:100%;box-sizing:border-box}
        .ci:focus{border-color:rgba(0,255,135,.5)}
        @media(max-width:768px){
          .mg{flex-direction:column!important}
          .cp{width:100%!important;height:auto!important;max-height:260px!important;border-left:none!important;border-top:1px solid rgba(255,255,255,.08)!important}
          .rbar{padding:6px 14px 16px!important;gap:4px!important}
          .pip-wrap{width:100px!important;height:56px!important;bottom:50px!important;right:8px!important}
        }
      `}</style>
      {/* ── HOST-ONLY LEADS BUTTON ── */}
      {isHost && (
        <a href="/leads" target="_blank" style={{
          position:"fixed", bottom:80, right:12, zIndex:9999,
          padding:"7px 14px", borderRadius:8, fontSize:11, fontWeight:800,
          background:"rgba(0,0,0,0.7)", border:"1px solid rgba(34,197,94,0.6)",
          color:"#22c55e", textDecoration:"none", letterSpacing:"0.08em",
          backdropFilter:"blur(8px)", boxShadow:"0 0 12px rgba(34,197,94,0.2)",
          whiteSpace:"nowrap",
        }}>LEADS ↗</a>
      )}
      

      <video ref={camRef} autoPlay playsInline muted style={{position:"fixed",width:0,height:0,opacity:0,pointerEvents:"none"}} />

      {!joined ? (
        <div style={{minHeight:"100dvh",background:"linear-gradient(135deg,#050505,#0a0f0a)",color:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"env(safe-area-inset-top,0px) 24px env(safe-area-inset-bottom,0px)",fontFamily:"system-ui,-apple-system,sans-serif"}}>
          <div style={{marginBottom:40,textAlign:"center"}}>
            <div style={{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#00ff87,#00c864)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:36}}>🌿</div>
            <h1 style={{fontSize:34,fontWeight:900,letterSpacing:"-1px",margin:"0 0 8px"}}>The Greenprint</h1>
            <p style={{color:"rgba(255,255,255,.4)",margin:0,fontSize:14,letterSpacing:"2px",textTransform:"uppercase"}}>Live Stream</p>
          </div>
          {isLive ? (
            <div style={{background:"rgba(255,255,255,.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:40,width:"100%",maxWidth:400}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:28,justifyContent:"center"}}>
                <span style={{width:10,height:10,background:"#ff2d55",borderRadius:"50%",display:"inline-block",animation:"pulse 1.2s infinite"}}/>
                <span style={{fontWeight:800,color:"#ff2d55",fontSize:13,letterSpacing:"2px"}}>LIVE NOW</span>
              </div>
              <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&joinStream()} placeholder="Enter your name to join..."
                style={{width:"100%",padding:"14px 16px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:12,color:"#fff",marginBottom:14,boxSizing:"border-box",fontSize:15,outline:"none"}} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email (optional)"
                style={{
                  width: "100%", padding: "14px 18px", marginTop: 10,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12, color: "#fff", fontSize: 16, outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <button onClick={joinStream} disabled={connecting}
                style={{width:"100%",padding:"15px 0",background:connecting?"rgba(255,255,255,.1)":"linear-gradient(135deg,#00ff87,#00c864)",border:"none",borderRadius:12,color:connecting?"rgba(255,255,255,.4)":"#000",fontWeight:800,cursor:connecting?"wait":"pointer",fontSize:16,animation:connecting?"none":"glow 2s infinite"}}>
                {connecting?"Connecting...":"▶  Join Stream"}
              </button>
            </div>
          ) : (
            <div style={{textAlign:"center",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:20,padding:48}}>
              <div style={{fontSize:64,marginBottom:20}}>📡</div>
              <h2 style={{color:"rgba(255,255,255,.5)",fontWeight:600,fontSize:22,margin:"0 0 8px"}}>Stream Offline</h2>
              <p style={{color:"rgba(255,255,255,.25)",fontSize:14,margin:"0 0 28px"}}>Come back when we go live</p>
              <a href={JOIN_URL} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",background:"linear-gradient(135deg,#00ff87,#00c864)",color:"#000",fontWeight:800,padding:"13px 28px",borderRadius:12,textDecoration:"none",fontSize:15}}>Join The Greenprint →</a>
            </div>
          )}
        </div>
      ) : (
        <div style={{height:"100dvh",background:"#050505",color:"#fff",display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"system-ui,-apple-system,sans-serif"}}>
          <div style={{paddingTop:"env(safe-area-inset-top,0px)",background:"rgba(0,0,0,.6)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(255,255,255,.06)",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#00ff87,#00c864)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🌿</div>
                <div><div style={{fontWeight:900,fontSize:13}}>The Greenprint</div><div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>Live Trading Session</div></div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
                <span style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:"3px 10px",fontSize:11}}>👁 {viewers+1}</span>
                <span style={{background:"rgba(255,45,85,.15)",border:"1px solid rgba(255,45,85,.4)",borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:800,letterSpacing:"1.5px",color:"#ff2d55",display:"flex",alignItems:"center",gap:4}}>
                  <span style={{width:6,height:6,background:"#ff2d55",borderRadius:"50%",animation:"pulse 1.2s infinite",display:"inline-block"}}/>LIVE
                </span>
                <span style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",borderRadius:20,padding:"3px 10px",fontSize:10,color:"rgba(255,255,255,.4)"}}>{fmt(dur)}</span>
                <button onClick={()=>setChatOpen(o=>!o)} style={{background:chatOpen?"rgba(0,255,135,.12)":"rgba(255,255,255,.05)",border:chatOpen?"1px solid rgba(0,255,135,.3)":"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"4px 10px",cursor:"pointer",color:chatOpen?"#00ff87":"rgba(255,255,255,.5)",fontSize:12,fontWeight:700}}>💬</button>
              </div>
            </div>
          </div>

          <div className="mg" style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
            <div style={{flex:1,position:"relative",background:"#000",overflow:"hidden"}} onClick={needsClick?()=>{screenRef.current?.play();setNeedsClick(false);}:undefined}>
              <video ref={screenRef} autoPlay playsInline style={{width:"100%",height:"100%",objectFit:"contain"}} />

              {hasCam && (
                <div className="pip-wrap" style={{position:"absolute",bottom:56,right:12,width:160,height:90,borderRadius:10,overflow:"hidden",border:"2px solid #00ff87",boxShadow:"0 4px 20px rgba(0,255,135,.45)",zIndex:20}}>
                  <video ref={pipRef} autoPlay playsInline muted style={{width:"100%",height:"100%",objectFit:"cover"}} />
                  <div style={{position:"absolute",top:0,left:0,background:"rgba(0,255,135,.9)",color:"#000",fontSize:8,fontWeight:900,letterSpacing:"1.5px",padding:"2px 6px",borderRadius:"0 0 6px 0"}}>CAM</div>
                </div>
              )}

              <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
                {floats.map(r=>(
                  <div key={r.id} style={{position:"absolute",bottom:70,left:`${8+r.x*78}%`,fontSize:34,animation:"floatUp 2.5s ease-out forwards",userSelect:"none",filter:"drop-shadow(0 2px 12px rgba(0,0,0,.8))"}}>{r.emoji}</div>
                ))}
              </div>

              {!hasVideo && (
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14,background:"#000"}}>
                  <div style={{width:44,height:44,border:"3px solid rgba(0,255,135,.25)",borderTopColor:"#00ff87",borderRadius:"50%",animation:"spin .9s linear infinite"}}/>
                  <span style={{color:"rgba(255,255,255,.35)",fontSize:13}}>{statusText}</span>
                </div>
              )}
              {needsClick&&hasVideo&&(
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.7)",backdropFilter:"blur(4px)",cursor:"pointer"}}>
                  <div style={{background:"#00ff87",color:"#000",fontWeight:800,borderRadius:14,padding:"18px 36px",fontSize:18}}>▶ Tap to Play</div>
                </div>
              )}

              {/* Reaction bar */}
              <div className="rbar" style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,.8))",padding:"32px 16px 12px",display:"flex",gap:8,alignItems:"center"}}>
                {reactions.map(r=>(
                  <button key={r.id} className="eb" onClick={()=>sendReaction(r.send)} title={r.label}>
                    {USE_BRANDED ? <GpIcon id={r.id} size={28}/> : <span style={{fontSize:22}}>{r.send}</span>}
                    {USE_BRANDED && <span className="eb-label">{r.label}</span>}
                  </button>
                ))}
              </div>
            </div>

            {chatOpen&&(
              <div className="cp" style={{width:300,borderLeft:"1px solid rgba(255,255,255,.06)",display:"flex",flexDirection:"column",background:"rgba(5,5,5,.9)",backdropFilter:"blur(20px)",flexShrink:0}}>
                <div style={{padding:"11px 14px",borderBottom:"1px solid rgba(255,255,255,.06)",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
                  <span>💬</span> Live Chat
                </div>
                                                                <div style={{flex:1,overflowY:"auto",padding:"8px 12px"}}>
                  {chat.length===0&&<div style={{textAlign:"center",padding:"36px 0"}}><div style={{fontSize:28,marginBottom:8}}>💬</div><p style={{color:"rgba(255,255,255,.2)",fontSize:12,margin:0}}>Be the first to chat!</p></div>}
                  {chat.map((m,i)=>(
                    <div key={i} style={{marginBottom:10,display:"flex",alignItems:"flex-start",gap:7}}>
                      <Avatar name={m.name} isHost={m.name==="Host"} />
                      <div style={{lineHeight:1.4,flex:1,minWidth:0}}>
                        <span style={{color:m.name==="Host"?"#ff9900":nc(m.name),fontWeight:700,fontSize:11}}>{m.name}</span>
                        <span style={{color:"rgba(255,255,255,.8)",fontSize:12,display:"block",wordBreak:"break-word"}}>{m.msg}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef}/>
                </div>
                <a href={JOIN_URL} target="_blank" rel="noopener noreferrer"
                  style={{display:"block",textDecoration:"none",margin:"6px 10px",background:"linear-gradient(135deg,rgba(0,255,135,.12),rgba(0,200,100,.08))",border:"1px solid rgba(0,255,135,.28)",borderRadius:10,padding:"10px 12px",textAlign:"center",animation:"joinPulse 3s infinite",flexShrink:0}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:2}}>Ready to level up?</div>
                  <div style={{fontSize:13,fontWeight:800,color:"#00ff87"}}>Join The Greenprint — $99/mo →</div>
                </a>
                <div style={{padding:"6px 12px",paddingBottom:"max(8px,env(safe-area-inset-bottom,0px))",borderTop:"1px solid rgba(255,255,255,.06)",flexShrink:0}}>
                  <div style={{display:"flex",gap:7}}>
                    <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder={`Chat as ${name}...`} className="ci" />
                    <button onClick={sendChat} style={{background:"#00ff87",border:"none",borderRadius:10,color:"#000",fontWeight:800,padding:"9px 12px",cursor:"pointer",flexShrink:0,fontSize:14}}>→</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
