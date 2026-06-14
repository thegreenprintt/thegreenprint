"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

const HOST_PEER_ID = "gp-greenprint-live";
const RTDB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_RTDB_URL ||
  "https://the-greenprint-53d98-default-rtdb.firebaseio.com";

interface ChatMsg { name: string; text: string; ts: number; }

/* ---------- Email Gate ---------- */
function EmailGate({ onAccess }: { onAccess: (name: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError("Please fill in both fields."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email."); return; }
    setLoading(true);
    setError("");
    try {
      sessionStorage.setItem("gp_stream_access", JSON.stringify({ name: name.trim(), email: email.trim(), ts: Date.now() }));
    } catch {}
    await new Promise(r => setTimeout(r, 600));
    onAccess(name.trim());
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#00FF85]/5 blur-[120px]"/>
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }}/>
      </div>
      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-[#00FF85] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M2 12L6 7L9 10L13 4" stroke="#080808" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">
            The <span className="text-[#00FF85]">Greenprint</span>
          </span>
        </div>
        <div className="rounded-3xl border border-white/8 bg-white/3 p-8 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"/>
            <span className="text-red-400 text-sm font-bold tracking-widest uppercase">Live Sessions</span>
          </div>
          <h1 className="text-3xl font-black text-white text-center mb-2 leading-tight">
            Watch The Greenprint<br/>
            <span className="text-[#00FF85]">Trade Live</span>
          </h1>
          <p className="text-white/40 text-sm text-center mb-8">
            Subscribe free to get access to every live session, plus real-time chat with the community.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wide block mb-1.5">First Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#00FF85]/50 transition-colors"/>
            </div>
            <div>
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wide block mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#00FF85]/50 transition-colors"/>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[#00FF85] text-black font-black py-4 rounded-xl text-base hover:bg-[#00e676] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ boxShadow: "0 0 30px rgba(0,255,133,0.3)" }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Getting you in...
                </span>
              ) : "Watch Free - Get Access"}
            </button>
          </form>
          <p className="text-white/20 text-xs text-center mt-4">
            Free access. No credit card required. Unsubscribe anytime.
          </p>
        </div>
        <p className="text-white/15 text-xs text-center mt-6 max-w-sm mx-auto leading-relaxed">
          By subscribing you agree to receive updates from The Greenprint. All content is for educational purposes only and does not constitute financial advice.
        </p>
        <div className="flex justify-center mt-6">
          <Link href="/" className="text-white/25 text-xs hover:text-white/50 transition-colors">
            Back to The Greenprint
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------- Stream Player ---------- */
function StreamPlayer({ viewerName, isAppMode }: { viewerName: string; isAppMode: boolean }) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const peerRef    = useRef<any>(null);
  const connRef    = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isLive, setIsLive]           = useState(false);
  const [liveTitle, setLiveTitle]     = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [connected, setConnected]     = useState(false);
  const [status, setStatus]           = useState("Checking stream status...");
  const [chat, setChat]               = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput]     = useState("");

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  useEffect(() => {
    async function checkLive() {
      try {
        const r = await fetch(`${RTDB_URL}/livestatus.json`);
        const d = await r.json();
        if (d?.isLive) {
          setIsLive(true);
          setLiveTitle(d.title || "The Greenprint - Live Session");
        } else {
          setIsLive(false);
          setConnected(false);
          if (videoRef.current) videoRef.current.srcObject = null;
        }
      } catch {}
    }
    checkLive();
    const id = setInterval(checkLive, 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isLive) return;
    setStatus("Connecting to stream...");
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.2/peerjs.min.js";
    script.onload = () => initPeer();
    script.onerror = () => setStatus("Failed to load stream. Try refreshing.");
    document.body.appendChild(script);
    return () => {
      if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }
      try { document.body.removeChild(script); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive]);

  function initPeer() {
    if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }
    const PeerJS = (window as any).Peer;
    const peer = new PeerJS(undefined, { debug: 0, config: { iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ]}});
    peerRef.current = peer;

    peer.on("open", (id: string) => {
      setStatus("Waiting for stream...");
      try {
        const conn = peer.connect(HOST_PEER_ID, { reliable: true });
        connRef.current = conn;
        conn.on("open", () => conn.send({ t: "join", name: viewerName, pid: id }));
        conn.on("data", (d: any) => {
          if (d?.t === "chat") setChat(prev => [...prev.slice(-99), { name: d.name, text: d.msg, ts: Date.now() }]);
          if (d?.t === "vc")   setViewerCount(d.count || 0);
          if (d?.t === "end")  {
            setStatus("Stream ended. Thanks for watching.");
            setConnected(false);
            setIsLive(false);
            if (videoRef.current) videoRef.current.srcObject = null;
          }
        });
      } catch {}
    });

    peer.on("call", (call: any) => {
      call.answer();
      call.on("stream", (remoteStream: MediaStream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = remoteStream;
          videoRef.current.play().catch(() => {});
        }
        setConnected(true);
        setStatus("");
      });
      call.on("close", () => { setConnected(false); setStatus("Reconnecting..."); setTimeout(initPeer, 3000); });
    });

    peer.on("error", () => setTimeout(() => { if (isLive) initPeer(); }, 4000));
  }

  function sendChat() {
    const msg = chatInput.trim();
    if (!msg || !connRef.current) return;
    try { connRef.current.send({ t: "chat", name: viewerName, msg }); } catch {}
    setChat(prev => [...prev.slice(-99), { name: "You", text: msg, ts: Date.now() }]);
    setChatInput("");
  }

  const recentChat = chat.slice(-6);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">

      {/* Full-screen video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ display: connected ? "block" : "none" }}
      />

      {/* Offline / loading state */}
      {!connected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 bg-[#080808]">
          {isLive ? (
            <>
              <div className="w-8 h-8 border-2 border-white/10 border-t-[#00FF85] rounded-full animate-spin"/>
              <p className="text-sm text-white/40 font-mono">{status}</p>
            </>
          ) : (
            <div className="text-center max-w-xs">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
                  <path d="M12 6v6l4 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3"/>
                </svg>
              </div>
              <p className="text-xl font-bold text-white mb-2">No live session right now.</p>
              <p className="text-sm text-white/40 mb-2">
                The Greenprint goes live soon. This page updates automatically.
              </p>
              <p className="text-xs text-white/20">
                Hi {viewerName} - you are subscribed and will get access the moment it starts.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)", height: "110px" }}/>

      {/* Top bar overlay */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 pt-4">
        {!isAppMode && (
          <Link href="/" className="mr-1">
            <div className="w-7 h-7 rounded-lg bg-[#00FF85] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M2 12L6 7L9 10L13 4" stroke="#080808" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        )}
        {isLive ? (
          <div className="flex items-center gap-1.5 bg-red-600 rounded-md px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>
            <span className="text-white text-[11px] font-black tracking-widest">LIVE</span>
          </div>
        ) : (
          <span className="text-[11px] text-white/40 font-mono bg-black/50 px-2 py-0.5 rounded-md">OFFLINE</span>
        )}
        <span className="text-sm text-white font-semibold flex-1 truncate" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
          {liveTitle || "The Greenprint"}
        </span>
        {viewerCount > 0 && (
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5.5" r="3" fill="white" fillOpacity="0.7"/>
              <path d="M2 14c0-3 2.686-5 6-5s6 2 6 5" stroke="white" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-white/70 text-[11px] font-mono">{viewerCount}</span>
          </div>
        )}
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 100%)", height: "360px" }}/>

      {/* Chat + input overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-5">
        {/* Recent chat messages */}
        {recentChat.length > 0 && (
          <div className="mb-3 space-y-2">
            {recentChat.map((m, i) => (
              <div key={i} className="flex items-start gap-2 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-[#00FF85]/20 border border-[#00FF85]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[#00FF85] text-[10px] font-bold">{m.name[0]?.toUpperCase()}</span>
                </div>
                <div className="bg-black/60 backdrop-blur-md rounded-2xl rounded-tl-sm px-3 py-2">
                  <span className="text-[#00FF85] text-xs font-bold">{m.name} </span>
                  <span className="text-white/80 text-xs">{m.text}</span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef}/>
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2 items-center">
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendChat()}
            placeholder="Say something..."
            className="flex-1 bg-white/10 backdrop-blur-md border border-white/15 rounded-full px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#00FF85]/50 transition-colors"
          />
          <button onClick={sendChat}
            className="bg-[#00FF85] text-black px-5 py-3 rounded-full text-sm font-black shrink-0 hover:bg-[#00e676] active:scale-95 transition-all"
            style={{ boxShadow: "0 0 24px rgba(0,255,133,0.45)" }}>
            Send
          </button>
        </div>

        <p className="text-white/20 text-[10px] text-center mt-2.5 leading-tight">
          Educational purposes only. Not financial advice. Trading involves risk.
        </p>
      </div>
    </div>
  );
}

/* ---------- Root ---------- */
function StreamInner() {
  const searchParams = useSearchParams();
  const isAppMode = searchParams.get("app") === "1";
  const [viewerName, setViewerName] = useState<string | null>(null);

  useEffect(() => {
    if (isAppMode) {
      const params = new URLSearchParams(window.location.search);
      setViewerName(params.get("name") || "Member");
      return;
    }
    try {
      const stored = sessionStorage.getItem("gp_stream_access");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name) setViewerName(parsed.name);
      }
    } catch {}
  }, [isAppMode]);

  if (!viewerName) return <EmailGate onAccess={name => setViewerName(name)} />;
  return <StreamPlayer viewerName={viewerName} isAppMode={isAppMode} />;
}

export default function StreamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/10 border-t-[#00FF85] rounded-full animate-spin"/>
      </div>
    }>
      <StreamInner />
    </Suspense>
  );
}
