"use client";
import { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, RemoteParticipant, LocalParticipant } from "livekit-client";

// ── The Greenprint Meeting Room v2 ───────────────────────────────────────────
// Zoom/Meet-grade group call: camera preview lobby, screen share with stage
// view, chat, speaking glow, host controls (remove / end for all).

const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const fbGet = async (p: string) => { try { const r = await fetch(`${FB}/${p}.json`, { cache: "no-store" }); return await r.json(); } catch { return null; } };
const fbPut = async (p: string, d: unknown) => { try { await fetch(`${FB}/${p}.json`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); } catch {} };
const fbPush = async (p: string, d: unknown) => { try { await fetch(`${FB}/${p}.json`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); } catch {} };

type CM = { name: string; msg: string; ts: number };
const COLORS = ["#00ff87", "#6bcbff", "#ffd93d", "#c77dff", "#ff9f43", "#ff6b9d", "#48dbfb"];
const nc = (n: string) => COLORS[n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const cleanName = (id: string) => id.replace(/^meet-/, "").replace(/-\d+$/, "");
const idKey = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);

function Tile({ participant, isLocal, version, speaking, big, isHost, onKick }: {
  participant: RemoteParticipant | LocalParticipant; isLocal: boolean; version: number;
  speaking: boolean; big?: boolean; isHost?: boolean; onKick?: () => void;
}) {
  const vidRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const source = big ? Track.Source.ScreenShare : Track.Source.Camera;

  useEffect(() => {
    const el = vidRef.current; if (!el) return;
    let attached: any = null;
    const pub = participant.getTrackPublication(source);
    const track: any = pub?.track;
    if (track && !(pub as any)?.isMuted) {
      track.attach(el); el.play().catch(() => {});
      attached = track; setHasVideo(true);
    } else setHasVideo(false);
    return () => { try { attached?.detach(el); } catch {} };
  }, [participant, version, source]);

  const micPub = participant.getTrackPublication(Track.Source.Microphone);
  const micMuted = !micPub || (micPub as any).isMuted;
  const name = cleanName(participant.identity);

  return (
    <div style={{
      position: "relative", background: "#0b0f0c", borderRadius: big ? 16 : 14, overflow: "hidden",
      border: speaking ? "2px solid #00ff87" : "1px solid rgba(255,255,255,.09)",
      boxShadow: speaking ? "0 0 22px rgba(0,255,135,.35)" : "0 4px 18px rgba(0,0,0,.35)",
      aspectRatio: big ? undefined : "16/10", minWidth: 0, height: big ? "100%" : undefined,
      transition: "border .2s, box-shadow .2s",
    }}>
      <video ref={vidRef} autoPlay playsInline muted={isLocal}
        style={{ width: "100%", height: "100%", objectFit: big ? "contain" : "cover", transform: isLocal && !big ? "scaleX(-1)" : "none", display: hasVideo ? "block" : "none", background: "#000" }} />
      {!hasVideo && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: big ? 88 : 54, height: big ? 88 : 54, borderRadius: "50%", background: `linear-gradient(135deg, ${nc(name)}, #0d3324)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: big ? 34 : 20 }}>
            {name.slice(0, 1).toUpperCase() || "?"}
          </div>
        </div>
      )}
      <div style={{ position: "absolute", left: 8, bottom: 8, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)", borderRadius: 8, padding: "3px 9px" }}>
        {micMuted && !big && <span style={{ fontSize: 10 }}>🔇</span>}
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isLocal ? `${name} (you)` : name}{big ? " — sharing" : ""}
        </span>
      </div>
      {isHost && !isLocal && !big && onKick && (
        <button onClick={onKick} title="Remove from meeting"
          style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 7, border: "1px solid rgba(255,45,85,.5)", background: "rgba(0,0,0,.6)", color: "#ff2d55", fontSize: 12, fontWeight: 900, cursor: "pointer", lineHeight: 1 }}>✕</button>
      )}
    </div>
  );
}

export default function MeetPage() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [version, setVersion] = useState(0);
  const [remotes, setRemotes] = useState<RemoteParticipant[]>([]);
  const [speakingIds, setSpeakingIds] = useState<string[]>([]);
  const [dur, setDur] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  // chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChatMsgs] = useState<CM[]>([]);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const chatOpenRef = useRef(false);
  const chatSeenRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // preview
  const previewRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const [previewOn, setPreviewOn] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const audioElsRef = useRef<HTMLMediaElement[]>([]);
  const joinTsRef = useRef(0);
  const myIdRef = useRef("");

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem("gp_viewer") || "null"); if (saved?.name) setName(saved.name); } catch {}
    try { if (localStorage.getItem("gp_host") === "true") setIsHost(true); } catch {}
    const c = new URLSearchParams(window.location.search).get("code"); if (c) setCode(c);
  }, []);

  useEffect(() => () => {
    try { roomRef.current?.disconnect(); } catch {}
    audioElsRef.current.forEach(el => { try { el.remove(); } catch {} });
    previewStreamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => { chatOpenRef.current = chatOpen; if (chatOpen) { setUnread(0); setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60); } }, [chatOpen]);
  useEffect(() => { if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, chatOpen]);
  useEffect(() => { if (!joined) return; const t0 = Date.now(); const id = setInterval(() => setDur(Math.floor((Date.now() - t0) / 1000)), 1000); return () => clearInterval(id); }, [joined]);

  // chat + control-channel poll (kick / end-for-all)
  useEffect(() => {
    if (!joined) return;
    const id = setInterval(async () => {
      const [chatData, kick, ended] = await Promise.all([
        fbGet("live/meeting/chat"),
        fbGet(`live/meeting/kick/${idKey(myIdRef.current)}`),
        fbGet("live/meeting/ended"),
      ]);
      if (chatData && typeof chatData === "object") {
        const next = (Object.values(chatData) as CM[]).filter(m => m?.msg && m?.name).sort((a, b) => a.ts - b.ts).slice(-80);
        setChatMsgs(next);
        const fresh = next.filter(m => m.ts > chatSeenRef.current);
        if (fresh.length && !chatOpenRef.current) setUnread(u => Math.min(9, u + fresh.length));
        if (fresh.length) chatSeenRef.current = Math.max(...fresh.map(m => m.ts));
      }
      if (kick && kick.ts > joinTsRef.current) { leave("You were removed by the host."); }
      if (typeof ended === "number" && ended > joinTsRef.current) { leave("The host ended the meeting."); }
    }, 2500);
    return () => clearInterval(id);
  }, [joined]);

  const startPreview = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      previewStreamRef.current = s;
      if (previewRef.current) { previewRef.current.srcObject = s; previewRef.current.play().catch(() => {}); }
      setPreviewOn(true);
    } catch { setErr("Camera permission needed for preview."); }
  };

  const refresh = (room: Room) => { setRemotes([...room.remoteParticipants.values()]); setVersion(v => v + 1); };

  const join = async () => {
    if (!name.trim()) { setErr("Enter your name."); return; }
    if (!code.trim()) { setErr("Enter the meeting code."); return; }
    setErr(""); setConnecting(true);
    try {
      const res = await fetch(`/api/token?mode=meeting&name=${encodeURIComponent(name.trim())}&code=${encodeURIComponent(code.trim())}`, { cache: "no-store" });
      if (res.status === 403) { setErr("Wrong meeting code."); setConnecting(false); return; }
      const { token, url } = res.ok ? await res.json() : ({} as any);
      if (!token || !url) { setErr("Meeting is unavailable right now."); setConnecting(false); return; }

      previewStreamRef.current?.getTracks().forEach(t => t.stop()); setPreviewOn(false);

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      const onChange = () => refresh(room);
      room.on(RoomEvent.ParticipantConnected, onChange);
      room.on(RoomEvent.ParticipantDisconnected, onChange);
      room.on(RoomEvent.TrackMuted, onChange);
      room.on(RoomEvent.TrackUnmuted, onChange);
      room.on(RoomEvent.LocalTrackPublished, onChange);
      room.on(RoomEvent.LocalTrackUnpublished, onChange);
      room.on(RoomEvent.ActiveSpeakersChanged, (sp: any[]) => setSpeakingIds(sp.map(s => s.identity)));
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach() as HTMLMediaElement;
          el.autoplay = true; el.setAttribute("playsinline", "true");
          audioElsRef.current.push(el); document.body.appendChild(el);
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
        setJoined(false); setRemotes([]); setSharing(false);
      });

      await room.connect(url, token);
      myIdRef.current = room.localParticipant.identity;
      joinTsRef.current = Date.now();
      try { await room.localParticipant.setMicrophoneEnabled(true); setMicOn(true); } catch { setMicOn(false); }
      try { await room.localParticipant.setCameraEnabled(true); setCamOn(true); } catch { setCamOn(false); }
      setJoined(true); setConnecting(false); setNotice(""); setDur(0);
      refresh(room);
      fbPush("live/meeting/chat", { name: "💚", msg: `${name.trim()} joined the meeting`, ts: Date.now() });
    } catch (e: any) {
      setErr("Couldn't connect: " + (e?.message || String(e)));
      setConnecting(false);
      try { roomRef.current?.disconnect(); } catch {}
      roomRef.current = null;
    }
  };

  const leave = async (msg = "") => {
    try { await roomRef.current?.disconnect(); } catch {}
    roomRef.current = null;
    setJoined(false); setRemotes([]); setSharing(false);
    if (msg) setNotice(msg);
  };
  const endForAll = async () => {
    if (!window.confirm("End the meeting for everyone?")) return;
    await fbPut("live/meeting/ended", Date.now());
    await leave("You ended the meeting.");
  };
  const kick = async (p: RemoteParticipant) => { await fbPut(`live/meeting/kick/${idKey(p.identity)}`, { ts: Date.now() }); };
  const toggleMic = async () => { const r = roomRef.current; if (!r) return; try { await r.localParticipant.setMicrophoneEnabled(!micOn); setMicOn(m => !m); } catch {} };
  const toggleCam = async () => { const r = roomRef.current; if (!r) return; try { await r.localParticipant.setCameraEnabled(!camOn); setCamOn(c => !c); setVersion(v => v + 1); } catch {} };
  const toggleShare = async () => {
    const r = roomRef.current; if (!r) return;
    try { await r.localParticipant.setScreenShareEnabled(!sharing); setSharing(s => !s); setVersion(v => v + 1); }
    catch { /* user cancelled the picker */ }
  };
  const sendChat = async () => {
    const m = draft.trim(); if (!m) return;
    setDraft("");
    await fbPush("live/meeting/chat", { name: name.trim() || "Guest", msg: m.slice(0, 400), ts: Date.now() });
  };
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`Join my Greenprint meeting: ${window.location.origin}/meet?code=${encodeURIComponent(code.trim())}`);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // who's sharing a screen?
  const all: (RemoteParticipant | LocalParticipant)[] = roomRef.current ? [roomRef.current.localParticipant, ...remotes] : [];
  const sharer = all.find(p => { const pub = p.getTrackPublication(Track.Source.ScreenShare); return pub && pub.track && !(pub as any).isMuted; });
  const count = remotes.length + (joined ? 1 : 0);
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
  const ctrl = (active: boolean, danger = false) => ({
    width: 52, height: 52, borderRadius: "50%", cursor: "pointer", fontSize: 19,
    border: "1px solid " + (danger ? "rgba(255,45,85,.5)" : active ? "rgba(255,255,255,.16)" : "rgba(255,45,85,.45)"),
    background: danger ? "rgba(255,45,85,.2)" : active ? "rgba(255,255,255,.08)" : "rgba(255,45,85,.22)",
    color: "#fff", transition: "all .15s",
  } as React.CSSProperties);

  return (
    <div style={{ height: "100dvh", background: "radial-gradient(1200px 700px at 70% -10%, #0a1810 0%, #050705 55%)", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:4px}
        .mbtn:hover{transform:scale(1.08)}
        .mbtn:active{transform:scale(.95)}
        @media(max-width:760px){.chatPanel{width:100%!important;border-left:none!important}}
      `}</style>

      {!joined ? (
        // ── LOBBY ──────────────────────────────────────────────────────────
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
          <div style={{ animation: "rise .5s ease both", width: "100%", maxWidth: 780, display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
            <div style={{ flex: "1 1 320px", maxWidth: 420 }}>
              <div style={{ position: "relative", aspectRatio: "16/10", background: "#0b0f0c", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(0,255,135,.2)", boxShadow: "0 12px 40px rgba(0,0,0,.5)" }}>
                <video ref={previewRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: previewOn ? "block" : "none" }} />
                {!previewOn && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#00ff87,#00c864)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🎥</div>
                    <button onClick={startPreview} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 12, padding: "9px 16px", cursor: "pointer" }}>
                      Check my camera
                    </button>
                  </div>
                )}
                <div style={{ position: "absolute", left: 10, bottom: 10, background: "rgba(0,0,0,.6)", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{name || "You"}</div>
              </div>
            </div>
            <div style={{ flex: "1 1 280px", maxWidth: 360 }}>
              <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 4px", letterSpacing: "-.02em" }}>Greenprint <span style={{ color: "#00ff87" }}>Meeting</span></h1>
              <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 24px" }}>Face to face · Screen share · Chat</p>
              {notice && <p style={{ color: "#ffc832", fontSize: 13, margin: "0 0 12px" }}>{notice}</p>}
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "#fff", marginBottom: 11, boxSizing: "border-box", fontSize: 15, outline: "none" }} />
              <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === "Enter" && join()} placeholder="Meeting code" type="password"
                style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "#fff", marginBottom: 13, boxSizing: "border-box", fontSize: 15, outline: "none", letterSpacing: "2px" }} />
              {err && <p style={{ color: "#ff5566", fontSize: 13, margin: "0 0 11px" }}>{err}</p>}
              <button onClick={join} disabled={connecting}
                style={{ width: "100%", padding: "15px 0", background: connecting ? "rgba(255,255,255,.1)" : "linear-gradient(135deg,#00ff87,#00c864)", border: "none", borderRadius: 12, color: connecting ? "rgba(255,255,255,.4)" : "#000", fontWeight: 900, cursor: connecting ? "wait" : "pointer", fontSize: 16, boxShadow: connecting ? "none" : "0 0 28px rgba(0,255,135,.3)" }}>
                {connecting ? "Joining…" : "Join Meeting →"}
              </button>
              <p style={{ color: "rgba(255,255,255,.22)", fontSize: 11, marginTop: 16, lineHeight: 1.6 }}>
                Camera & mic turn on when you join — you can mute anytime. Ask The Greenprint team for the code.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // ── IN MEETING ─────────────────────────────────────────────────────
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid rgba(0,255,135,.12)", background: "rgba(0,0,0,.55)", backdropFilter: "blur(14px)", flexShrink: 0, gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#00ff87,#00c864)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>👥</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 13, whiteSpace: "nowrap" }}>Greenprint Meeting</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>{count} in room · {fmt(dur)}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
              <button onClick={copyInvite} style={{ background: copied ? "rgba(0,255,135,.15)" : "rgba(255,255,255,.06)", border: "1px solid rgba(0,255,135,.3)", borderRadius: 9, color: copied ? "#00ff87" : "#fff", fontWeight: 700, fontSize: 11, padding: "7px 12px", cursor: "pointer" }}>
                {copied ? "✓ Copied" : "🔗 Invite"}
              </button>
              {isHost && (
                <button onClick={endForAll} style={{ background: "rgba(255,45,85,.15)", border: "1px solid rgba(255,45,85,.45)", borderRadius: 9, color: "#ff2d55", fontWeight: 800, fontSize: 11, padding: "7px 12px", cursor: "pointer" }}>
                  End for all
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
            <div style={{ flex: 1, overflow: "auto", padding: 12, minWidth: 0 }}>
              {sharer ? (
                // stage view: big shared screen + filmstrip
                <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <Tile participant={sharer} isLocal={sharer === roomRef.current?.localParticipant} version={version} speaking={false} big />
                  </div>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", flexShrink: 0, paddingBottom: 2 }}>
                    {all.map(p => (
                      <div key={p.identity} style={{ width: 150, flexShrink: 0 }}>
                        <Tile participant={p} isLocal={p === roomRef.current?.localParticipant} version={version}
                          speaking={speakingIds.includes(p.identity)} isHost={isHost}
                          onKick={p !== roomRef.current?.localParticipant ? () => kick(p as RemoteParticipant) : undefined} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 11, maxWidth: 1150, margin: "0 auto" }}>
                  {all.map(p => (
                    <Tile key={p.identity} participant={p} isLocal={p === roomRef.current?.localParticipant} version={version}
                      speaking={speakingIds.includes(p.identity)} isHost={isHost}
                      onKick={p !== roomRef.current?.localParticipant ? () => kick(p as RemoteParticipant) : undefined} />
                  ))}
                </div>
              )}
            </div>

            {chatOpen && (
              <div className="chatPanel" style={{ width: 300, borderLeft: "1px solid rgba(255,255,255,.07)", background: "rgba(6,9,7,.94)", backdropFilter: "blur(16px)", display: "flex", flexDirection: "column", flexShrink: 0, animation: "slideIn .25s ease both" }}>
                <div style={{ padding: "11px 14px", borderBottom: "1px solid rgba(255,255,255,.06)", fontWeight: 800, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>💬 Meeting Chat</span>
                  <button onClick={() => setChatOpen(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 14 }}>✕</button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
                  {chat.length === 0 && <p style={{ color: "rgba(255,255,255,.25)", fontSize: 12, textAlign: "center", marginTop: 30 }}>Say something 👋</p>}
                  {chat.map(m => (
                    <div key={m.ts + "|" + m.name} style={{ marginBottom: 9, lineHeight: 1.45 }}>
                      <span style={{ color: nc(m.name), fontWeight: 700, fontSize: 12 }}>{m.name}</span>
                      <span style={{ color: "rgba(255,255,255,.82)", fontSize: 12.5, display: "block", wordBreak: "break-word" }}>{m.msg}</span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ padding: "8px 10px calc(8px + env(safe-area-inset-bottom,0px))", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", gap: 7 }}>
                  <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Message…"
                    style={{ flex: 1, padding: "9px 12px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "#fff", fontSize: 13, outline: "none" }} />
                  <button onClick={sendChat} style={{ background: "#00ff87", border: "none", borderRadius: 10, color: "#000", fontWeight: 800, padding: "0 13px", cursor: "pointer" }}>→</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 11, padding: "12px 14px calc(12px + env(safe-area-inset-bottom,0px))", borderTop: "1px solid rgba(255,255,255,.06)", background: "rgba(0,0,0,.55)", backdropFilter: "blur(14px)", flexShrink: 0 }}>
            <button className="mbtn" onClick={toggleMic} title={micOn ? "Mute" : "Unmute"} style={ctrl(micOn)}>{micOn ? "🎙" : "🔇"}</button>
            <button className="mbtn" onClick={toggleCam} title={camOn ? "Camera off" : "Camera on"} style={ctrl(camOn)}>{camOn ? "🎥" : "🚫"}</button>
            <button className="mbtn" onClick={toggleShare} title={sharing ? "Stop sharing" : "Share your screen"} style={{ ...ctrl(true), background: sharing ? "rgba(0,255,135,.25)" : "rgba(255,255,255,.08)", border: sharing ? "1px solid rgba(0,255,135,.6)" : "1px solid rgba(255,255,255,.16)" }}>🖥</button>
            <button className="mbtn" onClick={() => setChatOpen(o => !o)} title="Chat" style={{ ...ctrl(true), position: "relative", background: chatOpen ? "rgba(0,255,135,.18)" : "rgba(255,255,255,.08)" }}>
              💬{unread > 0 && !chatOpen && <span style={{ position: "absolute", top: -2, right: -2, background: "#ff2d55", color: "#fff", fontSize: 10, fontWeight: 900, borderRadius: 9, minWidth: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>}
            </button>
            <button className="mbtn" onClick={() => leave()} style={{ height: 52, padding: "0 24px", borderRadius: 26, border: "none", background: "#ff2d55", color: "#fff", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>Leave</button>
          </div>
        </>
      )}
    </div>
  );
}
