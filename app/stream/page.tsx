"use client";
import{useState,useEffect,useRef}from"react";
const FB="https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const ICE=[
  {urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"},
  {urls:"turn:global.relay.metered.ca:80",username:"93c505beb914bb4b2330bc55",credential:"nMvZib7+ScgCeG8t"},
  {urls:"turn:global.relay.metered.ca:80?transport=tcp",username:"93c505beb914bb4b2330bc55",credential:"nMvZib7+ScgCeG8t"},
  {urls:"turn:global.relay.metered.ca:443",username:"93c505beb914bb4b2330bc55",credential:"nMvZib7+ScgCeG8t"},
  {urls:"turns:global.relay.metered.ca:443?transport=tcp",username:"93c505beb914bb4b2330bc55",credential:"nMvZib7+ScgCeG8t"},
];
const put=async(p:string,d:any)=>fetch(`${FB}/${p}.json`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(d),keepalive:true}).catch(()=>{});
const get=async(p:string)=>{try{const r=await fetch(`${FB}/${p}.json`,{cache:"no-store"});return r.json();}catch{return null;}};
const del=async(p:string)=>fetch(`${FB}/${p}.json`,{method:"DELETE",keepalive:true}).catch(()=>{});
const push=async(p:string,d:any)=>fetch(`${FB}/${p}.json`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}).catch(()=>{});
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
interface M{id?:string;name:string;text:string;ts:number}
export default function StreamPage(){
  const[name,setName]=useState("");
  const[joined,setJoined]=useState(false);
  const[isLive,setIsLive]=useState(false);
  const[playing,setPlaying]=useState(false);
  const[liveLabel,setLiveLabel]=useState("Checking...");
  const[step,setStep]=useState("Starting...");
  const[chat,setChat]=useState<M[]>([]);
  const[chatMsg,setChatMsg]=useState("");
  const vidRef=useRef<HTMLVideoElement>(null);
  const pcRef=useRef<RTCPeerConnection|null>(null);
  const myId=useRef(uid());
  const nameRef=useRef("");
  const isLiveRef=useRef(false);
  const keepRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const offerPollRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const chatTail=useRef<HTMLDivElement>(null);
  useEffect(()=>{chatTail.current?.scrollIntoView({behavior:"smooth"});},[chat]);
  // Live status
  useEffect(()=>{
    (async()=>{
      const d=await get("livestatus");
      const live=!!d?.live;
      setIsLive(live);isLiveRef.current=live;
      setLiveLabel(live?"🔴 LIVE":"Stream Offline");
    })();
    const es=new EventSource(`${FB}/livestatus.json`);
    es.addEventListener("put",(e:MessageEvent)=>{
      const d=JSON.parse(e.data);
      const live=!!d?.data?.live;
      setIsLive(live);isLiveRef.current=live;
      setLiveLabel(live?"🔴 LIVE":"Stream Offline");
      if(!live)setStep("Stream ended");
    });
    return()=>es.close();
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
  useEffect(()=>{if(joined&&isLive)joinStream();},[joined,isLive]);
  function cleanup(){
    if(keepRef.current){clearInterval(keepRef.current);keepRef.current=null;}
    if(offerPollRef.current){clearInterval(offerPollRef.current);offerPollRef.current=null;}
    if(pcRef.current){pcRef.current.close();pcRef.current=null;}
    del("live/viewers/"+myId.current);
  }
  async function joinStream(){
    cleanup();setPlaying(false);
    const id=myId.current;
    setStep("Joining stream...");
    await put("live/viewers/"+id,{name:nameRef.current,ts:Date.now()});
    setStep("Registered — waiting for broadcaster...");
    keepRef.current=setInterval(()=>{if(isLiveRef.current)put("live/viewers/"+id,{name:nameRef.current,ts:Date.now()});},10000);
    const pc=new RTCPeerConnection({iceServers:ICE});
    pcRef.current=pc;
    const pending:RTCIceCandidateInit[]=[];
    let remoteSet=false;
    pc.ontrack=(e)=>{
      setStep("Got video track!");
      const s=e.streams[0]||new MediaStream([e.track]);
      if(vidRef.current){
        vidRef.current.srcObject=s;
        vidRef.current.muted=true;
        vidRef.current.play().then(()=>{if(vidRef.current)vidRef.current.muted=false;setPlaying(true);}).catch(()=>setPlaying(true));
      }
    };
    pc.onicecandidate=e=>{if(e.candidate)push("live/ice_v/"+id,e.candidate.toJSON());};
    pc.onconnectionstatechange=()=>{
      const st=pc.connectionState;
      if(st==="connected"){setStep("Connected!");setPlaying(true);}
      if(st==="checking")setStep("ICE checking...");
      if((st==="failed"||st==="disconnected")&&isLiveRef.current){
        setStep("Reconnecting...");setPlaying(false);
        setTimeout(()=>{if(isLiveRef.current)joinStream();},3000);
      }
    };
    // ICE from broadcaster
    const seenIce=new Set<string>();
    const iceEs=new EventSource(`${FB}/live/ice_b/${id}.json`);
    const addIce=(data:any)=>{
      if(!data||typeof data!=="object")return;
      Object.entries(data).forEach(([k,c])=>{
        if(!seenIce.has(k)){seenIce.add(k);
          const cand=new RTCIceCandidate(c as RTCIceCandidateInit);
          if(remoteSet)pc.addIceCandidate(cand).catch(()=>{});else pending.push(c as RTCIceCandidateInit);
        }
      });
    };
    iceEs.addEventListener("put",(e:MessageEvent)=>{const d=JSON.parse(e.data);addIce(d.data);});
    iceEs.addEventListener("patch",(e:MessageEvent)=>{const d=JSON.parse(e.data);addIce(d.data);});
    // Poll for offer every 500ms — no timeout, keeps trying until offer or stream dies
    let offerHandled=false;
    const handleOffer=async(offer:any)=>{
      if(offerHandled||!offer?.sdp)return;
      offerHandled=true;
      if(offerPollRef.current){clearInterval(offerPollRef.current);offerPollRef.current=null;}
      setStep("Got offer — connecting...");
      try{
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        remoteSet=true;
        for(const c of pending)pc.addIceCandidate(new RTCIceCandidate(c)).catch(()=>{});
        pending.length=0;
        const ans=await pc.createAnswer();
        await pc.setLocalDescription(ans);
        await put("live/answers/"+id,{type:ans.type,sdp:ans.sdp});
        setStep("Answer sent — waiting for video...");
      }catch(err){setStep("Offer error, retrying...");offerHandled=false;}
    };
    offerPollRef.current=setInterval(async()=>{
      if(offerHandled||!isLiveRef.current){if(offerPollRef.current)clearInterval(offerPollRef.current);return;}
      const d=await get("live/offers/"+id);
      if(d?.sdp)await handleOffer(d);
    },500);
  }
  function enterName(){const n=name.trim();if(!n||!isLive)return;nameRef.current=n;setJoined(true);}
  async function sendMsg(){
    if(!chatMsg.trim())return;
    await push("live/chat",{name:nameRef.current,text:chatMsg.trim(),ts:Date.now()});
    setChatMsg("");
  }
  if(!joined)return(
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center space-y-2">
        {isLive?(
          <div className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse inline-block"/>
            <span className="text-white text-3xl font-bold">LIVE</span>
          </div>
        ):<span className="text-zinc-500 text-xl">{liveLabel}</span>}
        <p className="text-zinc-600 text-sm">{isLive?"Enter your name to watch":"Come back when the stream starts"}</p>
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
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block"/>
          <span className="font-bold">LIVE</span>
        </div>
        <span className="text-zinc-400 text-sm">{nameRef.current}</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1">
          <div className="relative bg-black flex-1" style={{minHeight:"60vh"}}>
            <video ref={vidRef} className="w-full h-full object-contain" autoPlay playsInline/>
            {!playing&&(
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin"/>
                <span className="text-zinc-400 text-sm">{step}</span>
              </div>
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
            <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()}
              className="flex-1 bg-zinc-800 text-white rounded-xl px-3 py-2 text-sm outline-none" placeholder="Send a message..."/>
            <button onClick={sendMsg} className="bg-green-500 hover:bg-green-400 text-black font-bold px-3 rounded-xl text-sm">→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
