"use client";
import { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, RemoteTrack } from "livekit-client";

const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const get = async (p: string) => { try { const r = await fetch(`${FB}/${p}.json`, { cache: "no-store" }); return await r.json(); } catch { return null; } };
const push = async (p: string, d: unknown) => { try { await fetch(`${FB}/${p}.json`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); } catch {} };

export default function StreamPage() {
  const [isLive, setIsLive] = useState(false);
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [statusText, setStatusText] = useState("Checking stream...");
  const [chat, setChat] = useState<{ name: string; msg: string; ts: number }[]>([]);
  const [chatMsg, setChatMsg] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);
  const [needsClick, setNeedsClick] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const pendingVideoRef = useRef<RemoteTrack | null>(null);

  // Live status polling
  useEffect(() => {
    const apply = (live: boolean) => setIsLive(live);
    get("livestatus").then(d => apply(!!d?.live));
    const es = new EventSource(`${FB}/livestatus.json`);
    es.addEventListener("put", (e: MessageEvent) => {
      try { const d = JSON.parse(e.data); apply(!!d?.data?.live); } catch {}
    });
    const poll = setInterval(() => get("livestatus").then(d => apply(!!d?.live)), 3000);
    return () => { es.close(); clearInterval(poll); };
  }, []);

  // Once video element exists, attach any pending track
  useEffect(() => {
    if (joined && videoRef.current && pendingVideoRef.current) {
      pendingVideoRef.current.attach(videoRef.current);
      videoRef.current.play().catch(() => setNeedsClick(true));
      setHasVideo(true);
      pendingVideoRef.current = null;
    }
  }, [joined]);

  // Chat SSE
  useEffect(() => {
    if (!joined) return;
    const es = new EventSource(`${FB}/live/chat.json`);
    es.addEventListener("put", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        if (d?.data && typeof d.data === "object") {
          const msgs = Object.values(d.data) as { name: string; msg: string; ts: number }[];
          setChat(msgs.sort((a, b) => a.ts - b.ts).slice(-50));
        }
      } catch {}
    });
    es.addEventListener("patch", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        if (d?.data) {
          const newMsg = Object.values(d.data)[0] as { name: string; msg: string; ts: number };
          if (newMsg) setChat(prev => [...prev, newMsg].slice(-50));
        }
      } catch {}
    });
    return () => es.close();
  }, [joined]);

  const attachVideo = (track: RemoteTrack) => {
    if (videoRef.current) {
      track.attach(videoRef.current);
      videoRef.current.play().catch(() => setNeedsClick(true));
      setHasVideo(true);
    } else {
      // Video element not in DOM yet — store and attach after render
      pendingVideoRef.current = track;
    }
  };

  const joinStream = async () => {
    if (!name.trim()) { alert("Enter your name"); return; }
    setConnecting(true);
    setStatusText("Connecting...");
    try {
      const res = await fetch("/api/lk-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), isHost: false }),
      });
      const { token, url } = await res.json();
      if (!url) { setStatusText("Stream unavailable."); setConnecting(false); return; }

      const room = new Room({ adaptiveStream: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Video) {
          attachVideo(track);
          setStatusText("Live");
        }
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.autoplay = true;
          document.body.appendChild(el);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach();
        if (track.kind === Track.Kind.Video) setHasVideo(false);
      });

      room.on(RoomEvent.ParticipantConnected, () => setViewerCount(room.remoteParticipants.size));
      room.on(RoomEvent.ParticipantDisconnected, () => setViewerCount(room.remoteParticipants.size));
      room.on(RoomEvent.Disconnected, () => {
        setStatusText("Disconnected.");
        setJoined(false);
        setConnecting(false);
        setHasVideo(false);
      });

      await room.connect(url, token);
      setJoined(true);
      setConnecting(false);
      setViewerCount(room.remoteParticipants.size);

      // Attach already-published tracks
      room.remoteParticipants.forEach(p => {
        p.trackPublications.forEach(pub => {
          if (pub.track) {
            const t = pub.track;
            if (t.kind === Track.Kind.Video) attachVideo(t);
            if (t.kind === Track.Kind.Audio) {
              const el = t.attach();
              el.autoplay = true;
              document.body.appendChild(el);
            }
          }
        });
      });

    } catch (err: any) {
      setStatusText("Error: " + (err.message || String(err)));
      setConnecting(false);
    }
  };

  const sendChat = async () => {
    if (!chatMsg.trim()) return;
    await push("live/chat", { name: name || "Viewer", msg: chatMsg.trim(), ts: Date.now() });
    setChatMsg("");
  };

  const handleVideoClick = () => {
    videoRef.current?.play().catch(() => {});
    setNeedsClick(false);
  };

  if (!joined) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>The Greenprint</h1>
        <p style={{ color: "#555", marginBottom: 40, fontSize: 14 }}>Live Stream</p>
        {isLive ? (
          <div style={{ background: "#111", borderRadius: 16, padding: 40, width: "100%", maxWidth: 380, border: "1px solid #222" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <span style={{ width: 10, height: 10, background: "#ff0033", borderRadius: "50%", display: "inline-block", animation: "pulse 1.2s infinite" }} />
              <span style={{ fontWeight: 700, color: "#ff0033", fontSize: 14 }}>LIVE NOW</span>
            </div>
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && joinStream()} placeholder="Your name"
              style={{ width: "100%", padding: "12px 14px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", marginBottom: 12, boxSizing: "border-box", fontSize: 15 }} />
            <button onClick={joinStream} disabled={connecting}
              style={{ width: "100%", padding: "13px 0", background: connecting ? "#333" : "#00ff87", border: "none", borderRadius: 8, color: connecting ? "#888" : "#000", fontWeight: 700, cursor: connecting ? "wait" : "pointer", fontSize: 15 }}>
              {connecting ? "Connecting..." : "▶ Watch Live"}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📡</div>
            <h2 style={{ color: "#444", fontWeight: 500, fontSize: 20 }}>Stream Offline</h2>
            <p style={{ color: "#333", fontSize: 14 }}>Check back when the stream starts</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", padding: "16px" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .stream-grid{display:grid;grid-template-columns:1fr 320px;gap:16px}
        .chat-box{height:420px}
        @media(max-width:768px){
          .stream-grid{grid-template-columns:1fr;grid-template-rows:auto 1fr}
          .chat-box{height:280px}
        }
      `}</style>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 20, color: "#00ff87", fontWeight: 800 }}>The Greenprint</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ background: "#1a1a1a", borderRadius: 20, padding: "5px 12px", fontSize: 12 }}>👁 {viewerCount + 1}</span>
            <span style={{ background: "#ff0033", borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, background: "#fff", borderRadius: "50%", animation: "pulse 1.2s infinite" }} />LIVE
            </span>
          </div>
        </div>

        <div className="stream-grid">
          <div>
            <div style={{ background: "#111", borderRadius: 12, overflow: "hidden", position: "relative", aspectRatio: "16/9" }} onClick={handleVideoClick}>
              <video ref={videoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000", display: "block" }} />
              {!hasVideo && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                  <div style={{ width: 36, height: 36, border: "3px solid #00ff87", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
                  <span style={{ color: "#666", fontSize: 13 }}>{statusText}</span>
                </div>
              )}
              {needsClick && hasVideo && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", cursor: "pointer" }}>
                  <div style={{ background: "#00ff87", color: "#000", fontWeight: 700, borderRadius: 12, padding: "16px 32px", fontSize: 18 }}>▶ Tap to Play</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: "#111", borderRadius: 12, border: "1px solid #222", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #222", fontWeight: 600, fontSize: 14 }}>💬 Live Chat</div>
            <div className="chat-box" style={{ overflowY: "auto", padding: 12, flex: 1 }}>
              {chat.length === 0 && <p style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 20 }}>No messages yet</p>}
              {chat.map((m, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <span style={{ color: "#00ff87", fontWeight: 700, fontSize: 13 }}>{m.name}: </span>
                  <span style={{ color: "#ddd", fontSize: 13 }}>{m.msg}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: 10, borderTop: "1px solid #222", display: "flex", gap: 8 }}>
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Say something..."
                style={{ flex: 1, background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, color: "#fff", padding: "8px 10px", fontSize: 13 }} />
              <button onClick={sendChat} style={{ background: "#00ff87", border: "none", borderRadius: 6, color: "#000", fontWeight: 700, padding: "8px 14px", cursor: "pointer" }}>→</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
