"use client";
import { useState, useEffect, useRef } from "react";

const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const HASH = "f7bbb300691e55f6eaad18327a462a30ff3bf38a4a36a24e9458fdfc508d4ab1";
const ICE = [
  {urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"},
  {urls:"turn:global.relay.metered.ca:80",username:"93c505beb914bb4b2330bc55",credential:"nMvZib7+ScgCeG8t"},
  {urls:"turn:global.relay.metered.ca:80?transport=tcp",username:"93c505beb914bb4b2330bc55",credential:"nMvZib7+ScgCeG8t"},
  {urls:"turn:global.relay.metered.ca:443",username:"93c505beb914bb4b2330bc55",credential:"nMvZib7+ScgCeG8t"},
  {urls:"turns:global.relay.metered.ca:443?transport=tcp",username:"93c505beb914bb4b2330bc55",credential:"nMvZib7+ScgCeG8t"},
];
const put = async(p:string,d:any)=>fetch(`${FB}/${p}.json`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(d),keepalive:true}).catch(()=>{});
const get = async(p:string)=>{try{const r=await fetch(`${FB}/${p}.json`,{cache:"no-store"});return r.json();}catch{return null;}};
const del = async(p:string)=>fetch(`${FB}/${p}.json`,{method:"DELETE",keepalive:true}).catch(()=>{});
const push = async(p:string,d:any)=>fetch(`${FB}/${p}.json`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}).catch(()=>{});
const sha = async(s:string)=>{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");};
interface M{id?:string;name:string;text:string;ts:number;}

export default function GoLive(){
  const[pw,setPw]=useState("");
  const[ok,setOk]=useState(false);
  const[err,setErr]=useState("");
  const[on,setOn]=useState(false);
  const[sharing,setSharing]=useState(false);
  const[vc,setVc]=useState(0);
  const[chat,setChat]=useState<M[]>([]);
  const[txt,setTxt]=useState("");
  const vid=useRef<HTMLVideoElement>(null);
  const pip=useRef<HTMLVideoElement>(null);
  const scr=useRef<MediaStream|null>(null);
  const cam=useRef<MediaStream|null>(null);
  const live=useRef(false);
  const pcs=useRef<Record<string,RTCPeerConnection>>({});
  const answered=useRef<Record<string,boolean>>({});
  const iceKeys=useRef<Record<string,Set<string>>>({});
  const tail=useRef<HTMLDivElement>(null);
  useEffect(()=>{tail.current?.scrollIntoView({behavior:"smooth"});},[chat]);

  async function login(){
    if(await sha(pw)===HASH)setOk(true);else setErr("Wrong password");
  }

  async function share(){
    try{
      const s=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:true});
      scr.current=s;
      if(vid.current){vid.current.srcObject=s;vid.current.play();}
      setSharing(true);
      s.getVideoTracks()[0].onended=()=>{setSharing(false);scr.current=null;};
      try{
        const c=await navigator.mediaDevices.getUserMedia({video:{width:320,height:240},audio:false});
        cam.current=c;
        if(pip.current){pip.current.srcObject=c;pip.current.play();}
      }catch{}
    }catch(e){alert("Share error: "+(e as Error).message);}
  }

  async function goLive(){
    if(!scr.current)return alert("Click Share Screen first");
    live.current=true;setOn(true);
    await del("live");
    await put("livestatus",{live:true,ts:Date.now()});
    const es=new EventSource(`${FB}/live/viewers.json`);
    const seen=new Set<string>();
    const handle=(data:Record<string,any>)=>{
      const ids=Object.keys(data);
      setVc(ids.length);
      ids.forEach(id=>{if(!seen.has(id)){seen.add(id);dial(id);}});
    };
    es.addEventListener("put",(e:MessageEvent)=>{const d=JSON.parse(e.data);if(d.data)handle(d.data);});
    es.addEventListener("patch",(e:MessageEvent)=>{const d=JSON.parse(e.data);if(d.data)handle(d.data);});
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
  }

  async function dial(id:string){
    if(!scr.current||!live.current)return;
    const pc=new RTCPeerConnection({iceServers:ICE});
    pcs.current[id]=pc;answered.current[id]=false;iceKeys.current[id]=new Set();
    scr.current.getTracks().forEach(t=>pc.addTrack(t,scr.current!));
    pc.onicecandidate=e=>{if(e.candidate)push("live/ice_b/"+id,e.candidate.toJSON());};
    const offer=await pc.createOffer();
    await pc.setLocalDescription(offer);
    await put("live/offers/"+id,{type:offer.type,sdp:offer.sdp});
    const ansEs=new EventSource(`${FB}/live/answers/${id}.json`);
    ansEs.addEventListener("put",async(e:MessageEvent)=>{
      const d=JSON.parse(e.data);
      if(!d.data?.sdp||answered.current[id])return;
      answered.current[id]=true;ansEs.close();
      await pc.setRemoteDescription(new RTCSessionDescription(d.data)).catch(()=>{});
    });
    const iceEs=new EventSource(`${FB}/live/ice_v/${id}.json`);
    iceEs.addEventListener("put",(e:MessageEvent)=>{
      const d=JSON.parse(e.data);if(!d.data)return;
      Object.entries(d.data).forEach(([k,c])=>{
        if(!iceKeys.current[id]?.has(k)){iceKeys.current[id]?.add(k);pc.addIceCandidate(new RTCIceCandidate(c as RTCIceCandidateInit)).catch(()=>{});}
      });
    });
    iceEs.addEventListener("patch",(e:MessageEvent)=>{
      const d=JSON.parse(e.data);if(!d.data)return;
      Object.entries(d.data).forEach(([k,c])=>{
        if(!iceKeys.current[id]?.has(k)){iceKeys.current[id]?.add(k);pc.addIceCandidate(new RTCIceCandidate(c as RTCIceCandidateInit)).catch(()=>{});}
      });
    });
    pc.onconnectionstatechange=()=>{
      if((pc.connectionState==="failed"||pc.connectionState==="closed")&&live.current){
        ansEs.close();iceEs.close();delete pcs.current[id];
        setTimeout(()=>dial(id),2000);
      }
    };
  }

  async function say(){
    if(!txt.trim())return;
    await push("live/chat",{name:"Streamer",text:txt.trim(),ts:Date.now()});
    setTxt("");
  }

  async function end(){
    live.current=false;setOn(false);setSharing(false);setVc(0);setChat([]);
    Object.values(pcs.current).forEach(p=>p.close());pcs.current={};
    scr.current?.getTracks().forEach(t=>t.stop());scr.current=null;
    cam.current?.getTracks().forEach(t=>t.stop());cam.current=null;
    if(vid.current)vid.current.srcObject=null;
    if(pip.current)pip.current.srcObject=null;
    await put("livestatus",{live:false,ts:Date.now()});
    await del("live");
  }

  if(!ok)return(
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-zinc-900 rounded-2xl p-8 w-full max-w-sm space-y-4">
        <h1 className="text-white text-2xl font-bold text-center">Stream Panel</h1>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
          className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none" placeholder="Password"/>
        {err&&<p className="text-red-400 text-center text-sm">{err}</p>}
        <button onClick={login} className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl">Enter</button>
      </div>
    </div>
  );

  return(
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          {on&&<span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block"/>}
          <span className="font-bold">{on?"LIVE":"Stream Panel"}</span>
        </div>
        <span className="text-zinc-400 text-sm">{vc} viewer{vc!==1?"s":""}</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 p-4 gap-3">
          <div className="relative bg-zinc-900 rounded-2xl overflow-hidden" style={{height:"60vh"}}>
            <video ref={vid} className="w-full h-full object-contain" autoPlay muted playsInline/>
            {!sharing&&<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500"><span className="text-5xl">🖥</span><span>Click Share Screen</span></div>}
            {sharing&&<video ref={pip} className="absolute bottom-3 right-3 w-32 h-24 rounded-xl object-cover border-2 border-zinc-700" autoPlay muted playsInline/>}
          </div>
          <div className="flex gap-3">
            {!sharing?(
              <button onClick={share} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 rounded-xl">Share Screen</button>
            ):!on?(
              <button onClick={goLive} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl">Go Live</button>
            ):(
              <button onClick={end} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-red-400 font-bold py-3 rounded-xl">End Stream</button>
            )}
          </div>
        </div>
        <div className="w-72 border-l border-zinc-800 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 text-sm font-semibold text-zinc-400">Live Chat</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {chat.length===0&&<p className="text-zinc-600 text-center pt-6">No messages yet</p>}
            {chat.map((m,i)=>(
              <div key={m.id||i}>
                <span className={m.name==="Streamer"?"text-green-400 font-bold":"text-zinc-300 font-semibold"}>{m.name}:</span>
                {" "}<span>{m.text}</span>
              </div>
            ))}
            <div ref={tail}/>
          </div>
          {on&&(
            <div className="p-3 border-t border-zinc-800 flex gap-2">
              <input value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&say()}
                className="flex-1 bg-zinc-800 text-white rounded-xl px-3 py-2 text-sm outline-none" placeholder="Chat as Streamer..."/>
              <button onClick={say} className="bg-green-500 hover:bg-green-400 text-black font-bold px-3 rounded-xl text-sm">Send</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
