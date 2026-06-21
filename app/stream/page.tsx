"use client";
import { useState, useEffect, useRef } from "react";

const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
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
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
interface M{id?:string;name:string;text:string;ts:number;}

export default function StreamPage(){
  const[name,setName]=useState("");
  const[joined,setJoined]=useState(false);
  const[isLive,setIsLive]=useState(false);
  const[status,setStatus]=useState("Checking stream...");
  const[playing,setPlaying]=useState(false);
  const[chat,setChat]=useState<M[]>([]);
  const[txt,setTxt]=useState("");
  const vid=useRef<HTMLVideoElement>(null);
  const pcRef=useRef<RTCPeerConnection|null>(null);
  const myId=useRef(uid());
  const nameRef=useRef("");
  const isLiveRef=useRef(false);
  const keepRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const tail=useRef<HTMLDivElement>(null);

  // Track live status immediately on mount
  useEffect(()=>{
    let es:EventSource|null=null;
    (async()=>{
      const d=await get("livestatus");
      const live=!!d?.live;
      setIsLive(live);isLiveRef.current=live;
      setStatus(live?"Stream is live — enter your name":"Stream is offline");
    })();
    es=new EventSource(`${FB}/livestatus.json`);
    es.addEventListener("put",(e:MessageEvent)=>{
      const d=JSON.parse(e.data);
      const live=!!d?.data?.live;
      setIsLive(live);isLiveRef.current=live;
      setStatus(live?"Stream is live — enter your name":"Stream is offline");
      if(!live){cleanup();}
    });
    return()=>{es?.close();};
  },[]);

  // Chat SSE
  useEffect(()=>{
    const es=new EventSource(`${FB}/live/chat.json`);
    es.addEventListener("put",(e:MessageEvent)=>{
      const d=JSON.parse(e.data);if(!d.data){setChat([]);return;}
      const m:M[]=Object.entries(d.data).map(([id,v])=>({id,...v as any}));
      setChat(m.sort((a,b)=>a.ts-b.ts));
    });
    es.addEventListener("patch",(e:MessageEvent)=>{
      const d=JSON.parse(e.data);if(!d.data)return;
      const inc:M[]=Object.entries(d.data).map(([id,v])=>({id,...v as any}));
      setChat(p=>{const m=new Map(p.map(x=>[x.id,x]));inc.forEach(x=>x.id&&m.set(x.id,x));return[...m.values()].sort((a,b)=>a.ts-b.ts);});
    });
    return()=>es.close();
  },[]);

  useEffect(()=>{tail.current?.scrollIntoView({behavior:"smooth"});},[chat]);

  // Join stream when name set and live
  useEffect(()=>{
    if(joined&&isLive)joinStream();
  },[joined,isLive]);

  function cleanup(){
    if(keepRef.current){clearInterval(keepRef.current);keepRef.current=null;}
    if(pcRef.current){pcRef.current.close();pcRef.current=null;}
    del("live/viewers/"+myId.current).catch(()=>{});
    setPlaying(false);
    if(vid.current)vid.current.srcObject=null;
  }

  async function joinStream(){
    cleanup();
    const id=myId.current;
    // Register as viewer
    await put("live/viewers/"+id,{name:nameRef.current,ts:Date.now()});
    // Keep-alive every 10s
    keepRef.current=setInterval(()=>{
      if(isLiveRef.current)put("live/viewers/"+id,{name:nameRef.current,ts:Date.now()});
    },10000);
    const pc=new RTCPeerConnection({iceServers:ICE});
    pcRef.current=pc;
    const pendingIce:RTCIceCandidateInit[]=[];
    let hasRemote=false;
    pc.ontrack=(e)=>{
      const s=e.streams[0]||new MediaStream([e.track]);
      if(vid.current){
        vid.current.srcObject=s;
        vid.current.muted=true;
        vid.current.play().then(()=>{vid.current!.muted=false;setPlaying(true);}).catch(()=>setPlaying(true));
      }
    };
    pc.onicecandidate=e=>{if(e.candidate)push("live/ice_v/"+id,e.candidate.toJSON());};
    pc.onconnectionstatechange=()=>{
      if((pc.connectionState==="failed"||pc.connectionState==="disconnected")&&isLiveRef.current){
        setTimeout(()=>joinStream(),3000);
      }
    };
    // ICE from broadcaster via SSE
    const iceKeys=new Set<string>();
    const iceEs=new EventSource(`${FB}/live/ice_b/${id}.json`);
    const handleIce=(data:Record<string,any>)=>{
      Object.entries(data).forEach(([k,c])=>{
        if(!iceKeys.has(k)){
          iceKeys.add(k);
          const cand=new RTCIceCandidate(c as RTCIceCandidateInit);
          if(hasRemote)pc.addIceCandidate(cand).catch(()=>{});
          else pendingIce.push(c as RTCIceCandidateInit);
        }
      });
    };
    iceEs.addEventListener("put",(e:MessageEvent)=>{const d=JSON.parse(e.data);if(d.data)handleIce(d.data);});
    iceEs.addEventListener("patch",(e:MessageEvent)=>{const d=JSON.parse(e.data);if(d.data)handleIce(d.data);});
    // Offer via SSE + 1s poll fallback
    let offerHandled=false;
    const offerEs=new EventSource(`${FB}/live/offers/${id}.json`);
    const handleOffer=async(offer:{type:RTCSdpType;sdp:string})=>{
      if(offerHandled||!offer?.sdp)return;
      offerHandled=true;offerEs.close();
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      hasRemote=true;
      for(const c of pendingIce)pc.addIceCandidate(new RTCIceCandidate(c)).catch(()=>{});
      pendingIce.length=0;
      const ans=await pc.createAnswer();
      await pc.setLocalDescription(ans);
      await put("live/answers/"+id,{type:ans.type,sdp:ans.sdp});
    };
    offerEs.addEventListener("put",async(e:MessageEvent)=>{const d=JSON.parse(e.data);if(d.data?.sdp)await handleOffer(d.data);});
    const poll=setInterval(async()=>{
      if(offerHandled){clearInterval(poll);return;}
      const d=await get("live/offers/"+id);
      if(d?.sdp){clearInterval(poll);await handleOffer(d);}
    },1000);
    setTimeout(()=>clearInterval(poll),30000);
  }

  function enterName(){
    const n=name.trim();
    if(!n)return;
    nameRef.current=n;
    setJoined(true);
  }

  async function say(){
    if(!txt.trim()||!nameRef.current)return;
    await push("live/chat",{name:nameRef.current,text:txt.trim(),ts:Date.now()});
    setTxt("");
  }

  if(!joined){
    return(
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            {isLive&&<span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block"/>}
            <span className={isLive?"text-white font-bold text-xl":"text-zinc-400 text-xl"}>{isLive?"LIVE":"Offline"}</span>
          </div>
          <p className="text-zinc-500 text-sm">{status}</p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <input
            value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&enterName()}
            className="w-full bg-zinc-900 text-white rounded-xl px-4 py-3 outline-none border border-zinc-800"
            placeholder="Enter your name to watch"
          />
          <button
            onClick={enterName}
            disabled={!isLive}
            className={isLive?"w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl":"w-full bg-zinc-800 text-zinc-600 font-bold py-3 rounded-xl cursor-not-allowed"}
          >
            {isLive?"Watch Live":"Stream Offline"}
          </button>
        </div>
      </div>
    );
  }

  return(
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block"/>
          <span className="font-bold">LIVE</span>
        </div>
        <span className="text-zinc-400 text-sm">Watching as {nameRef.current}</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1">
          <div className="relative bg-black flex-1" style={{minHeight:"60vh"}}>
            <video ref={vid} className="w-full h-full object-contain" autoPlay playsInline/>
            {!playing&&(
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500">
                <div className="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin"/>
                <span className="text-sm">Connecting...</span>
              </div>
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
          <div className="p-3 border-t border-zinc-800 flex gap-2">
            <input value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&say()}
              className="flex-1 bg-zinc-800 text-white rounded-xl px-3 py-2 text-sm outline-none" placeholder="Send a message..."/>
            <button onClick={say} className="bg-green-500 hover:bg-green-400 text-black font-bold px-3 py-2 rounded-xl text-sm">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
