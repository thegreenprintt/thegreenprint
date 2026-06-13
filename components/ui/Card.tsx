import { cn } from "@/lib/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  gold?: boolean;
}

export function Card({ children, className, gold = false }: CardProps) {
  return (
    <div className={cn(
      "bg-surface border rounded-card p-5",
      gold ? "border-gold/40" : "border-border",
      className
    )}>
      {children}
    </div>
  );
}
