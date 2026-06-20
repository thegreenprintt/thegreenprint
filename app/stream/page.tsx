"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const RTDB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_RTDB_URL ||
  "https://the-greenprint-53d98-default-rtdb.firebaseio.com";

async function getIceServers(): Promise<RTCIceServer[]> {
  try {
    const r = await fetch(
      "https://thegreenprint.metered.live/api/v1/turn/credentials?apiKey=5F8_ODeQi0c5SzzowPMIz2apHx4NPItp9aoVVxToeF_FbZoE"
    );
    if (r.ok) return await r.json();
  } catch {}
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];
}

async function fbGet(path: string) {
  try {
    const r = await fetch(`${RTDB_URL}/${path}.json`, { cache: "no-store" });
    return await r.json();
  } catch { return null; }
}

async function fbPut(path: string, data: any) {
  try {
    await fetch(`${RTDB_URL}/${path}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {}
}

async function fbDelete(path: string) {
  try {
    await fetch(`${RTDB_URL}/${path}.json`, { method: "DELETE" });
  } catch {}
}

interface ChatMsg { name: string; text: string; ts: number; }

export default function StreamPage() {
  const [name, setName] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const [isLive, setIsLive] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Checking if stream is live…");
  const [muted, setMuted] = useState(true);
  const [needsPlayGesture, setNeedsPlayGesture] = useState(false);

  // Sync muted toggle to video element (video starts muted for autoplay, unmuted after play())
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);
  const [viewerCount, setViewerCount] = useState(0);

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<any>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const startTimeRef = useRef<number | null>(null);

  // Firebase signaling
  const myIdRef = useRef<string>(`v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const liveCheckRef = useRef<any>(null);
  const endSseRef = useRef<EventSource | null>(null);
  const chatPollRef = useRef<any>(null);
  const lastChatTsRef = useRef<number>(Date.now());
  const viewerCountPollRef = useRef<any>(null);
  const connectedRef = useRef(false);

  const log = (msg: string) => setStatus(msg);

  // Generate stable viewer ID once
  useEffect(() => {
    const stored = sessionStorage.getItem("gp_viewer_id");
    if (stored) {
      myIdRef.current = stored;
    } else {
      sessionStorage.setItem("gp_viewer_id", myIdRef.current);
    }
  }, []);

  async async function joinStream(displayName: string) {
    const myId = myIdRef.current;
    log("Registering…");
    await fbPut(`live/viewers/${myId}`, { name: displayName, ts: Date.now() });
    log("Waiting for offer…");

    const pc = new RTCPeerConnection({ iceServers: await getIceServers(), iceCandidatePoolSize: 0 });
    pcRef.current = pc;
    let gotOffer = false;

    // Re-register every 5 s so broadcaster keeps us visible
    const reRegId = setInterval(async () => {
      if (gotOffer) { clearInterval(reRegId); return; }
      await fbPut(`live/viewers/${myId}`, { name: displayName, ts: Date.now() });
    }, 5000);

    let offerEs: EventSource | null = null;
    let iceEs:   EventSource | null = null;

    const cleanup = () => {
      clearInterval(reRegId);
      offerEs?.close();
      iceEs?.close();
      try { pc.close(); } catch {}
      fbDelete(`live/viewers/${myId}`);
      fbDelete(`live/answers/${myId}`);
      fbDelete(`live/ice_v/${myId}`);
      pcRef.current = null;
    };
    cleanupRef.current = cleanup;

    // Send our ICE candidates to the broadcaster
    const myIce: RTCIceCandidateInit[] = [];
    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        myIce.push(e.candidate.toJSON());
        await fbPut(`live/ice_v/${myId}`, myIce);
      }
    };

    // Handle incoming media tracks
    pc.ontrack = (e) => {
      if (!videoRef.current) return;
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      videoRef.current.srcObject = stream;
      if (e.track.kind === "video") {
        videoRef.current.muted = true;
        videoRef.current.play().then(() => {
          if (videoRef.current) { videoRef.current.muted = false; setMuted(false); }
        }).catch(() => setNeedsPlayGesture(true));
        connectedRef.current = true;
        setConnected(true);
        if (!startTimeRef.current) {
          startTimeRef.current = Date.now();
          timerRef.current = setInterval(() => {
            const s2 = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000);
            setElapsed(`${String(Math.floor(s2/3600)).padStart(2,"0")}:${String(Math.floor((s2%3600)/60)).padStart(2,"0")}:${String(s2%60).padStart(2,"0")}`);
          }, 1000);
        }
        log("Stream connected!");
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (pcRef.current !== pc) return;
        connectedRef.current = false;
        setConnected(false);
        clearInterval(timerRef.current);
        log("Connection lost — reconnecting…");
        cleanup();
        setTimeout(() => { if (!pcRef.current) joinStream(displayName); }, 2000);
      }
    };

    // SSE: receive broadcaster ICE candidates instantly
    const seenIce = new Set<string>();
    const applyBroadcasterIce = (data: any) => {
      if (!data) return;
      const arr: any[] = Array.isArray(data) ? data : Object.values(data);
      for (const c of arr) {
        const k = JSON.stringify(c);
        if (!seenIce.has(k) && pc.remoteDescription) {
          seenIce.add(k);
          pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
      }
    };
    iceEs = new EventSource(`${RTDB_URL}/live/ice_b/${myId}.json`);
    iceEs.addEventListener("put",   (e: any) => { try { applyBroadcasterIce(JSON.parse((e as MessageEvent).data)); } catch {} });
    iceEs.addEventListener("patch", (e: any) => { try { applyBroadcasterIce(JSON.parse((e as MessageEvent).data)); } catch {} });

    // SSE: receive broadcaster offer instantly (fallback to 500 ms poll on error)
    const processOffer = async (offer: any) => {
      if (!offer?.sdp || gotOffer) return;
      gotOffer = true;
      clearInterval(reRegId);
      offerEs?.close(); offerEs = null;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await fbPut(`live/answers/${myId}`, { type: answer.type, sdp: answer.sdp });
        log("Answer sent — connecting…");
      } catch (err) { log("Offer error: " + err); }
    };

    let fallbackPollId: any;
    offerEs = new EventSource(`${RTDB_URL}/live/offers/${myId}.json`);
    offerEs.addEventListener("put",   (e: any) => { try { processOffer(JSON.parse((e as MessageEvent).data)); } catch {} });
    offerEs.addEventListener("patch", (e: any) => { try { processOffer(JSON.parse((e as MessageEvent).data)); } catch {} });
    offerEs.onerror = () => {
      offerEs?.close(); offerEs = null;
      fallbackPollId = setInterval(async () => {
        if (gotOffer) { clearInterval(fallbackPollId); return; }
        const offer = await fbGet(`live/offers/${myId}`);
        if (offer?.sdp) processOffer(offer);
      }, 500);
    };
  }
  // Poll for live status
  useEffect(() => {
    const check = async () => {
      const status = await fbGet("livestatus");
      if (status?.isLive) {
        setIsLive(true);
        setStreamTitle(status.title || "");
      } else {
        setIsLive(false);
        setConnected(false);
        log("Stream is offline. Waiting for broadcaster…");
      }
    };
    check();
    liveCheckRef.current = setInterval(check, 5000);
    return () => clearInterval(liveCheckRef.current);
  }, []);

  // Poll chat messages for this viewer
  function startChatPoll() {
    chatPollRef.current = setInterval(async () => {
      const snap = await fbGet(`chat`);
      if (!snap) return;
      const msgs = Object.values(snap) as any[];
      const fresh = msgs.filter((m: any) => m.ts > lastChatTsRef.current);
      if (fresh.length === 0) return;
      fresh.sort((a: any, b: any) => a.ts - b.ts);
      lastChatTsRef.current = fresh[fresh.length - 1].ts;
            setChat((prev: any[]) => [...prev, ...fresh]);
    }, 2000);
  }

  // Poll viewer count
  function startViewerCountPoll() {
    viewerCountPollRef.current = setInterval(async () => {
      const viewers = await fbGet(`live/viewers`);
      if (viewers) setViewerCount(Object.keys(viewers).length);
    }, 5000);
  }

  // When live status changes, join or leave
  useEffect(() => {
    if (isLive && nameSet && !connectedRef.current) {
      joinStream(name);
      startChatPoll();
      startViewerCountPoll();
    }
    if (!isLive) {
      cleanupRef.current?.();
      clearInterval(chatPollRef.current);
      clearInterval(viewerCountPollRef.current);
      endSseRef.current?.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, nameSet]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      clearInterval(timerRef.current);
      clearInterval(liveCheckRef.current);
      clearInterval(chatPollRef.current);
      clearInterval(viewerCountPollRef.current);
      endSseRef.current?.close();
    };
  }, []);

  async function sendChat() {
    const msg = chatInput.trim();
    if (!msg || !name) return;
    setChatInput("");
    await fbPut(`live/chat/${Date.now()}_${Math.random().toString(36).slice(2)}`, {
      name, msg, ts: Date.now(),
    });
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !name) return;
    try {
      await fetch(`${RTDB_URL}/leads.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, ts: Date.now() }),
      });
      setEmailSent(true);
    } catch {}
  }

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setNameSet(true);
  }

  // ─── Name gate ────────────────────────────────────────────────────────────
  if (!nameSet) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#00FF85]/4 blur-[140px]"/>
        </div>
        <div className="relative w-full max-w-sm bg-[#111] border border-white/8 rounded-2xl p-8">
          <div className="w-10 h-10 bg-[#00FF85] rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 13L7 8L10 11L14 5" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-center font-bold text-white text-lg mb-1">Join the Stream</h1>
          <p className="text-center text-xs text-white/30 mb-6">The Greenprint — Live Trading</p>
          <form onSubmit={handleNameSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Your first name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#00FF85]/50 transition-colors"
            />
            <button
              type="submit"
              className="w-full bg-[#00FF85] text-black font-black py-3 rounded-xl text-sm hover:bg-[#00e676] transition-all"
              style={{ boxShadow: "0 0 24px rgba(0,255,133,0.3)" }}>
              Watch Live
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Main viewer UI ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col font-sans">
      {/* Top bar */}
      <div className="h-12 bg-[#0d0d0d] border-b border-white/5 flex items-center px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLive ? "bg-red-500 animate-pulse" : "bg-white/20"}`}/>
          <span className={`text-xs font-black tracking-widest ${isLive ? "text-red-400" : "text-white/25"}`}>
            {isLive ? "LIVE" : "OFFLINE"}
          </span>
        </div>
        {streamTitle && (
          <span className="text-xs text-white/40 flex-1 truncate">{streamTitle}</span>
        )}
        {!streamTitle && <span className="flex-1"/>}
        {viewerCount > 0 && (
          <span className="text-xs text-white/25 font-mono">{viewerCount} watching</span>
        )}
        {connected && <span className="font-mono text-xs text-[#00FF85]">{elapsed}</span>}
      </div>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Video */}
        <div className="flex-1 bg-black relative min-h-[220px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          {needsPlayGesture && (
            <div
              className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 cursor-pointer"
              onClick={() => { if (videoRef.current) { videoRef.current.muted = false; videoRef.current.play().catch(()=>{}); } setNeedsPlayGesture(false); }}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-[#00FF85] flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" width="40" height="40"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <span className="text-white font-bold text-lg">Tap to Play</span>
              </div>
            </div>
          )}
          {!connected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                {isLive ? (
                  <div className="w-5 h-5 border-2 border-[#00FF85] border-t-transparent rounded-full animate-spin"/>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="3" fill="#00FF85" opacity="0.4"/>
                    <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="1.5" strokeOpacity="0.15"/>
                    <circle cx="11" cy="11" r="10" stroke="white" strokeWidth="1" strokeOpacity="0.07"/>
                  </svg>
                )}
              </div>
              <div>
                <p className="text-white/40 text-sm font-medium">{status}</p>
                {isLive && !connected && (
                  <p className="text-white/20 text-xs mt-1">Establishing connection…</p>
                )}
              </div>
            </div>
          )}
          {connected && muted && (
            <button
              onClick={() => { setMuted(false); if (videoRef.current) videoRef.current.muted = false; }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 border border-white/20 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm hover:bg-black/90 transition-all"
              style={{ boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}>
              Tap to unmute
            </button>
          )}
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-72 bg-[#0d0d0d] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col shrink-0">
          {/* Status */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${connected ? "bg-[#00FF85]" : isLive ? "bg-yellow-400 animate-pulse" : "bg-white/20"}`}/>
              <p className="text-[11px] text-white/40 font-mono">{status}</p>
            </div>
            {connected && (
              <button
                onClick={() => { setMuted(m => !m); if (videoRef.current) videoRef.current.muted = !muted; }}
                className={`mt-2 text-xs px-3 py-1.5 rounded-lg border transition-colors ${muted ? "border-white/10 text-white/40 hover:text-white" : "border-[#00FF85]/30 text-[#00FF85] bg-[#00FF85]/5"}`}>
                {muted ? "Unmute" : "Muted"}
              </button>
            )}
          </div>

          {/* Lead capture */}
          {connected && !emailSent && (
            <div className="px-4 py-3 border-b border-white/5 bg-[#00FF85]/3">
              <p className="text-[11px] text-[#00FF85]/70 font-semibold mb-2">Get trade alerts & replays →</p>
              <form onSubmit={submitLead} className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="flex-1 bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#00FF85]/40"
                />
                <button type="submit" className="bg-[#00FF85] text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#00e676] transition-colors shrink-0">
                  Join
                </button>
              </form>
            </div>
          )}
          {emailSent && (
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-[11px] text-[#00FF85] font-semibold">You're in! Trade alerts coming soon.</p>
            </div>
          )}

          {/* Chat */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-white/5">
              <p className="font-mono text-[10px] tracking-widest uppercase text-white/25">Live Chat</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[80px] max-h-[220px] lg:max-h-none">
              {chat.length === 0
                ? <p className="text-[10px] text-white/20">Chat is quiet right now…</p>
                : chat.map((m, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-[#00FF85] font-semibold">{m.name}: </span>
                    <span className="text-white/50">{m.text}</span>
                  </div>
                ))
              }
            </div>
            <div className="p-3 border-t border-white/5">
              <form onSubmit={e => { e.preventDefault(); sendChat(); }} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Say something…"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  maxLength={200}
                  className="flex-1 bg-[#111] border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#00FF85]/30 transition-colors"
                />
                <button type="submit"
                  className="bg-[#00FF85]/10 border border-[#00FF85]/20 text-[#00FF85] text-xs px-3 py-2 rounded-xl hover:bg-[#00FF85]/20 transition-colors shrink-0">
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Join app CTA */}
          <div className="p-4 border-t border-white/5">
            <p className="text-[10px] text-white/25 mb-2 text-center">Want daily trade setups + full access?</p>
            <a
              href="https://whop.com/checkout/1qG9Z2JJtzx9EwqFqx-NniP-F77m-blPo-5FJfLrqeKabq/"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[#00FF85] text-black font-black text-xs py-2.5 rounded-xl text-center hover:bg-[#00e676] transition-all"
              style={{ boxShadow: "0 0 16px rgba(0,255,133,0.25)" }}>
              Join The Greenprint — $29.99/mo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
