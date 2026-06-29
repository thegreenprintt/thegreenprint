"use client";
import { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, createLocalScreenTracks, createLocalVideoTrack } from "livekit-client";

const HASH = "f7bbb300691e55f6eaad18327a462a30ff3bf38a4a36a24e9458fdfc508d4ab1";
const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}
const get = async (p: string) => { try { const r = await fetch(`${FB}/${p}.json`,{cache:"no-store"}); return await r.json(); } catch { return null; } };
const put = async (p: string, d: unknown) => { try { await fetch(`${FB}/${p}.json`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(d),keepalive:true}); } catch {} };
const push = async (p: string, d: unknown) => { try { await fetch(`${FB}/${p}.json`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}); } catch {} };
const del = async (p: string) => { try { await fetch(`${FB}/${p}.json`,{method:"DELETE"}); } catch {} };

type CM = { name: string; msg: string; ts: number };
type FE = { id: string; emoji: string; x: number };
const EMOJIS = ["🔥","❤️","😂","👏","💯","🚀"];
const COLORS = ["#00ff87","#ff6b6b","#ffd93d","#6bcbff","#c77dff","#ff9f43"];
const nc = (n: string) => COLORS[n.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%COLORS.length];
const fmt = (s: number) => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

export default function GoLive() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [live, setLive] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState<number|null>(null);
  const [status, setStatus] = useState("");
  const [viewers, setViewers] = useState(0);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [chat, setChat] = useState<CM[]>([]);
  const [chatMsg, setChatMsg] = useState("");
  const [floats, setFloats] = useState<FE[]>([]);
  const [dur, setDur] = useState(0);
  const [notifying, setNotifying] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const screenRef = useRef<HTMLVideoElement>(null);
  const camRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room|null>(null);
  const hbRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const camTrackRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const seenR = useRef(new Set<string>());
  const startRef = useRef(0);

  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [chat]);

  useEffect(() => {
    if (!live) return;
    startRef.current = Date.now();
    const id = setInterval(() => setDur(Math.floor((Date.now()-startRef.current)/1000)), 1000);
    return () => clearInterval(id);
  }, [live]);

  useEffect(() => {
    if (!authed) return;
    const poll = async () => {
      const data = await get("live/chat");
      if (!data||typeof data!=="object") { setChat([]); return; }
      setChat((Object.values(data) as CM[]).filter(m=>m?.msg&&m?.name).sort((a,b)=>a.ts-b.ts).slice(-50));
    };
    poll(); const id = setInterval(poll,2000); return () => clearInterval(id);
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
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
  }, [authed]);

  const startStream = async () => {
    try {
      setStatus("Requesting screen...");
      const tracks = await createLocalScreenTracks({audio:true});
      const vt = tracks.find(t=>t.kind===Track.Kind.Video);
      const at = tracks.find(t=>t.kind===Track.Kind.Audio);
      if (!vt) throw new Error("No video track");
      if (screenRef.current) vt.attach(screenRef.current);
      setStatus("Connecting...");
      const {token,url} = await fetch("/api/lk-token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({isHost:true})}).then(r=>r.json());
      if (!url) { setStatus("Missing LIVEKIT env vars."); return; }
      const room = new Room({adaptiveStream:true,dynacast:true});
      roomRef.current = room;
      room.on(RoomEvent.ParticipantConnected,()=>setViewers(room.remoteParticipants.size));
      room.on(RoomEvent.ParticipantDisconnected,()=>setViewers(room.remoteParticipants.size));
      await room.connect(url,token);
      await room.localParticipant.publishTrack(vt,{name:"screen",source:Track.Source.ScreenShare,simulcast:false});
      if (at) await room.localParticipant.publishTrack(at,{name:"screen-audio",source:Track.Source.ScreenShareAudio});
      setLive(true); setStatus(""); setViewers(room.remoteParticipants.size);
      await put("livestatus",{live:true,ts:Date.now()});
      hbRef.current = setInterval(()=>put("livestatus",{live:true,ts:Date.now()}),10000);
      vt.mediaStreamTrack.addEventListener("ended",()=>stopStream());
    } catch(err:any) { setStatus("Error: "+(err.message||String(err))); }
  };

  const stopStream = async () => {
    if (hbRef.current) clearInterval(hbRef.current);
    if (roomRef.current) { await roomRef.current.disconnect(); roomRef.current=null; }
    await put("livestatus",{live:false,ts:Date.now()});
    setLive(false); setStatus(""); setViewers(0); setCamOn(false);
    if (camTrackRef.current) { camTrackRef.current.stop(); camTrackRef.current=null; }
    if (camRef.current) camRef.current.srcObject=null;
  };

  const toggleCam = async () => {
    if (!roomRef.current) return;
    try {
      if (camOn) {
        if (camTrackRef.current) { await roomRef.current.localParticipant.unpublishTrack(camTrackRef.current); camTrackRef.current.stop(); camTrackRef.current=null; }
        if (camRef.current) camRef.current.srcObject=null;
        setCamOn(false);
      } else {
        const track = await createLocalVideoTrack({facingMode:"user"});
        camTrackRef.current = track;
        if (camRef.current) track.attach(camRef.current);
        await roomRef.current.localParticipant.publishTrack(track,{name:"camera",source:Track.Source.Camera,simulcast:true});
        setCamOn(true);
      }
    } catch(err:any) { setStatus("Cam: "+(err.message||String(err))); }
  };

  const toggleMic = async () => {
    if (!roomRef.current) return;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!micOn);
    setMicOn(m=>!m);
  };

  const notifySubscribers = async () => {
    if (notifying) return;
    setNotifying(true);
    setNotifyStatus("Sending...");
    try {
      const res = await fetch("/api/notify", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setNotifyStatus("✅ Sent to " + data.sent + " subscribers!");
      } else {
        setNotifyStatus("❌ " + (data.error || "Failed"));
      }
    } catch {
      setNotifyStatus("❌ Network error");
    }
    setNotifying(false);
    setTimeout(() => setNotifyStatus(""), 5000);
  };

  const sendChat = async () => {
    if (!chatMsg.trim()||sendingRef.current) return;
    sendingRef.current=true; const m=chatMsg.trim(); setChatMsg("");
    await push("live/chat",{name:"Host",msg:m,ts:Date.now()});
    sendingRef.current=false;
  };

  const sendReaction = async (emoji: string) => {
    const x=Math.random(),ts=Date.now(),id="h_"+ts;
    seenR.current.add(id);
    setFloats(p=>[...p,{id,emoji,x}]);
    setTimeout(()=>setFloats(p=>p.filter(r=>r.id!==id)),2500);
    await push("live/reactions",{emoji,x,ts});
  };

  const auth = async () => {
    if (await sha256(pw)===HASH) { setAuthed(true); localStorage.setItem('gp_host','true'); await put("livestatus",{live:false,ts:Date.now()}); await del("live"); }
    else alert("Wrong password");
  };

  if (!authed) return (
    <div style={{minHeight:"100dvh",background:"radial-gradient(ellipse at 25% 60%,#071a10 0%,#020807 55%,#020807 100%)",color:"#fff",fontFamily:"system-ui,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
      <style>{`
        @keyframes orbPulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.7;transform:scale(1.08)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        #studio-submit:hover{transform:translateY(-1px) scale(1.02)!important;box-shadow:0 8px 40px rgba(34,197,94,.6)!important}
        #studio-submit:active{transform:scale(.98)!important}
      `}</style>
      <div style={{position:"absolute",top:"5%",left:"5%",width:500,height:500,background:"radial-gradient(circle,rgba(34,197,94,.1) 0%,transparent 65%)",animation:"orbPulse 4s ease-in-out infinite",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"absolute",bottom:"0%",right:"0%",width:400,height:400,background:"radial-gradient(circle,rgba(34,197,94,.07) 0%,transparent 65%)",animation:"orbPulse 5s ease-in-out infinite 1s",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"absolute",top:"50%",left:"50%",width:800,height:2,background:"linear-gradient(90deg,transparent,rgba(34,197,94,.08),transparent)",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:0}}/>

      <div style={{width:"100%",maxWidth:420,position:"relative",zIndex:1,animation:"fadeUp .6s ease"}}>

        {/* Logo / Branding */}
        <div style={{textAlign:"center",marginBottom:44}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:72,height:72,borderRadius:20,background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.25)",marginBottom:20,boxShadow:"0 0 40px rgba(34,197,94,.15)"}}>
            <span style={{fontSize:34}}>🎙️</span>
          </div>
          <div style={{fontSize:11,letterSpacing:"4px",color:"rgba(34,197,94,.6)",textTransform:"uppercase",fontWeight:600,marginBottom:10}}>Welcome back</div>
          <div style={{fontSize:32,fontWeight:900,letterSpacing:"-1px",background:"linear-gradient(135deg,#22c55e 0%,#4ade80 45%,#bbf7d0 100%)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 4s linear infinite"}}>Greenprint Studio</div>
        </div>

        {/* Card */}
        <div style={{background:"rgba(255,255,255,.025)",border:"1px solid rgba(34,197,94,.12)",borderRadius:24,padding:"36px 32px",backdropFilter:"blur(32px)",boxShadow:"0 0 80px rgba(34,197,94,.05),inset 0 1px 0 rgba(255,255,255,.05)"}}>
          <div style={{marginBottom:10}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.35)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:10}}>Password</label>
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&auth()}
              placeholder="Enter your studio password"
              style={{width:"100%",padding:"16px 20px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,color:"#fff",fontSize:15,outline:"none",boxSizing:"border-box" as const,letterSpacing:".5px",transition:"border-color .2s ease"}}
              onFocus={e=>(e.currentTarget.style.borderColor="rgba(34,197,94,.5)")}
              onBlur={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,.1)")}
            />
          </div>
          <div style={{marginTop:20}}>
            <button id="studio-submit" onClick={auth}
              style={{width:"100%",padding:"16px 0",background:"linear-gradient(135deg,#15803d 0%,#22c55e 50%,#4ade80 100%)",border:"none",borderRadius:14,color:"#000",fontWeight:900,fontSize:15,cursor:"pointer",letterSpacing:"1px",boxShadow:"0 4px 28px rgba(34,197,94,.35)",transition:"all .2s ease"}}>
              ENTER STUDIO
            </button>
            <a href="/leads" target="_blank" style={{padding:"10px 18px",background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.4)",borderRadius:12,color:"#22c55e",fontWeight:800,fontSize:13,textDecoration:"none",letterSpacing:".05em",display:"inline-flex",alignItems:"center",gap:6}}>📋 LEADS ↗</a>
          </div>
          <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"rgba(255,255,255,.15)",letterSpacing:"1px"}}>Host access only · thegreenprint.trade</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{height:"100vh",background:"#050505",color:"#fff",display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-180px) scale(2)}}
        @keyframes glow{0%,100%{box-shadow:0 0 16px rgba(0,255,135,.2)}50%{box-shadow:0 0 32px rgba(0,255,135,.5)}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:4px}
        @media(max-width:900px){.sg{grid-template-columns:1fr!important}.cc{max-height:260px!important}}
      `}</style>
      

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,.06)",background:"rgba(0,0,0,.5)",backdropFilter:"blur(12px)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#00ff87,#00c864)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🌿</div>
          <div><div style={{fontWeight:900,fontSize:15}}>The Greenprint</div><div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>Broadcast Studio</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {live && <span style={{background:"rgba(255,45,85,.15)",border:"1px solid rgba(255,45,85,.4)",borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:800,letterSpacing:"1.5px",color:"#ff2d55",display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:7,height:7,background:"#ff2d55",borderRadius:"50%",animation:"pulse 1.2s infinite",display:"inline-block"}}/>LIVE
          </span>}
          <span style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:"5px 12px",fontSize:13}}>👁 {viewers} watching</span>
          {live && <span style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:"5px 12px",fontSize:12,color:"rgba(255,255,255,.5)"}}>{fmt(dur)}</span>}
        </div>
      </div>

      <div className="sg" style={{flex:1,display:"grid",gridTemplateColumns:"1fr 340px",overflow:"hidden"}}>
        <div style={{display:"flex",flexDirection:"column",overflow:"hidden",padding:16,gap:14}}>
          <div style={{flex:1,position:"relative",background:"#000",borderRadius:16,overflow:"hidden",border:"1px solid rgba(255,255,255,.08)"}}>
            <video ref={screenRef} autoPlay muted playsInline style={{width:"100%",height:"100%",objectFit:"contain"}} />
            {/* Camera PiP — ALWAYS in DOM */}
            <div style={{position:"absolute",bottom:16,right:16,width:200,height:113,borderRadius:12,overflow:"hidden",border:"2px solid #00ff87",boxShadow:"0 4px 24px rgba(0,255,135,.35)",display:camOn?"block":"none",zIndex:10}}>
              <video ref={camRef} autoPlay muted playsInline style={{width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)"}} />
              <div style={{position:"absolute",top:6,left:8,background:"rgba(0,255,135,.9)",color:"#000",fontSize:9,fontWeight:900,letterSpacing:"1.5px",borderRadius:4,padding:"2px 6px"}}>CAM</div>
            </div>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
              {floats.map(r=>(
                <div key={r.id} style={{position:"absolute",bottom:60,left:`${10+r.x*75}%`,fontSize:40,animation:"floatUp 2.5s ease-out forwards",userSelect:"none",filter:"drop-shadow(0 2px 8px rgba(0,0,0,.6))"}}>{r.emoji}</div>
              ))}
            </div>
            {!live && <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10,background:"rgba(0,0,0,.9)"}}>
              <div style={{fontSize:52}}>🎬</div><div style={{color:"rgba(255,255,255,.4)",fontSize:15}}>Click Go Live to start</div>
            </div>}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            {!live
              ? <button onClick={startStream} style={{background:"linear-gradient(135deg,#00ff87,#00c864)",border:"none",borderRadius:10,color:"#000",fontWeight:800,padding:"11px 24px",fontSize:14,cursor:"pointer",animation:"glow 2s infinite"}}>🔴 Go Live</button>
              : <button onClick={stopStream} style={{background:"#ff2d55",border:"none",borderRadius:10,color:"#fff",fontWeight:800,padding:"11px 24px",fontSize:14,cursor:"pointer"}}>⏹ End Stream</button>
            <button onClick={async()=>{setEmailSending(true);try{const r=await fetch('/api/notify-live',{method:'POST'});const d=await r.json();setEmailSent(d.sent??d.total??0);}catch(e){}setEmailSending(false);}} disabled={emailSending} style={{background:emailSent!==null?'rgba(0,255,135,.15)':'rgba(255,255,255,.08)',border:'1px solid rgba(0,255,135,.3)',borderRadius:10,color:emailSent!==null?'#00ff87':'#fff',fontWeight:800,padding:'11px 24px',fontSize:14,cursor:'pointer',width:'100%',marginTop:8}}>{emailSending?'Sending...':emailSent!==null?'\u2705 Sent to '+emailSent+' people':'\uD83D\uDCE7 Notify Email List'}</button>
            }
            <button onClick={toggleCam} disabled={!live} style={{background:camOn?"rgba(0,255,135,.15)":"rgba(255,255,255,.06)",border:camOn?"1px solid rgba(0,255,135,.4)":"1px solid rgba(255,255,255,.1)",borderRadius:10,color:camOn?"#00ff87":"rgba(255,255,255,.7)",padding:"10px 18px",cursor:live?"pointer":"not-allowed",opacity:live?1:.4,fontWeight:700,fontSize:14}}>
              {camOn?"📸 Cam ON":"📷 Cam OFF"}
            </button>
            <button onClick={toggleMic} disabled={!live} style={{background:micOn?"rgba(0,255,135,.15)":"rgba(255,45,85,.15)",border:micOn?"1px solid rgba(0,255,135,.4)":"1px solid rgba(255,45,85,.4)",borderRadius:10,color:micOn?"#00ff87":"#ff2d55",padding:"10px 18px",cursor:live?"pointer":"not-allowed",opacity:live?1:.4,fontWeight:700,fontSize:14}}>
              {micOn?"🎤 Mic ON":"🔇 Mic OFF"}
            </button>
              <a href="/leads" target="_blank" style={{padding:"10px 18px",background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.4)",borderRadius:8,color:"#22c55e",fontWeight:800,fontSize:13,textDecoration:"none",letterSpacing:".05em",display:"inline-flex",alignItems:"center",gap:6}}>📋 LEADS ↗</a>
              <button onClick={notifySubscribers} disabled={notifying} style={{background:"rgba(251,191,36,.1)",border:"1px solid rgba(251,191,36,.4)",borderRadius:8,color:"#fbbf24",fontWeight:800,padding:"10px 18px",fontSize:13,cursor:notifying?"not-allowed":"pointer",opacity:notifying?0.6:1,letterSpacing:".05em"}}>🔔 {notifying?"SENDING...":"NOTIFY SUBSCRIBERS"}</button>
              {notifyStatus && <span style={{color:notifyStatus.startsWith("✅")?"#22c55e":"#ff4444",fontSize:13,fontWeight:600}}>{notifyStatus}</span>}
              <button onClick={()=>setShowPreview(p=>!p)} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,color:"rgba(255,255,255,.6)",fontWeight:600,padding:"10px 14px",fontSize:12,cursor:"pointer",letterSpacing:".05em"}}>{showPreview?"🙈 Hide Preview":"👁 Preview Email"}</button>
              {showPreview && (
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={()=>setShowPreview(false)}>
                  <div style={{background:"#0a0a0a",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,padding:0,maxWidth:580,width:"100%",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
                    <div style={{padding:"16px 24px",borderBottom:"1px solid rgba(255,255,255,.08)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{color:"#fff",fontWeight:700,fontSize:14}}>📧 Email Preview</span>
                      <button onClick={()=>setShowPreview(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,.4)",fontSize:18,cursor:"pointer",lineHeight:1}}>✕</button>
                    </div>
                    <div style={{padding:"8px 24px 12px",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
                      <p style={{color:"rgba(255,255,255,.4)",fontSize:11,margin:"4px 0"}}>From: <span style={{color:"rgba(255,255,255,.6)"}}>The Greenprint &lt;noreply@thegreenprint.trade&gt;</span></p>
                      <p style={{color:"rgba(255,255,255,.4)",fontSize:11,margin:"4px 0"}}>Subject: <span style={{color:"rgba(255,255,255,.6)"}}>🟢 The Greenprint is LIVE — Free Day Trading Class</span></p>
                      <p style={{color:"rgba(255,255,255,.4)",fontSize:11,margin:"4px 0"}}>To: <span style={{color:"rgba(255,255,255,.6)"}}>All subscribers (~890 people)</span></p>
                    </div>
                    <div style={{padding:24}}>
                      <div style={{background:"#111",borderRadius:12,padding:"28px 24px",fontFamily:"-apple-system,sans-serif"}}>
                        <div style={{textAlign:"center",marginBottom:24}}>
                          <div style={{display:"inline-block",padding:"6px 16px",background:"rgba(34,197,94,.15)",border:"1px solid rgba(34,197,94,.4)",borderRadius:20,marginBottom:16}}>
                            <span style={{color:"#22c55e",fontSize:12,fontWeight:700,letterSpacing:2}}>🟢 LIVE NOW</span>
                          </div>
                          <h2 style={{color:"#fff",margin:"0 0 6px",fontSize:22,fontWeight:900}}>The Greenprint is Live</h2>
                          <p style={{color:"rgba(255,255,255,.5)",fontSize:13,margin:0}}>Free Day Trading Class — happening right now</p>
                        </div>
                        <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:12,padding:20,marginBottom:20}}>
                          <p style={{margin:"0 0 10px",fontSize:13,lineHeight:1.6,color:"rgba(255,255,255,.8)"}}>Your free day trading class is live right now. Come watch live trades, scanner alerts, and real-time market analysis with The Greenprint.</p>
                          <p style={{margin:0,fontSize:12,color:"rgba(255,255,255,.35)"}}>No cost. No catch. Just value.</p>
                        </div>
                        <div style={{textAlign:"center",marginBottom:20}}>
                          <span style={{display:"inline-block",padding:"14px 36px",background:"linear-gradient(135deg,#15803d,#22c55e)",borderRadius:10,color:"#000",fontWeight:900,fontSize:14,letterSpacing:.5}}>JOIN THE CLASS →</span>
                        </div>
                        <p style={{textAlign:"center",fontSize:10,color:"rgba(255,255,255,.2)",margin:0}}>The Greenprint · thegreenprint.trade</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
              {EMOJIS.map(e=>(
                <button key={e} onClick={()=>sendReaction(e)} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,padding:"7px 10px",cursor:"pointer",fontSize:18}}>{e}</button>
              ))}
            </div>
            {status && <span style={{fontSize:13,color:status.startsWith("Error")||status.startsWith("Cam")?"#ff4444":"#00ff87"}}>{status}</span>}
          </div>
        </div>

        <div className="cc" style={{borderLeft:"1px solid rgba(255,255,255,.06)",display:"flex",flexDirection:"column",background:"rgba(0,0,0,.4)",backdropFilter:"blur(20px)"}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,.06)",fontWeight:700,fontSize:13}}>💬 Live Chat</div>
          <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
            {chat.length===0&&<div style={{textAlign:"center",padding:"48px 0"}}><div style={{fontSize:36,marginBottom:10}}>💬</div><p style={{color:"rgba(255,255,255,.25)",fontSize:13,margin:0}}>No messages yet</p></div>}
            {chat.map((m,i)=>(
              <div key={i} style={{marginBottom:10,lineHeight:1.5}}>
                <span style={{color:m.name==="Host"?"#ff9900":nc(m.name),fontWeight:700,fontSize:13}}>{m.name}</span>
                <span style={{color:"rgba(255,255,255,.85)",fontSize:13}}> {m.msg}</span>
              </div>
            ))}
            <div ref={chatEndRef}/>
          </div>
          <div style={{padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,.06)",display:"flex",gap:8}}>
            <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Message as Host..."
              style={{flex:1,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#fff",padding:"10px 13px",fontSize:13,outline:"none",boxSizing:"border-box"}} />
            <button onClick={sendChat} style={{background:"#00ff87",border:"none",borderRadius:10,color:"#000",fontWeight:800,padding:"10px 14px",cursor:"pointer"}}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
