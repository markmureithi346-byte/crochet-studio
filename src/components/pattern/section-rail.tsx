"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * SECTION NAVIGATION — "where am I?"
 * ===================================
 * The single biggest usability problem in a long pattern: you open it, scroll
 * for a while, and lose all sense of where you are.
 *
 * Three cheap signals fix that, and they are the whole point of this component:
 *
 *   1. A sticky position bar that always shows the current section and
 *      "Round 14 of 31" as you scroll (IntersectionObserver, no scroll handler).
 *   2. Section chips you can click to jump straight there.
 *   3. A thin progress rule showing how far through the pattern you are.
 *
 * Implementation note: `IntersectionObserver` watches each section against a
 * root margin that biases the trigger line towards the upper third of the
 * viewport, so the "current" section changes when a heading passes your eye
 * rather than when it hits the very top.
 */
export function SectionRail({
  sections,
  totalRounds,
}: {
  sections: Array< { id: string; name: string; rowCount: number }>;
  totalRounds: number;
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const nodes = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => node !== null);

    if (nodes.length === 0) return;

    observer.current?.disconnect();
    observer.current = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      {
        // "Current" = the section whose heading is in the upper third.
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      },
    );

    for (const node of nodes) observer.current.observe(node);
    return () => observer.current?.disconnect();
  }, [sections]);

  const active = sections.find((section) => section.id === activeId) ?? sections[0];

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }

  // Rounds completed up to and including the active section.
  let roundsBefore = 0;
  for (const section of sections) {
    if (section.id === active?.id) break;
    roundsBefore += section.rowCount;
  }
  const roundInSection = active ? Math.min(active.rowCount, Math.max(1, active.rowCount)) : 0;
  const position = active ? roundsBefore + roundInSection : 0;

  return (
    <div className="sticky top-16 z-20 -mx-4 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      {/* ---- Position: always answers "where am I?" ---- */}
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm">
          <span className="font-medium text-ink">{active?.name ?? "Pattern"}</span>
          <span className="ml-2 font-stitch text-xs text-ink-subtle">
            round {position} of {totalRounds}
          </span>
        </p>
        {sections.length > 1 ? (
          <nav aria-label="Pattern sections" className="flex shrink-0 gap-1">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => jump(section.id)}
                aria-current={section.id === active?.id ? "true" : undefined}
                className={cn(
                  "rounded-md px-2 py-1 text-xs transition-colors",
                  section.id === active?.id
                    ? "bg-surface-3 font-medium text-ink"
                    : "text-ink-subtle hover:bg-surface-3 hover:text-ink-muted",
                )}
              >
                {section.name}
              </button>
            ))}
          </nav>
        ) : null}
      </div>

      {/* ---- How far through you are ---- */}
      <div
        role="progressbar"
        aria-valuenow={position}
        aria-valuemin={0}
        aria-valuemax={totalRounds}
        aria-label="Progress through pattern"
        className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-surface-3"
      >
        <div
          className="h-full rounded-full bg-ink-subtle transition-[width] duration-300"
          style={{ width: `${totalRounds === 0 ? 0 : (position / totalRounds) * 100}%` }}
        />
      </div>
    </div>
  );
}