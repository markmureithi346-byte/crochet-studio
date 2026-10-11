import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const FOOTER_LINKS = [
  { href: "/#systems", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#roadmap", label: "Roadmap" },
  { href: "/login", label: "Sign in" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-ink-muted">
            A design studio for people who make things with yarn.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-4 text-xs text-ink-subtle">
          Built as a real application: real data, real calculations, real state.
        </div>
      </div>
    </footer>
  );
}
