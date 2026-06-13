import Link from "next/link";

export function Footer() {
  const navLinks = [
    { label: "What We Do", href: "/#what-we-do" },
    { label: "Programs", href: "/#programs" },
    { label: "Book a Call", href: "/#book-a-call" },
    { label: "Real Estate", href: "/#real-estate" },
    { label: "Watch Live", href: "/stream" },
  ];
  const legalLinks = [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
    { label: "Risk Disclosure", href: "/risk-disclosure" },
    { label: "Earnings Disclaimer", href: "/earnings-disclaimer" },
    { label: "Refund Policy", href: "/refund-policy" },
  ];
  return (
    <footer className="bg-surface border-t border-border pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-accent rounded flex items-center justify-center">
                <span className="text-bg font-black text-xs">GP</span>
              </div>
              <span className="font-bold text-sm tracking-widest uppercase">The Greenprint</span>
            </div>
            <p className="text-xs text-muted leading-relaxed max-w-xs">
              Build Wealth. Own Your Future. Day trading, investing, and commercial real estate —
              all in one place.
            </p>
          </div>
          {/* Nav */}
          <div>
            <p className="text-[10px] font-mono tracking-widest uppercase text-muted mb-4">Navigation</p>
            <div className="flex flex-col gap-2">
              {navLinks.map(l => (
                <Link key={l.href} href={l.href} className="text-xs text-muted hover:text-text transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>
          {/* Legal */}
          <div>
            <p className="text-[10px] font-mono tracking-widest uppercase text-muted mb-4">Legal</p>
            <div className="flex flex-col gap-2">
              {legalLinks.map(l => (
                <Link key={l.href} href={l.href} className="text-xs text-muted hover:text-text transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-8">
          <p className="text-xs text-muted text-center mb-3">
            © 2025 The Greenprint. All rights reserved.
          </p>
          <p className="text-[10px] text-muted text-center leading-relaxed max-w-3xl mx-auto">
            I am not a licensed financial advisor. All content provided by The Greenprint is for educational
            and informational purposes only. Trading and investing involve significant risk of loss and are
            not suitable for all individuals. Past performance is not indicative of future results. Always
            consult a qualified financial professional before making any investment decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}
