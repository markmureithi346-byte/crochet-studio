import type { PatternRowStep } from "@prisma/client";
import { isStitchCode, type StitchCode } from "@/lib/crochet/stitches";
import type { PatternStep, StitchStep } from "@/lib/engine/stitch-math";
import type { EngineRow } from "@/lib/engine/validate";

/**
 * THE BOUNDARY BETWEEN THE DATABASE AND THE ENGINE
 * ================================================
 *
 * The database stores steps as flat rows, with nested repeat groups encoded as
 * a JSON string (so the schema stays SQLite/Postgres compatible). The engine
 * wants a nested `PatternStep[]`.
 *
 * Keeping the conversion in ONE place is what stops "the editor says 18 but the
 * dashboard says 12" bugs. Everything that touches pattern data goes through
 * these functions.
 */

export function parseGroupJson(json: string | null): StitchStep[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry): StitchStep[] => {
      if (typeof entry !== "object" || entry === null) return [];
      const record = entry as Record<string, unknown>;
      const stitch = record.stitch;
      const count = record.count;
      if (typeof stitch !== "string" || !isStitchCode(stitch)) return [];
      if (typeof count !== "number" || !Number.isFinite(count) || count < 0) return [];
      return [{ type: "STITCH", stitch: stitch as StitchCode, count }];
    });
  } catch {
    // Corrupt JSON in one row must not take down the whole pattern.
    return [];
  }
}

/** DB rows -> engine steps. */
export function stepsFromDb(steps: PatternRowStep[]): PatternStep[] {
  return steps.map((step) => {
    if (step.type === "GROUP") {
      return {
        type: "GROUP",
        count: step.count,
        steps: parseGroupJson(step.groupJson),
      } satisfies PatternStep;
    }
    if (!step.stitchCode || !isStitchCode(step.stitchCode)) {
      return { type: "STITCH", stitch: "SC", count: step.count } satisfies PatternStep;
    }
    return {
      type: "STITCH",
      stitch: step.stitchCode,
      count: step.count,
      ...(step.note ? { note: step.note } : {}),
    } satisfies PatternStep;
  });
}

/** Engine steps -> the shape Prisma expects for a nested create. */
export function stepsToDb(steps: PatternStep[]) {
  return steps.map((step, sortOrder) => ({
    sortOrder,
    type: step.type,
    stitchCode: step.type === "STITCH" ? step.stitch : null,
    count: step.count,
    groupJson:
      step.type === "GROUP"
        ? JSON.stringify(step.steps.map((child) => ({ stitch: child.stitch, count: child.count })))
        : null,
    note: step.note ?? "",
  }));
}

export interface RowWithSteps {
  id: string;
  label: string;
  sortOrder: number;
  totalStitches: number;
  expectedStitches: number | null;
  notes: string;
  steps: PatternRowStep[];
}

export function rowToEngineRow(row: RowWithSteps): EngineRow {
  return {
    id: row.id,
    label: row.label,
    steps: stepsFromDb(row.steps),
    expectedStitches: row.expectedStitches,
  };
}
