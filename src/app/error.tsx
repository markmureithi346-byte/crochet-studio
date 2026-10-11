"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ERROR BOUNDARY
 * --------------
 * Next.js renders this when a Server Component or render throws. Two rules:
 *
 * 1. It must be a Client Component ("use client") so it can hold state and hooks.
 * 2. It receives `error` and `reset`, but we must NEVER show `error.message`
 *    directly to the user: it can contain file paths, SQL fragments or other
 *    internals. We log it server-side and show a calm, human message.
 *
 * `reset()` re-renders the failed subtree without a full page reload — the right
 * choice for a transient failure like a dropped connection.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where an error-reporting service would go.
    console.error("[app] render error", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <span
        className="flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning"
        aria-hidden="true"
      >
        <TriangleAlert className="size-5" />
      </span>

      <h1 className="mt-6 font-display text-2xl font-semibold text-ink">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Your work is saved. This page just failed to load — try again, and if it
        keeps happening we will look into it.
      </p>

      {/* The digest is safe to show: it is a random id that lets support find
          the matching server log entry, without leaking anything sensitive. */}
      {error.digest ? (
        <p className="mt-2 font-stitch text-xs text-ink-subtle">
          Reference: {error.digest}
        </p>
      ) : null}

      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>
          <RotateCcw aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
