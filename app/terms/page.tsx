import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service — The Greenprint" };

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="pt-32 pb-20 max-w-3xl mx-auto px-4 sm:px-6">
        <p className="font-mono text-xs tracking-widest uppercase text-muted mb-2">Legal</p>
        <h1 className="text-3xl font-bold tracking-tight text-text mb-2">Terms of Service</h1>
        <p className="text-muted text-sm mb-12">Last updated: July 2026</p>

        <div className="space-y-10">
          {[
            {
              num: "01", title: "EDUCATIONAL PURPOSE",
              body: "The Greenprint provides financial education and information only. All content — including trade alerts, watchlists, live sessions, scanner signals, and any other material — is for educational and informational purposes only. Nothing on this platform constitutes financial, investment, legal, or tax advice."
            },
            {
              num: "02", title: "NOT A REGISTERED ADVISOR",
              body: "Jay and The Greenprint are not registered investment advisors, broker-dealers, or financial planners. We are not licensed by the SEC, FINRA, or any financial regulatory body."
            },
            {
              num: "03", title: "NO GUARANTEES",
              body: "The Greenprint makes no guarantees of profit, income, or trading success. Any results mentioned are not typical and should not be interpreted as a guarantee of your results."
            },
            {
              num: "04", title: "RISK ACKNOWLEDGMENT",
              body: "By joining The Greenprint, you acknowledge that trading and investing involve substantial risk of loss and are not suitable for all individuals. You may lose some or all of your capital."
            },
            {
              num: "05", title: "YOUR RESPONSIBILITY",
              body: "All trading and investment decisions are solely your own. You are responsible for your own due diligence. The Greenprint is not liable for any financial losses incurred as a result of information shared on this platform."
            },
            {
              num: "06", title: "MEMBERSHIP + BILLING",
              body: "Subscriptions are billed monthly and auto-renew unless cancelled. You may cancel at any time from your account dashboard. Cancellation takes effect at end of current billing period. See Refund Policy for details."
            },
            {
              num: "07", title: "ACCEPTABLE USE",
              body: "Member content is for personal use only. Redistribution of alerts, scanner signals, or any platform content is strictly prohibited. Accounts are personal and non-transferable."
            },
            {
              num: "08", title: "AI-ASSISTED CONTENT & TOOLS",
              body: "Portions of this platform — including software, design, automated chat responses (such as the 'GP AI' assistant), alerts formatting, and certain content — are produced or operated with the assistance of artificial intelligence tools under the direction and editorial control of The Greenprint. All such output is reviewed, adopted, and published by The Greenprint as its own work product. AI-assisted features are provided for convenience and education only, may contain errors, and do not constitute financial advice. The Greenprint may add, modify, or remove AI-assisted features at any time."
            },
            {
              num: "09", title: "INTELLECTUAL PROPERTY & OWNERSHIP",
              body: "The Greenprint name, brand, website, software, streams, alerts, courses, and all platform content are the exclusive property of The Greenprint and its operator, regardless of the tools (including AI tools) used in their creation. No license or ownership right is transferred to members. You may not copy, scrape, redistribute, resell, reverse-engineer, or use any platform content — including for training artificial intelligence or machine-learning systems — without prior written permission."
            },
            {
              num: "10", title: "RECORDINGS & LIVE SESSIONS",
              body: "Live streams, meetings, and sessions hosted on this platform may be recorded, clipped, and republished by The Greenprint for educational and promotional purposes. By joining a live stream or meeting — including appearing on camera, speaking on air, or participating in chat — you consent to such recording and use. If you do not consent, do not join live sessions or go on air."
            },
            {
              num: "11", title: "COMMUNICATIONS CONSENT",
              body: "By providing your email address or contact information, you consent to receive communications from The Greenprint, including stream notifications and educational or promotional messages. You may unsubscribe at any time, and every commercial email includes a way to opt out."
            },
            {
              num: "12", title: "CHANGES IN LAW & SEVERABILITY",
              body: "The Greenprint operates in good faith under the laws applicable at the time services are provided, including emerging laws governing artificial intelligence. If any provision of these terms becomes invalid under future law, the remaining provisions remain in full effect, and the invalid provision will be interpreted to fulfill its intent as closely as the law allows. The Greenprint may update these terms as laws evolve; continued use after changes constitutes acceptance."
            },
            {
              num: "13", title: "GOVERNING LAW",
              body: "These terms are governed by the laws of the state in which The Greenprint operates."
            },
          ].map(s => (
            <div key={s.num} className="border-l-2 border-border pl-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-xs text-muted">{s.num}</span>
                <h2 className="font-mono text-xs tracking-widest uppercase text-accent">{s.title}</h2>
              </div>
              <p className="text-sm text-muted leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 p-4 bg-surface border border-border rounded-card">
          <p className="text-xs text-muted">
            Questions? Email{" "}
            <a href="mailto:support@thegreenprint.trade" className="text-text underline">
              support@thegreenprint.trade
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
