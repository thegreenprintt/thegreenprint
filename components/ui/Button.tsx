"use client";
import { cn } from "@/lib/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "accent" | "ghost" | "gold" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "accent", size = "md", fullWidth = false, className, children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-btn disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent";
    const variants = {
      accent:  "bg-accent text-bg btn-accent",
      ghost:   "bg-transparent border border-border text-text btn-ghost",
      gold:    "bg-transparent border border-gold text-gold hover:shadow-gold",
      danger:  "bg-red/10 border border-red/30 text-red hover:bg-red/20",
    };
    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-5 py-2.5 text-sm",
      lg: "px-7 py-3.5 text-base",
    };
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
