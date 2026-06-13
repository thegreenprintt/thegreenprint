"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const HOST_PEER_ID = "gp-greenprint-live";
const RTDB_URL = process.env.NEXT_PUBLIC_FIREBASE_RTDB_URL ||
  "https://the-greenprint-53d98-default-rtdb.firebaseio.com";

interface ChatMsg { name: string; text: string; ts: number; }

function StreamInner() {
  const searchParams = useSearchParams();
  const isAppMode = searchParams.get("app") === "1";

  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [liveTitle, setLiveTitle] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Checking stream status…");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [viewerName] = useState(isAppMode ? "Member" : "Viewer");

  // Poll Firebase RTDB for live status
  useEffect(() => {
    async function checkLive() {
      try {
        const r = await fetch(`${RTDB_URL}/livestatus.json`);
        const d = await r.json();
        if (d?.isLive) {
          setIsLive(true);
          setLiveTitle(d.title || "The Greenprint — Live Session");
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
    setStatus("Connecting to stream…");

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.2/peerjs.min.js";
    script.onload = () => initPeer();
    script.onerror = () => setStatus("Failed to load stream library. Refresh the page.");
    document.body.appendChild(script);

    return () => {
      if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }
      document.body.removeChild(script);
    };
  }, [isLive]);

  function initPeer() {
    if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }
    const PeerJS = (window as any).Peer;
    const peer = new PeerJS(undefined, { debug: 0 });
    peerRef.current = peer;

    peer.on("open", (id: string) => {
      setStatus("Waiting for stream…");
      // Send join message to broadcaster
      try {
        const conn = peer.connect(HOST_PEER_ID, { reliable: true });
        connRef.current = conn;
        conn.on("open", () => {
          conn.send({ t: "join", name: viewerName, pid: id });
        });
        conn.on("data", (d: any) => {
          if (d?.t === "chat") {
            setChat(prev => [...prev.slice(-99), { name: d.name, text: d.msg, ts: Date.now() }]);
          }
          if (d?.t === "vc") setViewerCount(d.count || 0);
          if (d?.t === "live") setStatus("Stream starting…");
          if (d?.t === "end") {
            setStatus("Stream ended.");
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
      call.on("error", () => setStatus("Stream error. Reconnecting…"));
      call.on("close", () => {
        setConnected(false);
        setStatus("Reconnecting…");
        setTimeout(initPeer, 3000);
      });
    });

    peer.on("error", () => {
      setTimeout(() => { if (isLive) initPeer(); }, 4000);
    });
  }

  function sendChat() {
    const msg = chatInput.trim();
    if (!msg || !connRef.current) return;
    try { connRef.current.send({ t: "chat", name: viewerName, msg }); } catch {}
    setChat(prev => [...prev.slice(-99), { name: "You", text: msg, ts: Date.now() }]);
    setChatInput("");
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <div className="h-11 bg-surface border-b border-border flex items-center px-4 gap-4 shrink-0">
        {isLive ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red pulse-dot" />
            <span className="font-mono text-xs text-red font-bold">LIVE</span>
          </div>
        ) : (
          <span className="font-mono text-xs text-muted">OFFLINE</span>
        )}
        <span className="text-xs text-muted flex-1 truncate">{liveTitle || "The Greenprint"}</span>
        {viewerCount > 0 && <span className="font-mono text-[10px] text-muted">{viewerCount} watching</span>}
        {!isAppMode && <Link href="/dashboard" className="text-[10px] text-muted hover:text-text">← Dashboard</Link>}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Video */}
        <div className="flex-1 bg-black relative min-h-[200px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-contain"
            style={{ display: connected ? "block" : "none" }}
          />
          {!connected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              {isLive ? (
                <>
                  <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
                  <p className="text-sm text-muted font-mono">{status}</p>
                </>
              ) : (
                <div className="text-center px-6">
                  <p className="text-xl font-bold text-text mb-2">No session live right now.</p>
                  <p className="text-sm text-muted mb-6">Jay will be live soon. Check the dashboard for the next scheduled session.</p>
                  {!isAppMode && (
                    <Link href="/dashboard"><Button variant="ghost" size="sm">← Back to Dashboard</Button></Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="w-full lg:w-72 bg-surface border-t lg:border-t-0 lg:border-l border-border flex flex-col">
          <div className="px-3 py-2 border-b border-border">
            <p className="font-mono text-[10px] tracking-widest uppercase text-muted">Live Chat</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px] max-h-[300px] lg:max-h-none">
            {chat.length === 0 ? (
              <p className="text-[10px] text-muted">Chat will appear here once the stream starts.</p>
            ) : (
              chat.map((m, i) => (
                <div key={i} className="text-xs">
                  <span className="text-accent font-semibold">{m.name}: </span>
                  <span className="text-muted">{m.text}</span>
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              placeholder="Say something…"
              className="flex-1 bg-bg border border-border rounded-inp px-2.5 py-1.5 text-xs text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors min-w-0"
            />
            <button onClick={sendChat}
              className="bg-accent text-bg px-3 py-1.5 rounded-btn text-xs font-bold shrink-0 hover:bg-accent/90 transition-colors">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StreamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" /></div>}>
      <StreamInner />
    </Suspense>
  );
}
