"use client";

import { ChevronDown, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { REPEATABLE_STITCHES, type StitchCode } from "@/lib/crochet/stitches";
import {
  countRow,
  resultingCount,
  type GroupStep,
  type PatternStep,
  type StitchStep,
} from "@/lib/engine/stitch-math";
import { cn } from "@/lib/utils";

/**
 * ONE ROUND
 * ==========
 * Deliberately NOT a card inside a card. A round is a line of work, so it looks
 * like a line of work: a label, the stitch notation, and a count. Everything
 * secondary (notes, editing) stays hidden until asked for.
 *
 * WHY THAT MATTERS
 * ----------------
 * The previous version wrapped every round in its own bordered card, inside a
 * card per section. With 40 rounds that became 40 boxes in a box — heavy,
 * visually noisy, and impossible to scan for the round you were on. A flat row
 * with a hairline separator lets a whole section read as a single document.
 *
 * The count shown is the count the crocheter will HAVE (resultingCount), not
 * the raw produced figure — for a shaping round those differ.
 */
export function RoundRow({
  label,
  steps,
  notes,
  previousTotal,
  expanded,
  issueLevel,
  isFirst,
  isLast,
  onToggle,
  onChange,
  onDelete,
  onDuplicate,
}: {
  label: string;
  steps: PatternStep[];
  notes: string;
  /** Stitch count carried in from the round above, or null for the first. */
  previousTotal: number | null;
  expanded: boolean;
  issueLevel?: "error" | "warning";
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onChange: (patch: { label?: string; steps?: PatternStep[]; notes?: string }) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const total = previousTotal === null ? countRow(steps) : resultingCount(previousTotal, steps);
  const delta = previousTotal === null ? 0 : total - previousTotal;

  return (
    <div
      className={cn(
        "group relative border-b border-line transition-colors last:border-b-0",
        expanded && "bg-surface-2",
        issueLevel === "error" && "bg-danger-soft/40",
        issueLevel === "warning" && !expanded && "bg-warning-soft/30",
      )}
    >
      {/* ---- Summary line: always visible, always the same shape ---- */}
      <div className="flex items-center gap-2 px-1 py-1.5 sm:px-2">
        {/* Left gutter marks the first round of a section, like a print pattern. */}
        <span
          aria-hidden="true"
          className={cn(
            "w-0.5 shrink-0 self-stretch rounded-full",
            isFirst ? "bg-ink-subtle" : "bg-transparent",
          )}
        />

        <Input
          value={label}
          onChange={(event) => onChange({ label: event.target.value })}
          aria-label={`Round label${isFirst ? " (first round)" : ""}`}
          className="h-8 w-24 shrink-0 border-transparent bg-transparent px-1.5 font-stitch text-xs text-ink-muted hover:border-line"
        />

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {steps.length === 0 ? (
            <span className="text-xs text-ink-subtle italic">no instructions yet</span>
          ) : (
            steps.map((step, index) => (
              <StepEditor
                key={index}
                step={step}
                onChange={(next) => {
                  const copy = [...steps];
                  copy[index] = next;
                  onChange({ steps: copy });
                }}
                onDelete={() => onChange({ steps: steps.filter((_, i) => i !== index) })}
              />
            ))
          )}
          {steps.length === 0 ? (
            <AddStepButton
              onClick={() => onChange({ steps: [{ type: "STITCH", stitch: "SC", count: 1 }] })}
              label="Add a stitch"
            />
          ) : null}
        </div>

        {/* The count, and how it moved. */}
        <span className="flex shrink-0 items-baseline gap-1">
          <span className="font-stitch text-sm font-medium text-ink">{total}</span>
          {delta !== 0 ? (
            <span
              className={cn(
                "font-stitch text-[11px]",
                delta > 0 ? "text-moss" : "text-ink-subtle",
              )}
              title={`${delta > 0 ? "+" : ""}${delta} from the previous round`}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          ) : null}
        </span>

        {/* Row actions appear on hover/focus, but stay reachable by keyboard. */}
        <div className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onDuplicate}
            aria-label={`Duplicate ${label}`}
            title="Duplicate round"
          >
            <Copy aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} details for ${label}`}
            title="Round notes"
          >
            <ChevronDown
              className={cn("transition-transform", expanded && "rotate-180")}
              aria-hidden="true"
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-ink-subtle hover:text-danger"
            onClick={onDelete}
            disabled={isLast}
            aria-label={`Delete ${label}`}
            title={isLast ? "A pattern needs at least one round" : "Delete round"}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* ---- Expanded detail: notes, only when asked for ---- */}
      {expanded ? (
        <div className="space-y-2 px-2 pb-3 pl-8">
          <label className="block">
            <span className="text-xs font-medium text-ink-muted">Note for this round</span>
            <Textarea
              value={notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              placeholder="e.g. Start stuffing here. Keep tension firm."
              className="mt-1 min-h-16 text-sm"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

/** A single editable step: [SC ▾] [× 6]. */
function StepEditor({
  step,
  onChange,
  onDelete,
}: {
  step: PatternStep;
  onChange: (step: PatternStep) => void;
  onDelete: () => void;
}) {
  if (step.type === "GROUP") {
    const group = step as GroupStep;
    return (
      <span className="flex items-center gap-1 rounded-md border border-dashed border-line-strong bg-surface px-1 py-0.5">
        <span className="font-stitch text-[11px] text-ink-subline">repeat</span>

        {group.steps.map((child, childIndex) => (
          <span key={childIndex} className="flex items-center gap-0.5">
            <Select
              aria-label={`Stitch ${childIndex + 1} in the repeat`}
              value={child.stitch}
              onChange={(event) => {
                const copy = [...group.steps];
                copy[childIndex] = { ...child, stitch: event.target.value as StitchCode };
                onChange({ ...group, steps: copy });
              }}
              className="h-7 w-[4.5rem] border-transparent bg-transparent px-1 font-stitch text-xs"
            >
              {REPEATABLE_STITCHES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
            {group.steps.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  onChange({ ...group, steps: group.steps.filter((_, i) => i !== childIndex) })
                }
                aria-label={`Remove stitch ${childIndex + 1} from the repeat`}
                className="rounded px-1 font-stitch text-xs text-ink-subtle hover:text-danger"
              >
                &times;
              </button>
            ) : null}
          </span>
        ))}

        <button
          type="button"
          onClick={() =>
            onChange({
              ...group,
              steps: [...group.steps, { type: "STITCH", stitch: "SC", count: 1 }],
            })
          }
          aria-label="Add a stitch to the repeat"
          className="rounded px-1 font-stitch text-xs text-ink-subtle hover:text-ink"
        >
          +
        </button>

        <span className="font-stitch text-[11px] text-ink-subline">&times;</span>
        <input
          type="number"
          min={1}
          max={500}
          aria-label="How many times to repeat"
          value={group.count}
          onChange={(event) =>
            onChange({ ...group, count: Math.max(1, Number(event.target.value) || 1) })
          }
          className="h-7 w-12 rounded border border-transparent bg-transparent px-1 text-center font-stitch text-xs"
        />

        <button
          type="button"
          onClick={onDelete}
          aria-label="Remove the repeat group"
          className="rounded px-1 font-stitch text-xs text-ink-subline hover:text-danger"
        >
          &times;
        </button>
      </span>
    );
  }

  const single = step as StitchStep;
  return (
    <span className="flex items-center gap-0.5 rounded-md border border-line bg-surface px-1 py-0.5">
      <Select
        aria-label="Stitch"
        value={single.stitch}
        onChange={(event) => onChange({ ...single, stitch: event.target.value as StitchCode })}
        className="h-7 w-[5.5rem] border-transparent bg-transparent px-1 font-stitch text-xs font-medium"
      >
        {REPEATABLE_STITCHES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </Select>
      <span className="font-stitch text-[11px] text-ink-subline">&times;</span>
      <input
        type="number"
        min={1}
        max={1000}
        aria-label={`How many ${single.stitch}`}
        value={single.count}
        onChange={(event) =>
          onChange({ ...single, count: Math.max(1, Number(event.target.value) || 1) })
        }
        className="h-7 w-12 rounded border border-transparent bg-transparent px-1 text-center font-stitch text-xs"
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Remove ${single.stitch}`}
        className="rounded px-1 font-stitch text-xs text-ink-subline hover:text-danger"
      >
        &times;
      </button>
    </span>
  );
}

export function AddStepButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="h-7 text-xs">
      + {label}
    </Button>
  );
}