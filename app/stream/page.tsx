"use client";
import { useState, useEffect, useRef } from "react";

const DB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";

async function dbPut(p: string, d: any) {
  await fetch(`${DB}/${p}.json`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d), keepalive: true }).catch(() => {});
}
async function dbGet(p: string) {
  try { const r = await fetch(`${DB}/${p}.json`, { cache: "no-store" }); return await r.json(); } catch { return null; }
}
async function dbDel(p: string) {
  await fetch(`${DB}/${p}.json`, { method: "DELETE", keepalive: true }).catch(() => {});
}
async function dbPost(p: string, d: any) {
  await fetch(`${DB}/${p}.json`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).catch(() => {});
}
function ice(): RTCIceServer[] {
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "turn:global.relay.metered.ca:80", username: "93c505beb914bb4b2330bc55", credential: "nMvZib7+ScgCeG8t" },
    { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "93c505beb914bb4b2330bc55", credential: "nMvZib7+ScgCeG8t" },
    { urls: "turn:global.relay.metered.ca:443", username: "93c505beb914bb4b2330bc55", credential: "nMvZib7+ScgCeG8t" },
    { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "93c505beb914bb4b2330bc55", credential: "nMvZib7+ScgCeG8t" },
  ];
}
interface Msg { id?: string; name: string; text: string; ts: number; }

export default function StreamPage() {
  const [name, setName] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("Checking...");
  const [chat, setChat] = useState<Msg[]>([]);
  const [chatMsg, setChatMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const myId = useRef("v_" + Date.now() + "_" + Math.random().toString(36).slice(2));
  const isLiveRef = useRef(false);
  const nameRef = useRef("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const keepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offerEsRef = useRef<EventSource | null>(null);
  const iceEsRef = useRef<EventSource | null>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  useEffect(() => {
    dbGet("livestatus").then(data => {
      const live = data?.live === true;
      isLiveRef.current = live;
      setIsLive(live);
      setStatus(live ? "Stream is live" : "Stream is offline");
    });
    const es = new EventSource(`${DB}/livestatus.json`);
    es.addEventListener("put", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      const live = d.data?.live === true;
      isLiveRef.current = live;
      setIsLive(live);
      setStatus(live ? "Stream is live" : "Stream is offline");
      if (!live) { setPlaying(false); pcRef.current?.close(); pcRef.current = null; }
    });
    es.addEventListener("patch", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (typeof d.data?.live !== "boolean") return;
      const live = d.data.live;
      isLiveRef.current = live;
      setIsLive(live);
      setStatus(live ? "Stream is live" : "Stream is offline");
      if (!live) { setPlaying(false); pcRef.current?.close(); pcRef.current = null; }
    });
    return () => es.close();
  }, []);

  useEffect(() => {
    if (!isLive || !nameSet) return;
    joinStream();
    keepRef.current = setInterval(() => {
      if (isLiveRef.current) dbPut("live/viewers/" + myId.current, { name: nameRef.current, ts: Date.now() });
    }, 5000);
    return () => {
      if (keepRef.current) clearInterval(keepRef.current);
      offerEsRef.current?.close();
      iceEsRef.current?.close();
      dbDel("live/viewers/" + myId.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, nameSet]);

  useEffect(() => {
    if (!nameSet) return;
    const es = new EventSource(`${DB}/live/chat.json`);
    es.addEventListener("put", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (!d.data) { setChat([]); return; }
      const msgs: Msg[] = Object.entries(d.data).map(([id, v]) => ({ id, ...(v as any) }));
      setChat(msgs.sort((a, b) => a.ts - b.ts));
    });
    es.addEventListener("patch", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (!d.data) return;
      const inc: Msg[] = Object.entries(d.data).map(([id, v]) => ({ id, ...(v as any) }));
      setChat(prev => {
        const map = new Map(prev.map(m => [m.id, m]));
        inc.forEach(m => m.id && map.set(m.id, m));
        return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
      });
    });
    return () => es.close();
  }, [nameSet]);
  async function joinStream() {
    setStatus("Connecting...");
    const id = myId.current;
    await dbPut("live/viewers/" + id, { name: nameRef.current, ts: Date.now() });
    const pc = new RTCPeerConnection({ iceServers: ice() });
    pcRef.current = pc;
    pc.ontrack = (evt) => {
      if (!videoRef.current || !evt.streams[0]) return;
      videoRef.current.srcObject = evt.streams[0];
      videoRef.current.muted = true;
      videoRef.current.play()
        .then(() => { videoRef.current!.muted = false; setPlaying(true); setStatus("Watching live"); })
        .catch(() => setPlaying(false));
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) dbPost("live/ice_v/" + id, e.candidate.toJSON());
    };
    const iceEs = new EventSource(`${DB}/live/ice_b/${id}.json`);
    iceEsRef.current = iceEs;
    const addIce = (data: Record<string, RTCIceCandidateInit>) => {
      Object.values(data).forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
    };
    iceEs.addEventListener("put", (e: MessageEvent) => { const d = JSON.parse(e.data); if (d.data) addIce(d.data); });
    iceEs.addEventListener("patch", (e: MessageEvent) => { const d = JSON.parse(e.data); if (d.data) addIce(d.data); });
    let gotOffer = false;
    const offerEs = new EventSource(`${DB}/live/offers/${id}.json`);
    offerEsRef.current = offerEs;
    async function handleOffer(offer: RTCSessionDescriptionInit) {
      if (gotOffer) return;
      gotOffer = true;
      offerEs.close();
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await dbPut("live/answers/" + id, { type: answer.type, sdp: answer.sdp });
      } catch {}
    }
    offerEs.addEventListener("put", (e: MessageEvent) => { const d = JSON.parse(e.data); if (d.data?.sdp) handleOffer(d.data); });
    const poll = setInterval(async () => {
      if (gotOffer) { clearInterval(poll); return; }
      const o = await dbGet("live/offers/" + id);
      if (o?.sdp) { clearInterval(poll); handleOffer(o); }
    }, 1000);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") clearInterval(poll);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        clearInterval(poll); iceEs.close(); offerEs.close();
        setStatus("Reconnecting..."); setPlaying(false);
        setTimeout(() => { if (isLiveRef.current) joinStream(); }, 3000);
      }
    };
  }

  async function sendChat() {
    if (!chatMsg.trim() || !nameRef.current) return;
    await dbPost("live/chat", { name: nameRef.current, text: chatMsg.trim(), ts: Date.now() });
    setChatMsg("");
  }
  function handleName() {
    if (!name.trim()) return;
    nameRef.current = name.trim();
    setNameSet(true);
  }

  if (!nameSet) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-3">📺</div>
          <h1 className="text-white text-2xl font-bold">Watch Live</h1>
          <p className="text-zinc-400 text-sm mt-1">{isLive ? "🔴 Live now — join the stream" : "Stream is currently offline"}</p>
        </div>
        <input type="text" className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none"
          placeholder="Enter your name" value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleName()} maxLength={30} />
        <button onClick={handleName}
          className={"w-full font-bold py-3 rounded-xl " + (isLive ? "bg-green-500 hover:bg-green-400 text-black" : "bg-zinc-700 hover:bg-zinc-600 text-white")}>
          {isLive ? "Watch Live →" : "Join (stream offline)"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          {isLive && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block" />}
          <span className="font-bold">{isLive ? "LIVE" : "Offline"}</span>
        </div>
        <span className="text-zinc-400 text-sm">{status}</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="relative bg-zinc-950 flex-1" style={{ minHeight: "60vh" }}>
            <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline />
            {!playing && (
              <div className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={() => videoRef.current?.play().then(() => { videoRef.current!.muted = false; setPlaying(true); })}>
                <div className="bg-black bg-opacity-80 rounded-2xl px-10 py-6 text-center">
                  <div className="text-5xl mb-3">{isLive ? "▶" : "📴"}</div>
                  <div className="text-white font-bold text-lg">{isLive ? "Tap to Play" : "Stream Offline"}</div>
                  {isLive && <div className="text-zinc-400 text-sm mt-1">Connecting to stream...</div>}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="w-72 border-l border-zinc-800 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 text-sm font-semibold text-zinc-400">Live Chat</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {chat.length === 0 && <p className="text-zinc-600 text-center pt-4">No messages yet</p>}
            {chat.map((m, i) => (
              <div key={m.id || i}>
                <span className={m.name.startsWith("Streamer") ? "text-green-400 font-bold" : "text-zinc-300 font-semibold"}>{m.name}:</span>
                {" "}<span className="text-white">{m.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-zinc-800 flex gap-2">
            <input className="flex-1 bg-zinc-800 text-white rounded-xl px-3 py-2 text-sm outline-none"
              placeholder={"Chat as " + (nameRef.current || name) + "..."}
              value={chatMsg} onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()} />
            <button onClick={sendChat} className="bg-green-500 hover:bg-green-400 text-black font-bold px-3 py-2 rounded-xl text-sm">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
