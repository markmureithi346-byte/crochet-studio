import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * LOGO
 * ----
 * Drawn as inline SVG rather than an image file so it inherits `currentColor`
 * (one component, works on light and dark) and needs no network request.
 *
 * The mark is three interlocking loops on a grid â€” a stylised chain stitch and,
 * just as importantly, a nod to a graph node connecting to the next, which is
 * what a round of crochet actually is.
 */
export function Logo({
  className,
  markOnly = false,
}: {
  className?: string;
  markOnly?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 32 32"
        className="size-7 shrink-0 text-accent"
        aria-hidden="true"
        fill="none"
      >
        <circle cx="9" cy="9" r="5" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="23" cy="9" r="5" stroke="currentColor" strokeWidth="2.2" opacity="0.65" />
        <circle cx="9" cy="23" r="5" stroke="currentColor" strokeWidth="2.2" opacity="0.4" />
        <circle cx="23" cy="23" r="5" stroke="currentColor" strokeWidth="2.2" />
      </svg>
      {!markOnly ? (
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          Crochet Studio
        </span>
      ) : null}
    </span>
  );
}

export function LogoLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("rounded-md", className)} aria-label="Crochet Studio home">
      <Logo />
    </Link>
  );
}
