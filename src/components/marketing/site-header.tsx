import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { CurrentUser } from "@/lib/data/auth";

/**
 * Server Component: it receives the user as a prop (already resolved by the
 * layout) and renders either "Sign in / Get started" or "Open studio".
 */
export function SiteHeader({ user }: { user: CurrentUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Link href="/" className="rounded-md" aria-label="Crochet Studio home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          <Link
            href="/#systems"
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            How it works
          </Link>
          <Link
            href="/#features"
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Features
          </Link>
          <Link
            href="/#roadmap"
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Roadmap
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Open studio</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
