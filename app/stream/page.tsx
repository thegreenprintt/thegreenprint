"use client";
import{useState,useEffect,useRef}from"react";
const FB="https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const ICE=[
  {urls:"stun:stun.l.google.com:19302"},
  {urls:"stun:stun1.l.google.com:19302"},
  {urls:"stun:stun2.l.google.com:19302"},
  {urls:"stun:stun3.l.google.com:19302"},
  {urls:"turn:openrelay.metered.ca:80",username:"openrelayproject",credential:"openrelayproject"},
  {urls:"turn:openrelay.metered.ca:443",username:"openrelayproject",credential:"openrelayproject"},
  {urls:"turn:openrelay.metered.ca:80?transport=tcp",username:"openrelayproject",credential:"openrelayproject"},
  {urls:"turns:openrelay.metered.ca:443",username:"openrelayproject",credential:"openrelayproject"},
];
const PC={iceServers:ICE,iceCandidatePoolSize:10,bundlePolicy:"max-bundle" as RTCBundlePolicy};
const put=async(p:string,d:any)=>{try{await fetch(`${FB}/${p}.json`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(d),keepalive:true});}catch{}};
const get=async(p:string)=>{try{return await(await fetch(`${FB}/${p}.json`,{cache:"no-store"})).json();}catch{return null;}};
const del=async(p:string)=>{try{await fetch(`${FB}/${p}.json`,{method:"DELETE",keepalive:true});}catch{}};
const push=async(p:string,d:any)=>{try{await fetch(`${FB}/${p}.json`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});}catch{}};
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
interface M{id?:string;name:string;text:string;ts:number}

export default function StreamPage(){
  const[name,setName]=useState("");
  const[joined,setJoined]=useState(false);
  const[isLive,setIsLive]=useState(false);
  const[playing,setPlaying]=useState(false);
  const[step,setStep]=useState("Checking...");
  const[chat,setChat]=useState<M[]>([]);
  const[chatMsg,setChatMsg]=useState("");
  const vidRef=useRef<HTMLVideoElement>(null);
  const pcRef=useRef<RTCPeerConnection|null>(null);
  const myId=useRef(uid());
  const nameRef=useRef("");
  const isLiveRef=useRef(false);
  const keepRef=useRef<any>(null);
  const offerRef=useRef<any>(null);
  const chatTail=useRef<HTMLDivElement>(null);
  useEffect(()=>{chatTail.current?.scrollIntoView({behavior:"smooth"});},[chat]);
  // Poll live status every 3s
  useEffect(()=>{
    const check=async()=>{
      const d=await get("livestatus");
      const live=!!d?.live;
      setIsLive(live);isLiveRef.current=live;
      if(!live&&joined)setStep("Stream ended");
    };
    check();
    const p=setInterval(check,3000);
    return()=>clearInterval(p);
  },[joined]);
  // Chat SSE
  useEffect(()=>{
    const es=new EventSource(`${FB}/live/chat.json`);
    es.addEventListener("put",(e:MessageEvent)=>{const d=JSON.parse(e.data);if(!d.data){setChat([]);return;}setChat(Object.entries(d.data).map(([id,v])=>({id,...v as any})).sort((a:any,b:any)=>a.ts-b.ts));});
    es.addEventListener("patch",(e:MessageEvent)=>{const d=JSON.parse(e.data);if(!d.data)return;const inc=Object.entries(d.data).map(([id,v])=>({id,...v as any}));setChat(p=>{const m=new Map(p.map((x:any)=>[x.id,x]));(inc as any[]).forEach((x:any)=>x.id&&m.set(x.id,x));return[...m.values()].sort((a:any,b:any)=>a.ts-b.ts);});});
    return()=>es.close();
  },[]);
  useEffect(()=>{if(joined&&isLive)joinStream();},[joined,isLive]);
  function cleanup(){
    if(keepRef.current){clearInterval(keepRef.current);keepRef.current=null;}
    if(offerRef.current){clearInterval(offerRef.current);offerRef.current=null;}
    if(pcRef.current){pcRef.current.close();pcRef.current=null;}
    del("live/viewers/"+myId.current);
  }
  async function joinStream(){
    cleanup();setPlaying(false);
    const id=myId.current;
    setStep("Registering as viewer...");
    await put("live/viewers/"+id,{name:nameRef.current,ts:Date.now()});
    setStep("Waiting for broadcaster...");
    // Keep registration fresh
    keepRef.current=setInterval(()=>{if(isLiveRef.current)put("live/viewers/"+id,{name:nameRef.current,ts:Date.now()});},8000);
    const pc=new RTCPeerConnection(PC);
    pcRef.current=pc;
    const pending:RTCIceCandidateInit[]=[];
    let remoteSet=false;
    let offerHandled=false;
    pc.ontrack=(e)=>{
      const s=e.streams[0]||new MediaStream([e.track]);
      if(vidRef.current){vidRef.current.srcObject=s;vidRef.current.muted=true;vidRef.current.play().then(()=>{if(vidRef.current)vidRef.current.muted=false;setPlaying(true);setStep("Live!");}).catch(()=>setPlaying(true));}
    };
    pc.onicecandidate=e=>{if(e.candidate)push("live/ice_v/"+id,e.candidate.toJSON());};
    pc.onconnectionstatechange=()=>{
      const st=pc.connectionState;
      if(st==="connected"){setStep("Connected!");setPlaying(true);}
      if(st==="connecting")setStep("ICE connecting...");
      if((st==="failed"||st==="disconnected")&&isLiveRef.current){setStep("Lost connection, reconnecting...");setPlaying(false);setTimeout(()=>{if(isLiveRef.current)joinStream();},3000);}
    };
    const handleOffer=async(offer:any)=>{
      if(offerHandled||!offer?.sdp)return;
      offerHandled=true;
      if(offerRef.current){clearInterval(offerRef.current);offerRef.current=null;}
      setStep("Got offer — creating answer...");
      try{
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        remoteSet=true;
        for(const c of pending)pc.addIceCandidate(new RTCIceCandidate(c)).catch(()=>{});
        pending.length=0;
        const ans=await pc.createAnswer();
        await pc.setLocalDescription(ans);
        await put("live/answers/"+id,{type:ans.type,sdp:ans.sdp});
        setStep("Answer sent — connecting...");
      }catch{offerHandled=false;setStep("Offer error, retrying...");}
    };
    // Poll for offer every 500ms — no timeout
    offerRef.current=setInterval(async()=>{
      if(offerHandled||!isLiveRef.current)return;
      const d=await get("live/offers/"+id);
      if(d?.sdp)await handleOffer(d);
    },500);
    // Auto-retry: if no offer after 20s, re-register (broadcaster may have missed us)
    const retry=setTimeout(()=>{
      if(!offerHandled&&isLiveRef.current){setStep("No response — re-registering...");joinStream();}
    },20000);
    // Poll broadcaster ICE every 500ms
    const knownIce=new Set<string>();
    const iceP=setInterval(async()=>{
      if(!isLiveRef.current){clearInterval(iceP);return;}
      const ice=await get("live/ice_b/"+id);
      if(ice&&typeof ice==="object"){
        Object.entries(ice).forEach(([k,c])=>{
          if(!knownIce.has(k)){knownIce.add(k);
            const cand=new RTCIceCandidate(c as RTCIceCandidateInit);
            if(remoteSet)pc.addIceCandidate(cand).catch(()=>{});else pending.push(c as RTCIceCandidateInit);
          }
        });
      }
    },500);
    // Clear retry + iceP on cleanup
    const origCleanup=cleanup;
    (pcRef as any)._cleanup=()=>{clearTimeout(retry);clearInterval(iceP);origCleanup();};
  }
  function enterName(){const n=name.trim();if(!n||!isLive)return;nameRef.current=n;setJoined(true);}
  async function sendMsg(){if(!chatMsg.trim())return;await push("live/chat",{name:nameRef.current,text:chatMsg.trim(),ts:Date.now()});setChatMsg("");}
  if(!joined)return(
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        {isLive?(<div className="flex items-center justify-center gap-2 mb-2"><span className="w-3 h-3 rounded-full bg-red-500 animate-pulse inline-block"/><span className="text-white text-3xl font-bold">LIVE</span></div>)
        :(<p className="text-zinc-500 text-xl mb-2">Stream Offline</p>)}
        <p className="text-zinc-600 text-sm">{isLive?"Enter your name to watch":"Check back when the stream starts"}</p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&enterName()}
          className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-xl px-4 py-3 outline-none" placeholder="Your name"/>
        <button onClick={enterName} disabled={!isLive||!name.trim()}
          className={`w-full font-bold py-3 rounded-xl ${isLive&&name.trim()?"bg-green-500 hover:bg-green-400 text-black":"bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
          {isLive?"Watch Live →":"Stream Offline"}
        </button>
      </div>
    </div>
  );
  return(
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block"/><span className="font-bold">LIVE</span></div>
        <span className="text-zinc-400 text-sm">{nameRef.current}</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1">
          <div className="relative bg-black flex-1" style={{minHeight:"60vh"}}>
            <video ref={vidRef} className="w-full h-full object-contain" autoPlay playsInline/>
            {!playing&&(<div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin"/>
              <span className="text-zinc-400 text-sm">{step}</span>
            </div>)}
          </div>
        </div>
        <div className="w-72 border-l border-zinc-800 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 font-semibold text-zinc-400 text-sm">Live Chat</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {chat.length===0&&<p className="text-zinc-600 text-center pt-8">No messages yet</p>}
            {chat.map((m,i)=>(<div key={m.id||i} className="leading-tight"><span className={`font-bold ${m.name==="Streamer"?"text-green-400":"text-blue-400"}`}>{m.name}</span><span className="text-zinc-400">: </span><span>{m.text}</span></div>))}
            <div ref={chatTail}/>
          </div>
          <div className="p-3 border-t border-zinc-800 flex gap-2">
            <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} className="flex-1 bg-zinc-800 text-white rounded-xl px-3 py-2 text-sm outline-none" placeholder="Send a message..."/>
            <button onClick={sendMsg} className="bg-green-500 hover:bg-green-400 text-black font-bold px-3 rounded-xl text-sm">→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
