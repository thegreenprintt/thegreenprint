"use client";
import { useState, useEffect, useRef } from "react";

const RTDB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_RTDB_URL ||
  "https://the-greenprint-53d98-default-rtdb.firebaseio.com";

const PWD_HASH = "f7bbb300691e55f6eaad18327a462a30ff3bf38a4a36a24e9458fdfc508d4ab1";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

interface Viewer { name: string; conn: any; call: any; }
interface ChatMsg { name: string; text: string; ts: number; }
interface Lead { name: string; email: string; ts: number; }

async function getIceServers(): Promise<RTCIceServer[]> {
  try {
    const r = await fetch(
      "/api/ice"
    );
    if (r.ok) return await r.json();
  } catch {}
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];
}

async function fbPut(path: string, data: any) {
  try {
    await fetch(`${RTDB_URL}/${path}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {}
}

async function fbGet(path: string) {
  try {
    const r = await fetch(`${RTDB_URL}/${path}.json`, { cache: "no-store" });
    return await r.json();
  } catch { return null; }
}

async function fbDelete(path: string) {
  try {
    await fetch(`${RTDB_URL}/${path}.json`, { method: "DELETE" });
  } catch {}
}

export default function GoLivePage() {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [authLocked, setAuthLocked] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const [isLive, setIsLive] = useState(false);
  const [title, setTitle] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [camFacing, setCamFacing] = useState<"user"|"environment">("environment");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamId, setSelectedCamId] = useState<string>("");
  const [statusLog, setStatusLog] = useState("Ready — press Go Live to start.");
  const [elapsed, setElapsed] = useState("00:00:00");

  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const outStreamRef = useRef<MediaStream | null>(null);
  const viewersRef = useRef<Record<string, Viewer>>({});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDstRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipRafRef = useRef<number | null>(null);
  const chatToastTimer = useRef<any>(null);

  const viewerPcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const viewerCleanupRef = useRef<Record<string, () => void>>({});
  const watchSseRef = useRef<EventSource | null>(null);
  const watchCleanupRef = useRef<(() => void) | null>(null);
  const seenViewersRef = useRef<Set<string>>(new Set());

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatToast, setChatToast] = useState<{name:string,msg:string}|null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [viewers, setViewers] = useState<Record<string, string>>({});
  const [peakViewers, setPeakViewers] = useState(0);

  const log = (msg: string) => setStatusLog(msg);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      setVideoDevices(devices.filter(d => d.kind === "videoinput"));
    });
  }, []);

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

  async function callViewerWebRTC(viewerId: string, viewerName: string) {
    if (!outStreamRef.current) return;
    if (viewerPcsRef.current[viewerId]) {
      try { viewerCleanupRef.current[viewerId]?.(); } catch {}
    }

    const pc = new RTCPeerConnection({ iceServers: await getIceServers(), iceCandidatePoolSize: 0 });
    viewerPcsRef.current[viewerId] = pc;

    const iceCandidates: RTCIceCandidateInit[] = [];
    let answerPollId: any;
    let icePollId: any;
    let gotAnswer = false;

    const cleanup = () => {
      clearInterval(answerPollId);
      clearInterval(icePollId);
      try { pc.close(); } catch {}
      fbDelete(`live/offers/${viewerId}`);
      fbDelete(`live/answers/${viewerId}`);
      fbDelete(`live/ice_b/${viewerId}`);
      fbDelete(`live/ice_v/${viewerId}`);
      delete viewerPcsRef.current[viewerId];
      delete viewerCleanupRef.current[viewerId];
    };
    viewerCleanupRef.current[viewerId] = cleanup;

    outStreamRef.current.getTracks().forEach(t => pc.addTrack(t, outStreamRef.current!));

    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        iceCandidates.push(e.candidate.toJSON());
        await fbPut(`live/ice_b/${viewerId}`, iceCandidates);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        const boost = () => {
          try {
            pc.getSenders().forEach(s => {
              if (s.track?.kind === "video") {
                const p = s.getParameters();
                if (!p.encodings?.length) p.encodings = [{}];
                p.encodings[0].maxBitrate = 8_000_000;
                s.setParameters(p).catch(() => {});
              }
            });
          } catch {}
        };
        setTimeout(boost, 1000);
        setTimeout(boost, 3000);
        log(`${viewerName} connected. ${Object.keys(viewerPcsRef.current).length} viewer(s).`);
      }
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        clearInterval(answerPollId);
        clearInterval(icePollId);
        delete viewerPcsRef.current[viewerId];
        delete viewerCleanupRef.current[viewerId];
        delete viewersRef.current[viewerId];
        setViewers(prev => { const n = {...prev}; delete n[viewerId]; return n; });
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await new Promise<void>(r => { if (pc.iceGatheringState === 'complete') { r(); return; } pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') r(); }; setTimeout(r, 8000); });
      await fbPut(`live/offers/${viewerId}`, { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp });
    } catch {
      cleanup();
      return;
    }

    // SSE: receive viewer's answer instantly
    let answerEs: EventSource | null = new EventSource(`${RTDB_URL}/live/answers/${viewerId}.json`);
    const processAnswer = async (answer: any) => {
      if (!answer?.sdp || gotAnswer) return;
      gotAnswer = true;
      answerEs?.close(); answerEs = null;
      clearInterval(answerPollId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        log("Answer received — connected!");
      } catch (err) { log("Answer error: " + err); cleanup(); }
    };
    answerEs.addEventListener("put",   (e: any) => { try { processAnswer(JSON.parse((e as MessageEvent).data)?.data); } catch {} });
    answerEs.addEventListener("patch", (e: any) => { try { processAnswer(JSON.parse((e as MessageEvent).data)?.data); } catch {} });
    answerEs.onerror = () => {
      answerEs?.close(); answerEs = null;
      // fallback poll
      answerPollId = setInterval(async () => {
        if (gotAnswer) { clearInterval(answerPollId); return; }
        const answer = await fbGet(`live/answers/${viewerId}`);
        if (answer?.sdp) processAnswer(answer);
      }, 500);
    };

    // SSE: receive viewer's ICE candidates instantly
    const seenIce = new Set<string>();
    const applyViewerIce = (data: any) => {
      if (!data || !pc.remoteDescription) return;
      const arr: any[] = Array.isArray(data) ? data : Object.values(data);
      for (const c of arr) {
        const k = JSON.stringify(c);
        if (!seenIce.has(k)) {
          seenIce.add(k);
          pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
      }
    };
    let iceEs: EventSource | null = new EventSource(`${RTDB_URL}/live/ice_v/${viewerId}.json`);
    iceEs.addEventListener("put",   (e: any) => { try { applyViewerIce(JSON.parse((e as MessageEvent).data)?.data); } catch {} });
    iceEs.addEventListener("patch", (e: any) => { try { applyViewerIce(JSON.parse((e as MessageEvent).data)?.data); } catch {} });
    iceEs.onerror = () => {
      iceEs?.close(); iceEs = null;
      // fallback poll
      icePollId = setInterval(async () => {
        const ices = await fbGet(`live/ice_v/${viewerId}`);
        if (!ices || !pc.remoteDescription) return;
        const arr: any[] = Array.isArray(ices) ? ices : Object.values(ices);
        for (const c of arr) {
          const k = JSON.stringify(c);
          if (!seenIce.has(k)) {
            seenIce.add(k);
            pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
        }
      }, 1000);
    }
  }

  function startViewerWatch() {
    watchSseRef.current?.close();
    seenViewersRef.current.clear();

    const es = new EventSource(`${RTDB_URL}/live/viewers.json`);
    watchSseRef.current = es;

    const handleViewerData = (viewerId: string, data: any) => {
      if (!data) return;
      seenViewersRef.current.add(viewerId);
      const name = data.name || "Viewer";
      viewersRef.current[viewerId] = { name, conn: null, call: null };
      setViewers(prev => {
        const n = { ...prev, [viewerId]: name };
        setPeakViewers(p => Math.max(p, Object.keys(n).length));
        return n;
      });
      if (outStreamRef.current) {
        const _xpc = viewerPcsRef.current[viewerId];
        const _st = _xpc?.connectionState;
        if (!_xpc || _st === 'failed' || _st === 'closed' || _st === 'disconnected') {
          callViewerWebRTC(viewerId, name);
        }
      }
    };

    es.addEventListener("put", (e: any) => {
      try {
        const { path, data } = JSON.parse(e.data);
        if (!data) return;
        if (path === "/") {
          Object.entries(data).forEach(([id, d]) => handleViewerData(id, d));
        } else {
          const id = path.replace(/^\//, "");
          if (id && !id.includes("/")) handleViewerData(id, data);
        }
      } catch {}
    });

    es.addEventListener("patch", (e: any) => {
      try {
        const { data } = JSON.parse(e.data);
        if (data) Object.entries(data).forEach(([id, d]) => handleViewerData(id, d));
      } catch {}
    });

    const staleCheckId = setInterval(async () => {
      const data = await fbGet("live/viewers");
      const current = new Set(data ? Object.keys(data) : []);
      seenViewersRef.current.forEach(id => {
        if (!current.has(id)) {
          seenViewersRef.current.delete(id);
          viewerCleanupRef.current[id]?.();
          delete viewersRef.current[id];
          setViewers(prev => { const n = {...prev}; delete n[id]; return n; });
        }
      });
    }, 15000);

    let lastChatTs = Date.now();
    const chatPollId = setInterval(async () => {
      const data = await fbGet("live/chat");
      if (!data) return;
      const msgs = Object.values(data) as any[];
      msgs.forEach(m => {
        if (m.ts > lastChatTs) {
          lastChatTs = m.ts;
          setChat(prev => [...prev.slice(-199), { name: m.name, text: m.msg, ts: m.ts }]);
          if (chatToastTimer.current) clearTimeout(chatToastTimer.current);
          setChatToast({ name: m.name, msg: m.msg });
          chatToastTimer.current = setTimeout(() => setChatToast(null), 4000);
        }
      });
    }, 2000);

    const viewerPollId = setInterval(async () => {
      const vdata = await fbGet("live/viewers");
      if (!vdata) return;
      Object.entries(vdata).forEach(([vid, vd]) => handleViewerData(vid, vd as any));
    }, 500);
    watchCleanupRef.current = () => {
      clearInterval(staleCheckId);
      clearInterval(chatPollId);
      clearInterval(viewerPollId);
      es.close();
    };
  }

  async function goLive() {
    const onMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
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
        screenVideoRef.current.play().catch(() => {});
      }
      try { (navigator as any).wakeLock?.request("screen"); } catch {}
      const liveTitle = title || "The Greenprint - Live";
      setIsLive(true);
      await setLiveStatus(true, liveTitle);
      log("LIVE — broadcasting from camera.");
      Object.entries(viewersRef.current).forEach(([pid, v], i) => {
        setTimeout(() => callViewerWebRTC(pid, v.name), i * 150);
      });
      mobileStream.getVideoTracks()[0]?.addEventListener("ended", () => endStream());
      return;
    }

    // Camera-only — OBS Virtual Camera or any selected camera
    const cam = camStreamRef.current;
    if (!cam || cam.getVideoTracks().length === 0) {
      log("Click Cam, select your camera (e.g. OBS Virtual Camera), then Go Live.");
      return;
    }
    const mic = micStreamRef.current;
    outStreamRef.current = new MediaStream([
      cam.getVideoTracks()[0]!,
      ...(mic ? mic.getAudioTracks() : [])
    ]);
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = outStreamRef.current;
      screenVideoRef.current.style.display = "block";
      screenVideoRef.current.muted = true;
      screenVideoRef.current.play().catch(() => {});
    }
    if (camVideoRef.current) camVideoRef.current.style.display = "none";

    const liveTitle = title || "The Greenprint - Live Session";
    try { (navigator as any).wakeLock?.request("screen"); } catch {}
    setIsLive(true);
    await setLiveStatus(true, liveTitle);
    log("LIVE — broadcasting. Calling waiting viewers…");

    Object.entries(viewersRef.current).forEach(([pid, v], i) => {
      setTimeout(() => callViewerWebRTC(pid, v.name), i * 150);
    });

    cam.getVideoTracks()[0]?.addEventListener("ended", () => endStream());
  }

  async function endStream() {
    await fbPut("live/endSignal", { ts: Date.now() });
    setTimeout(() => fbDelete("live/endSignal"), 5000);
    await setLiveStatus(false, "");

    if (pipRafRef.current) { clearTimeout(pipRafRef.current); pipRafRef.current = null; }
    pipCanvasRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    camStreamRef.current?.getTracks().forEach(t => t.stop());
    try { audioCtxRef.current?.close(); } catch {}
    screenStreamRef.current = null; micStreamRef.current = null; outStreamRef.current = null;
    if (screenVideoRef.current) { screenVideoRef.current.srcObject = null; screenVideoRef.current.style.display = "none"; }
    if (camVideoRef.current) { camVideoRef.current.srcObject = null; camVideoRef.current.style.display = "none"; }

    Object.values(viewerCleanupRef.current).forEach(fn => { try { fn(); } catch {} });
    viewerPcsRef.current = {}; viewerCleanupRef.current = {};
    viewersRef.current = {};
    setViewers({});

    await fbDelete("live/viewers");
    await fbDelete("live/offers");
    await fbDelete("live/answers");
    await fbDelete("live/ice_b");
    await fbDelete("live/ice_v");
    await fbDelete("live/chat");

    setIsLive(false); setCamOn(false);
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
        const cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 }, ...(selectedCamId ? { deviceId: { exact: selectedCamId } } : { facingMode: "user" }) }, audio: false });
        camStreamRef.current = cam;
        if (camVideoRef.current) { camVideoRef.current.srcObject = cam; camVideoRef.current.style.display = "block"; }
        setCamOn(true);
      } catch { log("Camera access denied."); }
    }
  }

  function copyLeads(emailsOnly = false) {
    const text = emailsOnly ? leads.map(l => l.email).join(", ") : leads.map(l => `${l.name} <${l.email}>`).join("\n");
    navigator.clipboard.writeText(text);
    log(`${emailsOnly ? "Emails" : "All leads"} copied to clipboard.`);
  }

  function downloadCSV() {
    const rows = [["Name","Email","Joined"].join(","), ...leads.map(l => [l.name,l.email,new Date(l.ts).toISOString()].join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `greenprint-leads-${Date.now()}.csv`; a.click();
  }

  useEffect(() => {
    if (videoDevices.length > 0 && !selectedCamId) {
      const obs = videoDevices.find(d => d.label?.toLowerCase().includes('obs'));
      setSelectedCamId(obs ? obs.deviceId : videoDevices[0].deviceId);
    }
  }, [videoDevices]);

  useEffect(() => {
    if (!authed) return;
    startViewerWatch();
    return () => {
      watchCleanupRef.current?.();
      watchSseRef.current?.close();
      Object.values(viewerCleanupRef.current).forEach(fn => { try { fn(); } catch {} });
    };
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
          <p className="text-center text-xs text-white/30 mb-6">The Greenprint — Go Live Control Room</p>
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
    <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", flexDirection: "column", color: "#fff" }}>

      {/* AUTH GATE */}
      {!authed && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <form onSubmit={doAuth} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "40px", width: "320px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <span style={{ color: "#22c55e", fontWeight: 700, fontSize: "11px", letterSpacing: "0.14em" }}>THE GREENPRINT STUDIO</span>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Broadcaster Access</h2>
            <input
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="Access code"
              disabled={authLocked}
              autoFocus
              style={{ background: "#1a1a1a", border: `1px solid ${authErr ? "#ef4444" : "#252525"}`, borderRadius: "8px", padding: "12px 14px", color: "#fff", fontSize: "15px", outline: "none", fontFamily: "inherit" }}
            />
            {authErr && <p style={{ margin: 0, color: "#ef4444", fontSize: "13px" }}>{authErr}</p>}
            <button
              type="submit"
              disabled={authLocked || !pwd}
              style={{ background: authLocked ? "#111" : "#16a34a", color: authLocked ? "#444" : "#fff", border: "none", borderRadius: "8px", padding: "12px", fontSize: "15px", fontWeight: 700, cursor: authLocked ? "not-allowed" : "pointer" }}
            >
              {authLocked ? "Locked…" : "Enter"}
            </button>
          </form>
        </div>
      )}
      {/* STUDIO */}
      {authed && (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", padding: "14px", gap: "10px", boxSizing: "border-box" }}>

          {/* Header bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ color: "#22c55e", fontWeight: 700, fontSize: "11px", letterSpacing: "0.14em" }}>THE GREENPRINT STUDIO</span>
            {isLive && (
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ background: "#dc2626", color: "#fff", padding: "3px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>&#9679; LIVE</span>
                <span style={{ color: "#888", fontFamily: "monospace", fontSize: "13px" }}>{elapsed}</span>
                <span style={{ color: "#555", fontSize: "13px" }}>{Object.keys(viewers).length} viewer{Object.keys(viewers).length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* Camera preview */}
          <div style={{ flex: 1, position: "relative", background: "#070707", borderRadius: "10px", overflow: "hidden", minHeight: 0 }}>
            <video ref={camVideoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: camOn ? "block" : "none" }} />
            <video ref={screenVideoRef} autoPlay muted playsInline style={{ display: "none" }} />
            {!camOn && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", color: "#252525" }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M15 10l4.553-2.07A1 1 0 0121 8.83v6.34a1 1 0 01-1.447.9L15 14M4 8a2 2 0 012-2h9a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
                </svg>
                <span style={{ fontSize: "14px" }}>No camera preview</span>
                {selectedCamId && <span style={{ fontSize: "12px", color: "#1a1a1a" }}>Click Preview to start</span>}
              </div>
            )}
          </div>
          {/* Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "9px", flexShrink: 0 }}>
            {!isLive ? (
              <>
                {/* Camera select + preview toggle */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    value={selectedCamId}
                    onChange={e => setSelectedCamId(e.target.value)}
                    style={{ flex: 1, background: "#0e0e0e", border: "1px solid #1c1c1c", color: selectedCamId ? "#fff" : "#555", padding: "10px 12px", borderRadius: "7px", fontSize: "13px", fontFamily: "inherit" }}
                  >
                    <option value="">&#8212; Select camera &#8212;</option>
                    {videoDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || ("Camera " + d.deviceId.slice(0, 8))}</option>
                    ))}
                  </select>
                  <button
                    onClick={toggleCam}
                    disabled={!selectedCamId && !camOn}
                    style={{ background: camOn ? "#0c1c0c" : "#0e0e0e", border: `1px solid ${camOn ? "#22c55e" : "#1c1c1c"}`, color: camOn ? "#22c55e" : "#555", padding: "10px 16px", borderRadius: "7px", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}
                  >
                    {camOn ? "\u25cf On" : "Preview"}
                  </button>
                </div>

                {/* Stream title */}
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Stream title (optional)"
                  style={{ background: "#0e0e0e", border: "1px solid #1c1c1c", color: "#fff", padding: "10px 12px", borderRadius: "7px", fontSize: "13px", outline: "none", fontFamily: "inherit" }}
                />
                {/* Mic toggle */}
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }} onClick={toggleMic}>
                  <div style={{ width: "34px", height: "18px", background: micOn ? "#16a34a" : "#1c1c1c", borderRadius: "9px", position: "relative", flexShrink: 0, transition: "background 0.15s" }}>
                    <div style={{ position: "absolute", top: "2px", left: micOn ? "18px" : "2px", width: "14px", height: "14px", background: "#fff", borderRadius: "50%", transition: "left 0.15s" }} />
                  </div>
                  <span style={{ fontSize: "13px", color: "#555" }}>Mic {micOn ? "on" : "off"}</span>
                </label>

                {/* GO LIVE button */}
                <button
                  onClick={goLive}
                  disabled={!camOn}
                  style={{ background: camOn ? "#15803d" : "#0a0a0a", color: camOn ? "#fff" : "#1e1e1e", border: `1px solid ${camOn ? "#16a34a" : "#111"}`, borderRadius: "8px", padding: "14px", fontSize: "15px", fontWeight: 700, cursor: camOn ? "pointer" : "not-allowed", letterSpacing: "0.05em" }}
                >
                  &#9654;&#160;&#160;GO LIVE
                </button>
              </>
            ) : (
              <>
                {/* Mic toggle while live */}
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }} onClick={toggleMic}>
                  <div style={{ width: "34px", height: "18px", background: micOn ? "#16a34a" : "#1c1c1c", borderRadius: "9px", position: "relative", flexShrink: 0, transition: "background 0.15s" }}>
                    <div style={{ position: "absolute", top: "2px", left: micOn ? "18px" : "2px", width: "14px", height: "14px", background: "#fff", borderRadius: "50%", transition: "left 0.15s" }} />
                  </div>
                  <span style={{ fontSize: "13px", color: "#555" }}>Mic {micOn ? "on" : "off"}</span>
                </label>

                {/* END STREAM button */}
                <button
                  onClick={endStream}
                  style={{ background: "#110505", color: "#ef4444", border: "1px solid #2a0808", borderRadius: "8px", padding: "14px", fontSize: "15px", fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em" }}
                >
                  &#9632;&#160;&#160;END STREAM
                </button>
              </>
            )}
            {/* Status message */}
            {statusLog && (
              <p style={{ margin: 0, color: "#2a2a2a", fontSize: "12px", borderTop: "1px solid #0f0f0f", paddingTop: "8px" }}>{statusLog}</p>
            )}

            {/* Leads export */}
            {leads.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #0f0f0f", paddingTop: "8px" }}>
                <span style={{ color: "#2a2a2a", fontSize: "12px" }}>{leads.length} lead{leads.length !== 1 ? "s" : ""}</span>
                <button onClick={downloadCSV} style={{ background: "none", border: "1px solid #1a1a1a", color: "#333", padding: "3px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "11px" }}>Export CSV</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
