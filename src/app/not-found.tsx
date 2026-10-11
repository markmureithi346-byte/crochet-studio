import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 404. Matches the design language rather than Next.js's stock page, and offers
 * a way back into the app instead of a dead end.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span
        className="flex size-12 items-center justify-center rounded-full bg-surface-3 text-ink-muted"
        aria-hidden="true"
      >
        <SearchX className="size-5" />
      </span>

      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink">
        We lost that stitch
      </h1>
      <p className="mt-3 text-ink-muted">
        That page does not exist. It may have been renamed, or the link might be
        wrong.
      </p>

      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}
