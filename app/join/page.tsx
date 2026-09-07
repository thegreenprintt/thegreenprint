"use client";
import { useState } from "react";

export default function JoinPage() {
  const [screen, setScreen] = useState<"apps" | "confirm">("apps");
  const [done, setDone] = useState([false, false, false]);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState(false);
  const [phase, setPhase] = useState<"form" | "sending" | "sent">("form");
  const [copied, setCopied] = useState(false);

  const count = done.filter(Boolean).length;
  const mark = (k: number) => setDone((d) => d.map((v, i) => (i === k ? true : v)));
  const copyServer = () => {
    try { navigator.clipboard.writeText("LIVVFX"); } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const submit = async () => {
    if (!/.+@.+\..+/.test(email.trim())) { setErr(true); return; }
    setErr(false); setPhase("sending");
    try {
      await fetch("/api/join/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {}
    setPhase("sent");
  };

  return (
    <div className="jp">
      <style>{`
        .jp{--green:#00FF85;--mut:rgba(255,255,255,.56);--mut2:rgba(255,255,255,.32);--stroke:rgba(255,255,255,.09);--card:rgba(255,255,255,.04);
          position:relative;min-height:100vh;background:#04060a;color:#fff;font-family:'Space Grotesk',-apple-system,system-ui,sans-serif;overflow-x:hidden;}
        .jp *{box-sizing:border-box;}
        .jp .fx{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
        .jp .blob{position:absolute;border-radius:50%;filter:blur(90px);}
        .jp .b1{width:480px;height:480px;background:radial-gradient(circle,rgba(0,255,133,.18),transparent 65%);top:-200px;left:50%;margin-left:-240px;animation:jpp 9s ease-in-out infinite;}
        .jp .b2{width:420px;height:420px;background:radial-gradient(circle,rgba(0,255,133,.09),transparent 65%);bottom:-220px;right:-120px;}
        .jp .beam{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(0,255,133,.7),transparent);animation:jps 6s ease-in-out infinite;}
        @keyframes jpp{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.1)}}
        @keyframes jps{0%,100%{opacity:0;transform:translateY(0)}50%{opacity:1;transform:translateY(30vh)}}
        .jp .wrap{position:relative;z-index:1;max-width:460px;margin:0 auto;padding:30px 20px 44px;}
        .jp .top{text-align:center;margin-bottom:20px;}
        .jp .rl{position:relative;width:56px;height:56px;margin:0 auto 13px;}
        .jp .rl .halo{position:absolute;inset:-8px;border-radius:50%;background:radial-gradient(circle,rgba(0,255,133,.45),transparent 70%);animation:jpp 3.5s ease-in-out infinite;}
        .jp .rl .core{position:absolute;inset:0;border-radius:15px;background:var(--green);display:flex;align-items:center;justify-content:center;color:#000;font-weight:700;font-size:27px;box-shadow:0 0 30px rgba(0,255,133,.6);}
        .jp .kick{font-size:11px;letter-spacing:.34em;text-transform:uppercase;color:var(--green);font-weight:600;}
        .jp h1{font-size:28px;font-weight:700;letter-spacing:-.025em;line-height:1.08;margin:10px 0 10px;}
        .jp h1 .g{background:linear-gradient(180deg,#eafff4,#00FF85);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
        .jp .sub{font-size:14px;color:var(--mut);line-height:1.6;max-width:350px;margin:0 auto;}
        .jp .flag{display:inline-block;font-size:11px;color:var(--mut2);letter-spacing:.1em;margin-bottom:6px;}
        .jp .bar{display:flex;align-items:center;gap:11px;margin:18px 0;}
        .jp .track{flex:1;height:7px;border-radius:7px;background:rgba(255,255,255,.09);overflow:hidden;}
        .jp .fill{height:100%;background:linear-gradient(90deg,#0bd873,#00FF85);border-radius:7px;box-shadow:0 0 14px rgba(0,255,133,.6);transition:width .55s cubic-bezier(.2,.8,.3,1);}
        .jp .barlbl{font-size:12px;color:var(--mut);font-weight:500;white-space:nowrap;}.jp .barlbl b{color:var(--green);}
        .jp .item{display:flex;gap:13px;align-items:center;border:.5px solid var(--stroke);background:var(--card);border-radius:16px;padding:13px 14px;margin-bottom:11px;transition:.35s;}
        .jp .item.done{border-color:rgba(0,255,133,.3);background:rgba(0,255,133,.05);}
        .jp .ic{width:46px;height:46px;border-radius:13px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
        .jp .ic.tl{background:#0b0f14;border:.5px solid rgba(0,255,133,.4);}
        .jp .ic.tg{background:#229ED9;}
        .jp .ic.br{background:var(--green);}
        .jp .it{flex:1;min-width:0;}
        .jp .it b{display:block;font-size:14.5px;font-weight:600;}
        .jp .item.done .it b{color:var(--green);}
        .jp .it span{display:block;font-size:12px;color:var(--mut);margin-top:1px;line-height:1.4;}
        .jp .mini2{display:flex;gap:7px;margin-top:9px;flex-wrap:wrap;}
        .jp .lnk{font-size:12px;font-weight:600;color:var(--green);background:rgba(0,255,133,.08);border:.5px solid rgba(0,255,133,.3);border-radius:9px;padding:6px 11px;cursor:pointer;text-decoration:none;}
        .jp .chip{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.05);border:.5px solid var(--stroke);border-radius:9px;padding:6px 10px;font-size:12px;font-weight:600;color:#fff;cursor:pointer;}
        .jp .chip .k{color:var(--mut2);font-weight:500;}.jp .chip .cp{color:var(--green);font-size:10.5px;}
        .jp .tick{width:28px;height:28px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);color:var(--mut);border:.5px solid rgba(255,255,255,.2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;}
        .jp .item.done .tick{background:var(--green);color:#000;border:none;box-shadow:0 0 14px rgba(0,255,133,.5);}
        .jp .btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:17px 0;border-radius:15px;border:none;font-family:inherit;font-size:16px;font-weight:600;cursor:pointer;transition:transform .15s,box-shadow .3s;margin-top:16px;}
        .jp .btn:active{transform:scale(.98);}
        .jp .btn.primary{background:var(--green);color:#000;box-shadow:0 0 34px rgba(0,255,133,.4);}
        .jp .btn.primary:disabled{background:rgba(255,255,255,.06);color:var(--mut2);cursor:not-allowed;box-shadow:none;}
        .jp .emailcard{border:.5px solid var(--stroke);background:var(--card);border-radius:17px;padding:16px;}
        .jp .emailcard b{font-size:15px;font-weight:600;}.jp .emailcard p{font-size:12.5px;color:var(--mut);margin:3px 0 12px;line-height:1.5;}
        .jp input{width:100%;padding:14px 15px;background:rgba(255,255,255,.05);border:.5px solid var(--stroke);border-radius:13px;color:#fff;font-size:15px;font-family:inherit;outline:none;transition:.2s;}
        .jp input::placeholder{color:var(--mut2);}
        .jp input:focus{border-color:rgba(0,255,133,.55);box-shadow:0 0 0 3px rgba(0,255,133,.12);}
        .jp .er{font-size:12px;color:#ff6a6a;margin-top:7px;}
        .jp .back{background:none;border:none;color:var(--mut2);font-family:inherit;font-size:12.5px;cursor:pointer;padding:10px 0 0;display:block;margin:6px auto 0;}
        .jp .tk{display:flex;gap:14px;align-items:flex-start;position:relative;padding-bottom:22px;}
        .jp .tk:last-child{padding-bottom:0;}
        .jp .tk .line{position:absolute;left:16px;top:34px;bottom:-2px;width:2px;background:rgba(255,255,255,.12);}
        .jp .tk:last-child .line{display:none;}
        .jp .tk .dot{width:34px;height:34px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;background:rgba(255,255,255,.06);color:var(--mut);border:.5px solid rgba(255,255,255,.18);z-index:1;}
        .jp .tk .tx b{display:block;font-size:15.5px;font-weight:600;margin-top:5px;}
        .jp .tk .tx span{display:block;font-size:12.5px;color:var(--mut);margin-top:2px;line-height:1.45;}
        .jp .tk.done .dot{background:var(--green);color:#000;border:none;box-shadow:0 0 16px rgba(0,255,133,.5);}
        .jp .tk.done .tx b{color:var(--green);}.jp .tk.done .line{background:var(--green);}
        .jp .tk.active .dot{background:rgba(0,255,133,.12);color:var(--green);border:.5px solid rgba(0,255,133,.5);}
        .jp .spin{display:inline-block;animation:jpsp 1s linear infinite;}@keyframes jpsp{to{transform:rotate(360deg)}}
        .jp .foot{font-size:10px;color:var(--mut2);text-align:center;line-height:1.6;margin-top:20px;}
      `}</style>

      <div className="fx"><div className="beam" /><div className="blob b1" /><div className="blob b2" /></div>

      <div className="wrap">
        <div className="top">
          <div className="rl"><div className="halo" /><div className="core">G</div></div>
          <div className="kick">The Greenprint</div>
          {screen === "apps" ? (
            <>
              <h1>Get set up in <span className="g">minutes.</span></h1>
              <p className="sub">Grab the two apps and open your free account. Tick each one off — I&apos;ll take you to the chat next.</p>
            </>
          ) : phase === "sent" ? (
            <>
              <h1>Request <span className="g">received.</span></h1>
              <p className="sub">I&apos;m confirming your account now. Your private invite lands in your email the moment you&apos;re verified.</p>
            </>
          ) : (
            <>
              <h1>One last <span className="g">check.</span></h1>
              <p className="sub">Confirm the email you signed up with and I&apos;ll get you into the chat.</p>
            </>
          )}
        </div>

        {screen === "apps" && (
          <div>
            <span className="flag">STEP 1 OF 2 · GET SET UP</span>
            <div className="bar">
              <div className="track"><div className="fill" style={{ width: (count / 3) * 100 + "%" }} /></div>
              <div className="barlbl"><b>{count}</b> of 3 done</div>
            </div>

            <div className={"item" + (done[0] ? " done" : "")}>
              <div className="ic tl"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="9" width="3" height="9" rx="1" fill="#00FF85" /><rect x="4" y="6" width="1" height="3" fill="#00FF85" /><rect x="10.5" y="5" width="3" height="13" rx="1" fill="#00FF85" /><rect x="11.5" y="2" width="1" height="3" fill="#00FF85" /><rect x="18" y="11" width="3" height="7" rx="1" fill="#1f6f4a" /><rect x="19" y="8" width="1" height="3" fill="#1f6f4a" /></svg></div>
              <div className="it">
                <b>Get TradeLocker</b><span>The app you place your trades in</span>
                <div className="mini2">
                  <a className="lnk" href="https://apps.apple.com/us/app/tradelocker/id6447196449" target="_blank" rel="noopener noreferrer">iPhone ↗</a>
                  <a className="lnk" href="https://play.google.com/store/apps/details?id=com.tradelocker.mobile" target="_blank" rel="noopener noreferrer">Android ↗</a>
                  <span className="chip" onClick={copyServer}><span className="k">Server</span> LIVVFX <span className="cp">{copied ? "copied!" : "copy"}</span></span>
                </div>
              </div>
              <button className="tick" onClick={() => mark(0)} aria-label="Mark done">{done[0] ? "✓" : "1"}</button>
            </div>

            <div className={"item" + (done[1] ? " done" : "")}>
              <div className="ic tg"><svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.412 14.6l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.736.959z" /></svg></div>
              <div className="it">
                <b>Get Telegram</b><span>Where I send the live signals</span>
                <div className="mini2">
                  <a className="lnk" href="https://apps.apple.com/us/app/telegram-messenger/id686449807" target="_blank" rel="noopener noreferrer">iPhone ↗</a>
                  <a className="lnk" href="https://play.google.com/store/apps/details?id=org.telegram.messenger" target="_blank" rel="noopener noreferrer">Android ↗</a>
                </div>
              </div>
              <button className="tick" onClick={() => mark(1)} aria-label="Mark done">{done[1] ? "✓" : "2"}</button>
            </div>

            <div className={"item" + (done[2] ? " done" : "")}>
              <div className="ic br"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-5 4 3 6-7" stroke="#000" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 5h4v4" stroke="#000" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <div className="it">
                <b>Sign up with the broker</b><span>Your free account — with my link</span>
                <div className="mini2">
                  <a className="lnk" href="https://members.livvglobal.com/client/register/6a65379bb16ad" target="_blank" rel="noopener noreferrer">Create account ↗</a>
                </div>
              </div>
              <button className="tick" onClick={() => mark(2)} aria-label="Mark done">{done[2] ? "✓" : "3"}</button>
            </div>

            <button className="btn primary" disabled={count < 3} onClick={() => setScreen("confirm")}>
              {count < 3 ? `Finish all 3 to continue (${count}/3)` : "Continue →"}
            </button>
            <p className="foot">Educational only. Not financial advice. Past performance is not indicative of future results. Trading involves substantial risk of loss.</p>
          </div>
        )}

        {screen === "confirm" && phase !== "sent" && (
          <div>
            <span className="flag">STEP 2 OF 2 · CONFIRM &amp; ENTER</span>
            <div className="emailcard">
              <b>Confirm it&apos;s you</b>
              <p>Type the email you signed up with. I&apos;ll match it to your account, then send your private invite.</p>
              <input type="email" placeholder="you@email.com" autoComplete="email" value={email}
                onChange={(e) => { setEmail(e.target.value); setErr(false); }} />
              {err && <div className="er">Enter the email you used to sign up.</div>}
              <button className="btn primary" disabled={phase === "sending"} onClick={submit}>
                {phase === "sending" ? "Sending…" : "Confirm my account"}
              </button>
            </div>
            <button className="back" onClick={() => setScreen("apps")}>← Back to setup</button>
          </div>
        )}

        {screen === "confirm" && phase === "sent" && (
          <div>
            <span className="flag">STEP 2 OF 2 · CONFIRMING</span>
            <div style={{ margin: "8px 0 4px" }}>
              <div className="tk done"><div className="line" /><div className="dot">✓</div><div className="tx"><b>Signed up</b><span>Account created under The Greenprint</span></div></div>
              <div className="tk active"><div className="line" /><div className="dot"><span className="spin">◌</span></div><div className="tx"><b>Confirming your account</b><span>Matching your email to your signup.</span></div></div>
              <div className="tk"><div className="line" /><div className="dot">🔒</div><div className="tx"><b>Signals chat</b><span>Your invite is emailed the moment you&apos;re confirmed</span></div></div>
              <div className="tk"><div className="dot">📈</div><div className="tx"><b>Start trading</b><span>Copy the live calls and go</span></div></div>
            </div>
            <p className="foot">You can close this — check your email for your private invite. Confirmations are usually quick.</p>
          </div>
        )}
      </div>
    </div>
  );
}
