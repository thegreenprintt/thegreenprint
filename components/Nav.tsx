"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "./ui/Button";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = [
    { label: "What We Do", href: "/#what-we-do" },
    { label: "Programs", href: "/#programs" },
    { label: "Book a Call", href: "/#book-a-call" },
    { label: "Real Estate", href: "/#real-estate" },
    { label: "Members", href: "/#members" },
    { label: "Watch Live", href: "/stream" },
    { label: "Onboarding", href: "/onboard" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-black/80 backdrop-blur-md border-b border-border" : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent rounded flex items-center justify-center">
            <span className="text-bg font-black text-xs tracking-tighter">GP</span>
          </div>
          <span className="font-bold text-sm tracking-widest uppercase text-text hidden sm:block">
            The Greenprint
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-8">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="text-sm text-muted hover:text-text transition-colors">{l.label}</Link>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden sm:block">
          <Link href="/join"><Button size="sm">Get Access →</Button></Link>
        </div>

        {/* Hamburger */}
        <button className="lg:hidden text-muted hover:text-text p-1" onClick={() => setOpen(!open)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-surface border-t border-border">
          <div className="px-4 py-4 flex flex-col gap-4">
            {links.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="text-sm text-muted hover:text-text transition-colors py-1">{l.label}</Link>
            ))}
            <Link href="/join" onClick={() => setOpen(false)}>
              <Button fullWidth size="sm">Get Access →</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
