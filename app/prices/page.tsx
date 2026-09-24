export const metadata = {
  title: "Build Services and Pricing | The Greenprint",
  description: "Websites, lead capture, automation, and CRM systems that turn visitors into paying clients. Clear pricing and timelines.",
};

export default function PricesPage() {
  return (
    <div className="gp-prices">
      <style dangerouslySetInnerHTML={{ __html: `
        .gp-prices{
          min-height:100vh;
          background:#F2F5F3;
          color:#12211B;
          font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
          line-height:1.5;
          -webkit-print-color-adjust:exact;
          print-color-adjust:exact;
        }
        .gp-prices *{box-sizing:border-box}
        .gp-prices a{text-decoration:none}
        .gp-prices .hero{background:linear-gradient(135deg,#052A1D,#0B5C3E 70%,#0B8457);color:#fff;padding:70px 24px 62px;text-align:center}
        .gp-prices .hero .inner{max-width:760px;margin:0 auto}
        .gp-prices .brand{font-size:13px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#8FE9C4;margin:0 0 14px}
        .gp-prices .hero h1{font-size:44px;line-height:1.05;font-weight:800;letter-spacing:-.02em;margin:0 0 14px;color:#fff}
        .gp-prices .hero p{font-size:17px;line-height:1.55;color:#D5EEE1;margin:0 auto 26px;max-width:560px}
        .gp-prices .cta{display:inline-block;background:#fff;color:#083D2B;font-weight:700;font-size:15px;padding:14px 26px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.2)}
        .gp-prices .cta.alt{background:#00C46A;color:#052A1D}
        .gp-prices .heronote{margin-top:16px;font-size:13px;color:#9FD9BE}
        .gp-prices .wrap{max-width:960px;margin:0 auto;padding:8px 24px 20px}
        .gp-prices section{margin-top:44px}
        .gp-prices .sechead{margin-bottom:14px}
        .gp-prices h2{font-size:24px;font-weight:800;letter-spacing:-.01em;color:#083D2B;margin:0}
        .gp-prices .sub{color:#5B6B63;font-size:14.5px;margin:4px 0 0}
        .gp-prices .card{background:#fff;border:1px solid #E4EAE6;border-radius:14px;overflow:hidden;box-shadow:0 6px 22px rgba(8,61,43,.06)}
        .gp-prices table{width:100%;border-collapse:collapse;font-size:14.5px}
        .gp-prices thead th{background:#EAF6F0;color:#083D2B;text-align:left;font-weight:700;font-size:12px;letter-spacing:.04em;text-transform:uppercase;padding:12px 16px;border-bottom:1px solid #E4EAE6}
        .gp-prices tbody td{padding:14px 16px;border-bottom:1px solid #EEF3F0;vertical-align:top;color:#12211B}
        .gp-prices tbody tr:last-child td{border-bottom:none}
        .gp-prices tbody tr:nth-child(even){background:#FAFCFB}
        .gp-prices .pkg{font-weight:700;color:#12211B;white-space:nowrap}
        .gp-prices .price{font-weight:800;color:#0B8457;white-space:nowrap}
        .gp-prices .time{color:#5B6B63;white-space:nowrap;font-weight:500}
        .gp-prices .desc{color:#33463D}
        .gp-prices .how{background:#fff;border:1px solid #E4EAE6;border-radius:14px;padding:26px 28px;box-shadow:0 6px 22px rgba(8,61,43,.06)}
        .gp-prices .how ol{margin:0 0 0 4px;padding-left:22px}
        .gp-prices .how li{margin:8px 0;font-weight:500}
        .gp-prices .how .note{margin-top:16px;font-size:13.5px;color:#5B6B63}
        .gp-prices .final{margin:56px auto 0;max-width:960px;padding:0 24px}
        .gp-prices .finalband{background:linear-gradient(135deg,#083D2B,#0B7A52);color:#fff;border-radius:16px;padding:44px 34px;text-align:center}
        .gp-prices .finalband h3{font-size:28px;font-weight:800;margin:0 0 8px;color:#fff}
        .gp-prices .finalband p{color:#CFEBDD;margin:0 auto 22px;max-width:520px;font-size:15.5px}
        .gp-prices footer{max-width:960px;margin:0 auto;padding:26px 24px 44px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;color:#5B6B63;font-size:13.5px}
        .gp-prices footer .co{font-weight:700;color:#083D2B}
        .gp-prices footer a{color:#0B8457;font-weight:600}
        @media(max-width:640px){
          .gp-prices .hero{padding:52px 20px 46px}
          .gp-prices .hero h1{font-size:33px}
          .gp-prices table{font-size:13.5px}
          .gp-prices .pkg,.gp-prices .time,.gp-prices .price{white-space:normal}
        }
        @media print{
          .gp-prices{background:#fff}
          .gp-prices .cta{display:none}
          .gp-prices .card,.gp-prices .how,.gp-prices .finalband{box-shadow:none}
          .gp-prices section,.gp-prices tr,.gp-prices table{page-break-inside:avoid}
        }
      ` }} />

      <div className="hero">
        <div className="inner">
          <p className="brand">The Greenprint</p>
          <h1>Build Services and Pricing</h1>
          <p>Websites, lead capture, automation, and CRM systems that turn visitors into paying clients. Clear scope, clear prices, clear timelines.</p>
          <a className="cta alt" href="mailto:info@thegreenprint.trade?subject=Build%20inquiry">Book a call</a>
          <div className="heronote">Prices in USD.</div>
        </div>
      </div>

      <div className="wrap">
        <section>
          <div className="sechead"><h2>Websites</h2><p className="sub">From a single offer page to a full member platform.</p></div>
          <div className="card">
            <table>
              <thead><tr><th>Package</th><th>What You Get</th><th>Price</th><th>Timeline</th></tr></thead>
              <tbody>
                <tr><td className="pkg">Landing Page</td><td className="desc">One page to sell a single offer, lead form, mobile design.</td><td className="price">$1,500</td><td className="time">1 to 2 weeks</td></tr>
                <tr><td className="pkg">Business Website</td><td className="desc">Up to 5 pages, custom branding, contact forms, basic SEO.</td><td className="price">$3,000</td><td className="time">2 to 3 weeks</td></tr>
                <tr><td className="pkg">Full Platform</td><td className="desc">Member logins, paid subscriptions, database, member dashboard, all automations.</td><td className="price">$6,000+</td><td className="time">4 to 6 weeks</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="sechead"><h2>Lead Capture and Automation</h2><p className="sub">Turn new signups into calls, texts, and paying members automatically.</p></div>
          <div className="card">
            <table>
              <thead><tr><th>Package</th><th>What You Get</th><th>Price</th><th>Timeline</th></tr></thead>
              <tbody>
                <tr><td className="pkg">Lead Capture to Telegram</td><td className="desc">Signup form that sends every new lead (name, phone, email) straight to Telegram in real time, so the owner can call or text right away.</td><td className="price">$750</td><td className="time">3 to 5 days</td></tr>
                <tr><td className="pkg">Telegram Bot Setup</td><td className="desc">Welcomes new people, sends invite links, answers basic questions.</td><td className="price">$500</td><td className="time">3 to 5 days</td></tr>
                <tr><td className="pkg">Lead Capture and CRM</td><td className="desc">Everything above plus every lead saved and tracked in a CRM pipeline.</td><td className="price">$1,500</td><td className="time">1 to 2 weeks</td></tr>
                <tr><td className="pkg">Full Automation System</td><td className="desc">Payment triggers account setup, welcome emails, Telegram invites, and onboarding automatically.</td><td className="price">$3,000</td><td className="time">2 to 3 weeks</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="sechead"><h2>CRM Systems</h2><p className="sub">Keep every lead organized and followed up with.</p></div>
          <div className="card">
            <table>
              <thead><tr><th>Package</th><th>What You Get</th><th>Price</th><th>Timeline</th></tr></thead>
              <tbody>
                <tr><td className="pkg">CRM Setup</td><td className="desc">Pipeline stages, tags, custom fields.</td><td className="price">$1,000</td><td className="time">1 week</td></tr>
                <tr><td className="pkg">CRM and Funnel Connection</td><td className="desc">CRM plus website forms feeding leads in automatically.</td><td className="price">$1,500</td><td className="time">1 to 2 weeks</td></tr>
                <tr><td className="pkg">Team CRM</td><td className="desc">Set up for a team or referral partners with lead tracking per person.</td><td className="price">$2,000</td><td className="time">2 weeks</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="sechead"><h2>Add Ons</h2><p className="sub">Bolt these onto any package.</p></div>
          <div className="card">
            <table>
              <thead><tr><th>Add On</th><th>Price</th></tr></thead>
              <tbody>
                <tr><td className="desc">Payment or subscription setup (Whop, Stripe)</td><td className="price">$500</td></tr>
                <tr><td className="desc">Email welcome sequence, up to 5 emails</td><td className="price">$500</td></tr>
                <tr><td className="desc">Sales copywriting</td><td className="price">$300 per page</td></tr>
                <tr><td className="desc">Google Sheet lead backup</td><td className="price">$150</td></tr>
                <tr><td className="desc">Domain and hosting setup</td><td className="price">$150</td></tr>
                <tr><td className="desc">Extra revision round</td><td className="price">$100</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="sechead"><h2>Monthly Care Plans</h2><p className="sub">Keep it running and growing after launch.</p></div>
          <div className="card">
            <table>
              <thead><tr><th>Plan</th><th>What You Get</th><th>Price</th></tr></thead>
              <tbody>
                <tr><td className="pkg">Basic</td><td className="desc">Keep everything running, fix anything that breaks.</td><td className="price">$100 a month</td></tr>
                <tr><td className="pkg">Growth</td><td className="desc">Basic plus small monthly updates.</td><td className="price">$250 a month</td></tr>
                <tr><td className="pkg">Full Service</td><td className="desc">Growth plus new pages, new automations, priority support.</td><td className="price">$500 a month</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="sechead"><h2>How It Works</h2><p className="sub">Simple, four step process.</p></div>
          <div className="how">
            <ol>
              <li>Quick call to go over needs and lock in the price.</li>
              <li>50% deposit to start.</li>
              <li>Build and test, 2 rounds of revisions included.</li>
              <li>Remaining 50% due at launch.</li>
            </ol>
            <p className="note">Client provides access to their own accounts. Timelines start once deposit and access are received.</p>
          </div>
        </section>
      </div>

      <div className="final">
        <div className="finalband">
          <h3>Ready to build?</h3>
          <p>Tell me what you are trying to launch and I will map the fastest path to get it live.</p>
          <a className="cta" href="mailto:info@thegreenprint.trade?subject=Build%20inquiry">Contact info@thegreenprint.trade</a>
        </div>
      </div>

      <footer>
        <div><span className="co">The Greenprint Build Services</span></div>
        <div>Contact: <a href="mailto:info@thegreenprint.trade">info@thegreenprint.trade</a></div>
      </footer>
    </div>
  );
}
