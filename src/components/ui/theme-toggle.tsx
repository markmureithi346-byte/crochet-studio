"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * THEME TOGGLE
 * ------------
 * The theme lives in the DOM (`<html class="dark">`), which is an *external*
 * system. `useSyncExternalStore` is the correct React API for reading external
 * state: it subscribes, reads a snapshot, and works correctly with concurrent
 * rendering — unlike a `useEffect` + `setState`, which the compiler rightly
 * flags as a cascading render.
 *
 * Note what the render output depends on: the icons are chosen by CSS
 * (`dark:` variants) so there is no wrong-glyph flash. The button's accessible
 * name DOES depend on `isDark`, and that is the one documented exception —
 * `suppressHydrationWarning` tells React not to compare this element's
 * attributes, because we know the server necessarily guessed the theme.
 *
 * We also avoid the flash of the wrong theme entirely with the inline script in
 * the root layout; this component only handles switching after load.
 */

function subscribe(callback: () => void) {
  // The only other writer of this state is this component itself, so a simple
  // custom event is enough. If the OS theme changed we would also listen to the
  // matchMedia change event here.
  window.addEventListener("studio-theme-change", callback);
  return () => window.removeEventListener("studio-theme-change", callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  // The server always renders the light-mode markup; the inline layout script
  // corrects the class before first paint.
  return false;
}

export function ThemeToggle({ className }: { className?: string }) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !getSnapshot();
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("studio-theme", next ? "dark" : "light");
    window.dispatchEvent(new Event("studio-theme-change"));
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={className}
      suppressHydrationWarning
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {/* Both icons render; CSS picks one. No layout shift, no wrong-glyph flash. */}
      <Sun className="dark:hidden" aria-hidden="true" />
      <Moon className="hidden dark:block" aria-hidden="true" />
    </Button>
  );
}
