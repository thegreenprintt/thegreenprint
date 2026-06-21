"use client";
import { useState, useEffect, useRef } from "react";
import {
  Room,
  RoomEvent,
  Track,
  createLocalScreenTracks,
  createLocalVideoTrack,
} from "livekit-client";

const HASH = "f7bbb300691e55f6eaad18327a462a30ff3bf38a4a36a24e9458fdfc508d4ab1";
const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";

async function sha256(msg: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
const put = async (p: string, d: unknown) => { try { await fetch(`${FB}/${p}.json`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d), keepalive: true }); } catch {} };
const push = async (p: string, d: unknown) => { try { await fetch(`${FB}/${p}.json`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); } catch {} };
const del = async (p: string) => { try { await fetch(`${FB}/${p}.json`, { method: "DELETE" }); } catch {} };

export default function GoLive() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [chat, setChat] = useState<{ name: string; msg: string; ts: number }[]>([]);
  const [chatMsg, setChatMsg] = useState("");

  const screenRef = useRef<HTMLVideoElement>(null);
  const camRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const hbRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const camTrackRef = useRef<any>(null);

  useEffect(() => {
    if (!authed) return;
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
  }, [authed]);

  const startStream = async () => {
    try {
      setStatus("Getting screen share...");
      const screenTracks = await createLocalScreenTracks({ audio: true });
      const videoTrack = screenTracks.find(t => t.kind === Track.Kind.Video);
      const audioTrack = screenTracks.find(t => t.kind === Track.Kind.Audio);
      if (!videoTrack) throw new Error("No video track");
      videoTrack.attach(screenRef.current!);
      setStatus("Connecting...");
      const res = await fetch("/api/lk-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHost: true }),
      });
      const { token, url } = await res.json();
      if (!url) { setStatus("Missing NEXT_PUBLIC_LIVEKIT_URL env var."); return; }
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      room.on(RoomEvent.ParticipantConnected, () => setViewerCount(room.remoteParticipants.size));
      room.on(RoomEvent.ParticipantDisconnected, () => setViewerCount(room.remoteParticipants.size));
      await room.connect(url, token);
      await room.localParticipant.publishTrack(videoTrack, { name: "screen", source: Track.Source.ScreenShare, simulcast: false });
      if (audioTrack) await room.localParticipant.publishTrack(audioTrack, { name: "screen-audio", source: Track.Source.ScreenShareAudio });
      setLive(true);
      setStatus("Live");
      setViewerCount(room.remoteParticipants.size);
      await put("livestatus", { live: true, ts: Date.now() });
      hbRef.current = setInterval(() => put("livestatus", { live: true, ts: Date.now() }), 10000);
      videoTrack.mediaStreamTrack.addEventListener("ended", () => stopStream());
    } catch (err: any) {
      setStatus("Error: " + (err.message || String(err)));
    }
  };

  const stopStream = async () => {
    if (hbRef.current) clearInterval(hbRef.current);
    if (roomRef.current) { await roomRef.current.disconnect(); roomRef.current = null; }
    await put("livestatus", { live: false, ts: Date.now() });
    setLive(false); setStatus(""); setViewerCount(0); setCamOn(false); camTrackRef.current = null;
  };

  const toggleCam = async () => {
    if (!roomRef.current) return;
    if (camOn) {
      if (camTrackRef.current) { await roomRef.current.localParticipant.unpublishTrack(camTrackRef.current); camTrackRef.current.stop(); camTrackRef.current = null; }
      setCamOn(false);
    } else {
      const track = await createLocalVideoTrack({ facingMode: "user" });
      camTrackRef.current = track;
      track.attach(camRef.current!);
      await roomRef.current.localParticipant.publishTrack(track, { name: "camera", source: Track.Source.Camera, simulcast: true });
      setCamOn(true);
    }
  };

  const toggleMic = async () => {
    if (!roomRef.current) return;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!micOn);
    setMicOn(m => !m);
  };

  const sendChat = async () => {
    if (!chatMsg.trim()) return;
    await push("live/chat", { name: "Host", msg: chatMsg.trim(), ts: Date.now() });
    setChatMsg("");
  };

  const auth = async () => {
    const hash = await sha256(pw);
    if (hash === HASH) {
      setAuthed(true);
      await put("livestatus", { live: false, ts: Date.now() });
      await del("live");
    } else { alert("Wrong password"); }
  };

  if (!authed) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: 40, width: 320 }}>
        <h2 style={{ color: "#fff", marginBottom: 8, textAlign: "center" }}>Studio</h2>
        <p style={{ color: "#555", textAlign: "center", marginBottom: 24, fontSize: 13 }}>The Greenprint</p>
        <input type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && auth()} style={{ width: "100%", padding: "10px 14px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", marginBottom: 12, boxSizing: "border-box" }} />
        <button onClick={auth} style={{ width: "100%", padding: "10px 0", background: "#00ff87", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, cursor: "pointer" }}>Enter</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", padding: 24 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, color: "#00ff87", fontWeight: 800 }}>The Greenprint — Studio</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ background: "#1a1a1a", borderRadius: 20, padding: "6px 16px", fontSize: 13 }}>👁 {viewerCount} watching</span>
            {live && <span style={{ background: "#ff0033", borderRadius: 20, padding: "6px 16px", fontSize: 13, fontWeight: 700 }}>● LIVE</span>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
          <div>
            <div style={{ position: "relative", background: "#111", borderRadius: 12, overflow: "hidden", aspectRatio: "16/9" }}>
              <video ref={screenRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
              {camOn && (
                <div style={{ position: "absolute", bottom: 16, right: 16, width: 180, height: 101, borderRadius: 8, overflow: "hidden", border: "2px solid #00ff87" }}>
                  <video ref={camRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                </div>
              )}
              {!live && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: "#000" }}>
                  <span style={{ fontSize: 48 }}>🎬</span>
                  <span style={{ color: "#555", fontSize: 16 }}>Click Go Live to start</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
              {!live ? (
                <button onClick={startStream} style={{ background: "#00ff87", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, padding: "12px 28px", fontSize: 15, cursor: "pointer" }}>🔴 Go Live</button>
              ) : (
                <button onClick={stopStream} style={{ background: "#ff0033", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, padding: "12px 28px", fontSize: 15, cursor: "pointer" }}>⏹ End Stream</button>
              )}
              <button onClick={toggleCam} disabled={!live} style={{ background: camOn ? "#00ff87" : "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: camOn ? "#000" : "#fff", padding: "10px 20px", cursor: live ? "pointer" : "not-allowed", opacity: live ? 1 : 0.4, fontWeight: 600 }}>{camOn ? "📸 Cam ON" : "📷 Cam OFF"}</button>
              <button onClick={toggleMic} disabled={!live} style={{ background: micOn ? "#00ff87" : "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: micOn ? "#000" : "#fff", padding: "10px 20px", cursor: live ? "pointer" : "not-allowed", opacity: live ? 1 : 0.4, fontWeight: 600 }}>{micOn ? "🎤 Mic ON" : "🔇 Mic OFF"}</button>
              {status && <span style={{ color: status.startsWith("Error") ? "#ff4444" : "#00ff87", fontSize: 13 }}>{status}</span>}
            </div>
          </div>
          <div style={{ background: "#111", borderRadius: 12, border: "1px solid #222", display: "flex", flexDirection: "column", maxHeight: 540 }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #222", fontWeight: 600, fontSize: 14 }}>💬 Live Chat</div>
            <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              {chat.length === 0 && <p style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 20 }}>No messages yet</p>}
              {chat.map((m, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <span style={{ color: "#00ff87", fontWeight: 700, fontSize: 13 }}>{m.name}: </span>
                  <span style={{ color: "#ddd", fontSize: 13 }}>{m.msg}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: 12, borderTop: "1px solid #222", display: "flex", gap: 8 }}>
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Say something..." style={{ flex: 1, background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, color: "#fff", padding: "8px 10px", fontSize: 13 }} />
              <button onClick={sendChat} style={{ background: "#00ff87", border: "none", borderRadius: 6, color: "#000", fontWeight: 700, padding: "8px 14px", cursor: "pointer" }}>→</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
