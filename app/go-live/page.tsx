"use client";
import{useState,useEffect,useRef}from"react";
const FB="https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const HASH="f7bbb300691e55f6eaad18327a462a30ff3bf38a4a36a24e9458fdfc508d4ab1";
const ICE=[
  {urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"},
  {urls:"turn:global.relay.metered.ca:80",username:"93c505beb914bb4b2330bc55",credential:"nMvZib7+ScgCeG8t"},
  {urls:"turn:global.relay.metered.ca:80?transport=tcp",username:"93c505beb914bb4b2330bc55",credential:"nMvZib7+ScgCeG8t"},
  {urls:"turn:global.relay.metered.ca:443",username:"93c505beb914bb4b2330bc55",credential:"nMvZib7+ScgCeG8t"},
  {urls:"turns:global.relay.metered.ca:443?transport=tcp",username:"93c505beb914bb4b2330bc55",credential:"nMvZib7+ScgCeG8t"},
];
const sha=async(s:string)=>{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");};
const put=async(p:string,d:any)=>fetch(`${FB}/${p}.json`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(d),keepalive:true}).catch(()=>{});
const get=async(p:string)=>{try{const r=await fetch(`${FB}/${p}.json`,{cache:"no-store"});return r.json();}catch{return null;}};
const del=async(p:string)=>fetch(`${FB}/${p}.json`,{method:"DELETE",keepalive:true}).catch(()=>{});
const push=async(p:string,d:any)=>fetch(`${FB}/${p}.json`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}).catch(()=>{});
interface M{id?:string;name:string;text:string;ts:number}
export default function GoLive(){
  const[pw,setPw]=useState("");
  const[authed,setAuthed]=useState(false);
  const[pwErr,setPwErr]=useState("");
  const[live,setLive]=useState(false);
  const[sharing,setSharing]=useState(false);
  const[camOn,setCamOn]=useState(false);
  const[micOn,setMicOn]=useState(true);
  const[vc,setVc]=useState(0);
  const[chat,setChat]=useState<M[]>([]);
  const[chatMsg,setChatMsg]=useState("");
  const mainVid=useRef<HTMLVideoElement>(null);
  const pipVid=useRef<HTMLVideoElement>(null);
  const scrStream=useRef<MediaStream|null>(null);
  const camStream=useRef<MediaStream|null>(null);
  const liveRef=useRef(false);
  const pcs=useRef<Record<string,RTCPeerConnection>>({});
  const answered=useRef<Set<string>>(new Set());
  const seen=useRef<Set<string>>(new Set());
  const chatTail=useRef<HTMLDivElement>(null);
  useEffect(()=>{chatTail.current?.scrollIntoView({behavior:"smooth"});},[chat]);
  async function login(){if(await sha(pw)===HASH)setAuthed(true);else setPwErr("Wrong password");}
  async function startScreen(){
    try{
      const s=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:true});
      scrStream.current=s;
      if(mainVid.current){mainVid.current.srcObject=s;mainVid.current.play();}
      setSharing(true);
      s.getVideoTracks()[0].onended=()=>{if(!liveRef.current){setSharing(false);scrStream.current=null;}};
    }catch(e){alert("Screen share error: "+(e as Error).message);}
  }
  async function toggleCam(){
    if(camOn){
      camStream.current?.getTracks().forEach(t=>t.stop());
      camStream.current=null;
      if(pipVid.current)pipVid.current.srcObject=null;
      setCamOn(false);
    }else{
      try{
        const c=await navigator.mediaDevices.getUserMedia({video:{width:320,height:240,facingMode:"user"},audio:false});
        camStream.current=c;
        if(pipVid.current){pipVid.current.srcObject=c;pipVid.current.play();}
        setCamOn(true);
      }catch(e){alert("Camera error: "+(e as Error).message);}
    }
  }
  function toggleMic(){
    scrStream.current?.getAudioTracks().forEach(t=>{t.enabled=!micOn;});
    setMicOn(p=>!p);
  }
  async function goLive(){
    if(!scrStream.current)return alert("Share your screen first");
    liveRef.current=true;setLive(true);
    await del("live");
    await put("livestatus",{live:true,ts:Date.now()});
    const chatEs=new EventSource(`${FB}/live/chat.json`);
    chatEs.addEventListener("put",(e:MessageEvent)=>{
      const d=JSON.parse(e.data);if(!d.data){setChat([]);return;}
      const m:M[]=Object.entries(d.data).map(([id,v])=>({id,...v as any}));
      setChat(m.sort((a,b)=>a.ts-b.ts));
    });
    chatEs.addEventListener("patch",(e:MessageEvent)=>{
      const d=JSON.parse(e.data);if(!d.data)return;
      const inc:M[]=Object.entries(d.data).map(([id,v])=>({id,...v as any}));
      setChat(p=>{const m=new Map(p.map(x=>[x.id,x]));inc.forEach(x=>x.id&&m.set(x.id,x));return[...m.values()].sort((a,b)=>a.ts-b.ts);});
    });
    const viewPoll=setInterval(async()=>{
      if(!liveRef.current){clearInterval(viewPoll);return;}
      const v=await get("live/viewers");
      if(!v||typeof v!=="object"){setVc(0);return;}
      const ids=Object.keys(v);
      setVc(ids.length);
      ids.forEach(id=>{if(!seen.current.has(id)){seen.current.add(id);dial(id);}});
    },2000);
  }
  async function dial(id:string){
    if(!scrStream.current||!liveRef.current)return;
    const pc=new RTCPeerConnection({iceServers:ICE});
    pcs.current[id]=pc;
    scrStream.current.getTracks().forEach(t=>pc.addTrack(t,scrStream.current!));
    pc.onicecandidate=e=>{if(e.candidate)push("live/ice_b/"+id,e.candidate.toJSON());};
    const offer=await pc.createOffer();
    await pc.setLocalDescription(offer);
    await put("live/offers/"+id,{type:offer.type,sdp:offer.sdp});
    const ansPoll=setInterval(async()=>{
      if(answered.current.has(id)||!liveRef.current){clearInterval(ansPoll);return;}
      const ans=await get("live/answers/"+id);
      if(ans?.sdp){answered.current.add(id);clearInterval(ansPoll);pc.setRemoteDescription(new RTCSessionDescription(ans)).catch(()=>{});}
    },500);
    const seenIce=new Set<string>();
    const iceEs=new EventSource(`${FB}/live/ice_v/${id}.json`);
    const addIce=(data:any)=>{
      if(!data||typeof data!=="object")return;
      Object.entries(data).forEach(([k,c])=>{
        if(!seenIce.has(k)){seenIce.add(k);pc.addIceCandidate(new RTCIceCandidate(c as RTCIceCandidateInit)).catch(()=>{});}
      });
    };
    iceEs.addEventListener("put",(e:MessageEvent)=>{const d=JSON.parse(e.data);addIce(d.data);});
    iceEs.addEventListener("patch",(e:MessageEvent)=>{const d=JSON.parse(e.data);addIce(d.data);});
    pc.onconnectionstatechange=()=>{
      if((pc.connectionState==="failed"||pc.connectionState==="closed")&&liveRef.current){
        iceEs.close();clearInterval(ansPoll);delete pcs.current[id];answered.current.delete(id);
        setTimeout(()=>{if(liveRef.current&&seen.current.has(id))dial(id);},3000);
      }
    };
  }
  async function sendChat(){
    if(!chatMsg.trim())return;
    await push("live/chat",{name:"Streamer",text:chatMsg.trim(),ts:Date.now()});
    setChatMsg("");
  }
  async function endLive(){
    liveRef.current=false;setLive(false);setSharing(false);setCamOn(false);
    setVc(0);setChat([]);seen.current.clear();answered.current.clear();
    Object.values(pcs.current).forEach(p=>p.close());pcs.current={};
    scrStream.current?.getTracks().forEach(t=>t.stop());scrStream.current=null;
    camStream.current?.getTracks().forEach(t=>t.stop());camStream.current=null;
    if(mainVid.current)mainVid.current.srcObject=null;
    if(pipVid.current)pipVid.current.srcObject=null;
    await put("livestatus",{live:false,ts:Date.now()});
    await del("live");
  }
  if(!authed)return(
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-sm space-y-4">
        <h1 className="text-white text-2xl font-bold text-center">Streamer Login</h1>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
          className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none" placeholder="Password"/>
        {pwErr&&<p className="text-red-400 text-sm text-center">{pwErr}</p>}
        <button onClick={login} className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl">Enter</button>
      </div>
    </div>
  );
  return(
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {live&&<span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block"/>}
          <span className="font-bold text-lg">{live?"LIVE":"Stream Panel"}</span>
          {live&&<span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full">{vc} {vc===1?"viewer":"viewers"}</span>}
        </div>
        {live&&<button onClick={endLive} className="bg-zinc-800 hover:bg-red-900 text-red-400 font-bold px-4 py-2 rounded-xl text-sm">End Stream</button>}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 p-4 gap-3">
          <div className="relative bg-zinc-950 rounded-2xl overflow-hidden" style={{height:"55vh"}}>
            <video ref={mainVid} className="w-full h-full object-contain" autoPlay muted playsInline/>
            {!sharing&&<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-zinc-600"><span className="text-6xl">🖥</span><span className="text-lg">Share your screen to start</span></div>}
            {camOn&&<div className="absolute bottom-3 right-3 w-36 h-28 rounded-xl overflow-hidden border-2 border-zinc-600 bg-zinc-900"><video ref={pipVid} className="w-full h-full object-cover" autoPlay muted playsInline/></div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {!sharing?(
              <button onClick={startScreen} className="col-span-2 bg-zinc-700 hover:bg-zinc-600 font-bold py-3 rounded-xl">🖥 Share Screen</button>
            ):!live?(
              <>
                <button onClick={goLive} className="col-span-2 bg-red-600 hover:bg-red-500 font-bold py-3 rounded-xl text-lg">● Go Live</button>
                <button onClick={toggleCam} className={`font-bold py-3 rounded-xl text-sm ${camOn?"bg-green-600 hover:bg-green-500":"bg-zinc-700 hover:bg-zinc-600"}`}>{camOn?"📷 Cam ON":"📷 Cam OFF"}</button>
                <button onClick={toggleMic} className={`font-bold py-3 rounded-xl text-sm ${micOn?"bg-green-600 hover:bg-green-500":"bg-zinc-700 hover:bg-zinc-600"}`}>{micOn?"🎤 Mic ON":"🎤 Mic OFF"}</button>
              </>
            ):(
              <>
                <button onClick={toggleCam} className={`font-bold py-3 rounded-xl text-sm ${camOn?"bg-green-600 hover:bg-green-500":"bg-zinc-700 hover:bg-zinc-600"}`}>{camOn?"📷 Cam ON":"📷 Cam OFF"}</button>
                <button onClick={toggleMic} className={`font-bold py-3 rounded-xl text-sm ${micOn?"bg-green-600 hover:bg-green-500":"bg-zinc-700 hover:bg-zinc-600"}`}>{micOn?"🎤 Mic ON":"🎤 Mic OFF"}</button>
              </>
            )}
          </div>
        </div>
        <div className="w-72 border-l border-zinc-800 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 font-semibold text-zinc-400 text-sm">Live Chat</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {chat.length===0&&<p className="text-zinc-600 text-center pt-8">No messages yet</p>}
            {chat.map((m,i)=>(
              <div key={m.id||i} className="leading-tight">
                <span className={`font-bold ${m.name==="Streamer"?"text-green-400":"text-blue-400"}`}>{m.name}</span>
                <span className="text-zinc-400">: </span>
                <span className="text-white">{m.text}</span>
              </div>
            ))}
            <div ref={chatTail}/>
          </div>
          <div className="p-3 border-t border-zinc-800 flex gap-2">
            <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()}
              className="flex-1 bg-zinc-800 text-white rounded-xl px-3 py-2 text-sm outline-none" placeholder="Chat as Streamer..."/>
            <button onClick={sendChat} className="bg-green-500 hover:bg-green-400 text-black font-bold px-3 rounded-xl text-sm">→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
