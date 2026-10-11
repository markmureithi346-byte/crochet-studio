"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AppNav } from "@/components/app/app-nav";
import { signOutAction } from "@/app/(auth)/actions";
import type { CurrentUser } from "@/lib/data/auth";

/**
 * THE APP SHELL'S INTERACTIVE PARTS
 * ---------------------------------
 * Sidebar (desktop) and drawer (mobile) are the same nav; only the container
 * differs. Duplicating the nav markup for mobile would guarantee the two drift
 * apart, so we render one component and switch the wrapper with CSS.
 */
export function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      {/* ---- Desktop sidebar ---- */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Link href="/dashboard" aria-label="Crochet Studio dashboard">
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <AppNav />
        </div>
        <UserPanel user={user} />
      </aside>

      {/* ---- Mobile drawer ---- */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-surface shadow-lift">
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <Logo />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4" onClick={() => setOpen(false)}>
              <AppNav onNavigate={() => setOpen(false)} />
            </div>
            <UserPanel user={user} />
          </div>
        </div>
      ) : null}

      {/* ---- Main column ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur-md sm:px-6 lg:justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
          >
            <Menu aria-hidden="true" />
          </Button>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function UserPanel({ user }: { user: CurrentUser }) {
  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <div className="border-t border-line p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-moss-soft text-xs font-medium text-moss"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{user.name}</p>
          <p className="truncate text-xs text-ink-subtle">{user.email}</p>
        </div>
        <form action={signOutAction}>
          <Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out">
            <LogOut aria-hidden="true" />
          </Button>
        </form>
      </div>
    </div>
  );
}
