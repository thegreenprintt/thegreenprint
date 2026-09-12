"use client";
import { useState, useEffect } from "react";

export default function JoinPage() {
  const [step, setStep] = useState(1);
  const [acctType, setAcctType] = useState<"" | "demo" | "live">("");
  const [sub, setSub] = useState(0);
  const [done, setDone] = useState([false, false, false]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState(false);
  const [phase, setPhase] = useState<"form" | "sending" | "sent" | "approved" | "denied">("form");
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState("");
  const [copied, setCopied] = useState(false);

  const count = done.filter(Boolean).length;
  const mark = (k: number) => setDone((d) => d.map((v, i) => (i === k ? true : v)));
  const copyServer = () => {
    try { navigator.clipboard.writeText("LIVVFX"); } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    if (phase !== "sent" || !token) return;
    let stop = false;
    const id = setInterval(async () => {
      try {
        const r = await fetch("/api/gp-confirm?poll=" + encodeURIComponent(token));
        const j = await r.json();
        if (stop) return;
        if (j.status === "approved") { setInvite(j.invite || ""); setPhase("approved"); }
        else if (j.status === "denied") { setPhase("denied"); }
      } catch {}
    }, 3000);
    return () => { stop = true; clearInterval(id); };
  }, [phase, token]);

  const submit = async () => {
    if (!/.+@.+\..+/.test(email.trim())) { setErr(true); return; }
    setErr(false); setPhase("sending");
    try {
      const r = await fetch("/api/gp-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (j && j.token) setToken(j.token);
    } catch {}
    setPhase("sent");
  };

  const Apple = () => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.9-1.21-1.77-3.1-2.02-3.77-2.05-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.46 7.8 1.3 10.36.86 1.25 1.88 2.65 3.22 2.6 1.3-.05 1.78-.84 3.35-.84 1.56 0 2 .84 3.37.81 1.39-.02 2.27-1.27 3.12-2.53.98-1.45 1.39-2.85 1.41-2.92-.03-.01-2.7-1.04-2.73-4.13M14.6 4.9c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44" /></svg>);
  const Play = () => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 3.5v17l13-8.5-13-8.5z" /></svg>);

  return (
    <div className="jp">
      <style>{`
        html,body{overflow-x:hidden;max-width:100vw;}
        .fixed.bottom-0.left-0.right-0.z-50{display:none!important;}
        @keyframes gpIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .jp .gstep{animation:gpIn .4s cubic-bezier(.2,.8,.3,1) both;}
        .jp .choice{display:flex;align-items:center;gap:13px;padding:15px;border-radius:16px;background:rgba(255,255,255,.045);border:1px solid var(--stroke);cursor:pointer;transition:.2s;margin-bottom:12px;}
        .jp .choice:hover{border-color:rgba(0,255,133,.5);background:rgba(0,255,133,.05);}
        .jp .choice:active{transform:scale(.99);}
        .jp .cic{width:48px;height:48px;border-radius:13px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:23px;background:rgba(0,255,133,.12);border:1px solid rgba(0,255,133,.28);}
        .jp .ctx{flex:1;min-width:0;}
        .jp .ch{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .jp .ch b{font-size:16px;font-weight:700;}
        .jp .rec{font-size:9px;font-weight:700;letter-spacing:.1em;color:#001a0e;background:var(--green);padding:3px 7px;border-radius:6px;}
        .jp .ctx p{margin:3px 0 0;font-size:12.5px;color:var(--mut);line-height:1.45;}
        .jp .cgo{color:var(--green);font-weight:700;font-size:20px;flex-shrink:0;}
        .jp .qtag{display:inline-block;font-size:10px;letter-spacing:.24em;color:var(--green);font-weight:700;margin:2px 0 8px;}
        .jp .q{font-size:21px;font-weight:700;line-height:1.22;letter-spacing:-.01em;margin:0 0 4px;}
        .jp .qsub{font-size:12.5px;color:var(--mut2);margin:0 0 16px;}
        .jp{--green:#00FF85;--mut:rgba(255,255,255,.56);--mut2:rgba(255,255,255,.34);--stroke:rgba(255,255,255,.1);--card:rgba(255,255,255,.045);
          position:relative;min-height:100vh;background:#05070b;color:#fff;font-family:'Space Grotesk',-apple-system,system-ui,sans-serif;overflow-x:hidden;touch-action:pan-y;-webkit-text-size-adjust:100%;}
        .jp *{box-sizing:border-box;}
        .jp .fx{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
        .jp .blob{position:absolute;border-radius:50%;filter:blur(90px);}
        .jp .b1{width:480px;height:480px;background:radial-gradient(circle,rgba(0,255,133,.16),transparent 65%);top:-200px;left:50%;margin-left:-240px;animation:jpp 9s ease-in-out infinite;}
        .jp .b2{width:420px;height:420px;background:radial-gradient(circle,rgba(0,255,133,.08),transparent 65%);bottom:-220px;right:-120px;}
        @keyframes jpp{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
        .jp .wrap{position:relative;z-index:1;max-width:440px;margin:0 auto;padding:34px 20px 48px;}
        .jp .top{text-align:center;margin-bottom:22px;}
        .jp .rl{position:relative;width:54px;height:54px;margin:0 auto 14px;}
        .jp .rl .halo{position:absolute;inset:-8px;border-radius:50%;background:radial-gradient(circle,rgba(0,255,133,.4),transparent 70%);animation:jpp 3.5s ease-in-out infinite;}
        .jp .rl .core{position:absolute;inset:0;border-radius:15px;background:var(--green);display:flex;align-items:center;justify-content:center;color:#000;font-weight:700;font-size:26px;box-shadow:0 0 30px rgba(0,255,133,.55);}
        .jp .kick{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:var(--green);font-weight:600;}
        .jp h1{font-size:29px;font-weight:700;letter-spacing:-.02em;line-height:1.08;margin:11px 0 10px;}
        .jp h1 .g{background:linear-gradient(180deg,#eafff4,#00FF85);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
        .jp .sub{font-size:14px;color:var(--mut);line-height:1.6;max-width:340px;margin:0 auto;}
        .jp .flag{display:inline-block;font-size:10.5px;color:var(--mut2);letter-spacing:.14em;margin-bottom:8px;font-weight:600;}
        .jp .bar{display:flex;align-items:center;gap:11px;margin:14px 0 18px;}
        .jp .track{flex:1;height:7px;border-radius:7px;background:rgba(255,255,255,.08);overflow:hidden;}
        .jp .fill{height:100%;background:linear-gradient(90deg,#0bd873,#00FF85);border-radius:7px;box-shadow:0 0 12px rgba(0,255,133,.6);transition:width .55s cubic-bezier(.2,.8,.3,1);}
        .jp .barlbl{font-size:12px;color:var(--mut);font-weight:500;white-space:nowrap;}.jp .barlbl b{color:var(--green);}

        .jp .card{border:.5px solid var(--stroke);background:var(--card);border-radius:18px;padding:16px;margin-bottom:12px;transition:border-color .3s,background .3s;}
        .jp .card.done{border-color:rgba(0,255,133,.32);background:rgba(0,255,133,.055);}
        .jp .row{display:flex;gap:13px;align-items:center;}
        .jp .ic{width:50px;height:50px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.35);overflow:hidden;}
        .jp .ic img{width:100%;height:100%;object-fit:cover;display:block;}
        .jp .ic.tl{background:#0a1512;}
        .jp .ic.br{background:linear-gradient(135deg,#00FF85,#0bd873);}
        .jp .it{flex:1;min-width:0;}
        .jp .it b{display:block;font-size:15px;font-weight:600;line-height:1.25;}
        .jp .card.done .it b{color:var(--green);}
        .jp .it span{display:block;font-size:12.5px;color:var(--mut);margin-top:2px;line-height:1.4;}
        .jp .tick{width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);color:var(--mut);border:1.5px solid rgba(255,255,255,.18);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:.25s;}
        .jp .card.done .tick{background:var(--green);color:#000;border-color:var(--green);box-shadow:0 0 16px rgba(0,255,133,.5);}
        .jp .acts{display:flex;gap:9px;margin-top:14px;}
        .jp .store{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 10px;border-radius:12px;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.14);color:#fff;font-size:13px;font-weight:600;text-decoration:none;transition:.2s;}
        .jp .store:hover{background:rgba(255,255,255,.11);border-color:rgba(255,255,255,.24);}
        .jp .store svg{width:15px;height:16px;flex-shrink:0;}
        .jp .cta{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;width:100%;padding:13px 0;border-radius:12px;background:var(--green);color:#000;font-size:14.5px;font-weight:700;text-decoration:none;box-shadow:0 0 26px rgba(0,255,133,.35);}
        .jp .srv{display:flex;align-items:center;gap:9px;margin-top:11px;padding:10px 13px;border-radius:12px;background:rgba(255,255,255,.04);border:.5px solid var(--stroke);}
        .jp .srv .lbl{font-size:11.5px;color:var(--mut2);text-transform:uppercase;letter-spacing:.08em;}
        .jp .srv .val{font-size:14px;font-weight:700;letter-spacing:.06em;color:#fff;font-family:ui-monospace,Menlo,monospace;}
        .jp .srv .cpy{margin-left:auto;font-size:11px;font-weight:600;color:var(--green);border:.5px solid rgba(0,255,133,.35);border-radius:9px;padding:6px 12px;cursor:pointer;}
        .jp .btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:17px 0;border-radius:15px;border:none;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;transition:transform .15s,box-shadow .3s;margin-top:18px;}
        .jp .btn:active{transform:scale(.98);}
        .jp .btn.primary{background:var(--green);color:#000;box-shadow:0 0 34px rgba(0,255,133,.4);}
        .jp .btn.primary:disabled{background:rgba(255,255,255,.07);color:var(--mut2);cursor:not-allowed;box-shadow:none;}
        .jp .emailcard{border:.5px solid var(--stroke);background:var(--card);border-radius:18px;padding:18px;}
        .jp .emailcard b{font-size:16px;font-weight:600;}.jp .emailcard p{font-size:13px;color:var(--mut);margin:4px 0 14px;line-height:1.55;}
        .jp input{width:100%;padding:15px 16px;background:rgba(255,255,255,.05);border:.5px solid var(--stroke);border-radius:13px;color:#fff;font-size:15px;font-family:inherit;outline:none;transition:.2s;}
        .jp input::placeholder{color:var(--mut2);}
        .jp input:focus{border-color:rgba(0,255,133,.55);box-shadow:0 0 0 3px rgba(0,255,133,.12);}
        .jp .er{font-size:12px;color:#ff6a6a;margin-top:8px;}
        .jp .back{background:none;border:none;color:var(--mut2);font-family:inherit;font-size:12.5px;cursor:pointer;padding:12px 0 0;display:block;margin:8px auto 0;}
        .jp .tk{display:flex;gap:14px;align-items:flex-start;position:relative;padding-bottom:22px;}
        .jp .tk:last-child{padding-bottom:0;}
        .jp .tk .line{position:absolute;left:17px;top:36px;bottom:-2px;width:2px;background:rgba(255,255,255,.12);}
        .jp .tk:last-child .line{display:none;}
        .jp .tk .dot{width:36px;height:36px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;background:rgba(255,255,255,.06);color:var(--mut);border:1.5px solid rgba(255,255,255,.18);z-index:1;}
        .jp .tk .tx b{display:block;font-size:15.5px;font-weight:600;margin-top:6px;}
        .jp .tk .tx span{display:block;font-size:12.5px;color:var(--mut);margin-top:2px;line-height:1.45;}
        .jp .tk.done .dot{background:var(--green);color:#000;border-color:var(--green);box-shadow:0 0 16px rgba(0,255,133,.5);}
        .jp .tk.done .tx b{color:var(--green);}.jp .tk.done .line{background:var(--green);}
        .jp .tk.active .dot{background:rgba(0,255,133,.12);color:var(--green);border-color:rgba(0,255,133,.5);}
        .jp .spin{display:inline-block;animation:jpsp 1s linear infinite;}@keyframes jpsp{to{transform:rotate(360deg)}}
        .jp .seal{width:76px;height:76px;margin:4px auto 18px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;color:#000;font-size:36px;box-shadow:0 0 54px rgba(0,255,133,.6);}
        .jp .foot{font-size:10px;color:var(--mut2);text-align:center;line-height:1.6;margin-top:22px;}
      `}</style>

      <div className="fx"><div className="blob b1" /><div className="blob b2" /></div>

      <div className="wrap">
        <div className="top">
          <div className="rl"><div className="halo" /><div className="core">G</div></div>
          <div className="kick">The Greenprint</div>
          <h1>{step === 1 ? (<>Download your <span className="g">apps.</span></>) : step === 2 ? (acctType === "live" ? (<>Fund your <span className="g">account.</span></>) : acctType === "demo" ? (<>Set up your <span className="g">account.</span></>) : (<>Demo or <span className="g">live?</span></>)) : step === 3 ? (<>Join the <span className="g">signals chat.</span></>) : (<>Learn to <span className="g">trade.</span></>)}</h1>
          <p className="sub">{step === 1 ? "Three quick downloads: TradeLocker, Telegram, and your free broker account." : step === 2 ? (acctType === "live" ? "Deposit and move your funds into a live trading account — step by step." : acctType === "demo" ? "Your broker is the middleman between you and the markets. Let's open your trading account." : "How do you want to start? You can switch anytime — most beginners start on demo.") : step === 3 ? "Confirm your email and I'll approve you straight into the free signals chat." : "Watch this once and you'll know how to place your first trade."}</p>
        </div>

        <span className="flag">STEP {step} OF 4</span>

        {step === 1 && (
          <div className="gstep">
            <div className="bar"><div className="track"><div className="fill" style={{ width: (count / 3) * 100 + "%" }} /></div><div className="barlbl"><b>{count}</b> of 3 done</div></div>
            <p className="sub" style={{ margin: "2px 0 8px", fontSize: "12.5px", maxWidth: "none" }}>Tap the circle on the right of each one as you finish it.</p>
<div className={"card" + (done[0] ? " done" : "")}>
              <div className="row">
                <div className="ic tl"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/6c/25/c3/6c25c3c6-bbc4-f961-c32d-da661aeaee6f/AppIcon-0-0-1x_U007epad-0-1-85-220.png/512x512bb.jpg" alt="TradeLocker" /></div>
                <div className="it"><b>Get TradeLocker</b><span>The app you place your trades in</span></div>
                <button className="tick" onClick={() => mark(0)} aria-label="Mark done">{done[0] ? "✓" : ""}</button>
              </div>
              <div className="acts">
                <a className="store" href="https://apps.apple.com/us/app/tradelocker/id6447196449" target="_blank" rel="noopener noreferrer"><Apple /> App Store</a>
                <a className="store" href="https://play.google.com/store/apps/details?id=com.tradelocker.mobile" target="_blank" rel="noopener noreferrer"><Play /> Google Play</a>
              </div>
              
            </div>

            <div className={"card" + (done[1] ? " done" : "")}>
              <div className="row">
                <div className="ic tg"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/5a/2b/59/5a2b59f4-1458-d32d-7b33-00ba66d2d59e/Telegram-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg" alt="Telegram" /></div>
                <div className="it"><b>Get Telegram</b><span>Where I send the live signals</span></div>
                <button className="tick" onClick={() => mark(1)} aria-label="Mark done">{done[1] ? "✓" : ""}</button>
              </div>
              <div className="acts">
                <a className="store" href="https://apps.apple.com/us/app/telegram-messenger/id686449807" target="_blank" rel="noopener noreferrer"><Apple /> App Store</a>
                <a className="store" href="https://play.google.com/store/apps/details?id=org.telegram.messenger" target="_blank" rel="noopener noreferrer"><Play /> Google Play</a>
              </div>
            </div>

            <div className={"card" + (done[2] ? " done" : "")}>
              <div className="row">
                <div className="ic br"><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.5l5-5 4 3 6.5-7.5" stroke="#053" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 6.5h4v4" stroke="#053" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <div className="it"><b>Sign up with the broker</b><span>Your free account — with my link</span></div>
                <button className="tick" onClick={() => mark(2)} aria-label="Mark done">{done[2] ? "✓" : ""}</button>
              </div>
              <a className="cta" href="https://members.livvglobal.com/client/register/6a65379bb16ad" target="_blank" rel="noopener noreferrer">Create free account →</a>
            </div>
            <button className="btn primary" disabled={count < 3} onClick={() => setStep(2)}>{count < 3 ? "Tap all 3 to continue (" + count + "/3)" : "Next: set up your account →"}</button>
          </div>
        )}

        {step === 2 && (
          <div className="gstep">
            {!acctType ? (
              <>
                <div className="choice" role="button" tabIndex={0} onClick={() => { setAcctType("demo"); setSub(0); }}>
                  <div className="cic">📈</div>
                  <div className="ctx"><div className="ch"><b>Demo account</b></div><p>Practice with fake money — zero risk. Perfect if you're brand new.</p></div>
                  <span className="cgo">›</span>
                </div>
                <div className="choice" role="button" tabIndex={0} onClick={() => { setAcctType("live"); setSub(0); }}>
                  <div className="cic">💵</div>
                  <div className="ctx"><div className="ch"><b>Live account</b></div><p>Fund a real account and trade with your own money.</p></div>
                  <span className="cgo">›</span>
                </div>
                <button className="back" onClick={() => setStep(1)}>← Back</button>
              </>
            ) : (() => {
              const cred = (
                <div className="card" style={{ marginTop: 12 }}>
                  <b style={{ display: "block", fontSize: "13.5px", marginBottom: "8px" }}>Logging into TradeLocker? Type in:</b>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "13px", padding: "6px 0", borderBottom: ".5px solid rgba(255,255,255,.06)" }}><span style={{ color: "var(--mut)" }}>Email</span><b>your LivvFX email</b></div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "13px", padding: "6px 0" }}><span style={{ color: "var(--mut)" }}>Password</span><b>your LivvFX password</b></div>
                  <div className="srv" style={{ marginTop: 8 }}><span className="lbl">Server</span><span className="val">LIVVFX</span><span className="cpy" onClick={copyServer}>{copied ? "Copied ✓" : "Copy"}</span></div>
                </div>
              );
              const demoSteps = [
                { t: "Create your LivvFX account", d: "This free account is your login for everything. Tap below to sign up with my link.", extra: (<a className="cta" href="https://members.livvglobal.com/client/register/6a65379bb16ad" target="_blank" rel="noopener noreferrer">Create free account →</a>) },
                { t: "Open Trading Accounts", d: "Inside LivvFX, tap the menu in the top-left, then tap Trading Accounts.", extra: null },
                { t: "Open a Demo Account", d: "Tap Open Demo Account. Demo is practice money — zero risk while you learn.", extra: null },
                { t: "Set your balance & leverage", d: "Set balance to $1,000–$10,000 and leverage to 1:500, then tap Submit.", extra: null },
                { t: "Log into TradeLocker", d: "Open TradeLocker and log in with the demo account you just made. You're ready.", extra: cred },
              ];
              const liveSteps = [
                { t: "Log in & open My Funds", d: "Sign in to your LivvFX account. Open the side menu, tap MY FUNDS, then DEPOSIT.", extra: (<a className="cta" href="https://members.livvglobal.com/login" target="_blank" rel="noopener noreferrer">Open Livv to deposit →</a>) },
                { t: "Choose Card or Crypto", d: "Tap DEPOSIT NOW under Card (instant) or Crypto. For card: enter the amount, tap SUBMIT, and complete the payment.", extra: null },
                { t: "Check your wallet balance", d: "Open the side menu and tap DASHBOARD. Your Wallet Balance now shows your deposit.", extra: null },
                { t: "Open or find your account", d: "Menu → TRADING ACCOUNT. First time? Tap OPEN LIVE ACCOUNT. Already have one? Tap ACCOUNT LIST and note your account number.", extra: null },
                { t: "Move your funds over", d: "Tap INTERNAL FUND TRANSFER → WALLET TO TRADING ACCOUNT. Pick your account, enter the amount, type anything in Note, tap SUBMIT.", extra: null },
                { t: "Download TradeLocker", d: "Get the TradeLocker app from the App Store or Google Play if you haven't already.", extra: null },
                { t: "Log into TradeLocker", d: "Open the app and tap LOGIN. Use your LivvFX email and password, with server LIVVFX.", extra: cred },
                { t: "You're funded & ready", d: "Your live account shows up automatically. You're set to place your first trade.", extra: null },
              ];
              const steps = acctType === "demo" ? demoSteps : liveSteps;
              const i = Math.min(sub, steps.length - 1);
              const cur = steps[i];
              const last = steps.length - 1;
              return (
                <div key={acctType + "-" + i} className="gstep">
                  <span className="flag">{acctType === "demo" ? "DEMO · PRACTICE MONEY" : "LIVE · REAL MONEY"}</span>
                  <div style={{ height: 5, borderRadius: 5, background: "var(--stroke)", margin: "14px 0 8px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: ((i + 1) / steps.length * 100) + "%", background: "var(--green)", borderRadius: 5, transition: "width .35s ease" }} />
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--mut2)", letterSpacing: ".08em", marginBottom: 20 }}>STEP {i + 1} OF {steps.length}</div>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ flex: "0 0 auto", width: 42, height: 42, borderRadius: "50%", background: "var(--green)", color: "#02120a", fontWeight: 800, fontSize: "19px", display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
                    <div><b style={{ display: "block", fontSize: "21px", lineHeight: 1.25, marginBottom: 7 }}>{cur.t}</b><p style={{ margin: 0, fontSize: "15px", lineHeight: 1.55, color: "var(--mut)" }}>{cur.d}</p></div>
                  </div>
                  {cur.extra}
                  <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
                    <button className="back" style={{ marginTop: 0 }} onClick={() => (i === 0 ? setAcctType("") : setSub(i - 1))}>← Back</button>
                    <button className="btn primary" style={{ width: "auto", padding: "13px 26px", marginTop: 0 }} onClick={() => (i < last ? setSub(i + 1) : setStep(3))}>{i < last ? "Next →" : "I'm set — continue →"}</button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {step === 3 && (phase === "form" || phase === "sending") && (
          <div className="gstep">
            <div className="emailcard">
              <b>Confirm it&apos;s you</b>
              <p>Drop your name (or nickname) and the email you signed up with. I&apos;ll match it, then approve you into the chat.</p>
              <input type="text" placeholder="Name or nickname" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 10 }} />
              <input type="email" placeholder="you@email.com" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(false); }} />
              {err && <div className="er">Enter the email you used to sign up.</div>}
              <button className="btn primary" disabled={phase === "sending"} onClick={submit}>{phase === "sending" ? "Sending…" : "Confirm my account"}</button>
            </div>
            <button className="back" onClick={() => setStep(2)}>← Back</button>
          </div>
        )}

        {step === 3 && phase === "sent" && (
          <div className="gstep" style={{ margin: "10px 0 4px" }}>
            <div className="tk done"><div className="line" /><div className="dot">✓</div><div className="tx"><b>Request received</b><span>I&apos;m reviewing your account.</span></div></div>
            <div className="tk active"><div className="line" /><div className="dot"><span className="spin">◌</span></div><div className="tx"><b>Confirming you</b><span>This page unlocks the moment I approve you — keep it open.</span></div></div>
            <div className="tk"><div className="dot">🔓</div><div className="tx"><b>Chat unlocks here</b><span>Your one-time invite appears right on this screen.</span></div></div>
          </div>
        )}

        {step === 3 && phase === "approved" && (
          <div className="gstep" style={{ textAlign: "center" }}>
            <div className="seal">✓</div>
            <span className="flag">YOU&apos;RE APPROVED</span>
            <p className="sub" style={{ margin: "8px auto 18px" }}>You&apos;re in. Tap below to open the free signals chat — this invite is just for you and works once.</p>
            <a className="btn primary" href={invite} target="_blank" rel="noopener noreferrer" style={{ display: "flex", textDecoration: "none", marginTop: 0 }}>Join the free signals chat →</a>
            <button className="btn" style={{ background: "rgba(255,255,255,.06)", color: "#fff" }} onClick={() => setStep(4)}>Next: learn to trade →</button>
          </div>
        )}

        {step === 3 && phase === "denied" && (
          <div className="gstep" style={{ textAlign: "center" }}>
            <div className="seal" style={{ background: "#ff6a6a", boxShadow: "0 0 40px rgba(255,80,80,.4)" }}>!</div>
            <p className="sub" style={{ margin: "0 auto 14px" }}>I couldn&apos;t match this to a signup under my link yet. Make sure you used my link, then message me and I&apos;ll sort it out.</p>
            <button className="back" onClick={() => { setPhase("form"); }}>← Try a different email</button>
          </div>
        )}

        {step === 4 && (
          <div className="gstep">
            <p className="sub" style={{ margin: "0 0 14px", maxWidth: "none" }}>Watch it all the way through — and do each step in TradeLocker as you go. Follow along and you&apos;ll place your first practice trade by the end.</p>
            <video controls playsInline preload="metadata" style={{ width: "100%", borderRadius: 14, border: ".5px solid var(--stroke)", background: "#000", display: "block" }}>
              <source src="/tradelocker-overview.mp4" type="video/mp4" />
            </video>
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <button className="back" onClick={() => setStep(3)}>← Back</button>
              <a className="btn primary" href={invite || "https://t.me/+iNKnU8qINq8xMjc5"} target="_blank" rel="noopener noreferrer" style={{ width: "auto", padding: "13px 24px", marginTop: 0, textDecoration: "none" }}>Open the chat →</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}












