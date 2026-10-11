"use client";

import { useState } from "react";
import { Check, ChevronDown, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateRows } from "@/lib/engine/validate";
import { cn } from "@/lib/utils";

/**
 * VALIDATION BAR
 * ==============
 * A single line, not a panel. The rule it follows:
 *
 *   CLEAN  -> one quiet, reassuring line (collapsed)
 *   UNEVEN -> a short line with a count and a disclosure
 *   BROKEN -> the line plus the first few problems, always visible
 *
 * The previous version rendered a full-width coloured block above the pattern
 * even when everything was fine, which is how you make people stop reading the
 * warnings that matter. Silence is the default; it raises its voice only when
 * there is something to say.
 *
 * Severity is never colour alone — every item carries an icon and words.
 */
export function ValidationBar({
  validation,
  onJump,
}: {
  validation: ReturnType<typeof validateRows>;
  onJump: (rowId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { issues, errorCount, warningCount, totalRows } = validation;

  const infoIssues = issues.filter((issue) => issue.level === "info");
  const actionable = issues.filter((issue) => issue.level !== "info");

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success-soft px-3 py-2 text-sm text-success">
        <Check className="size-4 shrink-0" aria-hidden="true" />
        Arithmetic checks out across {totalRows} round{totalRows === 1 ? "" : "s"}.
      </div>
    );
  }

  const tone = errorCount
    ? "border-danger/40 bg-danger-soft"
    : warningCount
      ? "border-warning/40 bg-warning-soft"
      : "border-line bg-surface-2";

  const summary = errorCount
    ? `${errorCount} problem${errorCount === 1 ? "" : "s"} to fix`
    : warningCount
      ? `${warningCount} thing${warningCount === 1 ? "" : "s"} to check`
      : "Some notes on this pattern";

  const Icon = errorCount ? CircleAlert : warningCount ? TriangleAlert : Info;

  return (
    <div className={cn("rounded-lg border", tone)}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            errorCount ? "text-danger" : warningCount ? "text-warning" : "text-ink-muted",
          )}
          aria-hidden="true"
        />
        <span className="flex-1 text-sm font-medium text-ink">{summary}</span>

        {/* Shown inline so a warning you are scrolling past is still legible. */}
        {actionable.slice(0, 1).map((issue, index) => (
          <span
            key={index}
            className="hidden min-w-0 flex-1 truncate text-xs text-ink-muted sm:block"
          >
            {issue.message}
          </span>
        ))}

        <ChevronDown
          className={cn("size-4 shrink-0 text-ink-subtle transition-transform", expanded && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {expanded ? (
        <div className="space-y-2 border-t border-line/60 px-3 py-2.5">
          <ul className="space-y-1.5">
            {actionable.map((issue, index) => (
              <li key={`${issue.code}-${index}`} className="flex items-start gap-2 text-sm">
                {issue.level === "error" ? (
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
                )}
                <span className="text-ink-muted">
                  <span className="font-medium text-ink">{issue.rowLabel}:</span> {issue.message}
                  {issue.rowId && issue.level === "error" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-6 px-1.5 text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        onJump(issue.rowId as string);
                      }}
                    >
                      Show
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          {infoIssues.length > 0 ? (
            <details className="text-xs">
              <summary className="cursor-pointer text-ink-subtle">
                {infoIssues.length} note{infoIssues.length === 1 ? "" : "s"} (nothing is wrong)
              </summary>
              <ul className="mt-1.5 space-y-1 pl-4">
                {infoIssues.map((issue, index) => (
                  <li key={index} className="text-ink-subtle">
                    {issue.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <p className="border-t border-line/60 pt-2 text-xs text-ink-subtle">
            These checks cover arithmetic only. They cannot tell whether your shaping looks right or
            your tension is even.
          </p>
        </div>
      ) : null}
    </div>
  );
}