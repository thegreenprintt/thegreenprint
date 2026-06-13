import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Refund Policy — The Greenprint" };

export default function RefundPolicyPage() {
  return (
    <>
      <Nav />
      <main className="pt-32 pb-20 max-w-3xl mx-auto px-4 sm:px-6">
        <p className="font-mono text-xs tracking-widest uppercase text-muted mb-2">Legal</p>
        <h1 className="text-3xl font-bold tracking-tight text-text mb-2">Refund Policy</h1>
        <p className="text-muted text-sm mb-12">Last updated: 2025</p>

        <div className="space-y-10">
          {[
            {
              title: "MONTHLY SUBSCRIPTIONS",
              body: "Due to the digital nature of our product, The Greenprint does not offer refunds on monthly subscription payments. You may cancel at any time from your account dashboard. Cancellation takes effect at end of your current billing period."
            },
            {
              title: "ANNUAL SUBSCRIPTIONS",
              body: "Refund requests within 7 days of annual billing will be considered case by case. Contact: support@thegreenprint.trade"
            },
            {
              title: "ELITE TIER",
              body: "All Elite payments are non-refundable due to limited seat availability."
            },
            {
              title: "HOW TO CANCEL",
              body: "Log into your account → Settings → Cancel Subscription. Or email: support@thegreenprint.trade"
            },
          ].map(s => (
            <div key={s.title} className="border-l-2 border-border pl-6">
              <h2 className="font-mono text-xs tracking-widest uppercase text-accent mb-3">{s.title}</h2>
              <p className="text-sm text-muted leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 p-4 bg-surface border border-border rounded-card">
          <p className="text-xs text-muted">
            Contact:{" "}
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
