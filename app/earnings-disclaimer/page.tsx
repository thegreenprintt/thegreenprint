import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Earnings Disclaimer — The Greenprint" };

export default function EarningsDisclaimerPage() {
  return (
    <>
      <Nav />
      <main className="pt-32 pb-20 max-w-3xl mx-auto px-4 sm:px-6">
        <p className="font-mono text-xs tracking-widest uppercase text-muted mb-2">Legal</p>
        <h1 className="text-3xl font-bold tracking-tight text-text mb-2">Earnings Disclaimer</h1>
        <p className="text-muted text-sm mb-12">Last updated: 2025</p>

        <div className="space-y-6 text-sm text-muted leading-relaxed">
          <p>
            Any income, revenue, trading results, or financial figures referenced on The Greenprint
            website, social media, or platform are illustrative of what is possible — not a guarantee
            of what you will earn or achieve.
          </p>
          <p>
            Results mentioned by Jay or Greenprint members are individual results and are not typical.
            Individual results will vary based on experience, capital, risk tolerance, market conditions,
            and other factors.
          </p>
          <p>
            The Greenprint does not guarantee any specific financial outcome from membership, education,
            or use of any tools including the scanner.
          </p>
          <p className="font-medium text-text">
            There is always risk involved in trading. Do not trade with money you cannot afford to lose.
          </p>

          <div className="border border-border rounded-card p-5 mt-8">
            <p className="font-mono text-xs text-muted">
              The stats shown on this site (500+ Students, $847K+ Volume, 85% Win Rate) represent
              results from individual community members and are not typical. Past performance is not
              indicative of future results. See this full page for complete context.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
