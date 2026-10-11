import { STITCH_CATALOG, type StitchCode } from "@/lib/crochet/stitches";

/**
 * STITCH MATHEMATICS
 * ==================
 * The smallest, most important piece of logic in the whole application.
 *
 * A step is either a single stitch run or a repeat group:
 *
 *   { type: "STITCH", stitch: "SC", count: 6 }            ->  "SC x 6"
 *   { type: "GROUP",  steps: [SC, INC], count: 6 }        ->  "(SC, INC) x 6"
 *
 * Because every stitch declares how many loops it consumes and produces (see
 * src/lib/crochet/stitches.ts), all totals are plain integer arithmetic:
 *
 *   produced(step) = count x produces   (per stitch, or summed over a group)
 *   consumed(step) = count x consumes
 *
 * These functions are PURE: no database, no React, no I/O. That is deliberate —
 * it is why they are trivially testable, and why the same function can run on
 * the server during a save, in the browser for live preview, and in a test.
 */

export type StitchStep = {
  type: "STITCH";
  stitch: StitchCode;
  count: number;
  note?: string;
};

export type GroupStep = {
  type: "GROUP";
  steps: StitchStep[];
  count: number;
  note?: string;
};

export type PatternStep = StitchStep | GroupStep;

/**
 * Stitches left in the row after performing this step once.
 *
 * CAREFUL — "produced" is not the same as "the count in the row above".
 * A decrease produces 1 loop but consumes 2, so it REMOVES one from the count.
 * Only `resultingCount()` answers "how many stitches are there now?".
 *
 * Note the `child.count` multiplication inside the group branch: a group of
 * "(5 SC + 1 DEC) x 6" contains SIX stitches per repeat, not two. Forgetting
 * that would silently under-count every shaping round.
 */
export function producedByStep(step: PatternStep): number {
  if (step.type === "STITCH") return step.count * STITCH_CATALOG[step.stitch].produces;
  return (
    step.count *
    step.steps.reduce((sum, child) => sum + child.count * STITCH_CATALOG[child.stitch].produces, 0)
  );
}

/** Stitches taken from the round below when performing this step. */
export function consumedByStep(step: PatternStep): number {
  if (step.type === "STITCH") return step.count * STITCH_CATALOG[step.stitch].consumes;
  return (
    step.count *
    step.steps.reduce((sum, child) => sum + child.count * STITCH_CATALOG[child.stitch].consumes, 0)
  );
}

/**
 * How many stitches this whole step ADDS to the row: "SC x 6" -> 6.
 *
 * This is the produced count, not the resulting count. For rows with decreases
 * the two differ — see `resultingCount`.
 */
export function countStep(step: PatternStep): number {
  return producedByStep(step);
}

/** Net growth of a row: produced minus consumed. Negative means it shrinks. */
export function netChangeOfStep(step: PatternStep): number {
  return producedByStep(step) - consumedByStep(step);
}

/** Total stitches a row produces from its ordered steps. */
export function countRow(steps: PatternStep[]): number {
  return steps.reduce((sum, step) => sum + countStep(step), 0);
}

/** Net growth of a whole row. */
export function netChangeOfRow(steps: PatternStep[]): number {
  return steps.reduce((sum, step) => sum + netChangeOfStep(step), 0);
}

/**
 * HOW MANY STITCHES ARE IN THE ROW AFTER THIS ONE — the number a crocheter
 * actually counts.
 *
 *   resulting = previous - consumed + produced
 *
 * This is the function that matters for progress and for a pattern's stated
 * stitch count. For a round of plain stitches it equals `countRow`, but for a
 * shaping round the two diverge:
 *
 *   6 x (5 SC + 1 DEC)  produces 36 loops, consumes 42,
 *                       so the round goes 36 -> 30.
 *
 * Using `countRow` for that would tell the crocheter they have 36 stitches when
 * they have 30 — and they would be right to be confused.
 *
 * The first round of a pattern has nothing below it, so `previous` is 0 and
 * this reduces to the produced count, which is correct for a foundation.
 */
export function resultingCount(previous: number, steps: PatternStep[]): number {
  return previous + netChangeOfRow(steps);
}

/**
 * Renders a step the way a crocheter would write it.
 *   "SC x 6"      (uses the × character, as printed patterns do)
 *   "(SC, INC) x 6"
 */
export function formatStep(step: PatternStep): string {
  if (step.type === "STITCH") {
    return step.count > 1
      ? `${step.stitch} × ${step.count}`
      : step.stitch;
  }
  const inner = step.steps.map((child) => child.stitch).join(", ");
  return `(${inner}) × ${step.count}`;
}

/** Renders a full row of steps: "SC × 6, (DC, TR) × 3". */
export function formatRow(steps: PatternStep[]): string {
  return steps.map(formatStep).join(", ");
}
