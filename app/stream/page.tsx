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

/* âââ Email Gate âââââââââââââââââââââââââââââââââââââââââââââââ */
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

    // Store subscriber info â you can wire this to your email list / Supabase later
    try {
      sessionStorage.setItem("gp_stream_access", JSON.stringify({ name: name.trim(), email: email.trim(), ts: Date.now() }));
    } catch {}

    // Small delay for feel
    await new Promise(r => setTimeout(r, 600));
    onAccess(name.trim());
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#00FF85]/5 blur-[120px]"/>
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }}/>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
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

        {/* Card */}
        <div className="rounded-3xl border border-white/8 bg-white/3 p-8 backdrop-blur-sm">
          {/* Live badge */}
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
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wide block mb-1.5">
                First Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#00FF85]/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wide block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#00FF85]/50 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00FF85] text-black font-black py-4 rounded-xl text-base hover:bg-[#00e676] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ boxShadow: "0 0 30px rgba(0,255,133,0.3)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Getting you inâ¦
                </span>
              ) : (
                "Watch Free â Get Access"
              )}
            </button>
          </form>

          <p className="text-white/20 text-xs text-center mt-4">
            Free access. No credit card required. Unsubscribe anytime.
          </p>
        </div>

        <p className="text-white/15 text-xs text-center mt-6 max-w-sm mx-auto leading-relaxed">
          By subscribing you agree to receive updates from The Greenprint. All content is for educational purposes only and does not constitute financial advice. Trading involves risk.
        </p>

        <div className="flex justify-center mt-6">
          <Link href="/" className="text-white/25 text-xs hover:text-white/50 transition-colors">
            â Back to The Greenprint
          </Link>
        </div>
      </div>
    </div>
  );
}

/* âââ Stream Player ââââââââââââââââââââââââââââââââââââââââââââ */
function StreamPlayer({ viewerName, isAppMode }: { viewerName: string; isAppMode: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [liveTitle, setLiveTitle] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Checking stream statusâ¦");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Poll Firebase for live status
  useEffect(() => {
    async function checkLive() {
      try {
        const r = await fetch(`${RTDB_URL}/livestatus.json`);
        const d = await r.json();
        if (d?.isLive) {
          setIsLive(true);
          setLiveTitle(d.title || "The Greenprint â Live Session");
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

  // Load PeerJS and connect when live
  useEffect(() => {
    if (!isLive) return;
    setStatus("Connecting to streamâ¦");
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.2/peerjs.min.js";
    script.onload = () => initPeer();
    script.onerror = () => setStatus("Failed to load stream. Try refreshing the page.");
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
    const peer = new PeerJS(undefined, { debug: 0, config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" },{ urls: "stun:stun1.l.google.com:19302" },{ urls: "stun:stun2.l.google.com:19302" }] } });
    peerRef.current = peer;

    peer.on("open", (id: string) => {
      setStatus("Waiting for streamâ¦");
      try {
        const conn = peer.connect(HOST_PEER_ID, { reliable: true });
        connRef.current = conn;
        conn.on("open", () => { conn.send({ t: "join", name: viewerName, pid: id }); });
        conn.on("data", (d: any) => {
          if (d?.t === "chat") setChat(prev => [...prev.slice(-99), { name: d.name, text: d.msg, ts: Date.now() }]);
          if (d?.t === "vc") setViewerCount(d.count || 0);
          if (d?.t === "end") {
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
      call.on("close", () => { setConnected(false); setStatus("Reconnectingâ¦"); setTimeout(initPeer, 3000); });
    });

    peer.on("error", () => { setTimeout(() => { if (isLive) initPeer(); }, 4000); });
  }

  function sendChat() {
    const msg = chatInput.trim();
    if (!msg || !connRef.current) return;
    try { connRef.current.send({ t: "chat", name: viewerName, msg }); } catch {}
    setChat(prev => [...prev.slice(-99), { name: "You", text: msg, ts: Date.now() }]);
    setChatInput("");
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      {/* Top bar */}
      <div className="h-12 bg-[#0d0d0d] border-b border-white/5 flex items-center px-4 gap-4 shrink-0">
        {!isAppMode && (
          <Link href="/" className="flex items-center gap-1.5 mr-2">
            <div className="w-6 h-6 rounded-md bg-[#00FF85] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M2 12L6 7L9 10L13 4" stroke="#080808" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        )}
        {isLive ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
            <span className="text-xs text-red-400 font-black tracking-widest">LIVE</span>
          </div>
        ) : (
          <span className="text-xs text-white/20 font-mono">OFFLINE</span>
        )}
        <span className="text-xs text-white/40 flex-1 truncate">{liveTitle || "The Greenprint"}</span>
        {viewerCount > 0 && (
          <span className="text-xs text-white/25 font-mono">{viewerCount} watching</span>
        )}
        <span className="text-xs text-white/25 font-mono hidden sm:block">
          {viewerName}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Video area */}
        <div className="flex-1 bg-black relative min-h-[200px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
            style={{ display: connected ? "block" : "none" }}
          />
          {!connected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
              {isLive ? (
                <>
                  <div className="w-6 h-6 border-2 border-white/10 border-t-[#00FF85] rounded-full animate-spin"/>
                  <p className="text-sm text-white/40 font-mono">{status}</p>
                </>
              ) : (
                <div className="text-center max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-6">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
                      <path d="M12 6v6l4 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3"/>
                    </svg>
                  </div>
                  <p className="text-xl font-bold text-white mb-2">No session live right now.</p>
                  <p className="text-sm text-white/40 mb-2">
                    The Greenprint will be live soon. When a session starts, it will appear here automatically.
                  </p>
                  <p className="text-xs text-white/20">
                    Hi, {viewerName} â you&apos;re subscribed. You&apos;ll get access the moment the stream goes live.
                  </p>
                  {!isAppMode && (
                    <Link href="/#pricing" className="mt-6 inline-block text-[#00FF85] text-sm font-semibold hover:underline">
                      Upgrade for more access â
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        <div className="w-full lg:w-72 bg-[#0d0d0d] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-white/30" viewBox="0 0 16 16" fill="none">
              <path d="M2 3h12a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 3V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <span className="text-white/30 text-xs font-semibold uppercase tracking-widest">Live Chat</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px] max-h-[300px] lg:max-h-none">
            {chat.length === 0 ? (
              <p className="text-white/20 text-xs mt-2">
                {isLive ? "Be the first to say something!" : "Chat will be active when the stream starts."}
              </p>
            ) : (
              chat.map((m, i) => (
                <div key={i} className="text-xs">
                  <span className="text-[#00FF85] font-semibold">{m.name}: </span>
                  <span className="text-white/50">{m.text}</span>
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t border-white/5 flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              placeholder="Say somethingâ¦"
              className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#00FF85]/40 transition-colors min-w-0"
            />
            <button onClick={sendChat}
              className="bg-[#00FF85] text-black px-3 py-2 rounded-xl text-xs font-bold shrink-0 hover:bg-[#00e676] transition-colors">
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Disclaimer bar */}
      <div className="border-t border-white/5 bg-[#0a0a0a] px-4 py-2 text-center">
        <p className="text-white/15 text-[10px]">
          For educational purposes only. Not financial advice. Trading involves risk. Results not guaranteed.
        </p>
      </div>
    </div>
  );
}

/* âââ Root âââââââââââââââââââââââââââââââââââââââââââââââââââââ */
function StreamInner() {
  const searchParams = useSearchParams();
  const isAppMode = searchParams.get("app") === "1";
  const [viewerName, setViewerName] = useState<string | null>(null);

  // Check if already subscribed this session
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("gp_stream_access");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name) setViewerName(parsed.name);
      }
    } catch {}
    // App mode bypasses the gate
    if (isAppMode) setViewerName("Member");
  }, [isAppMode]);

  if (!viewerName) {
    return <EmailGate onAccess={name => setViewerName(name)} />;
  }

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
