"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Library,
  Settings,
  Shapes,
  NotebookPen,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SIDEBAR NAVIGATION
 * ------------------
 * A Client Component because active-link highlighting depends on the current
 * URL. Everything else in the app shell stays on the server.
 *
 * `usePathname()` returns the *current* path, so we match with `startsWith`
 * rather than equality â€” otherwise `/patterns/abc` would not highlight
 * "Patterns".
 *
 * HONESTY RULE: routes that are not built yet are rendered as disabled items
 * with a "Soon" badge, never as links to empty pages. A button that goes
 * nowhere is worse than no button.
 */
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  available: boolean;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, available: true },
      { href: "/projects", label: "My projects", icon: NotebookPen, available: true },
      { href: "/patterns", label: "Pattern studio", icon: Shapes, available: true },
      { href: "/designer", label: "3D designer", icon: Boxes, available: true },
    ],
  },
  {
    group: "Library",
    items: [
      { href: "/library", label: "Pattern library", icon: Library, available: true },
      { href: "/yarn", label: "Yarn inventory", icon: BarChart3, available: true },
      { href: "/analytics", label: "Analytics", icon: TrendingUp, available: true },
    ],
  },
  {
    group: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, available: true },
    ],
  },
];

export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="space-y-6">
      {NAV.map((section) => (
        <div key={section.group}>
          <p className="px-3 text-[11px] font-medium uppercase tracking-widest text-ink-subtle">
            {section.group}
          </p>
          <ul className="mt-2 space-y-0.5">
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              if (!item.available) {
                return (
                  <li key={item.href}>
                    <span
                      aria-disabled="true"
                      className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-subtle"
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="flex-1">{item.label}</span>
                      <span className="rounded border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                        Soon
                      </span>
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-accent-soft font-medium text-accent"
                        : "text-ink-muted hover:bg-surface-3 hover:text-ink",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
