"use client";
import { useState, useEffect, useRef } from "react";

const RTDB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_RTDB_URL ||
  "https://the-greenprint-53d98-default-rtdb.firebaseio.com";

function getIceServers(): RTCIceServer[] {
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "turn:global.relay.metered.ca:80", username: "93c505beb914bb4b2330bc55", credential: "nMvZib7+ScgCeG8t" },
    { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "93c505beb914bb4b2330bc55", credential: "nMvZib7+ScgCeG8t" },
    { urls: "turn:global.relay.metered.ca:443", username: "93c505beb914bb4b2330bc55", credential: "nMvZib7+ScgCeG8t" },
    { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "93c505beb914bb4b2330bc55", credential: "nMvZib7+ScgCeG8t" },
  ];
}

async function fbPut(path: string, data: any) {
  try {
    await fetch(`${RTDB_URL}/${path}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
    });
  } catch {}
}

async function fbGet(path: string) {
  try {
    const r = await fetch(`${RTDB_URL}/${path}.json`, { cache: "no-store" });
    return await r.json();
  } catch { return null; }
}

async function fbDelete(path: string) {
  try {
    await fetch(`${RTDB_URL}/${path}.json`, { method: "DELETE", keepalive: true });
  } catch {}
}

async function fbPost(path: string, data: any) {
  try {
    await fetch(`${RTDB_URL}/${path}.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {}
}

interface ChatMsg { id?: string; name: string; text: string; ts: number; }

export default function StreamPage() {
  const [name, setName] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [status, setStatus] = useState("Checking stream...");

  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const myIdRef = useRef("v_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8));
  const isLiveRef = useRef(false);
  const nameRef = useRef("");
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const data = await fbGet("livestatus");
      if (cancelled) return;
      const live = data?.live === true;
      isLiveRef.current = live;
      setIsLive(live);
      if (!live) {
        setStatus("Stream is offline");
        setTimeout(check, 5000);
      } else {
        setStatus("Stream is live!");
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isLive || !nameSet) return;
    joinStream();
    keepaliveRef.current = setInterval(() => {
      if (!isLiveRef.current) return;
      fbPut("live/viewers/" + myIdRef.current, { name: nameRef.current, joinedAt: Date.now() });
    }, 5000);
    return () => {
      if (keepaliveRef.current) clearInterval(keepaliveRef.current);
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, nameSet]);

  useEffect(() => {
    if (!nameSet) return;
    const ces = new EventSource(`${RTDB_URL}/live/chat.json`);
    ces.addEventListener("put", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (!d.data) return;
      const msgs: ChatMsg[] = Object.entries(d.data).map(([id, v]) => ({ id, ...(v as any) }));
      msgs.sort((a, b) => a.ts - b.ts);
      setChat(msgs);
    });
    ces.addEventListener("patch", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (!d.data) return;
      const newMsgs: ChatMsg[] = Object.entries(d.data).map(([id, v]) => ({ id, ...(v as any) }));
      setChat(prev => {
        const map = new Map(prev.map(m => [m.id, m]));
        newMsgs.forEach(m => m.id && map.set(m.id, m));
        return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
      });
    });
    return () => ces.close();
  }, [nameSet]);

  async function joinStream() {
    setStatus("Connecting...");
    const id = myIdRef.current;
    const myName = nameRef.current;
    await fbPut("live/viewers/" + id, { name: myName, joinedAt: Date.now() });
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    pcRef.current = pc;

    pc.ontrack = (evt) => {
      if (videoRef.current && evt.streams[0]) {
        videoRef.current.srcObject = evt.streams[0];
        videoRef.current.muted = true;
        videoRef.current.play().then(() => {
          videoRef.current!.muted = false;
          setPlaying(true);
        }).catch(() => {
          setPlaying(false);
        });
        setStatus("Watching live");
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setStatus("Reconnecting...");
        setTimeout(() => {
          if (isLiveRef.current) joinStream();
        }, 3000);
      }
    };

    pc.onicecandidate = async (evt) => {
      if (!evt.candidate) return;
      await fbPost("live/ice_v/" + id, evt.candidate.toJSON());
    };

    const iceEs = new EventSource(`${RTDB_URL}/live/ice_b/${id}.json`);
    iceEs.addEventListener("put", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (!d.data) return;
      Object.values(d.data as Record<string, RTCIceCandidateInit>).forEach(c =>
        pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
      );
    });
    iceEs.addEventListener("patch", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (!d.data) return;
      Object.values(d.data as Record<string, RTCIceCandidateInit>).forEach(c =>
        pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
      );
    });

    let gotOffer = false;
    const offerEs = new EventSource(`${RTDB_URL}/live/offers/${id}.json`);

    async function processOffer(offer: RTCSessionDescriptionInit) {
      if (gotOffer) return;
      gotOffer = true;
      offerEs.close();
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await fbPut("live/answers/" + id, { type: answer.type, sdp: answer.sdp });
      } catch {}
    }

    offerEs.addEventListener("put", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (d.data?.sdp) processOffer(d.data);
    });
    offerEs.onerror = () => {
      offerEs.close();
      const poll = setInterval(async () => {
        if (gotOffer) { clearInterval(poll); return; }
        const offer = await fbGet("live/offers/" + id);
        if (offer?.sdp) { clearInterval(poll); processOffer(offer); }
      }, 500);
    };
  }

  function cleanup() {
    pcRef.current?.close();
    pcRef.current = null;
    fbDelete("live/viewers/" + myIdRef.current);
  }

  async function sendChat() {
    if (!chatInput.trim() || !nameRef.current) return;
    await fbPost("live/chat", { name: nameRef.current, text: chatInput.trim(), ts: Date.now() });
    setChatInput("");
  }

  function handleName() {
    if (!name.trim()) return;
    nameRef.current = name.trim();
    setNameSet(true);
  }
  if (!nameSet) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-sm space-y-4">
          <h1 className="text-white text-2xl font-bold text-center">Watch Live</h1>
          <p className="text-zinc-400 text-center text-sm">Enter your name to join</p>
          <input
            type="text"
            className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleName()}
            maxLength={30}
          />
          <button
            onClick={handleName}
            className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl"
          >
            Watch Live →
          </button>
        </div>
      </div>
    );
  }

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
          <div className="relative bg-zinc-900 flex-1" style={{ minHeight: "60vh" }}>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
            />
            {!playing && (
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={() => {
                  videoRef.current?.play().then(() => {
                    videoRef.current!.muted = false;
                    setPlaying(true);
                  });
                }}
              >
                <div className="bg-black bg-opacity-70 rounded-2xl px-8 py-4 text-center">
                  <div className="text-4xl mb-2">▶</div>
                  <div className="text-white font-bold">{isLive ? "Tap to Play" : "Stream Offline"}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-80 border-l border-zinc-800 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 text-sm font-semibold text-zinc-400">
            Live Chat
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chat.map((m, i) => (
              <div key={m.id || i} className="text-sm">
                <span className={m.name.startsWith("Streamer") ? "text-green-400 font-bold" : "text-zinc-300 font-semibold"}>
                  {m.name}:
                </span>{" "}
                <span className="text-white">{m.text}</span>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
          <div className="p-3 border-t border-zinc-800 flex gap-2">
            <input
              className="flex-1 bg-zinc-800 text-white rounded-xl px-3 py-2 text-sm outline-none"
              placeholder={"Chat as " + name + "…"}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
            />
            <button
              onClick={sendChat}
              className="bg-green-500 hover:bg-green-400 text-black font-bold px-3 py-2 rounded-xl text-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
