"use client";
import { useState, useEffect, useRef } from "react";

const RTDB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_RTDB_URL ||
  "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const HOST_PEER_ID = "gp-greenprint-live";

const PWD_HASH = "f7bbb300691e55f6eaad18327a462a30ff3bf38a4a36a24e9458fdfc508d4ab1";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

interface Viewer { name: string; conn: any; call: any; }
interface ChatMsg { name: string; text: string; ts: number; }
interface Lead   { name: string; email: string; ts: number; }

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.stunprotocol.org:3478" },
  { urls: "turn:openrelay.metered.ca:80",               username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443",              username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:80?transport=tcp",  username: "openrelayproject", credential: "openrelayproject" },
];

let _retryCount = 0;
let _shouldReconnect = true;


export default function GoLivePage() {
  const [authed, setAuthed]         = useState(false);
  const [pwd, setPwd]               = useState("");
  const [authErr, setAuthErr]       = useState("");
  const [authLocked, setAuthLocked] = useState(false);
  const [attempts, setAttempts]     = useState(0);

  const [isLive, setIsLive]       = useState(false);
  const [title, setTitle]         = useState("");
  const [micOn, setMicOn]         = useState(true);
  const [camOn, setCamOn]         = useState(false);
  const [camFacing, setCamFacing] = useState<"user"|"environment">("environment");
  const [statusLog, setStatusLog] = useState("Ready - press Go Live to start.");
  const [elapsed, setElapsed]     = useState("00:00:00");

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
  const pipCanvasRef    = useRef<HTMLCanvasElement | null>(null);
  const pipRafRef       = useRef<number | null>(null);
  const chatToastTimer  = useRef<any>(null);

  const [chat, setChat]           = useState<ChatMsg[]>([]);
  const [chatToast, setChatToast] = useState<{name:string,msg:string}|null>(null);
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [viewers, setViewers]     = useState<Record<string, string>>({});
  const [peakViewers, setPeakViewers] = useState(0);

  const log = (msg: string) => setStatusLog(msg);

  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem("gp_golive_v3") || "null");
      if (s?.ok && s.exp > Date.now()) setAuthed(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (isLive) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000);
        setElapsed(
          `${String(Math.floor(s / 3600)).padStart(2,"0")}:${String(Math.floor((s % 3600) / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`
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
    const peer = new PeerJS(HOST_PEER_ID, {
      debug: 0,
      config: {
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 10,
      },
    });
    peerRef.current = peer;

        peer.on("open", (id: string) => {
      _retryCount = 0;
      log("Ready — press Go Live to start broadcasting.");
      if (outStreamRef.current) {
        Object.keys(viewersRef.current).forEach((pid, i) => setTimeout(() => callViewer(pid), i * 200));
      }
    });

    peer.on("connection", (conn: any) => {
      conn.on("data", (d: any) => {
        if (d?.t === "join" || d?.t === "request") {
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
          if (chatToastTimer.current) clearTimeout(chatToastTimer.current);
          setChatToast({ name: d.name, msg: d.msg });
          chatToastTimer.current = setTimeout(() => setChatToast(null), 4000);
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
        _retryCount += 1;
        if (_retryCount <= 12) {
          log("Previous session closing — retrying in 3s… (" + _retryCount + "/12)");
          setTimeout(() => { if (_shouldReconnect) startPeer(); }, 3000);
        } else {
          log("Stream ID stuck. Click ↺ Reset or refresh the page.");
        }
      } else {
        log("Connection dropped — reconnecting in 3s…");
        setTimeout(() => { if (_shouldReconnect) startPeer(); }, 3000);
      }
    });

        peer.on('disconnected', () => {
      if (peer && !peer.destroyed && _shouldReconnect) {
        log('Connection lost — reconnecting…');
        setTimeout(() => { try { if (_shouldReconnect) peer.reconnect(); } catch (e) {} }, 2000);
      }
    });

        peer.on('close', () => {
      if (_shouldReconnect) {
        log('Reconnecting…');
        setTimeout(() => { if (_shouldReconnect) startPeer(); }, 2000);
      }
    });

  }

  function callViewer(pid: string, attempt = 0) {
    if (!outStreamRef.current || !peerRef.current) return;
    const v = viewersRef.current[pid];
    if (!v) return;
    try {
      const call = peerRef.current.call(pid, outStreamRef.current);
      viewersRef.current[pid].call = call;
      // Boost WebRTC video bitrate to 20Mbps for crisp 4K-quality stream
      const boostBitrate = () => {
        try {
          const pc = (call as any).peerConnection;
          if (!pc) return;
          pc.getSenders().forEach((s: any) => {
            if (s.track?.kind === "video") {
              const p = s.getParameters();
              if (!p.encodings?.length) p.encodings = [{}];
              p.encodings[0].maxBitrate = 20_000_000; // 20 Mbps
              p.encodings[0].maxFramerate = 60;
              s.setParameters(p).catch(() => {});
            }
          });
        } catch {}
      };
      setTimeout(boostBitrate, 1000);
      setTimeout(boostBitrate, 3000);
      call.on("error", () => {
      try { call.close(); } catch {}
      if (attempt < 3 && viewersRef.current[pid]) setTimeout(() => callViewer(pid, attempt + 1), 4000);
    });
    } catch {}
  }

  function broadcast(data: object) {
    Object.values(viewersRef.current).forEach(v => {
      try { v.conn?.send(data); } catch {}
    });
  }

    async function goLive() {
  const onMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform) && !navigator.userAgent.includes('Win'));
  if (onMobile) {
    log("Starting camera and mic…");
    let mobileStream: MediaStream;
    try {
      mobileStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 }, facingMode: camFacing },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        log("Camera blocked — allow access in browser settings, then press Go Live again.");
        alert("Please allow camera and microphone access, then press Go Live again.");
      } else {
        log("Camera error: " + (err.message || "unknown"));
      }
      return;
    }
    screenStreamRef.current = mobileStream;
    outStreamRef.current = mobileStream;
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = mobileStream;
      screenVideoRef.current.muted = true;
      screenVideoRef.current.style.display = "block";
    }
    try { (navigator as any).wakeLock?.request("screen"); } catch {}
    const liveTitle = title || "The Greenprint - Live";
    setIsLive(true);
    await setLiveStatus(true, liveTitle);
    log("LIVE — broadcasting from camera. " + Object.keys(viewersRef.current).length + " viewer(s).");
    Object.keys(viewersRef.current).forEach((pid, i) => setTimeout(() => callViewer(pid), i * 100));
    mobileStream.getVideoTracks()[0]?.addEventListener("ended", () => endStream());
    return;
  }

        if (!navigator.mediaDevices?.getDisplayMedia) {
      const msg = "Go Live needs screen sharing — open this page in Chrome or Edge on a laptop or desktop.";
      log(msg); alert(msg); return;
    }

    // Step 1: Screen share — own try/catch, returns early on failure
    log("Select your screen or window to share...");
    let scrn: MediaStream;
    try {
      scrn = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 60, max: 60 }, width: { ideal: 2560, max: 3840 }, height: { ideal: 1440, max: 2160 } },
        audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 48000 },
      });
      scrn.getVideoTracks().forEach(t => { t.contentHint = "detail"; });
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "AbortError") {
        log("Screen share cancelled. Press Go Live to try again.");;alert("Go Live failed — screen sharing was cancelled or blocked. Tap Go Live again and allow screen sharing when prompted.");
      } else {
        log("Screen share error: " + (err.message || "unknown") + ". On Mac: System Settings > Privacy > Screen Recording > enable Chrome.");
      }
      return;
    }

    screenStreamRef.current = scrn;
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = new MediaStream(scrn.getVideoTracks());
      screenVideoRef.current.muted = true;
      screenVideoRef.current.style.display = "block";
    }

    // Step 2: Mic — optional, stream continues even if mic denied
    log("Screen captured. Requesting microphone...");
    let mic: MediaStream | null = null;
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 48000 },
        video: false,
      });
      micStreamRef.current = mic;
    } catch {
      log("Mic unavailable or denied - streaming without mic. Going live...");
    }

    // Step 3: Mix audio
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const dst = ctx.createMediaStreamDestination();
      audioDstRef.current = dst;
      const screenAudio = scrn.getAudioTracks();
      if (screenAudio.length > 0) ctx.createMediaStreamSource(new MediaStream(screenAudio)).connect(dst);
      if (mic) ctx.createMediaStreamSource(mic).connect(dst);
      const mixed = dst.stream.getAudioTracks();
      outStreamRef.current = new MediaStream([scrn.getVideoTracks()[0], ...(mixed.length ? [mixed[0]] : [])]);
      const audioDesc = mic && screenAudio.length ? "Mic + screen audio mixed." : mic ? "Mic audio ready." : screenAudio.length ? "Screen audio only." : "Video only (no audio).";
      log(audioDesc + " Going live...");
    } catch {
      const audioTracks = mic ? mic.getAudioTracks() : scrn.getAudioTracks();
      outStreamRef.current = new MediaStream([scrn.getVideoTracks()[0], ...audioTracks]);
      log("Audio setup issue - using fallback. Going live...");
    }

    // Step 4: PiP canvas compositor: screen fills frame, camera as corner overlay
    try {
      const svr = screenVideoRef.current!;
      if (svr.videoWidth === 0) {
        await new Promise<void>(res => {
          svr.onloadedmetadata = () => res();
          setTimeout(res, 2000);
        });
      }
      const pipCanvas = document.createElement("canvas");
      pipCanvasRef.current = pipCanvas;
      pipCanvas.width = svr.videoWidth || 1920;
      pipCanvas.height = svr.videoHeight || 1080;
      const CW = pipCanvas.width;
      const CH = pipCanvas.height;
      const pipCtx = pipCanvas.getContext("2d")!;
      pipCtx.imageSmoothingEnabled = true;
      pipCtx.imageSmoothingQuality = "high";
      const drawPip = () => {
        pipCtx.clearRect(0, 0, CW, CH);
        pipCtx.drawImage(svr, 0, 0, CW, CH);
        const cv = camVideoRef.current;
        if (camStreamRef.current && cv && cv.readyState >= 2) {
          const pw = Math.round(pipCanvas.width * 0.18);
          const ph = Math.round(pw * 9 / 16);
          const px = pipCanvas.width - pw - 36;
          const py = pipCanvas.height - ph - 36;
          const r = 22;
          const rr = () => {
            pipCtx.beginPath();
            pipCtx.moveTo(px + r, py);
            pipCtx.lineTo(px + pw - r, py);
            pipCtx.quadraticCurveTo(px + pw, py, px + pw, py + r);
            pipCtx.lineTo(px + pw, py + ph - r);
            pipCtx.quadraticCurveTo(px + pw, py + ph, px + pw - r, py + ph);
            pipCtx.lineTo(px + r, py + ph);
            pipCtx.quadraticCurveTo(px, py + ph, px, py + ph - r);
            pipCtx.lineTo(px, py + r);
            pipCtx.quadraticCurveTo(px, py, px + r, py);
            pipCtx.closePath();
          };
          pipCtx.save();
          pipCtx.shadowColor = "rgba(0,255,133,0.55)";
          pipCtx.shadowBlur = 30;
          pipCtx.fillStyle = "#00FF85";
          rr(); pipCtx.fill();
          pipCtx.restore();
          pipCtx.save();
          rr(); pipCtx.clip();
          pipCtx.drawImage(cv, px, py, pw, ph);
          pipCtx.restore();
          pipCtx.save();
          pipCtx.strokeStyle = "#00FF85";
          pipCtx.lineWidth = 4;
          rr(); pipCtx.stroke();
          pipCtx.restore();
        }
        pipRafRef.current = requestAnimationFrame(drawPip);
      };
      drawPip();
      const canvasStream = pipCanvas.captureStream(60);
      const audioTracks = outStreamRef.current?.getAudioTracks() ?? [];
      outStreamRef.current = new MediaStream([canvasStream.getVideoTracks()[0], ...audioTracks]);
      log("PiP active - canvas compositor running at 60fps. Broadcasting...");
    } catch {
      log("PiP setup failed, using direct screen stream.");
    }

    // Step 5: Go live
    const liveTitle = title || "The Greenprint - Live Session";
    try { (navigator as any).wakeLock?.request("screen"); } catch {}
    setIsLive(true);
    await setLiveStatus(true, liveTitle);
    log("LIVE - broadcasting to " + Object.keys(viewersRef.current).length + " viewer(s). Calling all waiting viewers...");

    Object.keys(viewersRef.current).forEach((pid, i) => {
      setTimeout(() => callViewer(pid), i * 100);
    });
    setTimeout(() => broadcast({ t: "live" }), Object.keys(viewersRef.current).length * 100 + 300);

    scrn.getVideoTracks()[0]?.addEventListener("ended", () => endStream());
  }

  async function endStream() {
    broadcast({ t: "end" });
    await setLiveStatus(false, "");
    if (pipRafRef.current) { cancelAnimationFrame(pipRafRef.current); pipRafRef.current = null; }
    pipCanvasRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    camStreamRef.current?.getTracks().forEach(t => t.stop());
    try { audioCtxRef.current?.close(); } catch {}
    screenStreamRef.current = null;
    micStreamRef.current = null;
    outStreamRef.current = null;
    if (screenVideoRef.current) { screenVideoRef.current.srcObject = null; screenVideoRef.current.style.display = "none"; }
    if (camVideoRef.current) { camVideoRef.current.srcObject = null; camVideoRef.current.style.display = "none"; }
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
        const cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 }, facingMode: "user" }, audio: false });
        camStreamRef.current = cam;
        if (camVideoRef.current) { camVideoRef.current.srcObject = cam; camVideoRef.current.style.display = "block"; }
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
    const rows = [["Name","Email","Joined"].join(","), ...leads.map(l => [l.name,l.email,new Date(l.ts).toISOString()].join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `greenprint-leads-${Date.now()}.csv`;
    a.click();
  }

  useEffect(() => {
    if (!authed) return;
    loadPeerJS(() => startPeer());
    return () => { _shouldReconnect = false; if (peerRef.current) try { peerRef.current.destroy(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

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
          <p className="text-center text-xs text-white/30 mb-6">The Greenprint - Go Live Control Room</p>
          <form onSubmit={doAuth} className="space-y-4">
            <input type="password" placeholder="Password" required value={pwd} onChange={e => setPwd(e.target.value)} disabled={authLocked}
              className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#00FF85]/50 transition-colors disabled:opacity-40"/>
            {authErr && <p className="text-xs text-red-400">{authErr}</p>}
            <button type="submit" disabled={authLocked}
              className="w-full bg-[#00FF85] text-black font-black py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-[#00e676] transition-all"
              style={{ boxShadow: "0 0 24px rgba(0,255,133,0.3)" }}>
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

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
        <span className="text-xs text-white/30 flex-1 truncate">The Greenprint - Go Live</span>
        <span className="font-mono text-xs text-white/25">
          {Object.keys(viewers).length} viewer{Object.keys(viewers).length !== 1 ? "s" : ""}
        </span>
        {isLive && <span className="font-mono text-xs text-[#00FF85]">{elapsed}</span>}
      </div>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Video stage */}
        <div className="flex-1 bg-black relative min-h-[220px]">
          <video ref={screenVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" style={{ display: "none" }}/>
          <video ref={camVideoRef} autoPlay muted playsInline
            className="absolute bottom-3 right-3 w-52 h-36 object-cover rounded-xl border border-white/10"
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
          <div className="p-4 border-b border-white/5">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Session title (e.g. NVDA Options Play)"
              className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#00FF85]/40 transition-colors mb-3"/>
            <div className="flex gap-2 flex-wrap">
              {!isLive ? (
                <button onClick={goLive}
                  className="flex-1 bg-[#00FF85] text-black font-black py-2.5 rounded-xl text-xs hover:bg-[#00e676] transition-all"
                  style={{ boxShadow: "0 0 16px rgba(0,255,133,0.3)" }}>
                  Go Live
                </button>
              ) : (
                <button onClick={endStream}
                  className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl text-xs hover:bg-red-500/20 transition-colors">
                  End Stream
                </button>
              )}
              <button onClick={toggleMic}
                className={`px-3 py-2.5 rounded-xl text-xs border transition-colors ${micOn ? "border-white/10 text-white/40 hover:text-white" : "border-red-500/30 text-red-400 bg-red-500/5"}`}>
                {micOn ? "Mic On" : "Muted"}
              </button>
              <button onClick={toggleCam}
                className={`px-3 py-2.5 rounded-xl text-xs border transition-colors ${camOn ? "border-[#00FF85]/30 text-[#00FF85] bg-[#00FF85]/5" : "border-white/10 text-white/40 hover:text-white"}`}>
                Cam
              </button>
            <button onClick={() => { _retryCount = 0; _shouldReconnect = true; startPeer(); log("Forcing reconnect…"); }}
              className="px-3 py-2.5 rounded-xl text-xs border border-white/10 text-white/40 hover:text-[#00FF85] hover:border-[#00FF85]/30 transition-colors">
              ↺ Reset
            </button>
            <button onClick={async () => {
              const next = camFacing === "user" ? "environment" : "user";
              setCamFacing(next);
              if (!isLive || !outStreamRef.current) return;
              try {
                const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next }, audio: false });
                const vt = s.getVideoTracks()[0];
                Object.values(viewersRef.current).forEach(v => {
                  const pc = (v.call as any)?.peerConnection;
                  pc?.getSenders().forEach((sd: any) => { if (sd.track?.kind === "video") sd.replaceTrack(vt).catch(()=>{}); });
                });
                outStreamRef.current.getVideoTracks().forEach(t => { outStreamRef.current!.removeTrack(t); t.stop(); });
                outStreamRef.current.addTrack(vt);
                if (screenVideoRef.current) screenVideoRef.current.srcObject = outStreamRef.current;
              } catch {}
            }}
              className="px-3 py-2.5 rounded-xl text-xs border border-white/10 text-white/40 hover:text-[#00FF85] hover:border-[#00FF85]/30 transition-colors">
              ⟳ Flip Cam
            </button>
            </div>
            <p className="text-[10px] text-white/30 mt-2.5 font-mono leading-relaxed">{statusLog}</p>
          </div>

          <div className="p-3 border-b border-white/5">
            <p className="font-mono text-[10px] tracking-widest uppercase text-white/25 mb-2">Show on Stream - Join App</p>
            <div className="flex items-center gap-3">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://whop.com/checkout/1qG9Z2JJtzx9EwqFqx-NniP-F77m-blPo-5FJfLrqeKabq/&color=00FF85&bgcolor=0d0d0d&qzone=1"
                alt="Join App QR" className="w-16 h-16 rounded-lg border border-white/10"/>
              <div>
                <p className="text-[11px] text-white/60 font-semibold mb-0.5">The Greenprint App</p>
                <button onClick={() => navigator.clipboard.writeText("https://whop.com/checkout/1qG9Z2JJtzx9EwqFqx-NniP-F77m-blPo-5FJfLrqeKabq/")}
                  className="mt-1.5 text-[9px] text-[#00FF85]/50 hover:text-[#00FF85] border border-white/8 rounded-lg px-2 py-0.5 transition-colors">
                  Copy Link
                </button>
              </div>
            </div>
          </div>

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

          {Object.keys(viewers).length > 0 && (
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-[10px] text-white/25 font-mono uppercase tracking-widest mb-1.5">Watching</p>
              <div className="flex flex-wrap gap-1">
                {Object.values(viewers).slice(0,12).map((name, i) => (
                  <span key={i} className="bg-white/5 text-white/40 text-[10px] px-2 py-0.5 rounded-full">{name}</span>
                ))}
                {Object.keys(viewers).length > 12 && (
                  <span className="text-white/25 text-[10px]">+{Object.keys(viewers).length - 12} more</span>
                )}
              </div>
            </div>
          )}

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

          <div className="border-t border-white/5 p-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[10px] tracking-widest uppercase text-white/25">Leads ({leads.length})</p>
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

      {chatToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111] border border-white/10 rounded-2xl px-4 py-3 flex items-start gap-3 shadow-2xl max-w-xs w-full">
          <div className="w-7 h-7 rounded-full bg-[#00FF85]/20 flex items-center justify-center shrink-0 text-[#00FF85] text-xs font-bold mt-0.5">
            {chatToast.name[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-[#00FF85] text-xs font-semibold">{chatToast.name}</p>
            <p className="text-white/80 text-sm">{chatToast.msg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
