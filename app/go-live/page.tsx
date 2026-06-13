"use client";
import { useState, useEffect, useRef } from "react";

const RTDB_URL = process.env.NEXT_PUBLIC_FIREBASE_RTDB_URL ||
  "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const HOST_PEER_ID = "gp-greenprint-live";

// Password is checked against SHA-256 hash of GO_LIVE_PASSWORD env var
// The hash is embedded at build time for client-side gate
const PWD_HASH = "688c62cbcc9582042931a11a16cd824cca4396d6a1a51f5da6f61dafb81ca1a9";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

interface Viewer { name: string; conn: any; call: any; }
interface ChatMsg { name: string; text: string; ts: number; }
interface Lead { name: string; email: string; ts: number; }

export default function GoLivePage() {
  // Auth
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [authLocked, setAuthLocked] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Stream state
  const [isLive, setIsLive] = useState(false);
  const [title, setTitle] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [statusLog, setStatusLog] = useState("Ready — press Go Live to start.");

  // Refs
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const outStreamRef = useRef<MediaStream | null>(null);
  const viewersRef = useRef<Record<string, Viewer>>({});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDstRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Chat + leads + stats
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [viewers, setViewers] = useState<Record<string, string>>({});
  const [peakViewers, setPeakViewers] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  const log = (msg: string) => setStatusLog(msg);
  const vcCount = Object.keys(viewers).length;

  // Auto-restore auth from sessionStorage
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem("gp_golive_v2") || "null");
      if (s?.ok && s.exp > Date.now()) setAuthed(true);
    } catch {}
  }, []);

  async function doAuth(e: React.FormEvent) {
    e.preventDefault();
    if (authLocked) return;
    const hash = await sha256(pwd);
    if (hash === PWD_HASH) {
      const now = Date.now();
      sessionStorage.setItem("gp_golive_v2", JSON.stringify({ ok: true, exp: now + 8*3600000 }));
      setAuthed(true);
      setAuthErr("");
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setPwd("");
      if (next >= 3) {
        setAuthLocked(true);
        setAuthErr("Too many attempts. Wait 2 minutes.");
        setTimeout(() => { setAuthLocked(false); setAttempts(0); }, 120000);
      } else {
        setAuthErr(`Wrong password. ${3 - next} attempt${3-next===1?"":"s"} left.`);
      }
    }
  }

  async function setLiveStatus(live: boolean, t?: string) {
    try {
      await fetch(`${RTDB_URL}/livestatus.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLive: live, title: t || "" }),
      });
    } catch (e) { console.warn("RTDB sync error:", e); }
  }

  function loadPeerJS(cb: () => void) {
    if ((window as any).Peer) { cb(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.2/peerjs.min.js";
    s.onload = cb;
    s.onerror = () => log("Failed to load PeerJS.");
    document.body.appendChild(s);
  }

  function startPeer() {
    const PeerJS = (window as any).Peer;
    if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }
    const peer = new PeerJS(HOST_PEER_ID, { debug: 0 });
    peerRef.current = peer;

    peer.on("open", (id: string) => log(`Connected — ID: ${id}`));
    peer.on("connection", (conn: any) => {
      conn.on("data", (d: any) => {
        if (d?.t === "join") {
          const pid = conn.peer;
          viewersRef.current[pid] = { name: d.name || "Viewer", conn, call: null };
          setViewers(prev => { const n = { ...prev, [pid]: d.name || "Viewer" }; setPeakViewers(p => Math.max(p, Object.keys(n).length)); return n; });
          // Send viewer count update to all
          broadcast({ t: "vc", count: Object.keys(viewersRef.current).length });
          if (isLive && outStreamRef.current) callViewer(pid);
        }
        if (d?.t === "chat") {
          setChat(prev => [...prev.slice(-199), { name: d.name, text: d.msg, ts: Date.now() }]);
          broadcast({ t: "chat", name: d.name, msg: d.msg });
        }
        if (d?.t === "lead") {
          setLeads(prev => [...prev, { name: d.name, email: d.email, ts: Date.now() }]);
        }
      });
      conn.on("close", () => {
        delete viewersRef.current[conn.peer];
        setViewers(prev => { const n = { ...prev }; delete n[conn.peer]; return n; });
        broadcast({ t: "vc", count: Object.keys(viewersRef.current).length });
      });
    });

    peer.on("error", (err: any) => {
      if (err.type === "unavailable-id") {
        log("Host peer ID in use — stream already active in another tab.");
      } else {
        log(`Peer error: ${err.message}`);
        setTimeout(() => startPeer(), 3000);
      }
    });
  }

  function callViewer(pid: string) {
    if (!outStreamRef.current || !peerRef.current) return;
    const v = viewersRef.current[pid];
    if (!v) return;
    try {
      const call = peerRef.current.call(pid, outStreamRef.current);
      viewersRef.current[pid].call = call;
      call.on("error", () => { try { call.close(); } catch {} });
    } catch {}
  }

  function broadcast(data: object) {
    Object.values(viewersRef.current).forEach(v => {
      try { v.conn?.send(data); } catch {}
    });
  }

  async function goLive() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      log("Use Chrome or Edge on desktop for screen sharing."); return;
    }
    log("Choose your screen — check Share Audio in the dialog.");

    try {
      // getDisplayMedia FIRST (requires direct user gesture)
      const scrn = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 60 }, cursor: "always" } as any,
        audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 48000 } as any,
      });
      screenStreamRef.current = scrn;

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = new MediaStream(scrn.getVideoTracks());
        screenVideoRef.current.muted = true;
        screenVideoRef.current.style.display = "block";
      }

      log("Screen captured — requesting mic…");
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
        video: false,
      });
      micStreamRef.current = mic;

      // Mix audio
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const dst = ctx.createMediaStreamDestination();
        audioDstRef.current = dst;
        ctx.createMediaStreamSource(mic).connect(dst);
        const screenAudio = scrn.getAudioTracks();
        if (screenAudio.length > 0) {
          ctx.createMediaStreamSource(new MediaStream(screenAudio)).connect(dst);
          log("Screen + mic audio mixed ✓");
        } else {
          log("Mic only — check Share Audio in screen picker for system sound");
        }
        outStreamRef.current = new MediaStream([scrn.getVideoTracks()[0], dst.stream.getAudioTracks()[0]]);
      } catch {
        outStreamRef.current = new MediaStream([scrn.getVideoTracks()[0], ...mic.getAudioTracks()]);
        log("Mic ready ✓");
      }

      const liveTitle = title || "The Greenprint — Live Session";
      setIsLive(true);
      setStartTime(Date.now());
      await setLiveStatus(true, liveTitle);
      log(`🔴 LIVE — calling ${Object.keys(viewersRef.current).length} waiting viewer(s)…`);

      // Call all waiting viewers
      Object.keys(viewersRef.current).forEach((pid, i) => {
        setTimeout(() => callViewer(pid), i * 80);
      });
      setTimeout(() => broadcast({ t: "live" }), Object.keys(viewersRef.current).length * 80 + 200);

      // Detect screen share stopped
      scrn.getVideoTracks()[0]?.addEventListener("ended", () => endStream());
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        log("Screen share cancelled.");
      } else {
        log(`Error: ${err.message}`);
      }
    }
  }

  async function endStream() {
    broadcast({ t: "end" });
    await setLiveStatus(false, "");
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    camStreamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    screenStreamRef.current = null; micStreamRef.current = null; outStreamRef.current = null;
    if (screenVideoRef.current) { screenVideoRef.current.srcObject = null; screenVideoRef.current.style.display = "none"; }
    if (camVideoRef.current) { camVideoRef.current.srcObject = null; }
    setIsLive(false);
    setCamOn(false);
    log("Stream ended.");
  }

  function toggleMic() {
    micStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicOn(m => !m);
  }

  async function toggleCam() {
    if (camOn) {
      camStreamRef.current?.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
      if (camVideoRef.current) { camVideoRef.current.srcObject = null; camVideoRef.current.style.display = "none"; }
      setCamOn(false);
    } else {
      try {
        const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        camStreamRef.current = cam;
        if (camVideoRef.current) { camVideoRef.current.srcObject = cam; camVideoRef.current.style.display = "block"; }
        setCamOn(true);
      } catch { log("Camera access denied."); }
    }
  }

  function copyLeads(emailsOnly = false) {
    const text = emailsOnly
      ? leads.map(l => l.email).join(", ")
      : leads.map(l => `${l.name} <${l.email}>`).join("
");
    navigator.clipboard.writeText(text);
    log(`${emailsOnly ? "Emails" : "All leads"} copied to clipboard.`);
  }

  function downloadCSV() {
    const rows = [["Name","Email","Joined"].join(","), ...leads.map(l => [l.name,l.email,new Date(l.ts).toISOString()].join(","))];
    const blob = new Blob([rows.join("
")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `greenprint-leads-${Date.now()}.csv`; a.click();
  }

  function dur() {
    if (!startTime) return "—";
    const s = Math.floor((Date.now() - startTime) / 1000);
    return `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  }

  // Init peer after auth
  useEffect(() => {
    if (!authed) return;
    loadPeerJS(() => startPeer());
    return () => { if (peerRef.current) try { peerRef.current.destroy(); } catch {} };
  }, [authed]);

  // ── Auth gate ──────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-surface border border-border rounded-card p-8">
          <div className="w-10 h-10 bg-accent rounded flex items-center justify-center mx-auto mb-6">
            <span className="text-bg font-black text-sm">GP</span>
          </div>
          <h1 className="text-center font-bold text-text mb-1">Broadcaster Access</h1>
          <p className="text-center text-xs text-muted mb-6">Go Live Control Room</p>
          <form onSubmit={doAuth} className="space-y-4">
            <input
              type="password" placeholder="Password" required
              value={pwd} onChange={e => setPwd(e.target.value)}
              disabled={authLocked}
              className={`w-full bg-bg border ${authErr ? "border-red" : "border-border"} rounded-inp px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors`}
            />
            {authErr && <p className="text-xs text-red">{authErr}</p>}
            <button type="submit" disabled={authLocked}
              className="w-full bg-accent text-bg font-bold py-2.5 rounded-btn text-sm disabled:opacity-40 btn-accent transition-all">
              Enter →
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Broadcaster control room ───────────────────────────────────
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top nav */}
      <div className="h-12 bg-surface border-b border-border flex items-center px-4 gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLive ? "bg-red pulse-dot" : "bg-muted"}`} />
          <span className={`font-mono text-xs font-bold ${isLive ? "text-red" : "text-muted"}`}>
            {isLive ? "LIVE" : "OFFLINE"}
          </span>
        </div>
        <span className="text-xs text-muted flex-1">Go Live Control Room</span>
        <span className="font-mono text-xs text-muted">{Object.keys(viewers).length} viewers</span>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Video stage */}
        <div className="flex-1 bg-black relative min-h-[220px]">
          <video ref={screenVideoRef} autoPlay muted playsInline
            className="w-full h-full object-contain" style={{ display: "none" }} />
          <video ref={camVideoRef} autoPlay muted playsInline
            className="absolute bottom-3 right-3 w-36 h-24 object-cover rounded border border-border"
            style={{ display: "none", transform: "scaleX(-1)" }} />
          {!isLive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="font-mono text-[10px] tracking-widest text-muted uppercase">Stage</div>
              <p className="text-xs text-muted">Press Go Live to start broadcasting</p>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-80 bg-surface border-t lg:border-t-0 lg:border-l border-border flex flex-col">
          {/* Controls */}
          <div className="p-4 border-b border-border">
            <div className="mb-3">
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Session title…"
                className="w-full bg-bg border border-border rounded-inp px-3 py-2 text-xs text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {!isLive ? (
                <button onClick={goLive}
                  className="flex-1 bg-accent text-bg font-bold py-2 rounded-btn text-xs btn-accent transition-all">
                  🔴 Go Live
                </button>
              ) : (
                <button onClick={endStream}
                  className="flex-1 bg-red/10 border border-red/30 text-red font-bold py-2 rounded-btn text-xs hover:bg-red/20 transition-colors">
                  ⏹ End
                </button>
              )}
              <button onClick={toggleMic}
                className={`px-3 py-2 rounded-btn text-xs border transition-colors ${
                  micOn ? "border-border text-muted hover:text-text" : "border-red/30 text-red bg-red/5"
                }`}>
                🎙 {micOn ? "Mic" : "Muted"}
              </button>
              <button onClick={toggleCam}
                className={`px-3 py-2 rounded-btn text-xs border transition-colors ${
                  camOn ? "border-accent/30 text-accent bg-accent/5" : "border-border text-muted hover:text-text"
                }`}>
                📷 Cam
              </button>
            </div>
            <p className="text-[10px] text-muted mt-2 font-mono">{statusLog}</p>
          </div>

          {/* Stats bar */}
          {isLive && (
            <div className="grid grid-cols-3 border-b border-border divide-x divide-border">
              {[
                { label: "Viewers", val: Object.keys(viewers).length },
                { label: "Peak", val: peakViewers },
                { label: "Duration", val: dur() },
              ].map(s => (
                <div key={s.label} className="p-3 text-center">
                  <div className="font-mono text-base font-bold text-accent">{s.val}</div>
                  <div className="font-mono text-[9px] text-muted uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Chat */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <p className="font-mono text-[10px] tracking-widest uppercase text-muted">Live Chat</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[100px] max-h-[240px] lg:max-h-none">
              {chat.length === 0
                ? <p className="text-[10px] text-muted">Chat appears here.</p>
                : chat.map((m, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-accent font-semibold">{m.name}: </span>
                    <span className="text-muted">{m.text}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Leads */}
          <div className="border-t border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[10px] tracking-widest uppercase text-muted">Leads ({leads.length})</p>
              <div className="flex gap-1">
                <button onClick={() => copyLeads(false)} className="text-[9px] text-muted hover:text-text border border-border rounded px-1.5 py-0.5 transition-colors">Copy All</button>
                <button onClick={() => copyLeads(true)} className="text-[9px] text-muted hover:text-text border border-border rounded px-1.5 py-0.5 transition-colors">Emails</button>
                <button onClick={downloadCSV} className="text-[9px] text-muted hover:text-text border border-border rounded px-1.5 py-0.5 transition-colors">CSV</button>
              </div>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {leads.length === 0
                ? <p className="text-[10px] text-muted">No leads yet.</p>
                : leads.map((l, i) => (
                  <div key={i} className="text-[10px] font-mono text-muted">
                    {l.name} &lt;{l.email}&gt;
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
