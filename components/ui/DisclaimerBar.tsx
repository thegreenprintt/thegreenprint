"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DisclaimerBar() {
  const pathname = usePathname();
  if (pathname === "/stream" || pathname === "/go-live" || pathname === "/meet" || pathname === "/app" || pathname.startsWith("/app/")) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border px-4 py-2 text-center">
      <p className="text-[10px] text-muted font-mono leading-relaxed">
        The Greenprint is for educational purposes only. Not financial advice. Trading involves risk of loss.{" "}
        <Link href="/risk-disclosure" className="text-muted underline hover:text-text transition-colors">
          See full disclaimer →
        </Link>
      </p>
    </div>
  );
}
