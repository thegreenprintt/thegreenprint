"use client";
import { useState } from "react";

export default function OneHousePage() {
  const [done, setDone] = useState([false, false, false, false, false, false]);
  const [copied, setCopied] = useState(false);
  const toggle = (i: number) => setDone((d) => d.map((v, k) => (k === i ? !v : v)));
  const copyServer = () => { try { navigator.clipboard.writeText("LIVVFX"); } catch {} setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const count = done.filter(Boolean).length;

  return (
    <div className="oh">
      <style>{`
        html,body{overflow-x:hidden;max-width:100vw;}
        .fixed.bottom-0.left-0.right-0.z-50{display:none!important;}
        .oh{--gold:#E8B84B;--gold2:#c9973a;--mut:rgba(255,255,255,.58);--mut2:rgba(255,255,255,.34);--stroke:rgba(255,255,255,.09);position:relative;min-height:100vh;background:#07070a;color:#fff;font-family:'Space Grotesk',-apple-system,system-ui,sans-serif;overflow-x:hidden;touch-action:pan-y;-webkit-text-size-adjust:100%;}
        .oh *{box-sizing:border-box;}
        .oh .glow{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(620px 400px at 50% -80px,rgba(232,184,75,.16),transparent 70%);}
        @keyframes ohIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .oh .hero{position:relative;z-index:1;text-align:center;padding:48px 22px 22px;max-width:600px;margin:0 auto;animation:ohIn .5s ease both;}
        .oh .pill{display:inline-block;font-size:10.5px;letter-spacing:.28em;color:var(--gold);border:1px solid rgba(232,184,75,.4);border-radius:999px;padding:6px 14px;font-weight:600;}
        .oh .mark{width:66px;height:66px;border-radius:18px;background:linear-gradient(140deg,var(--gold),var(--gold2));color:#1a1205;font-weight:800;font-size:23px;display:flex;align-items:center;justify-content:center;margin:18px auto 10px;box-shadow:0 10px 40px rgba(232,184,75,.35);}
        .oh .wm{font-size:12px;letter-spacing:.35em;text-transform:uppercase;color:var(--mut);font-weight:600;}
        .oh h1{font-size:31px;font-weight:800;letter-spacing:-.02em;line-height:1.08;margin:12px 0 12px;}
        .oh h1 .g{background:linear-gradient(180deg,#fff7e6,var(--gold));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
        .oh .lede{font-size:15px;color:var(--mut);line-height:1.6;max-width:450px;margin:0 auto;}
        .oh .prog{margin-top:18px;font-size:12px;color:var(--gold);font-weight:600;letter-spacing:.05em;}
        .oh .guide{position:relative;z-index:1;max-width:600px;margin:12px auto 0;padding:0 22px;}
        .oh .ms{display:flex;gap:15px;align-items:stretch;animation:ohIn .5s ease both;}
        .oh .rail{display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:40px;}
        .oh .node{width:40px;height:40px;border-radius:50%;flex-shrink:0;border:1.5px solid rgba(232,184,75,.5);background:rgba(232,184,75,.08);color:var(--gold);font-weight:700;font-size:16px;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.25s;}
        .oh .node.on{background:var(--gold);color:#1a1205;border-color:var(--gold);box-shadow:0 0 22px rgba(232,184,75,.5);}
        .oh .line{width:2px;flex:1;min-height:24px;margin:6px 0;background:var(--stroke);border-radius:2px;transition:.25s;}
        .oh .line.on{background:linear-gradient(var(--gold),var(--gold2));opacity:.5;}
        .oh .body{flex:1;min-width:0;padding-bottom:30px;}
        .oh .body h3{font-size:19px;font-weight:700;margin:5px 0 6px;}
        .oh .body .d{font-size:14px;color:var(--mut);line-height:1.6;margin:0 0 12px;}
        .oh .approw{display:flex;align-items:center;gap:12px;}
        .oh .aic{width:46px;height:46px;border-radius:12px;overflow:hidden;flex-shrink:0;box-shadow:0 4px 14px rgba(0,0,0,.35);}
        .oh .aic img{width:100%;height:100%;object-fit:cover;display:block;}
        .oh .an b{display:block;font-size:15px;font-weight:600;}
        .oh .an span{display:block;font-size:12.5px;color:var(--mut);}
        .oh .stores{display:flex;gap:8px;margin:10px 0 4px;}
        .oh .stores a{flex:1;text-align:center;padding:10px;border-radius:11px;background:rgba(255,255,255,.06);border:.5px solid var(--stroke);color:#fff;font-size:13px;font-weight:600;text-decoration:none;transition:.2s;}
        .oh .srv{display:flex;align-items:center;gap:8px;margin-top:10px;padding:10px 13px;border-radius:11px;background:rgba(255,255,255,.04);border:.5px solid var(--stroke);}
        .oh .srv i{font-style:normal;font-size:11px;color:var(--mut2);letter-spacing:.08em;}
        .oh .srv b{font-size:14px;font-family:ui-monospace,Menlo,monospace;letter-spacing:.06em;}
        .oh .srv button{margin-left:auto;font-size:11px;font-weight:600;color:var(--gold);background:none;border:.5px solid rgba(232,184,75,.4);border-radius:9px;padding:6px 12px;cursor:pointer;font-family:inherit;}
        .oh .act{display:flex;align-items:center;justify-content:center;margin-top:14px;padding:13px;border-radius:13px;background:linear-gradient(135deg,var(--gold),var(--gold2));color:#1a1205;font-size:14.5px;font-weight:700;text-decoration:none;box-shadow:0 8px 26px rgba(232,184,75,.28);}
        .oh ol.steps,.oh ul.keys{list-style:none;margin:0;padding:0;}
        .oh ol.steps{counter-reset:st;}
        .oh ol.steps li{counter-increment:st;position:relative;padding:9px 0 9px 30px;font-size:14px;color:var(--mut);line-height:1.5;border-bottom:.5px solid rgba(255,255,255,.05);}
        .oh ol.steps li:last-child{border-bottom:none;}
        .oh ol.steps li::before{content:counter(st);position:absolute;left:0;top:8px;width:20px;height:20px;border-radius:50%;background:rgba(232,184,75,.14);color:var(--gold);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;}
        .oh ol.steps li b{color:#fff;font-weight:600;}
        .oh ul.keys li{padding:11px 0;font-size:14px;color:var(--mut);line-height:1.55;border-bottom:.5px solid rgba(255,255,255,.05);}
        .oh ul.keys li:last-child{border-bottom:none;}
        .oh ul.keys li b{color:var(--gold);font-weight:700;}
        .oh video{width:100%;border-radius:14px;border:.5px solid var(--stroke);background:#000;display:block;}
        .oh .end{position:relative;z-index:1;text-align:center;padding:16px 22px 60px;max-width:600px;margin:0 auto;}
        .oh .fseal{width:60px;height:60px;border-radius:50%;background:linear-gradient(140deg,var(--gold),var(--gold2));color:#1a1205;font-size:27px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;box-shadow:0 0 40px rgba(232,184,75,.4);}
        .oh .end h2{font-size:24px;font-weight:800;margin:0 0 6px;}
        .oh .end p{font-size:14px;color:var(--mut);line-height:1.6;max-width:380px;margin:0 auto;}
      `}</style>
      <div className="glow" />

      <header className="hero">
        <div className="pill">PRIVATE START GUIDE</div>
        <div className="mark">1H</div>
        <div className="wm">1House</div>
        <h1>Welcome. Let&apos;s get you <span className="g">started.</span></h1>
        <p className="lede">Follow this top to bottom. By the end you&apos;ll have your broker set up, be inside the community, and know how to take your first trade.</p>
        <div className="prog">{count} of 6 complete</div>
      </header>

      <main className="guide">
        <section className="ms">
          <div className="rail"><button className={"node" + (done[0] ? " on" : "")} onClick={() => toggle(0)} aria-label="Mark done">{done[0] ? "✓" : 1}</button><div className={"line" + (done[0] ? " on" : "")} /></div>
          <div className="body">
            <h3>Download your apps</h3>
            <p className="d">Two apps to grab, plus your free broker account.</p>
            <div className="approw"><div className="aic"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/6c/25/c3/6c25c3c6-bbc4-f961-c32d-da661aeaee6f/AppIcon-0-0-1x_U007epad-0-1-85-220.png/512x512bb.jpg" alt="TradeLocker" /></div><div className="an"><b>TradeLocker</b><span>Where you place your trades</span></div></div>
            <div className="stores"><a href="https://apps.apple.com/us/app/tradelocker/id6447196449" target="_blank" rel="noopener noreferrer">App Store</a><a href="https://play.google.com/store/apps/details?id=com.tradelocker.mobile" target="_blank" rel="noopener noreferrer">Google Play</a></div>
            <div className="srv"><i>SERVER</i><b>LIVVFX</b><button onClick={copyServer}>{copied ? "Copied ✓" : "Copy"}</button></div>
            <div className="approw" style={{ marginTop: 14 }}><div className="aic"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/5a/2b/59/5a2b59f4-1458-d32d-7b33-00ba66d2d59e/Telegram-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg" alt="Telegram" /></div><div className="an"><b>Telegram</b><span>Where the community lives</span></div></div>
            <div className="stores"><a href="https://apps.apple.com/us/app/telegram-messenger/id686449807" target="_blank" rel="noopener noreferrer">App Store</a><a href="https://play.google.com/store/apps/details?id=org.telegram.messenger" target="_blank" rel="noopener noreferrer">Google Play</a></div>
            <a className="act" href="https://members.livvglobal.com/client/register/6a65379bb16ad" target="_blank" rel="noopener noreferrer">Open your free broker account →</a>
          </div>
        </section>

        <section className="ms">
          <div className="rail"><button className={"node" + (done[1] ? " on" : "")} onClick={() => toggle(1)} aria-label="Mark done">{done[1] ? "✓" : 2}</button><div className={"line" + (done[1] ? " on" : "")} /></div>
          <div className="body">
            <h3>Set up your broker</h3>
            <p className="d">Sign in to LivvFX first — that&apos;s what unlocks TradeLocker. Then open a demo account: practice money, zero risk.</p>
            <ol className="steps">
              <li><b>Sign in to LivvFX</b> — start there; it unlocks TradeLocker.</li>
              <li><b>Open TradeLocker</b> and tap the menu (arrow, top-left).</li>
              <li><b>Trade Accounts, then Open Demo Account.</b></li>
              <li><b>Set your balance</b> — $1,000 to $10,000 (not real money).</li>
              <li><b>Set leverage to 1:500,</b> then Submit.</li>
              <li><b>Log into your new demo account.</b> Done.</li>
            </ol>
          </div>
        </section>

        <section className="ms">
          <div className="rail"><button className={"node" + (done[2] ? " on" : "")} onClick={() => toggle(2)} aria-label="Mark done">{done[2] ? "✓" : 3}</button><div className={"line" + (done[2] ? " on" : "")} /></div>
          <div className="body">
            <h3>Log into 1House</h3>
            <p className="d">Your home base. Log in and get familiar with the platform.</p>
            <ol className="steps">
              <li><b>Go to 1house.tv</b> and sign in.</li>
              <li><b>Log into your account.</b></li>
              <li><b>Explore</b> the educators, live rooms and lessons.</li>
            </ol>
            <a className="act" href="https://www.1house.tv" target="_blank" rel="noopener noreferrer">Open 1house.tv →</a>
          </div>
        </section>

        <section className="ms">
          <div className="rail"><button className={"node" + (done[3] ? " on" : "")} onClick={() => toggle(3)} aria-label="Mark done">{done[3] ? "✓" : 4}</button><div className={"line" + (done[3] ? " on" : "")} /></div>
          <div className="body">
            <h3>Get in the community</h3>
            <p className="d">Ask questions, share wins, and be there for the live calls. The people who talk are the people who grow.</p>
            <a className="act" href="https://t.me/+NFLNaB00u65mOTM5" target="_blank" rel="noopener noreferrer">Join the community chat →</a>
          </div>
        </section>

        <section className="ms">
          <div className="rail"><button className={"node" + (done[4] ? " on" : "")} onClick={() => toggle(4)} aria-label="Mark done">{done[4] ? "✓" : 5}</button><div className={"line" + (done[4] ? " on" : "")} /></div>
          <div className="body">
            <h3>5 keys to a strong start</h3>
            <ul className="keys">
              <li><b>Listen to your mentors.</b> Don&apos;t swerve — do what they do. If you knew what we knew, you&apos;d do what we do.</li>
              <li><b>Communicate.</b> Get in the chats, ask questions, show up to the calls.</li>
              <li><b>It works if you work.</b> Consistency beats intensity.</li>
              <li><b>Practice on demo first.</b> Get your reps before you risk real money.</li>
              <li><b>Be patient.</b> Protect your money. Slow is smooth, smooth is fast.</li>
            </ul>
          </div>
        </section>

        <section className="ms">
          <div className="rail"><button className={"node" + (done[5] ? " on" : "")} onClick={() => toggle(5)} aria-label="Mark done">{done[5] ? "✓" : 6}</button></div>
          <div className="body">
            <h3>Learn to trade</h3>
            <p className="d">Start here: watch <b>&quot;New Trader Start Here&quot;</b> on Arin Long&apos;s page, then keep learning inside 1House.</p>
            <a className="act" href="https://www.1house.tv/educators/arin-long" target="_blank" rel="noopener noreferrer">Watch &quot;New Trader Start Here&quot; →</a>
            <p className="d" style={{ marginTop: 16 }}>Bonus — a quick TradeLocker walkthrough:</p>
            <video controls playsInline preload="metadata"><source src="/tradelocker-overview.mp4" type="video/mp4" /></video>
          </div>
        </section>
      </main>

      <footer className="end">
        <div className="fseal">✓</div>
        <h2>You&apos;re set.</h2>
        <p>Everything you need is above. Come back anytime — welcome to 1House.</p>
      </footer>
    </div>
  );
}

