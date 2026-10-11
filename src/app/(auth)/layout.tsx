import { redirectIfSignedIn } from "@/lib/data/auth";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/**
 * SHARED LAYOUT FOR /login AND /signup
 *
 * A centred, distraction-free column. Deliberately different from the marketing
 * pages: when someone is creating an account they should be looking at one
 * thing. A route group `(auth)` keeps this layout from wrapping the app pages.
 */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  await redirectIfSignedIn();

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex items-center justify-between p-6">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="pb-8 text-center text-xs text-ink-subtle">
        Your patterns and projects are private to your account.
      </footer>
    </div>
  );
}
