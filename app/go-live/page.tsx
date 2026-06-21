"use client";
import { useState, useEffect, useRef } from "react";

const DB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const PWD_HASH = "f7bbb300691e55f6eaad18327a462a30ff3bf38a4a36a24e9458fdfc508d4ab1";

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
}
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
interface PeerState { pc: RTCPeerConnection; answered: boolean; iceDone: boolean; processedIce: Set<string>; }

export default function GoLivePage() {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [live, setLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [chat, setChat] = useState<Msg[]>([]);
  const [msg, setMsg] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const liveRef = useRef(false);
  const peersRef = useRef<Record<string, PeerState>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEsRef = useRef<EventSource | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  async function handleAuth() {
    if (await sha256(pwd) === PWD_HASH) setAuthed(true);
    else setPwdErr("Wrong password");
  }

  async function shareScreen() {
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 30 } },
        audio: true,
      });
      screenRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
      setStreaming(true);
      s.getVideoTracks()[0].onended = () => { setStreaming(false); screenRef.current = null; };
    } catch (e) {
      alert("Screen share error: " + (e as Error).message);
    }
  }
  async function goLive() {
    if (!screenRef.current) return alert("Share your screen first");
    liveRef.current = true;
    setLive(true);
    // Wipe previous session data
    await dbDel("live/viewers"); await dbDel("live/offers"); await dbDel("live/answers");
    await dbDel("live/ice_b"); await dbDel("live/ice_v"); await dbDel("live/chat");
    await dbPut("livestatus", { live: true, ts: Date.now() });

    // Poll for viewers + handle signaling every 2s
    pollRef.current = setInterval(async () => {
      if (!liveRef.current) return;
      const data = await dbGet("live/viewers");
      const ids: string[] = data ? Object.keys(data) : [];
      setViewerCount(ids.length);
      for (const id of ids) {
        const state = peersRef.current[id];
        if (!state) {
          connectViewer(id);
        } else if (state.pc.connectionState === "failed" || state.pc.connectionState === "closed") {
          state.pc.close();
          delete peersRef.current[id];
          connectViewer(id);
        } else if (!state.answered) {
          // Poll for answer
          const ans = await dbGet("live/answers/" + id);
          if (ans?.sdp) {
            state.answered = true;
            await state.pc.setRemoteDescription(new RTCSessionDescription(ans)).catch(() => {});
          }
        }
        // Poll for ICE from viewer
        if (state && !state.iceDone) {
          const iceData = await dbGet("live/ice_v/" + id);
          if (iceData) {
            for (const key of Object.keys(iceData)) {
              if (!state.processedIce.has(key)) {
                state.processedIce.add(key);
                state.pc.addIceCandidate(new RTCIceCandidate(iceData[key])).catch(() => {});
              }
            }
          }
        }
      }
    }, 2000);

    // Watch chat via SSE
    const ces = new EventSource(`${DB}/live/chat.json`);
    chatEsRef.current = ces;
    ces.addEventListener("put", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (!d.data) { setChat([]); return; }
      const msgs: Msg[] = Object.entries(d.data).map(([id, v]) => ({ id, ...(v as any) }));
      setChat(msgs.sort((a, b) => a.ts - b.ts));
    });
    ces.addEventListener("patch", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (!d.data) return;
      const incoming: Msg[] = Object.entries(d.data).map(([id, v]) => ({ id, ...(v as any) }));
      setChat(prev => {
        const map = new Map(prev.map(m => [m.id, m]));
        incoming.forEach(m => m.id && map.set(m.id, m));
        return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
      });
    });
  }

  async function connectViewer(vid: string) {
    if (!screenRef.current || !liveRef.current) return;
    const pc = new RTCPeerConnection({ iceServers: ice() });
    const peerState: PeerState = { pc, answered: false, iceDone: false, processedIce: new Set() };
    peersRef.current[vid] = peerState;

    screenRef.current.getTracks().forEach(t => pc.addTrack(t, screenRef.current!));

    pc.onicecandidate = (e) => {
      if (e.candidate) dbPost("live/ice_b/" + vid, e.candidate.toJSON());
    };
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") peerState.iceDone = true;
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await dbPut("live/offers/" + vid, { type: offer.type, sdp: offer.sdp });
  }

  async function sendChat() {
    if (!msg.trim()) return;
    await dbPost("live/chat", { name: "Streamer 🟢", text: msg.trim(), ts: Date.now() });
    setMsg("");
  }

  async function endStream() {
    liveRef.current = false;
    setLive(false);
    setStreaming(false);
    setViewerCount(0);
    setChat([]);
    if (pollRef.current) clearInterval(pollRef.current);
    chatEsRef.current?.close();
    Object.values(peersRef.current).forEach(s => s.pc.close());
    peersRef.current = {};
    screenRef.current?.getTracks().forEach(t => t.stop());
    screenRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    await dbPut("livestatus", { live: false, ts: Date.now() });
    await dbDel("live/viewers"); await dbDel("live/offers"); await dbDel("live/answers");
    await dbDel("live/ice_b"); await dbDel("live/ice_v"); await dbDel("live/chat");
  }
  // ── Auth Gate ────────────────────────────────────────────────────────────
  if (!authed) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-sm space-y-4">
        <h1 className="text-white text-2xl font-bold text-center">Streamer Login</h1>
        <input type="password"
          className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none"
          placeholder="Password" value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAuth()} />
        {pwdErr && <p className="text-red-400 text-sm text-center">{pwdErr}</p>}
        <button onClick={handleAuth}
          className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl">
          Enter →
        </button>
      </div>
    </div>
  );

  // ── Main Panel ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {live && <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse inline-block" />}
          <span className="font-bold text-lg">{live ? "● LIVE" : "Stream Panel"}</span>
        </div>
        <span className="text-zinc-400 text-sm">{viewerCount} viewer{viewerCount !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: preview + controls */}
        <div className="flex flex-col flex-1 p-4 gap-3">
          {/* Screen preview */}
          <div className="relative bg-zinc-900 rounded-2xl overflow-hidden flex-1" style={{ minHeight: "55vh" }}>
            <video ref={videoRef} className="w-full h-full object-contain" autoPlay muted playsInline />
            {!streaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-zinc-500">
                <span className="text-5xl">🖥</span>
                <span>Click Share Screen to begin</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {!streaming ? (
              <button onClick={shareScreen}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 rounded-xl text-sm">
                🖥 Share Screen
              </button>
            ) : !live ? (
              <button onClick={goLive}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl animate-pulse">
                ● Go Live
              </button>
            ) : (
              <button onClick={endStream}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-red-400 font-bold py-3 rounded-xl">
                End Stream
              </button>
            )}
          </div>
        </div>

        {/* Right: Chat */}
        <div className="w-72 border-l border-zinc-800 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 text-sm font-semibold text-zinc-400">
            Live Chat
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {chat.length === 0 && <p className="text-zinc-600 text-center pt-4">No messages yet</p>}
            {chat.map((m, i) => (
              <div key={m.id || i}>
                <span className={m.name.startsWith("Streamer") ? "text-green-400 font-bold" : "text-zinc-300 font-semibold"}>
                  {m.name}:
                </span>{" "}
                <span className="text-white">{m.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {live && (
            <div className="p-3 border-t border-zinc-800 flex gap-2">
              <input
                className="flex-1 bg-zinc-800 text-white rounded-xl px-3 py-2 text-sm outline-none"
                placeholder="Reply as Streamer..."
                value={msg}
                onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()} />
              <button onClick={sendChat}
                className="bg-green-500 hover:bg-green-400 text-black font-bold px-3 py-2 rounded-xl text-sm">
                Send
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
