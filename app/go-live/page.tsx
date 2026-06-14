"use client";
import { useState, useEffect, useRef } from "react";

const RTDB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_RTDB_URL ||
  "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const HOST_PEER_ID = "gp-greenprint-live";

// Password: Greenprint1!
// To change password: run  echo -n "YourNewPassword" | sha256sum  then paste hash below
const PWD_HASH = "f7bbb300691e55f6eaad18327a462a30ff3bf38a4a36a24e9458fdfc508d4ab1";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

interface Viewer { name: string; conn: any; call: any; }
interface ChatMsg { name: string; text: string; ts: number; }
interface Lead   { name: string; email: string; ts: number; }

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export default function GoLivePage() {
  // Auth
  const [authed, setAuthed]         = useState(false);
  const [pwd, setPwd]               = useState("");
  const [authErr, setAuthErr]       = useState("");
  const [authLocked, setAuthLocked] = useState(false);
  const [attempts, setAttempts]     = useState(0);

  // Stream state
  const [isLive, setIsLive]       = useState(false);
  const [title, setTitle]         = useState("");
  const [micOn, setMicOn]         = useState(true);
  const [camOn, setCamOn]         = useState(false);
  const [statusLog, setStatusLog] = useState("Ready Ã¢ÂÂ press Go Live to start.");
  const [elapsed, setElapsed]     = useState("00:00:00");

  // Refs
  const screenVideoRef  = useRef<HTMLVideoElement>(null);
  const camVideoRef     = useRef<HTMLVideoElement>(null);
  const peerRef         = useRef<any>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef    = useRef<MediaStream | null>(null);
  const camStreamRef    = useRef<MediaStream | null>(null);
  const outStreamRef    = useRef<MediaStream | null>(null);
  const viewersRef      = useRef<Record<string, Viewer>>({});
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const audioDstRef     = useRef<MediaStreamAudioDestinationNode | null>(null);
  const startTimeRef    = useRef<number | null>(null);
  const timerRef        = useRef<any>(null);

  // Chat + leads + stats
  const [chat, setChat]           = useState<ChatMsg[]>([]);
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [viewers, setViewers]     = useState<Record<string, string>>({});
  const [peakViewers, setPeakViewers] = useState(0);

  const log = (msg: string) => setStatusLog(msg);

  // Restore auth from session
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem("gp_golive_v3") || "null");
      if (s?.ok && s.exp > Date.now()) setAuthed(true);
    } catch {}
  }, []);

  // Timer
  useEffect(() => {
    if (isLive) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000);
        setElapsed(
          `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
        );
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setElapsed("00:00:00");
    }
    return () => clearInterval(timerRef.current);
  }, [isLive]);

  async function doAuth(e: React.FormEvent) {
    e.preventDefault();
    if (authLocked) return;
    const hash = await sha256(pwd);
    if (hash === PWD_HASH) {
      sessionStorage.setItem("gp_golive_v3", JSON.stringify({ ok: true, exp: Date.now() + 8 * 3600000 }));
      setAuthed(true);
      setAuthErr("");
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setPwd("");
      if (next >= 5) {
        setAuthLocked(true);
        setAuthErr("Too many attempts. Wait 2 minutes.");
        setTimeout(() => { setAuthLocked(false); setAttempts(0); }, 120000);
      } else {
        setAuthErr(`Wrong password. ${5 - next} attempt${5 - next === 1 ? "" : "s"} left.`);
      }
    }
  }

  async function setLiveStatus(live: boolean, t?: string) {
    try {
      await fetch(`${RTDB_URL}/livestatus.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLive: live, title: t || "", ts: Date.now() }),
      });
    } catch (e) { console.warn("Firebase sync error:", e); }
  }

  function loadPeerJS(cb: () => void) {
    if ((window as any).Peer) { cb(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.2/peerjs.min.js";
    s.onload = cb;
    s.onerror = () => log("Failed to load PeerJS. Check your internet connection.");
    document.body.appendChild(s);
  }

  function startPeer() {
    const PeerJS = (window as any).Peer;
    if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }
    const peer = new PeerJS(HOST_PEER_ID, { debug: 0, config: { iceServers: ICE_SERVERS } });
    peerRef.current = peer;

    peer.on("open", (id: string) => {
      log(`Ã¢ÂÂ Broadcaster ready Ã¢ÂÂ ID: ${id}. Press Go Live when ready.`);
    });

    peer.on("connection", (conn: any) => {
      conn.on("data", (d: any) => {
        if (d?.t === "join") {
          const pid = conn.peer;
          viewersRef.current[pid] = { name: d.name || "Viewer", conn, call: null };
          setViewers(prev => {
            const n = { ...prev, [pid]: d.name || "Viewer" };
            setPeakViewers(p => Math.max(p, Object.keys(n).length));
            return n;
          });
          broadcast({ t: "vc", count: Object.keys(viewersRef.current).length });
          if (outStreamRef.current) callViewer(pid);
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
        log("Ã¢ÂÂ Ã¯Â¸Â Stream ID already in use Ã¢ÂÂ you may already be live in another tab.");
      } else {
        log(`Peer error: ${err.message}. ReconnectingÃ¢ÂÂ¦`);
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
      log("Ã¢ÂÂ Ã¯Â¸Â Use Chrome or Edge on desktop for screen sharing.");
      return;
    }
    log("Choose your screen Ã¢ÂÂ select 'Share Audio' if you want system sound.");
    try {
      const scrn = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 60 }, cursor: "always" } as any,
        audio: { echoCancellation: false, noiseSuppression: false } as any,
      });
      screenStreamRef.current = scrn;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = new MediaStream(scrn.getVideoTracks());
        screenVideoRef.current.muted = true;
        screenVideoRef.current.style.display = "block";
      }

      log("Screen captured Ã¢ÂÂ requesting micÃ¢ÂÂ¦");
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      micStreamRef.current = mic;

      // Mix screen audio + mic
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const dst = ctx.createMediaStreamDestination();
        audioDstRef.current = dst;
        ctx.createMediaStreamSource(mic).connect(dst);
        const screenAudio = scrn.getAudioTracks();
        if (screenAudio.length > 0) {
          ctx.createMediaStreamSource(new MediaStream(screenAudio)).connect(dst);
          log("Ã¢ÂÂ Screen + mic audio mixed. Going liveÃ¢ÂÂ¦");
        } else {
          log("Ã¢ÂÂ Mic ready (no screen audio selected). Going liveÃ¢ÂÂ¦");
        }
        outStreamRef.current = new MediaStream([scrn.getVideoTracks()[0], dst.stream.getAudioTracks()[0]]);
      } catch {
        outStreamRef.current = new MediaStream([scrn.getVideoTracks()[0], ...mic.getAudioTracks()]);
        log("Ã¢ÂÂ Mic ready. Going liveÃ¢ÂÂ¦");
      }

      const liveTitle = title || "The Greenprint Ã¢ÂÂ Live Session";
      setIsLive(true);
      await setLiveStatus(true, liveTitle);
      log(`Ã°ÂÂÂ´ LIVE Ã¢ÂÂ broadcasting to ${Object.keys(viewersRef.current).length} viewer(s). Calling all waiting viewersÃ¢ÂÂ¦`);

      Object.keys(viewersRef.current).forEach((pid, i) => {
        setTimeout(() => callViewer(pid), i * 100);
      });
      setTimeout(() => broadcast({ t: "live" }), Object.keys(viewersRef.current).length * 100 + 300);

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
    try { audioCtxRef.current?.close(); } catch {}
    screenStreamRef.current = null;
    micStreamRef.current = null;
    outStreamRef.current = null;
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
      screenVideoRef.current.style.display = "none";
    }
    if (camVideoRef.current) {
      camVideoRef.current.srcObject = null;
      camVideoRef.current.style.display = "none";
    }
    setIsLive(false);
    setCamOn(false);
    log("Stream ended. Thanks for going live.");
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
        if (camVideoRef.current) {
          camVideoRef.current.srcObject = cam;
          camVideoRef.current.style.display = "block";
        }
        setCamOn(true);
      } catch { log("Camera access denied."); }
    }
  }

  function copyLeads(emailsOnly = false) {
    const text = emailsOnly
      ? leads.map(l => l.email).join(", ")
      : leads.map(l => `${l.name} <${l.email}>`).join("\n");
    navigator.clipboard.writeText(text);
    log(`${emailsOnly ? "Emails" : "All leads"} copied to clipboard.`);
  }

  function downloadCSV() {
    const rows = [
      ["Name", "Email", "Joined"].join(","),
      ...leads.map(l => [l.name, l.email, new Date(l.ts).toISOString()].join(","))
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `greenprint-leads-${Date.now()}.csv`;
    a.click();
  }

  // Init peer after auth
  useEffect(() => {
    if (!authed) return;
    loadPeerJS(() => startPeer());
    return () => { if (peerRef.current) try { peerRef.current.destroy(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  /* Ã¢ÂÂÃ¢ÂÂ Auth gate Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#00FF85]/4 blur-[120px]"/>
        </div>
        <div className="relative w-full max-w-sm bg-[#111] border border-white/8 rounded-2xl p-8">
          <div className="w-10 h-10 bg-[#00FF85] rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 12L6 7L9 10L13 4" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-center font-bold text-white mb-1">Broadcaster Access</h1>
          <p className="text-center text-xs text-white/30 mb-6">The Greenprint Ã¢ÂÂ Go Live Control Room</p>
          <form onSubmit={doAuth} className="space-y-4">
            <input
              type="password"
              placeholder="Password"
              required
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              disabled={authLocked}
              className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#00FF85]/50 transition-colors disabled:opacity-40"
            />
            {authErr && <p className="text-xs text-red-400">{authErr}</p>}
            <button
              type="submit"
              disabled={authLocked}
              className="w-full bg-[#00FF85] text-black font-black py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-[#00e676] transition-all"
              style={{ boxShadow: "0 0 24px rgba(0,255,133,0.3)" }}
            >
              Enter Ã¢ÂÂ
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* Ã¢ÂÂÃ¢ÂÂ Broadcaster control room Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col font-sans">
      {/* Top bar */}
      <div className="h-12 bg-[#0d0d0d] border-b border-white/5 flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isLive ? "bg-red-500 animate-pulse" : "bg-white/20"}`}/>
          <span className={`text-xs font-black tracking-widest ${isLive ? "text-red-400" : "text-white/25"}`}>
            {isLive ? "LIVE" : "OFFLINE"}
          </span>
        </div>
        <span className="text-xs text-white/30 flex-1 truncate">
          The Greenprint Ã¢ÂÂ Go Live Control Room
        </span>
        <span className="font-mono text-xs text-white/25">
          {Object.keys(viewers).length} viewer{Object.keys(viewers).length !== 1 ? "s" : ""}
        </span>
        {isLive && (
          <span className="font-mono text-xs text-[#00FF85]">{elapsed}</span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Video stage */}
        <div className="flex-1 bg-black relative min-h-[220px]">
          <video ref={screenVideoRef} autoPlay muted playsInline
            className="w-full h-full object-contain" style={{ display: "none" }}/>
          <video ref={camVideoRef} autoPlay muted playsInline
            className="absolute bottom-3 right-3 w-36 h-24 object-cover rounded-xl border border-white/10"
            style={{ display: "none", transform: "scaleX(-1)" }}/>
          {!isLive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" fill="#00FF85"/>
                  <path d="M12 5a7 7 0 100 14A7 7 0 0012 5z" stroke="white" strokeWidth="1.5" strokeOpacity="0.2"/>
                  <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1" strokeOpacity="0.1"/>
                </svg>
              </div>
              <p className="text-white/20 text-xs">Press Go Live to start broadcasting</p>
              <p className="text-white/10 text-xs">Viewers at thegreenprint.trade/stream will connect automatically</p>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-80 bg-[#0d0d0d] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col shrink-0">
          {/* Controls */}
          <div className="p-4 border-b border-white/5">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Session title (e.g. NVDA Options Play)"
              className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#00FF85]/40 transition-colors mb-3"
            />
            <div className="flex gap-2 flex-wrap">
              {!isLive ? (
                <button onClick={goLive}
                  className="flex-1 bg-[#00FF85] text-black font-black py-2.5 rounded-xl text-xs hover:bg-[#00e676] transition-all"
                  style={{ boxShadow: "0 0 16px rgba(0,255,133,0.3)" }}>
                  Ã°ÂÂÂ´ Go Live
                </button>
              ) : (
                <button onClick={endStream}
                  className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl text-xs hover:bg-red-500/20 transition-colors">
                  Ã¢ÂÂ¹ End Stream
                </button>
              )}
              <button onClick={toggleMic}
                className={`px-3 py-2.5 rounded-xl text-xs border transition-colors ${
                  micOn ? "border-white/10 text-white/40 hover:text-white" : "border-red-500/30 text-red-400 bg-red-500/5"
                }`}>
                Ã°ÂÂÂ {micOn ? "Mic On" : "Muted"}
              </button>
              <button onClick={toggleCam}
                className={`px-3 py-2.5 rounded-xl text-xs border transition-colors ${
                  camOn ? "border-[#00FF85]/30 text-[#00FF85] bg-[#00FF85]/5" : "border-white/10 text-white/40 hover:text-white"
                }`}>
                Ã°ÂÂÂ· Cam
              </button>
            </div>
            <p className="text-[10px] text-white/30 mt-2.5 font-mono leading-relaxed">{statusLog}</p>
          </div>

          {/* App QR Ã¢ÂÂ show on stream so viewers can join */}
          <div className="p-3 border-b border-white/5">
            <p className="font-mono text-[10px] tracking-widest uppercase text-white/25 mb-2">Show on Stream Ã¢ÂÂ Join App</p>
            <div className="flex items-center gap-3">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://whop.com/checkout/1qG9Z2JJtzx9EwqFqx-NniP-F77m-blPo-5FJfLrqeKabq/&color=00FF85&bgcolor=0d0d0d&qzone=1"
                alt="Join App QR"
                className="w-16 h-16 rounded-lg border border-white/10"
              />
              <div>
                <p className="text-[11px] text-white/60 font-semibold mb-0.5">The Greenprint App</p>
                <p className="text-[10px] text-white/25 leading-relaxed">$29.99/mo Ã¢ÂÂ scan to join<br/>full access + mobile app</p>
                <button
                  onClick={() => navigator.clipboard.writeText("https://whop.com/checkout/1qG9Z2JJtzx9EwqFqx-NniP-F77m-blPo-5FJfLrqeKabq/")}
                  className="mt-1.5 text-[9px] text-[#00FF85]/50 hover:text-[#00FF85] border border-white/8 rounded-lg px-2 py-0.5 transition-colors"
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>

          {/* Live stats */}
          {isLive && (
            <div className="grid grid-cols-3 border-b border-white/5">
              {[
                { label: "Live", val: Object.keys(viewers).length },
                { label: "Peak", val: peakViewers },
                { label: "Time", val: elapsed },
              ].map(s => (
                <div key={s.label} className="p-3 text-center border-r border-white/5 last:border-0">
                  <div className="font-mono text-base font-black text-[#00FF85]">{s.val}</div>
                  <div className="font-mono text-[9px] text-white/25 uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Who's watching */}
          {Object.keys(viewers).length > 0 && (
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-[10px] text-white/25 font-mono uppercase tracking-widest mb-1.5">Watching</p>
              <div className="flex flex-wrap gap-1">
                {Object.values(viewers).slice(0, 12).map((name, i) => (
                  <span key={i} className="bg-white/5 text-white/40 text-[10px] px-2 py-0.5 rounded-full">{name}</span>
                ))}
                {Object.keys(viewers).length > 12 && (
                  <span className="text-white/25 text-[10px]">+{Object.keys(viewers).length - 12} more</span>
                )}
              </div>
            </div>
          )}

          {/* Chat */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-white/5">
              <p className="font-mono text-[10px] tracking-widest uppercase text-white/25">Live Chat</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[100px] max-h-[200px] lg:max-h-none">
              {chat.length === 0
                ? <p className="text-[10px] text-white/20">Chat appears here once viewers start watching.</p>
                : chat.map((m, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-[#00FF85] font-semibold">{m.name}: </span>
                    <span className="text-white/40">{m.text}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Leads */}
          <div className="border-t border-white/5 p-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[10px] tracking-widest uppercase text-white/25">
                Leads ({leads.length})
              </p>
              <div className="flex gap-1">
                {[
                  { label: "Copy", fn: () => copyLeads(false) },
                  { label: "Emails", fn: () => copyLeads(true) },
                  { label: "CSV", fn: downloadCSV },
                ].map(b => (
                  <button key={b.label} onClick={b.fn}
                    className="text-[9px] text-white/25 hover:text-white border border-white/8 rounded-lg px-1.5 py-0.5 transition-colors">
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-20 overflow-y-auto space-y-0.5">
              {leads.length === 0
                ? <p className="text-[10px] text-white/20">Stream subscriber emails appear here.</p>
                : leads.map((l, i) => (
                  <div key={i} className="text-[10px] font-mono text-white/30">
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
