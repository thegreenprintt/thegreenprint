"use client";
import { useState, useEffect, useRef } from "react";

const RTDB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_RTDB_URL ||
  "https://the-greenprint-53d98-default-rtdb.firebaseio.com";

const PWD_HASH = "f7bbb300691e55f6eaad18327a462a30ff3bf38a4a36a24e9458fdfc508d4ab1";

async function sha256(msg: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

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

export default function GoLivePage() {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCam, setSelectedCam] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [live, setLive] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [viewers, setViewers] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const streamRef = useRef<MediaStream | null>(null);
  const liveRef = useRef(false);
  const viewerEsRef = useRef<EventSource | null>(null);
  const chatEsRef = useRef<EventSource | null>(null);
  const staleCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authed) return;
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const cams = devs.filter(d => d.kind === "videoinput");
      setCameras(cams);
      const obs = cams.find(c => /obs|virtual/i.test(c.label));
      setSelectedCam(obs ? obs.deviceId : (cams[0]?.deviceId || ""));
    });
  }, [authed]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  async function handleAuth() {
    const h = await sha256(pwd);
    if (h === PWD_HASH) {
      setAuthed(true);
    } else {
      setPwdErr("Wrong password");
    }
  }

  async function startPreview() {
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCam ? { deviceId: { exact: selectedCam } } : true,
        audio: false,
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
      setPreviewing(true);
    } catch (e) {
      alert("Camera error: " + (e as Error).message);
    }
  }

  async function goLive() {
    if (!streamRef.current) return;
    liveRef.current = true;
    setLive(true);
    await fbPut("livestatus", { live: true, startedAt: Date.now() });
    await fbDelete("live/viewers");
    await fbDelete("live/offers");
    await fbDelete("live/answers");
    await fbDelete("live/ice_b");
    await fbDelete("live/ice_v");

    const es = new EventSource(`${RTDB_URL}/live/viewers.json`);
    viewerEsRef.current = es;
    es.addEventListener("put", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (!d.data) return;
      const viewerMap: Record<string, any> = d.data;
      setViewers(Object.keys(viewerMap));
      Object.keys(viewerMap).forEach(vid => callViewer(vid));
    });
    es.addEventListener("patch", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (!d.data) return;
      const viewerMap: Record<string, any> = d.data;
      Object.keys(viewerMap).forEach(vid => {
        if (viewerMap[vid]) callViewer(vid);
      });
      setViewers(prev => {
        const next = new Set(prev);
        Object.keys(viewerMap).forEach(vid => {
          if (viewerMap[vid]) next.add(vid);
          else next.delete(vid);
        });
        return Array.from(next);
      });
    });

    const ces = new EventSource(`${RTDB_URL}/live/chat.json`);
    chatEsRef.current = ces;
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

    staleCheckRef.current = setInterval(async () => {
      if (!liveRef.current) return;
      const viewerData = await fbGet("live/viewers");
      if (!viewerData) return;
      Object.keys(viewerData).forEach(vid => {
        if (!peersRef.current[vid] || peersRef.current[vid].connectionState === "closed") {
          callViewer(vid);
        }
      });
    }, 15000);
  }

  async function callViewer(viewerId: string) {
    if (!streamRef.current || !liveRef.current) return;
    if (peersRef.current[viewerId]) {
      const state = peersRef.current[viewerId].connectionState;
      if (state === "connected" || state === "connecting") return;
      peersRef.current[viewerId].close();
    }
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    peersRef.current[viewerId] = pc;
    streamRef.current.getTracks().forEach(t => pc.addTrack(t, streamRef.current!));
    pc.onicecandidate = async (evt) => {
      if (!evt.candidate) return;
      await fbPost("live/ice_b/" + viewerId, evt.candidate.toJSON());
    };
    const iceEs = new EventSource(`${RTDB_URL}/live/ice_v/${viewerId}.json`);
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
    const ansEs = new EventSource(`${RTDB_URL}/live/answers/${viewerId}.json`);
    ansEs.addEventListener("put", async (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (!d.data?.sdp) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(d.data));
        ansEs.close();
      } catch {}
    });
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        iceEs.close();
        ansEs.close();
      }
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await fbPut("live/offers/" + viewerId, { type: offer.type, sdp: offer.sdp });
  }
  async function sendChat() {
    if (!chatInput.trim()) return;
    await fbPost("live/chat", { name: "Streamer 🟢", text: chatInput.trim(), ts: Date.now() });
    setChatInput("");
  }

  async function endStream() {
    liveRef.current = false;
    setLive(false);
    setPreviewing(false);
    viewerEsRef.current?.close();
    chatEsRef.current?.close();
    if (staleCheckRef.current) clearInterval(staleCheckRef.current);
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    await fbPut("livestatus", { live: false });
    await fbDelete("live/viewers");
    await fbDelete("live/offers");
    await fbDelete("live/answers");
    await fbDelete("live/ice_b");
    await fbDelete("live/ice_v");
    await fbDelete("live/chat");
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-sm space-y-4">
          <h1 className="text-white text-2xl font-bold text-center">Go Live</h1>
          <input
            type="password"
            className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none"
            placeholder="Enter password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAuth()}
          />
          {pwdErr && <p className="text-red-400 text-sm text-center">{pwdErr}</p>}
          <button
            onClick={handleAuth}
            className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl"
          >
            Enter →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold">
          {live ? <span className="text-red-500">● LIVE</span> : "Go Live"}
        </h1>
        <span className="text-zinc-400 text-sm">{viewers.length} viewer{viewers.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 p-4 gap-4">
          {!live && (
            <div className="flex gap-2 items-center">
              <select
                className="flex-1 bg-zinc-800 text-white rounded-xl px-4 py-2"
                value={selectedCam}
                onChange={e => setSelectedCam(e.target.value)}
              >
                {cameras.map(c => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label || "Camera " + c.deviceId.slice(0, 8)}
                  </option>
                ))}
              </select>
              {!previewing ? (
                <button
                  onClick={startPreview}
                  className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold px-5 py-2 rounded-xl"
                >
                  Preview
                </button>
              ) : (
                <button
                  onClick={goLive}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2 rounded-xl animate-pulse"
                >
                  Go Live
                </button>
              )}
            </div>
          )}
          <div className="relative bg-zinc-900 rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            {!previewing && (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-lg">
                No preview — click Preview to start
              </div>
            )}
          </div>
          {live && (
            <button
              onClick={endStream}
              className="bg-zinc-800 hover:bg-zinc-700 text-red-400 font-bold py-3 rounded-xl"
            >
              End Stream
            </button>
          )}
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
          {live && (
            <div className="p-3 border-t border-zinc-800 flex gap-2">
              <input
                className="flex-1 bg-zinc-800 text-white rounded-xl px-3 py-2 text-sm outline-none"
                placeholder="Comment as Streamer..."
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
          )}
        </div>
      </div>
    </div>
  );
}
