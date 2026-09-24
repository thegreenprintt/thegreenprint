export const metadata = {
  title: "Build Services and Pricing | The Greenprint",
  description: "Websites, automation, and CRM systems. Clear prices, clear timelines.",
};

export default function PricesPage() {
  return (
    <div className="gp-prices">
      <style dangerouslySetInnerHTML={{ __html: `
        .gp-prices{min-height:100vh;background:#F6F9F7;color:#0F1F18;font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.4}
        .gp-prices *{box-sizing:border-box}
        .gp-prices a{text-decoration:none}
        .gp-prices .container{max-width:1080px;margin:0 auto;padding:0 22px}
        .gp-prices .hero{text-align:center;padding:52px 22px 26px}
        .gp-prices .brand{font-size:12px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#0B8457;margin:0 0 10px}
        .gp-prices .hero h1{font-size:42px;font-weight:800;letter-spacing:-.02em;margin:0 0 10px;color:#0C2E20}
        .gp-prices .tag{color:#5C6B64;font-size:16px;max-width:520px;margin:0 auto 20px}
        .gp-prices .cta{display:inline-block;background:#00C46A;color:#04241A;font-weight:700;font-size:14.5px;padding:12px 24px;border-radius:10px;box-shadow:0 8px 24px rgba(0,196,106,.32)}
        .gp-prices .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .gp-prices .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
        @media(max-width:880px){.gp-prices .grid{grid-template-columns:1fr}.gp-prices .grid2{grid-template-columns:1fr}}
        .gp-prices .col{background:#fff;border:1px solid #E6ECE9;border-radius:16px;padding:18px 20px 8px;box-shadow:0 8px 26px rgba(9,54,38,.05)}
        .gp-prices .colhead{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#0B8457;margin:0 0 4px}
        .gp-prices .pkg{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid #F0F4F2}
        .gp-prices .col .pkg:last-child{border-bottom:none}
        .gp-prices .pt b{display:block;font-size:15.5px;font-weight:700;color:#0F1F18}
        .gp-prices .pt span{display:block;font-size:12.5px;color:#6B7B73;margin-top:2px;line-height:1.35}
        .gp-prices .pp{text-align:right;white-space:nowrap;flex:0 0 auto}
        .gp-prices .pp b{display:block;font-size:20px;font-weight:800;color:#0B8457;letter-spacing:-.01em}
        .gp-prices .pp span{display:block;font-size:11.5px;color:#8A968F;margin-top:1px}
        .gp-prices .addon{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #F0F4F2;font-size:14px;color:#2B3B33}
        .gp-prices .col .addon:last-child{border-bottom:none}
        .gp-prices .addon .ap{font-weight:800;color:#0B8457;white-space:nowrap}
        .gp-prices .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}
        @media(max-width:880px){.gp-prices .steps{grid-template-columns:1fr 1fr}}
        .gp-prices .step{background:#fff;border:1px solid #E6ECE9;border-radius:14px;padding:16px}
        .gp-prices .step .n{width:26px;height:26px;border-radius:50%;background:#00C46A;color:#04241A;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
        .gp-prices .step p{font-size:13.5px;color:#2B3B33;margin:0;font-weight:500}
        .gp-prices .stepnote{color:#8A968F;font-size:12px;margin-top:10px;text-align:center}
        .gp-prices .finalband{background:linear-gradient(135deg,#0C2E20,#0B7A52);color:#fff;border-radius:18px;padding:34px;text-align:center;margin-top:26px}
        .gp-prices .finalband h3{font-size:24px;font-weight:800;margin:0 0 6px}
        .gp-prices .finalband p{color:#CFEBDD;margin:0 auto 16px;max-width:460px;font-size:14.5px}
        .gp-prices .finalband .cta{background:#fff;color:#0C2E20}
        .gp-prices footer{text-align:center;color:#8A968F;font-size:12.5px;padding:22px 22px 40px}
        .gp-prices footer a{color:#0B8457;font-weight:600}
        @media(max-width:640px){.gp-prices .hero h1{font-size:33px}}
      ` }} />

      <div className="hero">
        <p className="brand">The Greenprint</p>
        <h1>Build Services</h1>
        <p className="tag">Websites, automation, and CRM systems. Clear prices, clear timelines.</p>
        <a className="cta" href="mailto:info@thegreenprint.trade?subject=Build%20inquiry">Book a call</a>
      </div>

      <div className="container">
        <div className="grid">
          <div className="col">
            <p className="colhead">Websites</p>
            <div className="pkg"><div className="pt"><b>Landing Page</b><span>One offer, lead form, mobile.</span></div><div className="pp"><b>$1,500</b><span>1 to 2 wks</span></div></div>
            <div className="pkg"><div className="pt"><b>Business Website</b><span>Up to 5 pages, branding, SEO.</span></div><div className="pp"><b>$3,000</b><span>2 to 3 wks</span></div></div>
            <div className="pkg"><div className="pt"><b>Full Platform</b><span>Logins, subscriptions, dashboard.</span></div><div className="pp"><b>$6,000+</b><span>4 to 6 wks</span></div></div>
          </div>

          <div className="col">
            <p className="colhead">Lead Capture and Automation</p>
            <div className="pkg"><div className="pt"><b>Lead Capture to Telegram</b><span>New leads sent to Telegram live.</span></div><div className="pp"><b>$750</b><span>3 to 5 days</span></div></div>
            <div className="pkg"><div className="pt"><b>Telegram Bot Setup</b><span>Welcomes, invites, basic answers.</span></div><div className="pp"><b>$500</b><span>3 to 5 days</span></div></div>
            <div className="pkg"><div className="pt"><b>Lead Capture and CRM</b><span>Above, plus tracked in a CRM.</span></div><div className="pp"><b>$1,500</b><span>1 to 2 wks</span></div></div>
            <div className="pkg"><div className="pt"><b>Full Automation System</b><span>Payment runs the whole onboarding.</span></div><div className="pp"><b>$3,000</b><span>2 to 3 wks</span></div></div>
          </div>

          <div className="col">
            <p className="colhead">CRM Systems</p>
            <div className="pkg"><div className="pt"><b>CRM Setup</b><span>Pipeline stages, tags, fields.</span></div><div className="pp"><b>$1,000</b><span>1 week</span></div></div>
            <div className="pkg"><div className="pt"><b>CRM and Funnel Connection</b><span>Website forms feed leads in.</span></div><div className="pp"><b>$1,500</b><span>1 to 2 wks</span></div></div>
            <div className="pkg"><div className="pt"><b>Team CRM</b><span>Per person tracking for a team.</span></div><div className="pp"><b>$2,000</b><span>2 weeks</span></div></div>
          </div>
        </div>

        <div className="grid2">
          <div className="col">
            <p className="colhead">Add Ons</p>
            <div className="addon"><span>Payment or subscription setup (Whop, Stripe)</span><span className="ap">$500</span></div>
            <div className="addon"><span>Email welcome sequence, up to 5 emails</span><span className="ap">$500</span></div>
            <div className="addon"><span>Sales copywriting</span><span className="ap">$300 per page</span></div>
            <div className="addon"><span>Google Sheet lead backup</span><span className="ap">$150</span></div>
            <div className="addon"><span>Domain and hosting setup</span><span className="ap">$150</span></div>
            <div className="addon"><span>Extra revision round</span><span className="ap">$100</span></div>
          </div>

          <div className="col">
            <p className="colhead">Monthly Care Plans</p>
            <div className="pkg"><div className="pt"><b>Basic</b><span>Keep it running, fix breakages.</span></div><div className="pp"><b>$100</b><span>a month</span></div></div>
            <div className="pkg"><div className="pt"><b>Growth</b><span>Basic, plus monthly updates.</span></div><div className="pp"><b>$250</b><span>a month</span></div></div>
            <div className="pkg"><div className="pt"><b>Full Service</b><span>New pages, automations, priority.</span></div><div className="pp"><b>$500</b><span>a month</span></div></div>
          </div>
        </div>

        <div className="steps">
          <div className="step"><div className="n">1</div><p>Quick call, lock in the price.</p></div>
          <div className="step"><div className="n">2</div><p>50% deposit to start.</p></div>
          <div className="step"><div className="n">3</div><p>Build and test, 2 revisions.</p></div>
          <div className="step"><div className="n">4</div><p>Remaining 50% at launch.</p></div>
        </div>
        <p className="stepnote">You provide access to your own accounts. Timelines start once deposit and access are received.</p>

        <div className="finalband">
          <h3>Ready to build?</h3>
          <p>Tell me what you want to launch and I will map the fastest path to get it live.</p>
          <a className="cta" href="mailto:info@thegreenprint.trade?subject=Build%20inquiry">Contact info@thegreenprint.trade</a>
        </div>
      </div>

      <footer>The Greenprint Build Services. Contact <a href="mailto:info@thegreenprint.trade">info@thegreenprint.trade</a>. Prices in USD.</footer>
    </div>
  );
}
