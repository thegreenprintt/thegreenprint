"use client";
import { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, RemoteParticipant, LocalParticipant } from "livekit-client";

// ── The Greenprint Meeting Room ──────────────────────────────────────────────
// Zoom-style group call: everyone with the meeting code can join with cam + mic.
// Completely separate from the broadcast stream (different LiveKit room).

function Tile({ participant, isLocal, version }: { participant: RemoteParticipant | LocalParticipant; isLocal: boolean; version: number }) {
  const vidRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const el = vidRef.current; if (!el) return;
    let attached: any = null;
    const pub = participant.getTrackPublication(Track.Source.Camera);
    const track: any = pub?.track;
    if (track && !(pub as any)?.isMuted) {
      track.attach(el);
      el.play().catch(() => {});
      attached = track; setHasVideo(true);
    } else {
      setHasVideo(false);
    }
    return () => { try { attached?.detach(el); } catch {} };
  }, [participant, version]);

  const name = participant.identity.replace(/^meet-/, "").replace(/-\d+$/, "");
  return (
    <div style={{ position: "relative", background: "#0d120e", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(0,255,135,.15)", aspectRatio: "16/10", minWidth: 0 }}>
      <video ref={vidRef} autoPlay playsInline muted={isLocal} style={{ width: "100%", height: "100%", objectFit: "cover", transform: isLocal ? "scaleX(-1)" : "none", display: hasVideo ? "block" : "none" }} />
      {!hasVideo && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#00ff87,#00c864)", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 900, fontSize: 22 }}>
            {name.slice(0, 1).toUpperCase() || "?"}
          </div>
        </div>
      )}
      <div style={{ position: "absolute", left: 8, bottom: 8, background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700, color: "#fff" }}>
        {isLocal ? name + " (you)" : name}
      </div>
    </div>
  );
}

export default function MeetPage() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [err, setErr] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [version, setVersion] = useState(0); // bump to re-attach tiles on track changes
  const [remotes, setRemotes] = useState<RemoteParticipant[]>([]);
  const roomRef = useRef<Room | null>(null);
  const audioElsRef = useRef<HTMLMediaElement[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gp_viewer") || "null");
      if (saved?.name) setName(saved.name);
    } catch {}
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code"); if (c) setCode(c);
  }, []);

  useEffect(() => () => { try { roomRef.current?.disconnect(); } catch {} audioElsRef.current.forEach(el => { try { el.remove(); } catch {} }); }, []);

  const refresh = (room: Room) => {
    setRemotes([...room.remoteParticipants.values()]);
    setVersion(v => v + 1);
  };

  const join = async () => {
    if (!name.trim()) { setErr("Enter your name."); return; }
    if (!code.trim()) { setErr("Enter the meeting code."); return; }
    setErr(""); setConnecting(true);
    try {
      const res = await fetch(`/api/token?mode=meeting&name=${encodeURIComponent(name.trim())}&code=${encodeURIComponent(code.trim())}`, { cache: "no-store" });
      if (res.status === 403) { setErr("Wrong meeting code."); setConnecting(false); return; }
      const { token, url } = res.ok ? await res.json() : ({} as any);
      if (!token || !url) { setErr("Meeting is unavailable right now."); setConnecting(false); return; }

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      const onChange = () => refresh(room);
      room.on(RoomEvent.ParticipantConnected, onChange);
      room.on(RoomEvent.ParticipantDisconnected, onChange);
      room.on(RoomEvent.TrackMuted, onChange);
      room.on(RoomEvent.TrackUnmuted, onChange);
      room.on(RoomEvent.LocalTrackPublished, onChange);
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach() as HTMLMediaElement;
          el.autoplay = true; el.setAttribute("playsinline", "true");
          audioElsRef.current.push(el);
          document.body.appendChild(el);
          el.play().catch(() => {});
        }
        onChange();
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach(el => { audioElsRef.current = audioElsRef.current.filter(a => a !== el); el.remove(); });
        onChange();
      });
      room.on(RoomEvent.Disconnected, () => {
        audioElsRef.current.forEach(el => { try { el.remove(); } catch {} }); audioElsRef.current = [];
        setJoined(false); setRemotes([]);
      });

      await room.connect(url, token);
      try { await room.localParticipant.setMicrophoneEnabled(true); setMicOn(true); } catch { setMicOn(false); }
      try { await room.localParticipant.setCameraEnabled(true); setCamOn(true); } catch { setCamOn(false); }
      setJoined(true); setConnecting(false);
      refresh(room);
    } catch (e: any) {
      setErr("Couldn't connect: " + (e?.message || String(e)));
      setConnecting(false);
      try { roomRef.current?.disconnect(); } catch {}
      roomRef.current = null;
    }
  };

  const leave = async () => { try { await roomRef.current?.disconnect(); } catch {} roomRef.current = null; setJoined(false); setRemotes([]); };
  const toggleMic = async () => { const r = roomRef.current; if (!r) return; try { await r.localParticipant.setMicrophoneEnabled(!micOn); setMicOn(m => !m); } catch {} };
  const toggleCam = async () => { const r = roomRef.current; if (!r) return; try { await r.localParticipant.setCameraEnabled(!camOn); setCamOn(c => !c); setVersion(v => v + 1); } catch {} };

  const count = remotes.length + (joined ? 1 : 0);
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(135deg,#050505,#0a0f0a)", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {!joined ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ animation: "rise .5s ease both", width: "100%", maxWidth: 400, textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#00ff87,#00c864)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 30 }}>👥</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 6px" }}>Greenprint Meeting</h1>
            <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13, letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 28px" }}>Cameras on · Everyone talks</p>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
              style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "#fff", marginBottom: 12, boxSizing: "border-box", fontSize: 15, outline: "none" }} />
            <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === "Enter" && join()} placeholder="Meeting code" type="password"
              style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "#fff", marginBottom: 14, boxSizing: "border-box", fontSize: 15, outline: "none", letterSpacing: "2px" }} />
            {err && <p style={{ color: "#ff5566", fontSize: 13, margin: "0 0 12px" }}>{err}</p>}
            <button onClick={join} disabled={connecting}
              style={{ width: "100%", padding: "15px 0", background: connecting ? "rgba(255,255,255,.1)" : "linear-gradient(135deg,#00ff87,#00c864)", border: "none", borderRadius: 12, color: connecting ? "rgba(255,255,255,.4)" : "#000", fontWeight: 800, cursor: connecting ? "wait" : "pointer", fontSize: 16 }}>
              {connecting ? "Joining…" : "🎥 Join Meeting"}
            </button>
            <p style={{ color: "rgba(255,255,255,.25)", fontSize: 11, marginTop: 18, lineHeight: 1.6 }}>
              Your camera and mic turn on when you join. The code comes from The Greenprint team.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(0,255,135,.12)", background: "rgba(0,0,0,.55)", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#00ff87,#00c864)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>👥</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 13 }}>Greenprint Meeting</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>{count} {count === 1 ? "person" : "people"} in the room</div>
              </div>
            </div>
            <span style={{ background: "rgba(0,255,135,.12)", border: "1px solid rgba(0,255,135,.3)", borderRadius: 20, padding: "4px 12px", fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", color: "#00ff87", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, background: "#00ff87", borderRadius: "50%", animation: "pulse 1.6s infinite", display: "inline-block" }} />IN MEETING
            </span>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, maxWidth: 1100, margin: "0 auto" }}>
              {roomRef.current && <Tile participant={roomRef.current.localParticipant} isLocal version={version} />}
              {remotes.map(p => <Tile key={p.identity} participant={p} isLocal={false} version={version} />)}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: "14px 16px calc(14px + env(safe-area-inset-bottom,0px))", borderTop: "1px solid rgba(255,255,255,.06)", background: "rgba(0,0,0,.55)", backdropFilter: "blur(12px)" }}>
            <button onClick={toggleMic} style={{ width: 54, height: 54, borderRadius: "50%", border: "1px solid rgba(255,255,255,.15)", background: micOn ? "rgba(255,255,255,.08)" : "rgba(255,45,85,.25)", color: "#fff", fontSize: 20, cursor: "pointer" }}>{micOn ? "🎙" : "🔇"}</button>
            <button onClick={toggleCam} style={{ width: 54, height: 54, borderRadius: "50%", border: "1px solid rgba(255,255,255,.15)", background: camOn ? "rgba(255,255,255,.08)" : "rgba(255,45,85,.25)", color: "#fff", fontSize: 20, cursor: "pointer" }}>{camOn ? "🎥" : "🚫"}</button>
            <button onClick={leave} style={{ height: 54, padding: "0 26px", borderRadius: 27, border: "none", background: "#ff2d55", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Leave</button>
          </div>
        </>
      )}
    </div>
  );
}
