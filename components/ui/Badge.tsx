import { cn } from "@/lib/cn";

type BadgeVariant = "breakout" | "momentum" | "reversal" | "setup" | "live" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    breakout:  "bg-accent text-bg font-bold",
    momentum:  "border border-accent text-accent",
    reversal:  "bg-red text-white font-bold",
    setup:     "border border-gold text-gold",
    live:      "bg-red/20 text-red border border-red/30",
    default:   "bg-surface2 text-muted border border-border",
  };
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase rounded",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
