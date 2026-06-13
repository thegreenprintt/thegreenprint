import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Risk Disclosure — The Greenprint" };

export default function RiskDisclosurePage() {
  return (
    <>
      <Nav />
      <main className="pt-32 pb-20 max-w-3xl mx-auto px-4 sm:px-6">
        <p className="font-mono text-xs tracking-widest uppercase text-muted mb-2">Legal</p>
        <h1 className="text-3xl font-bold tracking-tight text-text mb-2">Risk Disclosure</h1>
        <p className="text-muted text-sm mb-12">Read before accessing platform content.</p>

        <div className="p-5 bg-red/5 border border-red/20 rounded-card mb-10">
          <p className="text-sm text-text leading-relaxed">
            Trading stocks, options, futures, and other financial instruments involves significant risk
            of loss.
          </p>
        </div>

        <div className="space-y-10">
          {[
            {
              title: "MARKET RISK",
              body: "Markets can move against your position rapidly and without warning. You can lose more than your initial investment."
            },
            {
              title: "PAST PERFORMANCE",
              body: "Any trading results or performance figures shared by The Greenprint reflect past performance only. Past performance is not indicative of future results."
            },
            {
              title: "EDUCATIONAL CONTENT RISK",
              body: "Trade alerts, scanner signals, watchlists, and live session content are shared for educational purposes only. They do not represent personalized investment advice."
            },
            {
              title: "NOT SUITABLE FOR ALL INVESTORS",
              body: "Only trade with capital you can afford to lose entirely."
            },
            {
              title: "SEEK PROFESSIONAL ADVICE",
              body: "Before making any investment decision, consult a licensed financial advisor who understands your personal financial situation."
            },
          ].map(s => (
            <div key={s.title} className="border-l-2 border-red/30 pl-6">
              <h2 className="font-mono text-xs tracking-widest uppercase text-red mb-3">{s.title}</h2>
              <p className="text-sm text-muted leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 p-5 bg-surface border border-border rounded-card">
          <p className="text-sm text-muted">
            By accessing The Greenprint platform, you confirm you have read and accepted this risk disclosure.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
