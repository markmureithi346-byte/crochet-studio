import {
  netChangeOfRow,
  resultingCount,
  type PatternStep,
} from "./stitch-math";
import { isStitchCode } from "@/lib/crochet/stitches";

/**
 * PATTERN VALIDATION
 * ==================
 * What this CAN prove, because it is arithmetic:
 *   - a round produces a different count than the pattern expects
 *   - the stitch count changes without the pattern acknowledging it
 *   - increases/decreases do not divide evenly around the round
 *     (the classic "count is right but it looks lumpy" bug)
 *   - a row produces nothing at all
 *   - a round closes the piece (a decrease to zero)
 *
 * What this CANNOT know, and must never pretend to know:
 *   - whether your shaping is aesthetically right
 *   - whether your tension is even
 *   - whether you forgot to fasten off
 *   - whether a decrease "should" happen on this row
 * Those need a human or a photograph. We would rather say nothing than lie.
 */

export interface EngineRow {
  /** Stable id for React keys and for mapping issues back to a row. */
  id?: string;
  label: string;
  steps: PatternStep[];
  /** The count the pattern author expects this row to produce, if declared. */
  expectedStitches?: number | null;
}

export type IssueCode =
  | "COUNT_MISMATCH"
  | "UNEVEN_INCREASE"
  | "UNEVEN_DECREASE"
  | "SILENT_CHANGE"
  | "EMPTY_ROW"
  | "UNKNOWN_STITCH"
  | "JOIN"
  | "UNREALISTIC_COUNT";

export type IssueLevel = "error" | "warning" | "info";

export interface ValidationIssue {
  level: IssueLevel;
  code: IssueCode;
  rowId?: string;
  rowLabel: string;
  message: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  /** Total stitches in the last row — the finished round size. */
  finalCount: number;
  totalRows: number;
}

/** Above this, a pattern is almost certainly a typo rather than a real object. */
const UNREALISTIC_STITCH_COUNT = 5000;

export function validateRows(rows: EngineRow[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  let previousTotal: number | null = null;
  let finalCount = 0;

  const push = (issue: ValidationIssue) => issues.push(issue);

  for (const row of rows) {
    const base = { rowId: row.id, rowLabel: row.label };

    // --- Structural sanity ------------------------------------------------
    if (row.steps.length === 0) {
      push({
        ...base,
        level: "error",
        code: "EMPTY_ROW",
        message: `${row.label} has no instructions yet.`,
      });
      continue;
    }

    const unknownStitch = findUnknownStitch(row.steps);
    if (unknownStitch) {
      push({
        ...base,
        level: "error",
        code: "UNKNOWN_STITCH",
        message: `${row.label} uses "${unknownStitch}", which is not a stitch we know.`,
      });
      continue;
    }

    // The count a crocheter will actually have: previous count adjusted by what
    // this row consumes and produces. For a plain round this equals countRow,
    // but for a shaping round it does not — see resultingCount().
    const total = resultingCount(previousTotal ?? 0, row.steps);
    finalCount = total;

    // --- The headline check ----------------------------------------------
    if (row.expectedStitches != null && row.expectedStitches !== total) {
      push({
        ...base,
        level: "error",
        code: "COUNT_MISMATCH",
        message:
          `${row.label} produces ${total} stitch${total === 1 ? "" : "es"} ` +
          `but ${row.expectedStitches} were expected.`,
      });
    }

    // --- A count changed without being declared --------------------------
    // Not an error: growing or shrinking on purpose is normal. But silently
    // changing the count is the #1 source of "why won't this lie flat?", so we
    // surface it as information.
    if (
      previousTotal !== null &&
      row.expectedStitches == null &&
      total !== previousTotal
    ) {
      push({
        ...base,
        level: "info",
        code: "SILENT_CHANGE",
        message:
          `${row.label} changes the stitch count from ${previousTotal} to ${total} ` +
          `without a declared target.`,
      });
    }

    // --- Even division ---------------------------------------------------
    // If you add 6 stitches to a 36-stitch round, the round divides evenly and
    // the increase sits at a consistent interval. If you add 4 to 36, the
    // spacing is uneven and the fabric puckers.
    const change = netChangeOfRow(row.steps);
    if (change > 0 && previousTotal !== null && previousTotal > 0) {
      const incCount = countStitchesOfType(row.steps, "INC");
      if (incCount > 0 && previousTotal % incCount !== 0) {
        push({
          ...base,
          level: "warning",
          code: "UNEVEN_INCREASE",
          message:
            `${previousTotal} stitches do not divide evenly by ${incCount} increase` +
            `${incCount === 1 ? "" : "s"} — spacing will be uneven.`,
        });
      }
    }
    if (change < 0 && previousTotal !== null && previousTotal > 0) {
      const decCount = countStitchesOfType(row.steps, "DEC");
      if (decCount > 0 && previousTotal % decCount !== 0) {
        push({
          ...base,
          level: "warning",
          code: "UNEVEN_DECREASE",
          message:
            `${previousTotal} stitches do not divide evenly by ${decCount} decrease` +
            `${decCount === 1 ? "" : "s"} — spacing will be uneven.`,
        });
      }
    }

    // --- Joining off ------------------------------------------------------
    // A round "joins" when its net change exactly cancels the count that
    // existed below it, leaving nothing to work into. Note this is NOT the same
    // as `total === 0`: a row of 6 DEC produces 6 new loops, it just consumes
    // the 6 that were there. Testing the resulting count instead would never
    // fire, which is why the condition is written on the sum.
    if (previousTotal !== null && previousTotal + change === 0) {
      push({
        ...base,
        level: "info",
        code: "JOIN",
        message: `${row.label} closes the piece — fasten off and weave in the tail.`,
      });
    }

    if (total > UNREALISTIC_STITCH_COUNT) {
      push({
        ...base,
        level: "warning",
        code: "UNREALISTIC_COUNT",
        message: `${row.label} produces ${total} stitches, which is unusually large. Check the counts.`,
      });
    }

    previousTotal = total;
  }

  return {
    issues,
    errorCount: issues.filter((issue) => issue.level === "error").length,
    warningCount: issues.filter((issue) => issue.level === "warning").length,
    finalCount,
    totalRows: rows.length,
  };
}

// --- helpers ---------------------------------------------------------------

function findUnknownStitch(steps: PatternStep[]): string | null {
  for (const step of steps) {
    if (step.type === "STITCH" && !isStitchCode(step.stitch)) return step.stitch;
    if (step.type === "GROUP") {
      for (const child of step.steps) {
        if (!isStitchCode(child.stitch)) return child.stitch;
      }
    }
  }
  return null;
}

/** How many times a given stitch is executed across a row (groups included). */
export function countStitchesOfType(steps: PatternStep[], code: string): number {
  return steps.reduce((sum, step) => {
    if (step.type === "STITCH") return sum + (step.stitch === code ? step.count : 0);
    const groupCount = step.steps
      .filter((child) => child.stitch === code)
      .reduce((inner, child) => inner + child.count, 0);
    return sum + groupCount * step.count;
  }, 0);
}

//** Re-exported so UI code can reason about a row without a second import. */\nexport { producedByStep, consumedByStep, resultingCount };
