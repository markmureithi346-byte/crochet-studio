"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronLeft, Moon, PartyPopper, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { completeRowAction, setProjectStatusAction, toggleSessionAction, uncompleteRowAction } from "@/app/(app)/projects/actions";
import { countRow, type PatternStep } from "@/lib/engine/stitch-math";

/**
 * CROCHET MODE
 * ============
 * The screen a crocheter actually looks at while their hands are busy. Every
 * design decision here comes from that fact:
 *
 *   - ONE instruction at a time, in very large type. You read it, work it, tap.
 *   - The complete button is at the BOTTOM, where the thumb rests.
 *   - Going backwards is one tap. There is no confirmation, no "are you sure".
 *     Friction here costs people their place; the data is already saved.
 *   - Dark mode is offered explicitly, because crochet at night is common.
 *   - No navigation away from the current round: the back arrow leaves the mode
 *     entirely rather than stepping through rows, so a stray tap cannot skip a
 *     round.
 *
 * The round text comes straight from the pattern's structured steps via
 * `countRow`, so the number shown is computed, never typed.
 */

export interface CrochetRowView {
  id: string;
  label: string;
  sectionName: string;
  totalStitches: number;
  notes: string;
  steps: PatternStep[];
  completed: boolean;
}

export function CrochetMode({
  projectId,
  projectName,
  rows,
}: {
  projectId: string;
  projectName: string;
  rows: CrochetRowView[];
}) {
  const [dark, setDark] = useState(false);
  const [index, setIndex] = useState(() => {
    const firstIncomplete = rows.findIndex((row) => !row.completed);
    return firstIncomplete === -1 ? Math.max(0, rows.length - 1) : firstIncomplete;
  });
  const [celebrated, setCelebrated] = useState(false);
  const [isPending, startTransition] = useTransition();

  const total = rows.length;
  const completed = rows.filter((row) => row.completed).length;
  const current = rows[Math.min(index, Math.max(0, total - 1))];
  const remaining = rows.length - completed;

  const stitchesHere = useMemo(() => (current ? countRow(current.steps) : 0), [current]);

  function toggleComplete() {
    if (!current) return;
    const wasCompleted = current.completed;

    startTransition(async () => {
      if (wasCompleted) {
        await uncompleteRowAction({ projectId, rowId: current.id });
      } else {
        await completeRowAction({ projectId, rowId: current.id });
      }

      // Move forward only when advancing. Undoing must not move us anywhere,
      // otherwise correcting a mistake costs two extra taps.
      if (!wasCompleted && index < total - 1) {
        setIndex(index + 1);
      }
      if (!wasCompleted && remaining - 1 === 0) {
        setCelebrated(true);
        startTransition(async () => {
          await setProjectStatusAction({ projectId, status: "COMPLETED" });
        });
      }
    });
  }

  function toggleTimer() {
    startTransition(async () => {
      await toggleSessionAction({ projectId });
    });
  }

  if (celebrated || (total > 0 && completed === total)) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
          <PartyPopper className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink">Project complete</h1>
        <p className="mt-2 text-ink-muted">
          {projectName} — {completed} of {total} rounds.
        </p>
        <div className="mt-8 flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href={`/projects/${projectId}`}>View finished project</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/projects">Start another project</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={dark ? "dark" : undefined}>
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg flex-col px-4 py-6">
        {/* ---- Header: minimal, everything else is distraction ---- */}
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft aria-hidden="true" />
              Exit
            </Link>
          </Button>
          <p className="truncate text-sm text-ink-muted">{projectName}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark((value) => !value)}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={dark}
          >
            <Moon aria-hidden="true" />
          </Button>
        </div>

        {/* ---- Progress ---- */}
        <div className="mt-5">
          <Progress value={completed} max={total} label={`${completed} of ${total} rounds done`} />
        </div>

        {/* ---- The round ---- */}
        {current ? (
          <>
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <Badge tone="neutral" className="mb-4">
                {current.sectionName}
              </Badge>

              <p className="font-stitch text-sm uppercase tracking-widest text-ink-subtle">
                {current.label}
              </p>

              <p className="mt-6 font-stitch text-4xl leading-tight font-semibold text-ink sm:text-5xl">
                {formatInstructions(current.steps)}
              </p>

              <p className="mt-6 text-lg text-ink-muted">
                {stitchesHere} stitch{stitchesHere === 1 ? "" : "es"}
              </p>

              {current.notes ? (
                <p className="mt-4 max-w-sm text-sm text-ink-muted">{current.notes}</p>
              ) : null}
            </div>

            {/* ---- Controls: the only thing you need to touch ---- */}
            <div className="space-y-3">
              <Button
                size="lg"
                block
                className="h-16 text-lg"
                onClick={toggleComplete}
                disabled={isPending}
                variant={current.completed ? "secondary" : "primary"}
              >
                {current.completed ? (
                  <>
                    <ChevronLeft aria-hidden="true" />
                    Completed — go back
                  </>
                ) : (
                  <>
                    <Check aria-hidden="true" />
                    Complete round
                  </>
                )}
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  disabled={index === 0 || isPending}
                  onClick={() => setIndex(index - 1)}
                >
                  <ChevronLeft aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  disabled={index >= total - 1 || isPending}
                  onClick={() => setIndex(index + 1)}
                >
                  Next
                  <ChevronLeft className="rotate-180" aria-hidden="true" />
                </Button>
              </div>

              <Button variant="ghost" size="sm" block onClick={toggleTimer} disabled={isPending}>
                <Play aria-hidden="true" />
                Toggle timer
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-ink-muted">
            This project has no rounds yet.
          </div>
        )}
      </div>
    </div>
  );
}

/** Big, unambiguous round text: "SC × 8" or "(SC, INC) × 6". */
export function formatInstructions(steps: PatternStep[]): string {
  if (steps.length === 0) return "—";
  return steps
    .map((step) => {
      if (step.type === "STITCH") {
        return step.count > 1 ? `${step.stitch} × ${step.count}` : step.stitch;
      }
      const inner = step.steps.map((child) => child.stitch).join(", ");
      return `(${inner}) × ${step.count}`;
    })
    .join("   ");
}

/** Small status pill used on project cards. */
export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: "success" | "warning" | "neutral" }> = {
    COMPLETED: { label: "Finished", tone: "success" },
    PAUSED: { label: "Paused", tone: "warning" },
    ACTIVE: { label: "In progress", tone: "neutral" },
  };
  const entry = map[status] ?? map.ACTIVE;
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

