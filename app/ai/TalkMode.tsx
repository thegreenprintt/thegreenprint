"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { speakable } from "./lib";

type Phase = "listening" | "thinking" | "speaking" | "paused";

export function pickVoice(): SpeechSynthesisVoice | null {
  try {
    const vs = window.speechSynthesis.getVoices();
    const pref = [/Samantha/i, /Google US English/i, /Ava/i, /Allison/i, /Microsoft (Aria|Jenny)/i, /en[-_]US/i, /^en/i];
    for (const p of pref) { const v = vs.find((x) => p.test(x.name) || p.test(x.lang)); if (v) return v; }
    return vs[0] || null;
  } catch { return null; }
}

export function speak(text: string, onEnd?: () => void): boolean {
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const clean = speakable(text).slice(0, 2400);
    if (!clean) { onEnd?.(); return false; }
    // split into sentences so long replies don't get cut off by some browsers
    const parts = clean.match(/[^.!?]+[.!?]*\s*/g) || [clean];
    const v = pickVoice();
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      if (v) u.voice = v;
      u.rate = 1.04; u.pitch = 1;
      if (i === parts.length - 1) u.onend = () => onEnd?.();
      synth.speak(u);
    });
    return true;
  } catch { onEnd?.(); return false; }
}

export function TalkMode({ onSend, onClose }: { onSend: (text: string) => Promise<string>; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("listening");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const recRef = useRef<any>(null);
  const alive = useRef(true);
  const finalRef = useRef("");

  const listen = useCallback(() => {
    if (!alive.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try { recRef.current?.abort(); } catch {}
    const r = new SR();
    r.lang = "en-US"; r.continuous = false; r.interimResults = true;
    finalRef.current = "";
    setHeard("");
    r.onresult = (e: any) => {
      let t = "";
      for (let k = 0; k < e.results.length; k++) t += e.results[k][0].transcript;
      finalRef.current = t.trim();
      setHeard(t.trim());
    };
    r.onerror = () => {};
    r.onend = async () => {
      if (!alive.current) return;
      const said = finalRef.current;
      if (!said) { setPhase("paused"); return; }
      setPhase("thinking");
      let ans = "";
      try { ans = await onSend(said); } catch {}
      if (!alive.current) return;
      setReply(ans);
      setPhase("speaking");
      speak(ans, () => { if (alive.current) { setPhase("listening"); listen(); } });
    };
    recRef.current = r;
    setPhase("listening");
    try { r.start(); } catch {}
  }, [onSend]);

  useEffect(() => {
    alive.current = true;
    try { window.speechSynthesis.getVoices(); } catch {}
    listen();
    return () => {
      alive.current = false;
      try { recRef.current?.abort(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, [listen]);

  function tapOrb() {
    if (phase === "speaking") { try { window.speechSynthesis.cancel(); } catch {} listen(); }
    else if (phase === "paused") listen();
    else if (phase === "listening") { try { recRef.current?.stop(); } catch {} }
  }

  const label = { listening: "Listening", thinking: "Thinking", speaking: "Speaking", paused: "Tap to talk" }[phase];
  const sub = phase === "listening" ? heard || "Go ahead, I'm listening." : phase === "thinking" ? heard : phase === "speaking" ? speakable(reply).slice(0, 220) : "Tap the orb when you're ready.";

  return (
    <motion.div className="gp-talk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="gp-talk-top">
        <span className="gp-talk-badge"><span className="gp-dot w-1.5 h-1.5 rounded-full inline-block" />Talk mode</span>
        <button onClick={onClose} className="gp-talk-x" aria-label="End talk mode">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <button onClick={tapOrb} className={`gp-orb gp-orb-${phase}`} aria-label={label}>
        <span className="gp-orb-ring" /><span className="gp-orb-ring gp-orb-ring2" /><span className="gp-orb-core" />
        {phase === "speaking" && <span className="gp-orb-bars">{Array.from({ length: 5 }).map((_, i) => <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}</span>}
      </button>
      <div className="gp-talk-label">{label}</div>
      <div className="gp-talk-sub">{sub}</div>
      <div className="gp-talk-hint">{phase === "speaking" ? "Tap the orb to interrupt" : phase === "listening" ? "Tap the orb when you're done" : ""}</div>
    </motion.div>
  );
}
