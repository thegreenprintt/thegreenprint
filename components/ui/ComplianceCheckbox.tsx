"use client";
import { useState } from "react";
import Link from "next/link";

interface ComplianceCheckboxProps {
  onChange: (checked: boolean) => void;
}

export function ComplianceCheckbox({ onChange }: ComplianceCheckboxProps) {
  const [checked, setChecked] = useState(false);
  const toggle = () => {
    const next = !checked;
    setChecked(next);
    onChange(next);
  };
  return (
    <div
      className="flex items-start gap-3 cursor-pointer group"
      onClick={toggle}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={e => e.key === " " && toggle()}
    >
      <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
        checked ? "bg-accent border-accent" : "border-border bg-surface"
      }`}>
        {checked && <svg className="w-2.5 h-2.5 text-bg" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <p className="text-xs text-muted leading-relaxed">
        I understand The Greenprint provides financial education only and is not financial advice.
        I accept the{" "}
        <Link href="/terms" className="text-text underline" onClick={e => e.stopPropagation()}>Terms of Service</Link>,{" "}
        <Link href="/risk-disclosure" className="text-text underline" onClick={e => e.stopPropagation()}>Risk Disclosure</Link>, and{" "}
        <Link href="/earnings-disclaimer" className="text-text underline" onClick={e => e.stopPropagation()}>Earnings Disclaimer</Link>.
      </p>
    </div>
  );
}
