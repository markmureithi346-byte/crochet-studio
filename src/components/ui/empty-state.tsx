import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * EMPTY STATE
 * -----------
 * An empty screen is a bug if it is blank. This component gives every empty
 * collection one clear next action, an explanation of what will appear there,
 * and a little visual anchor so the page still looks designed.
 *
 * It is used everywhere: no projects, no patterns, no yarn, no photos, no search
 * results. One component, consistent tone of voice.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface-2 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div
          className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}

      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
