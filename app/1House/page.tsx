"use client";
import { useState } from "react";

export default function OneHousePage() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState([false, false, false]);
  const [copied, setCopied] = useState(false);
  const count = done.filter(Boolean).length;
  const mark = (k: number) => setDone((d) => d.map((v, i) => (i === k ? true : v)));
  const copyServer = () => { try { navigator.clipboard.writeText("LIVVFX"); } catch {} setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const Apple = () => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.9-1.21-1.77-3.1-2.02-3.77-2.05-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.46 7.8 1.3 10.36.86 1.25 1.88 2.65 3.22 2.6 1.3-.05 1.78-.84 3.35-.84 1.56 0 2 .84 3.37.81 1.39-.02 2.27-1.27 3.12-2.53.98-1.45 1.39-2.85 1.41-2.92-.03-.01-2.7-1.04-2.73-4.13M14.6 4.9c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44" /></svg>);
  const Play = () => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 3.5v17l13-8.5-13-8.5z" /></svg>);

  return (
    <div className="jp">
      <style>{`
        html,body{overflow-x:hidden;max-width:100vw;}
        .fixed.bottom-0.left-0.right-0.z-50{display:none!important;}
        @keyframes gpIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .jp .gstep{animation:gpIn .4s cubic-bezier(.2,.8,.3,1) both;}
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
          <div className="rl"><div className="halo" /><div className="core" style={{ fontSize: "20px" }}>1H</div></div>
          <div className="kick">1House Onboarding</div>
          <h1>{step === 1 ? (<>Download your <span className="g">apps.</span></>) : step === 2 ? (<>Set up your <span className="g">accounts.</span></>) : step === 3 ? (<>Get into <span className="g">1House.</span></>) : step === 4 ? (<>Navigate <span className="g">1House.</span></>) : step === 5 ? (<>Watch the <span className="g">videos.</span></>) : (<>Where to <span className="g">start.</span></>)}</h1>
          <p className="sub">{step === 1 ? "Brand new? Perfect. Start here — grab the apps and open your free broker account." : step === 2 ? "Sign in to LivvFX first, then set up a demo account to practice with — zero risk." : step === 3 ? "1house.tv is your home base. Let's get you logged in." : step === 4 ? "Here's where everything lives so you never feel lost." : step === 5 ? "Watch these, follow along, and you'll know how to take your first trade." : "A few keys to start strong — then you're off."}</p>
        </div>

        <span className="flag">STEP {step} OF 6</span>

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
            <button className="btn primary" disabled={count < 3} onClick={() => setStep(2)}>{count < 3 ? "Tap all 3 to continue (" + count + "/3)" : "Next: set up your accounts →"}</button>
          </div>
        )}

        {step === 2 && (
          <div className="gstep">
            <p className="sub" style={{ margin: "0 0 14px", maxWidth: "none" }}>No rush — do this now or come back anytime. Follow these in order:</p>
            <div style={{ margin: "4px 0 6px" }}>
              <div className="tk"><div className="line" /><div className="dot">1</div><div className="tx"><b>Sign in to LivvFX</b><span>Create your free LivvFX account — this is your login for everything.</span></div></div>
              <div className="tk"><div className="line" /><div className="dot">2</div><div className="tx"><b>Open Trading Accounts</b><span>In LivvFX, tap the menu (top-left), then &quot;Trade Accounts.&quot;</span></div></div>
              <div className="tk"><div className="line" /><div className="dot">3</div><div className="tx"><b>Open a Demo Account</b><span>Tap &quot;Open Demo Account&quot; — demo is practice money, zero risk.</span></div></div>
              <div className="tk"><div className="line" /><div className="dot">4</div><div className="tx"><b>Set balance &amp; leverage</b><span>Balance $1,000–$10,000, leverage 1:500, then Submit.</span></div></div>
              <div className="tk"><div className="dot">5</div><div className="tx"><b>Log into TradeLocker</b><span>Open TradeLocker and log in with the demo account you just made — you&apos;re ready.</span></div></div>
            </div>
            <div className="card" style={{ marginTop: 4 }}>
              <b style={{ display: "block", fontSize: "13.5px", marginBottom: "8px" }}>Logging into TradeLocker? Type in:</b>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "13px", padding: "6px 0", borderBottom: ".5px solid rgba(255,255,255,.06)" }}><span style={{ color: "var(--mut)" }}>Email</span><b>the email you used on LivvFX</b></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "13px", padding: "6px 0" }}><span style={{ color: "var(--mut)" }}>Password</span><b>the password you made</b></div>
              <div className="srv" style={{ marginTop: 8 }}><span className="lbl">Server</span><span className="val">LIVVFX</span><span className="cpy" onClick={copyServer}>{copied ? "Copied ✓" : "Copy"}</span></div>
            </div>
            <a className="cta" href="https://members.livvglobal.com/client/register/6a65379bb16ad" target="_blank" rel="noopener noreferrer">Open your broker →</a>
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <button className="back" onClick={() => setStep(1)}>← Back</button>
              <button className="btn primary" style={{ width: "auto", padding: "13px 24px", marginTop: 0 }} onClick={() => setStep(3)}>Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="gstep">
            <div style={{ margin: "4px 0 6px" }}>
              <div className="tk"><div className="line" /><div className="dot">1</div><div className="tx"><b>Go to 1house.tv</b><span>Open it in your browser.</span></div></div>
              <div className="tk"><div className="line" /><div className="dot">2</div><div className="tx"><b>Create your account or log in</b><span>Use the same email you signed up with.</span></div></div>
              <div className="tk"><div className="dot">3</div><div className="tx"><b>You&apos;re in</b><span>This is your home base from now on.</span></div></div>
            </div>
            <a className="cta" href="https://www.1house.tv" target="_blank" rel="noopener noreferrer">Open 1house.tv →</a>
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <button className="back" onClick={() => setStep(2)}>← Back</button>
              <button className="btn primary" style={{ width: "auto", padding: "13px 24px", marginTop: 0 }} onClick={() => setStep(4)}>Next →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="gstep">
            <p className="sub" style={{ margin: "0 0 14px", maxWidth: "none" }}>Inside 1House, here&apos;s where the important stuff lives:</p>
            <div style={{ margin: "4px 0 6px" }}>
              <div className="tk"><div className="line" /><div className="dot">1</div><div className="tx"><b>Educators</b><span>Pick a mentor to follow — start with Arin Long.</span></div></div>
              <div className="tk"><div className="line" /><div className="dot">2</div><div className="tx"><b>Live rooms</b><span>Where the team trades together in real time.</span></div></div>
              <div className="tk"><div className="dot">3</div><div className="tx"><b>Lessons &amp; library</b><span>Go at your own pace, anytime.</span></div></div>
            </div>
            <a className="cta" href="https://t.me/+NFLNaB00u65mOTM5" target="_blank" rel="noopener noreferrer">Join the community chat →</a>
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <button className="back" onClick={() => setStep(3)}>← Back</button>
              <button className="btn primary" style={{ width: "auto", padding: "13px 24px", marginTop: 0 }} onClick={() => setStep(5)}>Next →</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="gstep">
            <p className="sub" style={{ margin: "0 0 12px", maxWidth: "none" }}>Start with <b>&quot;New Trader Start Here&quot;</b> on Arin Long&apos;s page, then watch the TradeLocker walkthrough below.</p>
            <a className="cta" href="https://www.1house.tv/educators/arin-long" target="_blank" rel="noopener noreferrer">Watch &quot;New Trader Start Here&quot; →</a>
            <p className="sub" style={{ margin: "16px 0 8px", maxWidth: "none", fontSize: "13px" }}>How to use TradeLocker:</p>
            <video controls playsInline preload="metadata" style={{ width: "100%", borderRadius: 14, border: ".5px solid var(--stroke)", background: "#000", display: "block" }}>
              <source src="/tradelocker-overview.mp4" type="video/mp4" />
            </video>
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <button className="back" onClick={() => setStep(4)}>← Back</button>
              <button className="btn primary" style={{ width: "auto", padding: "13px 24px", marginTop: 0 }} onClick={() => setStep(6)}>Next →</button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="gstep">
            <div style={{ margin: "4px 0 6px" }}>
              <div className="tk"><div className="line" /><div className="dot">1</div><div className="tx"><b>Listen to your mentors</b><span>Don&apos;t swerve — do what they do. If you knew what we knew, you&apos;d do what we do.</span></div></div>
              <div className="tk"><div className="line" /><div className="dot">2</div><div className="tx"><b>Communicate</b><span>Get in the chats, ask questions, show up to the live calls.</span></div></div>
              <div className="tk"><div className="line" /><div className="dot">3</div><div className="tx"><b>It works if you work</b><span>Consistency beats intensity. Show up daily.</span></div></div>
              <div className="tk"><div className="line" /><div className="dot">4</div><div className="tx"><b>Practice on demo first</b><span>Get your reps before you risk real money.</span></div></div>
              <div className="tk"><div className="dot">5</div><div className="tx"><b>Be patient</b><span>Protect your money. Slow is smooth, smooth is fast.</span></div></div>
            </div>
            <div className="seal" style={{ marginTop: 8 }}>✓</div>
            <p className="sub" style={{ textAlign: "center", margin: "0 auto 6px" }}>You&apos;re set. Welcome to 1House.</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <button className="back" onClick={() => setStep(5)}>← Back</button>
              <button className="btn primary" style={{ width: "auto", padding: "13px 24px", marginTop: 0 }} onClick={() => setStep(1)}>Finish 🎉</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




