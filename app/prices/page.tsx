export const metadata = {
  title: "Build Services and Pricing | The Greenprint",
  description: "High converting websites, lead capture, automation, and CRM systems. Clear scope, clear prices, clear timelines.",
};

export default function PricesPage() {
  return (
    <div className="gp-prices">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        .gp-prices{position:relative;min-height:100vh;background:#06090C;color:#F5F8F6;font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.45;overflow:hidden}
        .gp-prices *{box-sizing:border-box}
        .gp-prices a{text-decoration:none;color:inherit}
        .gp-prices .bg{position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(62% 42% at 50% -6%, rgba(0,229,138,.20), transparent 60%),radial-gradient(40% 34% at 88% 16%, rgba(0,196,106,.12), transparent 60%),radial-gradient(46% 40% at 6% 44%, rgba(0,120,90,.12), transparent 60%)}
        .gp-prices .wrap{position:relative;z-index:2;max-width:1140px;margin:0 auto;padding:0 24px}
        .gp-prices .hero{text-align:center;padding:88px 24px 30px}
        .gp-prices .pill{display:inline-flex;align-items:center;gap:8px;background:rgba(0,229,138,.08);border:1px solid rgba(0,229,138,.25);color:#7FF0C4;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:7px 14px;border-radius:999px}
        .gp-prices .pill .dot{width:6px;height:6px;border-radius:50%;background:#00E58A;box-shadow:0 0 10px #00E58A}
        .gp-prices h1{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(40px,6.4vw,74px);line-height:1.02;letter-spacing:-.03em;margin:24px 0 0;background:linear-gradient(180deg,#FFFFFF 32%,#7FEFC0 122%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
        .gp-prices .sub{color:rgba(245,248,246,.6);font-size:clamp(15px,1.6vw,19px);max-width:600px;margin:20px auto 0;line-height:1.6}
        .gp-prices .herobtns{margin-top:34px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
        .gp-prices .btn{font-family:'Sora',sans-serif;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
        .gp-prices .btn.primary{background:linear-gradient(180deg,#00FFA3,#00C46A);color:#03231A;box-shadow:0 12px 34px rgba(0,229,138,.35)}
        .gp-prices .btn.primary:hover{transform:translateY(-2px);box-shadow:0 18px 46px rgba(0,229,138,.5)}
        .gp-prices .btn.ghost{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);color:#F5F8F6}
        .gp-prices .btn.ghost:hover{background:rgba(255,255,255,.09)}
        .gp-prices .seclabel{text-align:center;margin:30px 0 4px}
        .gp-prices .seclabel .k{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#5FCFA0}
        .gp-prices .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:18px}
        .gp-prices .grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}
        @media(max-width:900px){.gp-prices .grid,.gp-prices .grid2{grid-template-columns:1fr}}
        .gp-prices .card{position:relative;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:24px 24px 10px;box-shadow:0 22px 54px rgba(0,0,0,.4);transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}
        .gp-prices .card:hover{transform:translateY(-5px);border-color:rgba(0,229,138,.34);box-shadow:0 30px 66px rgba(0,0,0,.5),0 0 0 1px rgba(0,229,138,.16)}
        .gp-prices .card.feat{border-color:rgba(0,229,138,.38);box-shadow:0 28px 74px rgba(0,229,138,.14),0 22px 54px rgba(0,0,0,.4)}
        .gp-prices .tagpop{position:absolute;top:-11px;left:22px;background:linear-gradient(180deg,#00FFA3,#00C46A);color:#03231A;font-family:'Sora',sans-serif;font-weight:700;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;padding:5px 12px;border-radius:999px;box-shadow:0 8px 20px rgba(0,229,138,.4)}
        .gp-prices .ctop{display:flex;align-items:center;gap:11px;margin-bottom:8px}
        .gp-prices .ic{width:36px;height:36px;border-radius:11px;background:rgba(0,229,138,.12);border:1px solid rgba(0,229,138,.25);display:flex;align-items:center;justify-content:center}
        .gp-prices .ic svg{width:18px;height:18px}
        .gp-prices .colhead{font-family:'Sora',sans-serif;font-size:15.5px;font-weight:700;color:#F5F8F6;letter-spacing:-.01em}
        .gp-prices .pkg{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:16px 0;border-top:1px solid rgba(255,255,255,.06)}
        .gp-prices .pt b{display:block;font-size:15.5px;font-weight:600;color:#F5F8F6}
        .gp-prices .pt span{display:block;font-size:12.5px;color:rgba(245,248,246,.5);margin-top:3px;line-height:1.4}
        .gp-prices .pp{text-align:right;white-space:nowrap;flex:0 0 auto}
        .gp-prices .pp b{display:block;font-family:'Sora',sans-serif;font-size:21px;font-weight:800;color:#00E58A;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
        .gp-prices .pp span{display:block;font-size:11px;color:rgba(245,248,246,.42);margin-top:2px;letter-spacing:.02em}
        .gp-prices .addon{display:flex;justify-content:space-between;gap:14px;padding:12px 0;border-top:1px solid rgba(255,255,255,.06);font-size:14.5px;color:rgba(245,248,246,.82)}
        .gp-prices .addon .ap{font-family:'Sora',sans-serif;font-weight:700;color:#00E58A;white-space:nowrap;font-variant-numeric:tabular-nums}
        .gp-prices .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:44px}
        @media(max-width:900px){.gp-prices .steps{grid-template-columns:1fr 1fr}}
        .gp-prices .step{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px}
        .gp-prices .step .n{font-family:'Sora',sans-serif;font-weight:800;font-size:14px;color:#00E58A;width:32px;height:32px;line-height:30px;text-align:center;border-radius:10px;border:1px solid rgba(0,229,138,.3);background:rgba(0,229,138,.08);display:block;margin-bottom:12px}
        .gp-prices .step p{font-size:14px;color:rgba(245,248,246,.82);margin:0}
        .gp-prices .stepnote{color:rgba(245,248,246,.4);font-size:12.5px;margin-top:14px;text-align:center}
        .gp-prices .final{position:relative;margin:54px 0 0;border-radius:24px;overflow:hidden;padding:58px 34px;text-align:center;background:linear-gradient(135deg,rgba(0,229,138,.16),rgba(0,120,90,.06));border:1px solid rgba(0,229,138,.22)}
        .gp-prices .final h3{font-family:'Sora',sans-serif;font-size:clamp(26px,3.6vw,40px);font-weight:800;margin:0 0 10px;letter-spacing:-.02em;background:linear-gradient(180deg,#fff,#8AF3C6);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
        .gp-prices .final p{color:rgba(245,248,246,.68);max-width:480px;margin:0 auto 24px;font-size:15.5px}
        .gp-prices footer{position:relative;z-index:2;text-align:center;color:rgba(245,248,246,.4);font-size:12.5px;padding:36px 24px 54px}
        .gp-prices footer a{color:#00E58A;font-weight:600}
        @media(max-width:640px){.gp-prices .hero{padding:64px 20px 20px}}
      ` }} />

      <div className="bg" />

      <div className="wrap">
        <div className="hero">
          <span className="pill"><span className="dot" />The Greenprint · Build Studio</span>
          <h1>Websites and systems, built to convert.</h1>
          <p className="sub">High converting sites, lead capture, automation, and CRM. Clear scope, clear prices, clear timelines.</p>
          <div className="herobtns">
            <a className="btn primary" href="mailto:info@thegreenprint.trade?subject=Build%20inquiry">Book a call</a>
            <a className="btn ghost" href="#pricing">See pricing</a>
          </div>
        </div>

        <div className="seclabel" id="pricing"><div className="k">Packages and pricing</div></div>

        <div className="grid">
          <div className="card">
            <div className="ctop">
              <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#00E58A" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg></span>
              <span className="colhead">Websites</span>
            </div>
            <div className="pkg"><div className="pt"><b>Landing Page</b><span>One offer, lead form, mobile.</span></div><div className="pp"><b>$1,500</b><span>1 to 2 wks</span></div></div>
            <div className="pkg"><div className="pt"><b>Business Website</b><span>Up to 5 pages, branding, SEO.</span></div><div className="pp"><b>$3,000</b><span>2 to 3 wks</span></div></div>
            <div className="pkg"><div className="pt"><b>Full Platform</b><span>Logins, subscriptions, dashboard.</span></div><div className="pp"><b>$6,000+</b><span>4 to 6 wks</span></div></div>
          </div>

          <div className="card feat">
            <span className="tagpop">Most requested</span>
            <div className="ctop">
              <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#00E58A" strokeWidth="1.8" strokeLinejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg></span>
              <span className="colhead">Lead Capture and Automation</span>
            </div>
            <div className="pkg"><div className="pt"><b>Lead Capture to Telegram</b><span>New leads sent to Telegram live.</span></div><div className="pp"><b>$750</b><span>3 to 5 days</span></div></div>
            <div className="pkg"><div className="pt"><b>Telegram Bot Setup</b><span>Welcomes, invites, basic answers.</span></div><div className="pp"><b>$500</b><span>3 to 5 days</span></div></div>
            <div className="pkg"><div className="pt"><b>Lead Capture and CRM</b><span>Above, plus tracked in a CRM.</span></div><div className="pp"><b>$1,500</b><span>1 to 2 wks</span></div></div>
            <div className="pkg"><div className="pt"><b>Full Automation System</b><span>Payment runs the whole onboarding.</span></div><div className="pp"><b>$3,000</b><span>2 to 3 wks</span></div></div>
          </div>

          <div className="card">
            <div className="ctop">
              <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#00E58A" strokeWidth="1.8"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/></svg></span>
              <span className="colhead">CRM Systems</span>
            </div>
            <div className="pkg"><div className="pt"><b>CRM Setup</b><span>Pipeline stages, tags, fields.</span></div><div className="pp"><b>$1,000</b><span>1 week</span></div></div>
            <div className="pkg"><div className="pt"><b>CRM and Funnel Connection</b><span>Website forms feed leads in.</span></div><div className="pp"><b>$1,500</b><span>1 to 2 wks</span></div></div>
            <div className="pkg"><div className="pt"><b>Team CRM</b><span>Per person tracking for a team.</span></div><div className="pp"><b>$2,000</b><span>2 weeks</span></div></div>
          </div>
        </div>

        <div className="grid2">
          <div className="card">
            <div className="ctop"><span className="colhead">Add Ons</span></div>
            <div className="addon"><span>Payment or subscription setup (Whop, Stripe)</span><span className="ap">$500</span></div>
            <div className="addon"><span>Email welcome sequence, up to 5 emails</span><span className="ap">$500</span></div>
            <div className="addon"><span>Sales copywriting</span><span className="ap">$300 per page</span></div>
            <div className="addon"><span>Google Sheet lead backup</span><span className="ap">$150</span></div>
            <div className="addon"><span>Domain and hosting setup</span><span className="ap">$150</span></div>
            <div className="addon"><span>Extra revision round</span><span className="ap">$100</span></div>
          </div>

          <div className="card">
            <div className="ctop"><span className="colhead">Monthly Care Plans</span></div>
            <div className="pkg"><div className="pt"><b>Basic</b><span>Keep it running, fix breakages.</span></div><div className="pp"><b>$100</b><span>a month</span></div></div>
            <div className="pkg"><div className="pt"><b>Growth</b><span>Basic, plus monthly updates.</span></div><div className="pp"><b>$250</b><span>a month</span></div></div>
            <div className="pkg"><div className="pt"><b>Full Service</b><span>New pages, automations, priority.</span></div><div className="pp"><b>$500</b><span>a month</span></div></div>
          </div>
        </div>

        <div className="steps">
          <div className="step"><span className="n">1</span><p>Quick call, lock in the price.</p></div>
          <div className="step"><span className="n">2</span><p>50% deposit to start.</p></div>
          <div className="step"><span className="n">3</span><p>Build and test, 2 revisions.</p></div>
          <div className="step"><span className="n">4</span><p>Remaining 50% at launch.</p></div>
        </div>
        <p className="stepnote">You provide access to your own accounts. Timelines start once deposit and access are received.</p>

        <div className="final">
          <h3>Ready to build?</h3>
          <p>Tell me what you want to launch and I will map the fastest path to get it live.</p>
          <a className="btn primary" href="mailto:info@thegreenprint.trade?subject=Build%20inquiry">Contact info@thegreenprint.trade</a>
        </div>
      </div>

      <footer>The Greenprint Build Studio. Contact <a href="mailto:info@thegreenprint.trade">info@thegreenprint.trade</a>. Prices in USD.</footer>
    </div>
  );
}
