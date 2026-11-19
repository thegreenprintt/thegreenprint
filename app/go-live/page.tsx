"use client";
import { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, createLocalScreenTracks, createLocalVideoTrack } from "livekit-client";

const HASH = "eb2f9ff29cc1016e2588694f8d9b0aa6703e334811a992f0ec550221081651d0";
const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}
const get = async (p: string) => { try { const r = await fetch(`${FB}/${p}.json`,{cache:"no-store"}); return await r.json(); } catch { return null; } };
const put = async (p: string, d: unknown) => { try { await fetch(`${FB}/${p}.json`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(d),keepalive:true}); } catch {} };
const push = async (p: string, d: unknown) => { try { await fetch(`${FB}/${p}.json`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}); } catch {} };
const del = async (p: string) => { try { await fetch(`${FB}/${p}.json`,{method:"DELETE"}); } catch {} };

type CM = { name: string; msg: string; ts: number };
type FE = { id: string; emoji: string; x: number };
const EMOJIS = ["🔥","❤️","😂","👏","💯","🚀"];
const COLORS = ["#00ff87","#ff6b6b","#ffd93d","#6bcbff","#c77dff","#ff9f43"];
const nc = (n: string) => COLORS[n.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%COLORS.length];
const fmt = (s: number) => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

const CSS = `
@keyframes gpPulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes gpFloat{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-200px) scale(1.9)}}
@keyframes gpAurora{0%{transform:translate(-8%,-8%) rotate(0deg)}50%{transform:translate(8%,5%) rotate(180deg)}100%{transform:translate(-8%,-8%) rotate(360deg)}}
@keyframes gpRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes gpRing{0%{box-shadow:0 0 0 0 rgba(0,255,133,.45)}100%{box-shadow:0 0 0 18px rgba(0,255,133,0)}}
@keyframes gpScan{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}
.gp{position:relative;height:100dvh;background:#040605;color:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden;display:flex;flex-direction:column}
.gp *{box-sizing:border-box}
.gp-bg{position:absolute;inset:-30%;background:radial-gradient(40% 35% at 30% 30%,rgba(0,255,133,.11),transparent 70%),radial-gradient(35% 30% at 75% 70%,rgba(0,200,120,.07),transparent 70%);animation:gpAurora 40s linear infinite;pointer-events:none}
.gp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:48px 48px;-webkit-mask-image:radial-gradient(ellipse at center,#000 30%,transparent 80%);mask-image:radial-gradient(ellipse at center,#000 30%,transparent 80%);pointer-events:none}
.gp-top{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 22px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(4,6,5,.6);backdrop-filter:blur(18px)}
.gp-brand{display:flex;align-items:center;gap:12px}
.gp-logo{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#00FF85,#00B85F);display:flex;align-items:center;justify-content:center;font-weight:900;color:#04110a;letter-spacing:-.5px;box-shadow:0 0 24px rgba(0,255,133,.35);flex-shrink:0}
.gp-pill{display:inline-flex;align-items:center;gap:7px;padding:6px 13px;border-radius:999px;font-size:12px;font-weight:700;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.75);white-space:nowrap}
.gp-dot{width:7px;height:7px;border-radius:50%;display:inline-block}
.gp-main{position:relative;z-index:1;flex:1;display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:18px;padding:18px 22px;overflow:hidden;min-height:0}
.gp-col{display:flex;flex-direction:column;gap:14px;min-height:0;overflow-y:auto;padding-bottom:6px}
.gp-card{background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.015));border:1px solid rgba(255,255,255,.07);border-radius:20px;backdrop-filter:blur(20px);animation:gpRise .5s ease both}
.gp-stage{position:relative;aspect-ratio:16/9;width:100%;max-height:62vh;flex-shrink:0;background:#000;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,.08);box-shadow:0 30px 80px rgba(0,0,0,.55);transition:border-color .3s ease,box-shadow .3s ease}
.gp-stage.on{border-color:rgba(255,59,92,.5);box-shadow:0 0 0 1px rgba(255,59,92,.2),0 30px 80px rgba(0,0,0,.55)}
.gp-scan{position:absolute;inset:0;background:linear-gradient(180deg,transparent,rgba(0,255,133,.05),transparent);animation:gpScan 5s linear infinite;pointer-events:none}
.gp-lbl{font-size:10.5px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4)}
.gp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:14px;padding:12px 18px;font-weight:800;font-size:14px;cursor:pointer;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;transition:transform .15s ease,background .2s ease,border-color .2s ease;text-decoration:none;font-family:inherit;white-space:nowrap}
.gp-btn:hover:not(:disabled){transform:translateY(-1px);background:rgba(255,255,255,.09)}
.gp-btn:disabled{opacity:.4;cursor:not-allowed}
.gp-go{background:linear-gradient(135deg,#00FF85,#00C567);color:#03110a;border:none;font-size:16px;padding:16px 30px;animation:gpRing 1.8s ease-out infinite}
.gp-go:hover:not(:disabled){background:linear-gradient(135deg,#3dffa0,#00d872)}
.gp-end{background:#FF3B5C;border:none;font-size:16px;padding:16px 30px}
.gp-end:hover:not(:disabled){background:#ff5470}
.gp-on{background:rgba(0,255,133,.12);border-color:rgba(0,255,133,.4);color:#00FF85}
.gp-off{background:rgba(255,59,92,.12);border-color:rgba(255,59,92,.4);color:#FF3B5C}
.gp-in{width:100%;padding:12px 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font-size:14px;outline:none;font-family:inherit;min-width:0}
.gp-in:focus{border-color:rgba(0,255,133,.5)}
.gp-chk{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:11px 13px;border-radius:12px;cursor:pointer;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:rgba(255,255,255,.6);font-size:13px;font-family:inherit;transition:all .2s ease}
.gp-chk.done{border-color:rgba(0,255,133,.35);background:rgba(0,255,133,.07);color:#fff}
.gp-box{width:20px;height:20px;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;background:rgba(255,255,255,.08);color:#03110a}
.gp-chk.done .gp-box{background:#00FF85}
.gp-emo{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:8px 10px;cursor:pointer;font-size:19px;line-height:1;transition:transform .15s ease}
.gp-emo:hover{transform:translateY(-2px) scale(1.08)}
.gp-chat{display:flex;flex-direction:column;min-height:0}
.gp-msg{margin-bottom:10px;line-height:1.5;font-size:13.5px;word-wrap:break-word;animation:gpRise .25s ease both}
.gp ::-webkit-scrollbar{width:4px}.gp ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:4px}
@media(max-width:1000px){.gp-main{grid-template-columns:1fr;overflow-y:auto;padding:14px}.gp-col{overflow:visible}.gp-chatcard{height:440px}.gp-hide-sm{display:none!important}.gp-top{padding:12px 14px}}
`;

export default function GoLive() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [live, setLive] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState<number|null>(null);
  const [status, setStatus] = useState("");
  const [viewers, setViewers] = useState(0);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [chat, setChat] = useState<CM[]>([]);
  const [chatMsg, setChatMsg] = useState("");
  const [floats, setFloats] = useState<FE[]>([]);
  const [dur, setDur] = useState(0);
  const [notifying, setNotifying] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const screenRef = useRef<HTMLVideoElement>(null);
  const camRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room|null>(null);
  const hbRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const camTrackRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const seenR = useRef(new Set<string>());
  const startRef = useRef(0);
  const micOnRef = useRef(true);
  const camOnRef = useRef(false);
  const camBusyRef = useRef(false);
  const [connQuality, setConnQuality] = useState("");
  const [preflight, setPreflight] = useState<Record<string, boolean>>({});
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { camOnRef.current = camOn; }, [camOn]);

  // ── STAGE: viewer call-in requests (additive) ─────────────────────────────
  const [stageReqs, setStageReqs] = useState<{id:string;name:string}[]>([]);
  const [stageOn, setStageOn] = useState<{key:string;name:string}[]>([]);
  const stageKey = (n: string) => n.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(async () => {
      const [reqs, appr] = await Promise.all([get("live/stage/requests"), get("live/stage/approved")]);
      const approvedNames = new Set(Object.values(appr || {}).map((a: any) => a?.name));
      const seen = new Set<string>();
      const list: {id:string;name:string}[] = [];
      Object.entries(reqs || {}).forEach(([rid, r]: [string, any]) => {
        if (r?.name && !approvedNames.has(r.name) && !seen.has(r.name)) { seen.add(r.name); list.push({ id: rid, name: r.name }); }
      });
      setStageReqs(list);
      setStageOn(Object.entries(appr || {}).map(([k, a]: [string, any]) => ({ key: k, name: a?.name || k })));
    }, 3000);
    return () => clearInterval(id);
  }, [live]);
  const approveGuest = async (r: {id:string;name:string}) => {
    await put(`live/stage/approved/${stageKey(r.name)}`, { name: r.name, ts: Date.now() });
    await del(`live/stage/requests/${r.id}`);
  };
  const removeGuest = async (g: {key:string;name:string}) => { await del(`live/stage/approved/${g.key}`); };

  // ── GP AI co-host: answers common beginner questions in chat (additive) ──
  useEffect(() => {
    if (!live) return;
    let lastTs = Date.now();
    const cool: Record<string, number> = {};
    const faqs = [
      { id: "0dte", re: /0\s*dte/i, a: "0DTE = zero days to expiration — options that expire today. Fast moves, high risk, small size. 📚" },
      { id: "rmult", re: /r[- ]multiple|what does \+?\d(\.\d)?r mean|mean by \+?\d(\.\d)?r/i, a: "R = risk unit. +2R means the trade made 2x what was risked. It keeps wins and losses comparable." },
      { id: "join", re: /how (do i|to|can i) (join|sign ?up)|how much (is|does)|what('| i)?s the price/i, a: "Tap 'Join The Greenprint' below the chat for full access — alerts, signals & the community. 💚" },
      { id: "sched", re: /when (are you|is he|do you).{0,15}(live|stream)|stream schedule/i, a: "We go live around market opens — join the free Telegram (link on the homepage) to get notified." },
      { id: "broker", re: /(what|which) broker/i, a: "The community uses LivvFX + TradeLocker — full setup steps at thegreenprint.trade/onboard." },
      { id: "demo", re: /paper trad|demo account|practice account/i, a: "Start on a TradeLocker demo account — onboarding walks you through it. Practice before real money. 💪" },
      { id: "advice", re: /financial advice/i, a: "Nothing here is financial advice — it's education. Trade your own plan and manage your risk." },
      { id: "callput", re: /what('| i)?s a (call|put)/i, a: "Calls profit when price rises, puts when it falls. The free Academy on the app page covers the basics." },
      { id: "leverage", re: /leverage/i, a: "Leverage lets you control a bigger position with less capital — 1:500 means $1 controls $500. It amplifies wins AND losses, so risk management is everything." },
      { id: "margin", re: /margin/i, a: "Margin is the collateral your broker holds to keep leveraged trades open. If losses eat it up, positions get closed — that's a margin call." },
      { id: "start", re: /how (do i|to|can i) (start|get started|begin)|where (do|should) i start|i('| a)?m new/i, a: "Start at thegreenprint.trade/onboard — it sets up your apps, broker demo, and the foundations. Then watch the live sessions. 💚" },
      { id: "pip", re: /what('| i)?s a pip|how much is a pip/i, a: "A pip is the smallest standard price move in forex — it's how gains and losses get measured per position size." },
      { id: "lot", re: /what('| i)?s a lot\b|lot size/i, a: "A lot is your position size in forex — 1 standard lot = 100k units. Smaller lots (mini/micro) = smaller risk. Size according to your plan." },
      { id: "stoploss", re: /stop ?loss/i, a: "A stop loss auto-closes your trade at a set price so one bad trade can't wreck the account. Every trade here has one — non-negotiable." },
      { id: "scalp", re: /what('| i)?s scalping|scalp/i, a: "Scalping = quick in-and-out trades catching small moves, often minutes. It's fast — learn on a demo first." },
    ];
    const id = setInterval(async () => {
      const data = await get("live/chat"); if (!data) return;
      const msgs = (Object.values(data) as any[]).filter(m => m && m.ts > lastTs && m.name !== "GP AI" && m.name !== "Host");
      if (msgs.length) lastTs = Math.max(...msgs.map((m: any) => m.ts));
      for (const m of msgs) {
        for (const f of faqs) {
          if (f.re.test(String(m.msg || "")) && (!cool[f.id] || Date.now() - cool[f.id] > 90000)) {
            cool[f.id] = Date.now();
            await push("live/chat", { name: "GP AI", msg: "@" + m.name + " " + f.a, ts: Date.now() });
            return;
          }
        }
      }
    }, 4000);
    return () => clearInterval(id);
  }, [live]);

  // KEEPALIVE — if the browser silently kills the mic or camera track
  // (commonly right after the camera is toggled), bring it back automatically.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(async () => {
      const room = roomRef.current; if (!room) return;
      try {
        if (micOnRef.current) {
          const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
          const t = pub?.track?.mediaStreamTrack;
          if (!pub?.track || t?.readyState === "ended") await room.localParticipant.setMicrophoneEnabled(true);
        }
        if (camOnRef.current && !camBusyRef.current && camTrackRef.current?.mediaStreamTrack?.readyState === "ended") {
          camBusyRef.current = true;
          try {
          const old = room.localParticipant.getTrackPublication(Track.Source.Camera);
          if (old?.track) await room.localParticipant.unpublishTrack(old.track);
          const track = await createLocalVideoTrack({facingMode:"user"});
          camTrackRef.current = track;
          if (camRef.current) track.attach(camRef.current);
          await room.localParticipant.publishTrack(track,{name:"camera",source:Track.Source.Camera,simulcast:true});
          } finally { camBusyRef.current = false; }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(id);
  }, [live]);

  const chatBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = chatBoxRef.current;
    if (!box || box.scrollHeight - box.scrollTop - box.clientHeight < 140) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);

  useEffect(() => {
    if (!live) return;
    startRef.current = Date.now();
    const id = setInterval(() => setDur(Math.floor((Date.now()-startRef.current)/1000)), 1000);
    return () => clearInterval(id);
  }, [live]);

  useEffect(() => {
    if (!authed) return;
    const poll = async () => {
      const data = await get("live/chat");
      if (!data||typeof data!=="object") { setChat([]); return; }
      setChat((Object.values(data) as CM[]).filter(m=>m?.msg&&m?.name).sort((a,b)=>a.ts-b.ts).slice(-50));
    };
    poll(); const id = setInterval(poll,2000); return () => clearInterval(id);
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    const poll = async () => {
      const data = await get("live/reactions");
      if (!data) return;
      const now = Date.now();
      Object.entries(data as Record<string,any>).forEach(([key,val]) => {
        if (now-val.ts>4000||seenR.current.has(key)) return;
        if (seenR.current.size > 900) seenR.current.clear();
        seenR.current.add(key);
        const id=key;
        setFloats(p=>[...p,{id,emoji:val.emoji,x:val.x??Math.random()}]);
        setTimeout(()=>setFloats(p=>p.filter(r=>r.id!==id)),2500);
      });
    };
    const id = setInterval(poll,1000); return () => clearInterval(id);
  }, [authed]);

  // ── MEETING MODE (additive): set a code, open the Zoom-style room ──
  const [meetCode, setMeetCode] = useState("");
  const [meetSaved, setMeetSaved] = useState(false);
  useEffect(() => {
    if (!authed) return;
    get("live/meeting/code").then(c => { if (typeof c === "string" && c) { setMeetCode(c); setMeetSaved(true); } });
  }, [authed]);
  const saveMeetCode = async () => {
    const c = meetCode.trim();
    if (!c) return;
    await put("live/meeting/code", c);
    setMeetSaved(true);
  };

  const startStream = async () => {
    setStatus("Starting — pick your screen in the popup…");
    try {
      setStatus("Requesting screen...");
      const tracks = await createLocalScreenTracks({audio:true});
      const vt = tracks.find(t=>t.kind===Track.Kind.Video);
      const at = tracks.find(t=>t.kind===Track.Kind.Audio);
      if (!vt) throw new Error("No video track");
      if (screenRef.current) vt.attach(screenRef.current);
      setStatus("Connecting...");
      const tokenRes = await fetch(`/api/token?isHost=1&key=${encodeURIComponent(pw)}`, { cache: "no-store" });
      if (tokenRes.status === 403) { vt.stop(); if (at) at.stop(); setStatus("Error: the server did not accept your studio password. Refresh the page and sign in again."); return; }
      const {token,url} = tokenRes.ok ? await tokenRes.json().catch(()=>({} as any)) : ({} as any);
      if (!url) { setStatus("Missing LIVEKIT env vars."); return; }
      const room = new Room({adaptiveStream:true,dynacast:true});
      roomRef.current = room;
      room.on(RoomEvent.ParticipantConnected,()=>setViewers(room.remoteParticipants.size));
      room.on(RoomEvent.ParticipantDisconnected,()=>setViewers(room.remoteParticipants.size));
      room.on(RoomEvent.ConnectionQualityChanged,(q:any,participant:any)=>{
        if (participant === room.localParticipant) setConnQuality(String(q));
      });
      // Hear stage guests (additive): play audio published by approved call-in viewers
      room.on(RoomEvent.TrackSubscribed,(track:any,_pub:any,participant:any)=>{
        try {
          if (track.kind === Track.Kind.Audio && String(participant?.identity||"").startsWith("guest-")) {
            const el = track.attach() as HTMLMediaElement;
            el.autoplay = true; el.setAttribute("playsinline","true");
            el.setAttribute("data-stage-guest", participant.identity);
            document.body.appendChild(el);
            el.play().catch(()=>{});
          }
        } catch {}
      });
      room.on(RoomEvent.TrackUnsubscribed,(track:any)=>{ try { track.detach().forEach((el:HTMLElement)=>el.remove()); } catch {} });
      await room.connect(url,token);
      await room.localParticipant.publishTrack(vt,{name:"screen",source:Track.Source.ScreenShare,simulcast:false});
      if (at) await room.localParticipant.publishTrack(at,{name:"screen-audio",source:Track.Source.ScreenShareAudio});
      // Publish the mic so "Mic ON" is real from the moment the stream starts
      try { await room.localParticipant.setMicrophoneEnabled(true); setMicOn(true); } catch {}
      setLive(true); setStatus(""); setViewers(room.remoteParticipants.size);
      await put("livestatus",{live:true,ts:Date.now()});
      hbRef.current = setInterval(()=>put("livestatus",{live:true,ts:Date.now()}),10000);
      vt.mediaStreamTrack.addEventListener("ended", async () => {
        // Screen share stopped (often an accidental click on the browser's "Stop sharing" bar).
        // Offer to re-share instead of instantly killing the broadcast for everyone.
        const reshare = window.confirm("Screen sharing stopped. Click OK to share again and keep the stream alive, or Cancel to end the stream.");
        if (!reshare) { stopStream(); return; }
        try {
          const tracks = await createLocalScreenTracks({ audio: true });
          const nvt = tracks.find(t => t.kind === Track.Kind.Video);
          const nat = tracks.find(t => t.kind === Track.Kind.Audio);
          if (!nvt || !roomRef.current) { stopStream(); return; }
          if (screenRef.current) nvt.attach(screenRef.current);
          await roomRef.current.localParticipant.publishTrack(nvt, { name: "screen", source: Track.Source.ScreenShare, simulcast: false });
          if (nat) await roomRef.current.localParticipant.publishTrack(nat, { name: "screen-audio", source: Track.Source.ScreenShareAudio });
          nvt.mediaStreamTrack.addEventListener("ended", () => stopStream());
        } catch { stopStream(); }
      });
    } catch(err:any) { setStatus("Error: "+(err.message||String(err))); }
  };

  const stopStream = async () => {
    if (hbRef.current) clearInterval(hbRef.current);
    if (roomRef.current) { await roomRef.current.disconnect(); roomRef.current=null; }
    await del("live/stage");
    await put("livestatus",{live:false,ts:Date.now()});
    setLive(false); setStatus(""); setViewers(0); setCamOn(false);
    if (camTrackRef.current) { camTrackRef.current.stop(); camTrackRef.current=null; }
    if (camRef.current) camRef.current.srcObject=null;
  };

  const toggleCam = async () => {
    if (!roomRef.current || camBusyRef.current) return;
    camBusyRef.current = true;
    try {
      if (camOn) {
        if (camTrackRef.current) { await roomRef.current.localParticipant.unpublishTrack(camTrackRef.current); camTrackRef.current.stop(); camTrackRef.current=null; }
        if (camRef.current) camRef.current.srcObject=null;
        setCamOn(false);
      } else {
        const track = await createLocalVideoTrack({facingMode:"user"});
        camTrackRef.current = track;
        if (camRef.current) track.attach(camRef.current);
        await roomRef.current.localParticipant.publishTrack(track,{name:"camera",source:Track.Source.Camera,simulcast:true});
        // Some browsers restart the audio device when the camera starts — re-assert the mic so audio never drops
        if (micOn) { try { await roomRef.current.localParticipant.setMicrophoneEnabled(true); } catch {} }
        setCamOn(true);
      }
    } catch(err:any) { setStatus("Cam: "+(err.message||String(err))); }
    finally { camBusyRef.current = false; }
  };

  const toggleMic = async () => {
    if (!roomRef.current) return;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!micOn);
    setMicOn(m=>!m);
  };

  const notifySubscribers = async () => {
    if (notifying) return;
    setNotifying(true);
    setNotifyStatus("Sending...");
    try {
      const res = await fetch("/api/notify", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setNotifyStatus("✅ Sent to " + data.sent + " subscribers!");
      } else {
        setNotifyStatus("❌ " + (data.error || "Failed"));
      }
    } catch {
      setNotifyStatus("❌ Network error");
    }
    setNotifying(false);
    setTimeout(() => setNotifyStatus(""), 5000);
  };

  const sendChat = async () => {
    if (!chatMsg.trim()||sendingRef.current) return;
    sendingRef.current=true; const m=chatMsg.trim(); setChatMsg("");
    await push("live/chat",{name:"Host",msg:m,ts:Date.now()});
    sendingRef.current=false;
  };

  const sendReaction = async (emoji: string) => {
    const x=Math.random(),ts=Date.now(),id="h_"+ts;
    seenR.current.add(id);
    setFloats(p=>[...p,{id,emoji,x}]);
    setTimeout(()=>setFloats(p=>p.filter(r=>r.id!==id)),2500);
    await push("live/reactions",{emoji,x,ts});
  };

  useEffect(() => {
    let vp = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!vp) { vp = document.createElement("meta"); vp.setAttribute("name","viewport"); document.head.appendChild(vp); }
    const prev = vp.getAttribute("content");
    vp.setAttribute("content","width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover");
    const st = document.createElement("style");
    st.textContent = "html,body{margin:0;height:100%;overflow:hidden;overscroll-behavior:none;}";
    document.head.appendChild(st);
    return () => { if (prev) vp!.setAttribute("content", prev); st.remove(); };
  }, []);

  const auth = async () => {
    if (await sha256(pw)===HASH) {
      setAuthed(true); localStorage.setItem('gp_host','true');
      try { localStorage.setItem('gp_hk', pw); } catch {}
      await put("livestatus",{live:false,ts:Date.now()});
      // Clear session data only — NEVER live/leads (the email list lives there)
      await del("live/chat"); await del("live/reactions"); await del("live/stage");
    }
    else alert("Wrong password");
  };

  const checks: [string, string][] = [
    ["tabs", "Private tabs and notifications closed"],
    ["mic", "Mic connected and tested"],
    ["chart", "Charts open and laid out"],
    ["alert", "Community alerted (email + Telegram)"],
    ["record", "Recording started (Win+Alt+R)"],
  ];
  const doneCount = checks.filter(([k]) => preflight[k]).length;
  const allClear = doneCount >= checks.length;
  const qColor = connQuality === "excellent" ? "#00FF85" : connQuality === "good" ? "#FFC832" : "#FF3B5C";
  const isErr = status.startsWith("Error") || status.startsWith("Cam") || status.startsWith("Missing");
  const notifyEmail = async () => {
    setEmailSending(true);
    try { const r = await fetch("/api/notify-live", { method: "POST" }); const d = await r.json(); setEmailSent(d.sent ?? d.total ?? 0); } catch {}
    setEmailSending(false);
  };

  if (!authed) return (
    <div className="gp" style={{ alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{CSS}</style>
      <div className="gp-bg" /><div className="gp-grid" />
      <div className="gp-card" style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, padding: "40px 34px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 30 }}>
          <div className="gp-logo" style={{ width: 58, height: 58, borderRadius: 18, fontSize: 20, marginBottom: 18 }}>GP</div>
          <div className="gp-lbl" style={{ color: "rgba(0,255,133,.7)", marginBottom: 8 }}>Host access</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-1px" }}>Greenprint Studio</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", marginTop: 8 }}>Sign in to open your broadcast room.</div>
        </div>
        <label className="gp-lbl" style={{ display: "block", marginBottom: 8 }}>Studio password</label>
        <input className="gp-in" type="password" value={pw} autoFocus onChange={e => setPw(e.target.value)} onKeyDown={e => { if (e.key === "Enter") auth(); }} placeholder="Enter your studio password" />
        <button className="gp-btn gp-go" onClick={auth} style={{ width: "100%", marginTop: 16, animation: "none" }}>Enter Studio</button>
        <a href="/leads" target="_blank" rel="noopener noreferrer" className="gp-btn" style={{ width: "100%", marginTop: 10, fontSize: 13 }}>📋 Open Leads</a>
        <div style={{ textAlign: "center", marginTop: 22, fontSize: 11, color: "rgba(255,255,255,.2)", letterSpacing: "1px" }}>thegreenprint.trade</div>
      </div>
    </div>
  );

  return (
    <div className="gp">
      <style>{CSS}</style>
      <div className="gp-bg" /><div className="gp-grid" />

      {live && (stageReqs.length > 0 || stageOn.length > 0) && (
        <div className="gp-card" style={{ position: "fixed", bottom: 18, left: 18, zIndex: 50, width: 270, padding: "14px 16px", background: "rgba(6,10,8,.96)", borderColor: "rgba(0,255,133,.3)" }}>
          <div className="gp-lbl" style={{ color: "#00FF85", marginBottom: 10 }}>🎙 Stage</div>
          {stageOn.map(g => (
            <div key={g.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🔴 {g.name}</span>
              <button className="gp-btn gp-off" style={{ padding: "5px 10px", fontSize: 11, borderRadius: 9 }} onClick={() => removeGuest(g)}>Remove</button>
            </div>
          ))}
          {stageReqs.map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>✋ {r.name}</span>
              <button className="gp-btn gp-on" style={{ padding: "5px 10px", fontSize: 11, borderRadius: 9 }} onClick={() => approveGuest(r)}>Put on air</button>
            </div>
          ))}
        </div>
      )}

      <header className="gp-top">
        <div className="gp-brand">
          <div className="gp-logo">GP</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: "-.2px" }}>The Greenprint</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)" }}>Broadcast Studio</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {live
            ? <span className="gp-pill" style={{ background: "rgba(255,59,92,.14)", borderColor: "rgba(255,59,92,.45)", color: "#FF3B5C", letterSpacing: "1.5px" }}><span className="gp-dot" style={{ background: "#FF3B5C", animation: "gpPulse 1.2s infinite" }} />LIVE {fmt(dur)}</span>
            : <span className="gp-pill"><span className="gp-dot" style={{ background: "rgba(255,255,255,.35)" }} />OFF AIR</span>}
          <span className="gp-pill">👁 {viewers} watching</span>
          {live && connQuality && <span className="gp-pill gp-hide-sm" style={{ color: qColor }} title="Your upload connection">📶 {connQuality}</span>}
        </div>
      </header>

      <main className="gp-main">
        <section className="gp-col">
          <div className={live ? "gp-stage on" : "gp-stage"}>
            <video ref={screenRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            <div style={{ position: "absolute", bottom: 16, right: 16, width: 210, height: 118, borderRadius: 14, overflow: "hidden", border: "2px solid #00FF85", boxShadow: "0 8px 30px rgba(0,255,133,.3)", display: camOn ? "block" : "none", zIndex: 10 }}>
              <video ref={camRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
              <div style={{ position: "absolute", top: 6, left: 8, background: "#00FF85", color: "#03110a", fontSize: 9, fontWeight: 900, letterSpacing: "1.5px", borderRadius: 5, padding: "2px 6px" }}>CAM</div>
            </div>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
              {floats.map(r => (
                <div key={r.id} style={{ position: "absolute", bottom: 60, left: `${10 + r.x * 75}%`, fontSize: 40, animation: "gpFloat 2.5s ease-out forwards", userSelect: "none", filter: "drop-shadow(0 2px 8px rgba(0,0,0,.6))" }}>{r.emoji}</div>
              ))}
            </div>
            {live && (
              <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 8, zIndex: 5 }}>
                <span className="gp-pill" style={{ background: "rgba(255,59,92,.92)", border: "none", color: "#fff", letterSpacing: "1.5px" }}><span className="gp-dot" style={{ background: "#fff", animation: "gpPulse 1.2s infinite" }} />ON AIR</span>
                {!micOn && <span className="gp-pill" style={{ background: "rgba(0,0,0,.75)", color: "#FF3B5C" }}>🔇 Mic muted</span>}
              </div>
            )}
            {!live && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "radial-gradient(ellipse at center,rgba(0,40,22,.6),rgba(0,0,0,.94))", overflowY: "auto" }}>
                <div className="gp-scan" />
                <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div className="gp-lbl" style={{ color: "rgba(0,255,133,.75)" }}>Pre-flight</div>
                      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{allClear ? "Cleared. Hit Go Live." : "Run it down, then go live"}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: allClear ? "#00FF85" : "rgba(255,255,255,.45)" }}>{doneCount}/{checks.length}</div>
                  </div>
                  <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,.08)", marginBottom: 14, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(doneCount / checks.length) * 100}%`, background: "linear-gradient(90deg,#00C567,#00FF85)", transition: "width .35s ease" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {checks.map(([k, label]) => (
                      <button key={k} className={preflight[k] ? "gp-chk done" : "gp-chk"} onClick={() => setPreflight(p => ({ ...p, [k]: !p[k] }))}>
                        <span className="gp-box">{preflight[k] ? "✓" : ""}</span>{label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 12 }}>Everything on the screen you share goes out live.</div>
                </div>
              </div>
            )}
          </div>

          <div className="gp-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {!live
              ? <button className="gp-btn gp-go" onClick={startStream}>● Go Live</button>
              : <button className="gp-btn gp-end" onClick={stopStream}>■ End Stream</button>}
            <button className={camOn ? "gp-btn gp-on" : "gp-btn"} onClick={toggleCam} disabled={!live}>{camOn ? "📸 Cam on" : "📷 Cam off"}</button>
            <button className={micOn ? "gp-btn gp-on" : "gp-btn gp-off"} onClick={toggleMic} disabled={!live}>{micOn ? "🎤 Mic on" : "🔇 Mic off"}</button>
            <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
              {EMOJIS.map(e => (<button key={e} className="gp-emo" onClick={() => sendReaction(e)}>{e}</button>))}
            </div>
            {status && <div style={{ width: "100%", fontSize: 13, fontWeight: 600, color: isErr ? "#FF3B5C" : "#00FF85" }}>{status}</div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
            <div className="gp-card" style={{ padding: 16 }}>
              <div className="gp-lbl" style={{ marginBottom: 12 }}>📣 Bring people in</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button className={emailSent !== null ? "gp-btn gp-on" : "gp-btn"} onClick={notifyEmail} disabled={emailSending}>{emailSending ? "Sending..." : emailSent !== null ? `✅ Emailed ${emailSent} people` : "📧 Notify email list"}</button>
                <button className="gp-btn" style={{ color: "#FBBF24", borderColor: "rgba(251,191,36,.35)", background: "rgba(251,191,36,.08)" }} onClick={notifySubscribers} disabled={notifying}>🔔 {notifying ? "Sending..." : "Notify subscribers"}</button>
                {notifyStatus && <div style={{ fontSize: 12.5, fontWeight: 600, color: notifyStatus.startsWith("✅") ? "#00FF85" : "#FF3B5C" }}>{notifyStatus}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="gp-btn" style={{ flex: 1, fontSize: 12.5 }} onClick={() => setShowPreview(true)}>👁 Preview email</button>
                  <a className="gp-btn" style={{ flex: 1, fontSize: 12.5, color: "#00FF85" }} href="/leads" target="_blank" rel="noopener noreferrer">📋 Leads ↗</a>
                </div>
              </div>
            </div>
            <div className="gp-card" style={{ padding: 16 }}>
              <div className="gp-lbl" style={{ marginBottom: 12 }}>👥 Meeting mode</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.45)", marginBottom: 10 }}>Set a code, then open the private meeting room.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="gp-in" value={meetCode} onChange={e => { setMeetCode(e.target.value); setMeetSaved(false); }} placeholder="Meeting code" style={{ flex: 1 }} />
                <button className={meetSaved ? "gp-btn gp-on" : "gp-btn"} onClick={saveMeetCode} style={{ fontSize: 12.5 }}>{meetSaved ? "✓ Saved" : "Save"}</button>
              </div>
              <a className={meetSaved ? "gp-btn gp-on" : "gp-btn"} href={`/meet?code=${encodeURIComponent(meetCode)}`} target="_blank" rel="noopener noreferrer" style={{ width: "100%", marginTop: 8, fontSize: 13, pointerEvents: meetSaved ? "auto" : "none", opacity: meetSaved ? 1 : 0.4 }}>Open meeting room →</a>
            </div>
          </div>
        </section>

        <aside className="gp-card gp-chat gp-chatcard" style={{ overflow: "hidden" }}>
          <div style={{ padding: "15px 16px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>💬 Live chat</span>
            <span className="gp-lbl">{viewers} in the room</span>
          </div>
          <div ref={chatBoxRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            {chat.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,.3)", fontSize: 13 }}><div style={{ fontSize: 34, marginBottom: 10 }}>💬</div>Chat shows up here once people join.</div>}
            {chat.map(m => (
              <div key={m.ts + "|" + m.name} className="gp-msg">
                <span style={{ color: m.name === "Host" ? "#FFB020" : m.name === "GP AI" ? "#00FF85" : nc(m.name), fontWeight: 800 }}>{m.name}</span>
                <span style={{ color: "rgba(255,255,255,.85)" }}> {m.msg}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", gap: 8 }}>
            <input className="gp-in" value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendChat(); }} placeholder="Message as Host..." />
            <button className="gp-btn gp-go" style={{ padding: "10px 16px", fontSize: 15, animation: "none" }} onClick={sendChat}>↑</button>
          </div>
        </aside>
      </main>

      {showPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", backdropFilter: "blur(6px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowPreview(false)}>
          <div className="gp-card" style={{ background: "#0a0d0b", maxWidth: 560, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>📧 Email preview</span>
              <button onClick={() => setShowPreview(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "10px 22px", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 11.5, color: "rgba(255,255,255,.45)", lineHeight: 1.8 }}>
              <div>From: <span style={{ color: "rgba(255,255,255,.7)" }}>The Greenprint &lt;noreply@thegreenprint.trade&gt;</span></div>
              <div>Subject: <span style={{ color: "rgba(255,255,255,.7)" }}>🟢 The Greenprint is LIVE, Free Day Trading Class</span></div>
              <div>To: <span style={{ color: "rgba(255,255,255,.7)" }}>Your email list</span></div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ background: "#111", borderRadius: 14, padding: "28px 24px", textAlign: "center" }}>
                <div style={{ display: "inline-block", padding: "6px 16px", background: "rgba(0,255,133,.12)", border: "1px solid rgba(0,255,133,.4)", borderRadius: 20, marginBottom: 16, color: "#00FF85", fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>🟢 LIVE NOW</div>
                <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900 }}>The Greenprint is Live</h2>
                <p style={{ color: "rgba(255,255,255,.5)", fontSize: 13, margin: "0 0 18px" }}>Free Day Trading Class, happening right now</p>
                <p style={{ margin: "0 0 18px", fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,.8)", textAlign: "left" }}>Your free day trading class is live right now. Come watch live trades, scanner alerts, and real-time market analysis with The Greenprint.</p>
                <span style={{ display: "inline-block", padding: "14px 34px", background: "linear-gradient(135deg,#00C567,#00FF85)", borderRadius: 10, color: "#03110a", fontWeight: 900, fontSize: 14 }}>JOIN THE CLASS →</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
