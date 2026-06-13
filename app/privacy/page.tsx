import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy — The Greenprint" };

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="pt-32 pb-20 max-w-3xl mx-auto px-4 sm:px-6">
        <p className="font-mono text-xs tracking-widest uppercase text-muted mb-2">Legal</p>
        <h1 className="text-3xl font-bold tracking-tight text-text mb-2">Privacy Policy</h1>
        <p className="text-muted text-sm mb-12">Last updated: 2025</p>

        <div className="space-y-10">
          {[
            {
              num: "01", title: "WHAT DATA WE COLLECT",
              body: "We collect: name, email address, payment information (processed by Whop — we do not store card numbers), usage data (pages visited, features used), and any information you voluntarily provide during onboarding."
            },
            {
              num: "02", title: "HOW WE USE IT",
              body: "We use your data to: provide platform access and features, send transactional and educational emails, improve platform performance and personalization, and comply with legal obligations."
            },
            {
              num: "03", title: "WHO WE SHARE IT WITH",
              body: "We share data only with trusted service providers: Whop (payment processing and membership), Supabase (database and authentication), Resend (transactional email), Beehiiv (newsletter), and Telegram (community invitations). We do not sell your data."
            },
            {
              num: "04", title: "DATA DELETION",
              body: "To request deletion of your data, email support@thegreenprint.trade with subject 'Data Deletion Request'. We will process your request within 30 days."
            },
            {
              num: "05", title: "COOKIES",
              body: "We use essential cookies for authentication and session management. We do not use advertising or tracking cookies."
            },
            {
              num: "06", title: "EMAIL OPT-OUT",
              body: "You may opt out of marketing emails at any time via the unsubscribe link in any email. Transactional emails (login, receipts) cannot be disabled as they are required for account function."
            },
            {
              num: "07", title: "DATA RETENTION",
              body: "We retain your data for as long as your account is active. Upon cancellation, data is retained for 12 months then deleted, unless required by law."
            },
            {
              num: "08", title: "CONTACT",
              body: "Privacy questions: support@thegreenprint.trade"
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
      </main>
      <Footer />
    </>
  );
}
