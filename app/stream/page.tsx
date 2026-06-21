"use client";
import { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, RemoteTrack, RemoteTrackPublication } from "livekit-client";

const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const JOIN_URL = "https://subscribe.1houseglobal.com/jay";
const get = async (p: string) => { try { const r = await fetch(`${FB}/${p}.json`,{cache:"no-store"}); return await r.json(); } catch { return null; } };
const push = async (p: string, d: unknown) => { try { await fetch(`${FB}/${p}.json`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}); } catch {} };

type CM = { name: string; msg: string; ts: number };
type FE = { id: string; emoji: string; x: number };
const EMOJIS = ["🔥","❤️","😂","👏","💯","🚀"];
const COLORS = ["#00ff87","#ff6b6b","#ffd93d","#6bcbff","#c77dff","#ff9f43","#48dbfb","#ff6b9d"];
const nc = (n: string) => COLORS[n.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%COLORS.length];
const fmt = (s: number) => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

export default function StreamPage() {
  const [isLive, setIsLive] = useState(false);
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
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
  // camRef is rendered OUTSIDE the joined gate so it's always in the DOM
  const camRef = useRef<HTMLVideoElement>(null);
  const pendingCamTrack = useRef<RemoteTrack|null>(null);
  const roomRef = useRef<Room|null>(null);
  const pendingScreenRef = useRef<RemoteTrack|null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastSendRef = useRef(0);
  const seenR = useRef(new Set<string>());
  const startRef = useRef(0);

  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [chat]);

  useEffect(() => {
    if (!joined) return;
    startRef.current = Date.now();
    const id = setInterval(() => setDur(Math.floor((Date.now()-startRef.current)/1000)), 1000);
    return () => clearInterval(id);
  }, [joined]);

  // Live status
  useEffect(() => {
    get("livestatus").then(d => setIsLive(!!d?.live));
    const es = new EventSource(`${FB}/livestatus.json`);
    es.addEventListener("put", (e: MessageEvent) => {
      try { const d = JSON.parse(e.data); setIsLive(!!d?.data?.live); } catch {}
    });
    const poll = setInterval(() => get("livestatus").then(d => setIsLive(!!d?.live)), 3000);
    return () => { es.close(); clearInterval(poll); };
  }, []);

  // After joined, attach any pending screen/cam tracks
  useEffect(() => {
    if (!joined) return;
    if (screenRef.current && pendingScreenRef.current) {
      pendingScreenRef.current.attach(screenRef.current);
      screenRef.current.play().catch(() => setNeedsClick(true));
      setHasVideo(true);
      pendingScreenRef.current = null;
    }
    if (camRef.current && pendingCamTrack.current) {
      pendingCamTrack.current.attach(camRef.current);
      camRef.current.play().catch(() => {});
      setHasCam(true);
      pendingCamTrack.current = null;
    }
  }, [joined]);

  // Chat polling
  useEffect(() => {
    if (!joined) return;
    const poll = async () => {
      const data = await get("live/chat");
      if (!data||typeof data!=="object") return;
      setChat((Object.values(data) as CM[]).filter(m=>m?.msg&&m?.name).sort((a,b)=>a.ts-b.ts).slice(-50));
    };
    poll(); const id = setInterval(poll,2000); return () => clearInterval(id);
  }, [joined]);

  // Reactions polling
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
    if (screenRef.current) {
      track.attach(screenRef.current);
      screenRef.current.play().catch(() => setNeedsClick(true));
      setHasVideo(true);
    } else {
      pendingScreenRef.current = track;
    }
  };

  // camRef is always mounted — attach immediately or queue if somehow not ready
  const attachCam = (track: RemoteTrack) => {
    if (camRef.current) {
      track.attach(camRef.current);
      camRef.current.play().catch(() => {});
      setHasCam(true);
    } else {
      pendingCamTrack.current = track;
      setHasCam(true);
    }
  };

  const joinStream = async () => {
    if (!name.trim()) { alert("Enter your name"); return; }
    setConnecting(true); setStatusText("Connecting...");
    try {
      const {token,url} = await fetch("/api/lk-token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name.trim(),isHost:false})}).then(r=>r.json());
      if (!url) { setStatusText("Stream unavailable."); setConnecting(false); return; }
      const room = new Room({adaptiveStream:true});
      roomRef.current = room;
      room.on(RoomEvent.TrackSubscribed,(track:RemoteTrack,pub:RemoteTrackPublication)=>{
        if (track.kind===Track.Kind.Video) pub.source===Track.Source.Camera ? attachCam(track) : (attachScreen(track), setStatusText("Live"));
        if (track.kind===Track.Kind.Audio) { const el=track.attach(); el.autoplay=true; document.body.appendChild(el); }
      });
      room.on(RoomEvent.TrackUnsubscribed,(track:RemoteTrack,pub:RemoteTrackPublication)=>{
        track.detach();
        if (track.kind===Track.Kind.Video) pub.source===Track.Source.Camera ? setHasCam(false) : setHasVideo(false);
      });
      room.on(RoomEvent.ParticipantConnected,()=>setViewers(room.remoteParticipants.size));
      room.on(RoomEvent.ParticipantDisconnected,()=>setViewers(room.remoteParticipants.size));
      room.on(RoomEvent.Disconnected,()=>{ setStatusText("Disconnected."); setJoined(false); setConnecting(false); setHasVideo(false); setHasCam(false); });
      await room.connect(url,token);
      setJoined(true); setConnecting(false); setViewers(room.remoteParticipants.size);
      room.remoteParticipants.forEach(p=>{
        p.trackPublications.forEach(pub=>{
          if (!pub.track) return;
          if (pub.track.kind===Track.Kind.Video) pub.source===Track.Source.Camera ? attachCam(pub.track) : (attachScreen(pub.track), setStatusText("Live"));
          if (pub.track.kind===Track.Kind.Audio) { const el=pub.track.attach(); el.autoplay=true; document.body.appendChild(el); }
        });
      });
    } catch(err:any) { setStatusText("Error: "+(err.message||String(err))); setConnecting(false); }
  };

  const sendReaction = async (emoji: string) => {
    const x=Math.random(),ts=Date.now(),id="v_"+ts;
    seenR.current.add(id);
    setFloats(p=>[...p,{id,emoji,x}]);
    setTimeout(()=>setFloats(p=>p.filter(r=>r.id!==id)),2500);
    await push("live/reactions",{emoji,x,ts});
  };

  const sendChat = async () => {
    const text=chatMsg.trim(); if (!text) return;
    const now=Date.now(); if (now-lastSendRef.current<1500) return;
    lastSendRef.current=now; setChatMsg("");
    await push("live/chat",{name:name||"Viewer",msg:text,ts:now});
  };

  return (
    <>
      {/* Camera PiP video — ALWAYS in DOM regardless of joined state */}
      {/* This guarantees camRef.current is set when TrackSubscribed fires */}
      <video
        ref={camRef}
        autoPlay playsInline muted
        style={{
          position:"fixed",
          right:joined&&hasCam?16:-999,
          bottom:joined&&hasCam?72:0,
          width:joined&&hasCam?170:0,
          height:joined&&hasCam?96:0,
          opacity:joined&&hasCam?1:0,
          borderRadius:10,
          objectFit:"cover",
          border:joined&&hasCam?"2px solid #00ff87":"none",
          boxShadow:joined&&hasCam?"0 4px 20px rgba(0,255,135,.45)":"none",
          zIndex:999,
          transition:"opacity .3s",
          pointerEvents:"none",
        }}
      />
      {joined&&hasCam&&<div style={{position:"fixed",right:18,bottom:168,zIndex:1000,background:"rgba(0,255,135,.9)",color:"#000",fontSize:9,fontWeight:900,letterSpacing:"1.5px",borderRadius:"4px 4px 0 0",padding:"2px 7px",pointerEvents:"none"}}>CAM</div>}

      {!joined ? (
        /* ── JOIN SCREEN ── */
        <div style={{minHeight:"100dvh",background:"linear-gradient(135deg,#050505,#0a0f0a)",color:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"system-ui,-apple-system,sans-serif"}}>
          <style>{`
            @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.95)}}
            @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(0,255,135,.3)}50%{box-shadow:0 0 40px rgba(0,255,135,.6)}}
            @keyframes spin{to{transform:rotate(360deg)}}
          `}</style>
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
              <a href={JOIN_URL} target="_blank" rel="noopener noreferrer"
                style={{display:"inline-block",background:"linear-gradient(135deg,#00ff87,#00c864)",color:"#000",fontWeight:800,padding:"13px 28px",borderRadius:12,textDecoration:"none",fontSize:15}}>
                Join The Greenprint →
              </a>
            </div>
          )}
        </div>
      ) : (
        /* ── STREAM SCREEN ── */
        <div style={{height:"100dvh",background:"#050505",color:"#fff",display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"system-ui,-apple-system,sans-serif"}}>
          <style>{`
            @keyframes spin{to{transform:rotate(360deg)}}
            @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
            @keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-200px) scale(2)}}
            @keyframes joinPulse{0%,100%{opacity:1}50%{opacity:.85}}
            ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:4px}
            .eb{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:50px;padding:6px 11px;cursor:pointer;font-size:18px;transition:all .15s;color:white;line-height:1}
            .eb:hover{background:rgba(255,255,255,.15);transform:scale(1.2)}
            .eb:active{transform:scale(.9)}
            .ci{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;padding:9px 13px;font-size:14px;outline:none;width:100%;box-sizing:border-box}
            .ci:focus{border-color:rgba(0,255,135,.5)}
            @media(max-width:768px){.mg{flex-direction:column!important}.cp{width:100%!important;height:260px!important;border-left:none!important;border-top:1px solid rgba(255,255,255,.08)!important}.rbar{padding:6px 12px 8px!important}}
          `}</style>

          {/* Header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,.06)",background:"rgba(0,0,0,.5)",backdropFilter:"blur(12px)",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#00ff87,#00c864)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🌿</div>
              <div>
                <div style={{fontWeight:900,fontSize:13}}>The Greenprint</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>Live Trading Session</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:"3px 10px",fontSize:11}}>👁 {viewers+1}</span>
              <span style={{background:"rgba(255,45,85,.15)",border:"1px solid rgba(255,45,85,.4)",borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:800,letterSpacing:"1.5px",color:"#ff2d55",display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:6,height:6,background:"#ff2d55",borderRadius:"50%",animation:"pulse 1.2s infinite",display:"inline-block"}}/>LIVE
              </span>
              <span style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",borderRadius:20,padding:"3px 10px",fontSize:10,color:"rgba(255,255,255,.4)"}}>{fmt(dur)}</span>
              <button onClick={()=>setChatOpen(o=>!o)} style={{background:chatOpen?"rgba(0,255,135,.12)":"rgba(255,255,255,.05)",border:chatOpen?"1px solid rgba(0,255,135,.3)":"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"4px 10px",cursor:"pointer",color:chatOpen?"#00ff87":"rgba(255,255,255,.5)",fontSize:12,fontWeight:700}}>💬</button>
            </div>
          </div>

          {/* Body */}
          <div className="mg" style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
            {/* Video */}
            <div style={{flex:1,position:"relative",background:"#000",overflow:"hidden"}} onClick={needsClick?()=>{screenRef.current?.play();setNeedsClick(false);}:undefined}>
              <video ref={screenRef} autoPlay playsInline style={{width:"100%",height:"100%",objectFit:"contain"}} />

              {/* Floating reactions */}
              <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
                {floats.map(r=>(
                  <div key={r.id} style={{position:"absolute",bottom:50,left:`${8+r.x*78}%`,fontSize:36,animation:"floatUp 2.5s ease-out forwards",userSelect:"none",filter:"drop-shadow(0 2px 10px rgba(0,0,0,.7))"}}>{r.emoji}</div>
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

              {/* Reaction bar — compact, no overlap */}
              <div className="rbar" style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,.75))",padding:"28px 12px 10px",display:"flex",gap:6,alignItems:"center"}}>
                {EMOJIS.map(e=>(
                  <button key={e} className="eb" onClick={()=>sendReaction(e)}>{e}</button>
                ))}
              </div>
            </div>

            {/* Chat panel */}
            {chatOpen&&(
              <div className="cp" style={{width:300,borderLeft:"1px solid rgba(255,255,255,.06)",display:"flex",flexDirection:"column",background:"rgba(5,5,5,.85)",backdropFilter:"blur(20px)",flexShrink:0}}>
                <div style={{padding:"11px 14px",borderBottom:"1px solid rgba(255,255,255,.06)",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:7}}>
                  <span>💬</span> Live Chat
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"8px 12px"}}>
                  {chat.length===0&&<div style={{textAlign:"center",padding:"36px 0"}}><div style={{fontSize:28,marginBottom:8}}>💬</div><p style={{color:"rgba(255,255,255,.2)",fontSize:12,margin:0}}>Be the first to chat!</p></div>}
                  {chat.map((m,i)=>(
                    <div key={i} style={{marginBottom:8,lineHeight:1.4}}>
                      <span style={{color:m.name==="Host"?"#ff9900":nc(m.name),fontWeight:700,fontSize:12}}>{m.name}</span>
                      <span style={{color:"rgba(255,255,255,.82)",fontSize:12}}> {m.msg}</span>
                    </div>
                  ))}
                  <div ref={chatEndRef}/>
                </div>
                <div style={{padding:"8px 12px",borderTop:"1px solid rgba(255,255,255,.06)"}}>
                  <div style={{display:"flex",gap:7}}>
                    <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder={`Chat as ${name}...`} className="ci" />
                    <button onClick={sendChat} style={{background:"#00ff87",border:"none",borderRadius:10,color:"#000",fontWeight:800,padding:"9px 12px",cursor:"pointer",flexShrink:0,fontSize:14}}>→</button>
                  </div>
                </div>
                {/* Join CTA */}
                <a href={JOIN_URL} target="_blank" rel="noopener noreferrer"
                  style={{display:"block",textDecoration:"none",margin:"0 10px 10px",background:"linear-gradient(135deg,rgba(0,255,135,.12),rgba(0,200,100,.08))",border:"1px solid rgba(0,255,135,.28)",borderRadius:10,padding:"10px 12px",textAlign:"center",animation:"joinPulse 3s infinite"}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:2}}>Ready to level up?</div>
                  <div style={{fontSize:13,fontWeight:800,color:"#00ff87"}}>Join The Greenprint — $99/mo →</div>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
