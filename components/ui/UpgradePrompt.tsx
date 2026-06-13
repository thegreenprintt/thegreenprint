"use client";
import { Button } from "./Button";
import Link from "next/link";

interface UpgradePromptProps {
  tier: "trader" | "elite";
  feature: string;
  onDismiss?: () => void;
}

export function UpgradePrompt({ tier, feature, onDismiss }: UpgradePromptProps) {
  const isElite = tier === "elite";
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-card">
      <div className="bg-surface border border-border rounded-card p-8 max-w-sm w-full mx-4 text-center">
        <div className={`text-3xl mb-4 ${isElite ? "text-gold" : "text-accent"}`}>⚡</div>
        <h3 className="text-text font-semibold text-lg mb-2">
          This is a {isElite ? "Elite" : "Trader"} feature.
        </h3>
        <p className="text-muted text-sm mb-6">{feature}</p>
        <Link href="/join">
          <Button variant={isElite ? "gold" : "accent"} fullWidth className="mb-3">
            Upgrade to {isElite ? "Elite — $297/mo" : "Trader — $97/mo"} →
          </Button>
        </Link>
        {onDismiss && (
          <button onClick={onDismiss} className="text-muted text-sm hover:text-text transition-colors">
            Maybe later
          </button>
        )}
      </div>
    </div>
  );
}
