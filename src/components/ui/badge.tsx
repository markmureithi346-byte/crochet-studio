import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A small status pill.
 *
 * ACCESSIBILITY: colour is never the only signal. Every badge also carries a
 * text label, so a user who cannot distinguish accent from moss still gets the
 * information from the words. If we ever add an icon-only badge, it must have
 * an accessible name.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-surface-3 text-ink-muted",
        accent: "bg-accent-soft text-accent",
        moss: "bg-moss-soft text-moss",
        dusk: "bg-dusk-soft text-dusk",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** A stitch code chip. Always monospace so abbreviations line up in a list. */
export function StitchChip({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-8 items-center justify-center rounded-md border border-line bg-surface-2 px-1.5 font-stitch text-xs font-medium text-ink",
        className,
      )}
    >
      {code}
    </span>
  );
}
