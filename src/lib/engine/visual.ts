import { STITCH_CATALOG, type StitchCode } from "@/lib/crochet/stitches";
import { resultingCount } from "./stitch-math";
import type { PatternStep } from "./stitch-math";

/**
 * VISUAL STITCH LAYOUT
 * ====================
 * Turns one round of structured instructions into positions that can be drawn.
 *
 * WHY THIS IS WORTH BUILDING
 * -------------------------
 * A written round — "6 INC" — hides the shape. That single instruction is the
 * difference between a circle that lies flat and one that spirals into a cone,
 * and a crocheter cannot see that from text alone. Showing the two resulting
 * stitches side by side makes the geometry obvious.
 *
 * WHAT IT IS NOT
 * --------------
 * This is a SCHEMATIC of where stitches land, not a fabric simulation. It does
 * not model tension, stitch height, or how the fabric drapes. Each cell is one
 * stitch top as counted, placed in the order it is worked.
 *
 * WHY IT IS PURE
 * --------------
 * No React, no DOM, no SVG. It returns coordinates, which means it can be unit
 * tested — "does this round place exactly as many cells as it has stitches?" —
 * and the same function drives the editor, Read mode and any future print view.
 */

export type VisualMode = "circle" | "row";

export type CellKind = "stitch" | "increase" | "decrease";

export interface StitchCell {
  /** Position in the order the round is worked. */
  index: number;
  /** Which stitch this cell represents. */
  code: StitchCode;
  kind: CellKind;
  x: number;
  y: number;
  /** Angle in radians, for circle mode. */
  angle: number;
  /**
   * For an increase, the index of the sibling stitch produced by the same
   * instruction. The renderer draws a connector between them.
   */
  pairedWith?: number;
}

export interface RowVisual {
  mode: VisualMode;
  cells: StitchCell[];
  width: number;
  height: number;
  total: number;
  /** Why we chose this layout — shown in the UI so the choice is never silent. */
  reason: string;
}

export interface VisualInput {
  label: string;
  steps: PatternStep[];
  /** Stitch count carried in from the round above; null for the first. */
  previousTotal: number | null;
}

/**
 * Decides whether a round is worked in the round (a circle) or in rows (a line).
 *
 * HONEST HEURISTIC, NOT A FACT
 * -----------------------------
 * Crochet patterns label these two things differently — "Round 7" means
 * circular, "Row 7" means flat — and that convention is reliable enough in
 * practice. We fall back to structure when the label is unhelpful: a round that
 * increases or decreases the count is almost certainly circular.
 *
 * When this guesses wrong the picture is merely laid out the wrong way round —
 * the stitch counts stay correct — so we say which rule fired instead of
 * pretending we can tell for certain.
 */
/**
 * A first round that makes loops is usually a circular base — but only if it is
 * a BASE-sized one. A 40-stitch foundation chain (a scarf) also makes loops and
 * is emphatically not a circle, so we cap the guess at magic-ring scale.
 */
const BASE_ROUND_MAX = 12;

export function chooseMode(input: VisualInput): { mode: VisualMode; reason: string } {
  const label = input.label.toLowerCase();

  const hasShaping = input.steps.some((step) =>
    step.type === "STITCH"
      ? step.stitch === "INC" || step.stitch === "DEC"
      : step.steps.some((child) => child.stitch === "INC" || child.stitch === "DEC"),
  );

  if (/\bround\b/.test(label)) {
    return { mode: "circle", reason: 'Labelled "Round", so worked in the round.' };
  }
  if (hasShaping) {
    return { mode: "circle", reason: "The stitch count changes, so it is a round." };
  }
  if (input.previousTotal === null) {
    const produced = input.steps.reduce((sum, step) => {
      if (step.type === "STITCH") return sum + step.count * (STITCH_CATALOG[step.stitch].produces || 0);
      return (
        sum +
        step.count *
          step.steps.reduce((inner, child) => inner + child.count * (STITCH_CATALOG[child.stitch].produces || 0), 0)
      );
    }, 0);

    if (produced > 0 && produced <= BASE_ROUND_MAX) {
      return { mode: "circle", reason: "Small first round — a circular base." };
    }
    return {
      mode: "row",
      reason:
        produced > BASE_ROUND_MAX
          ? "Too many stitches for a circular base — drawn flat."
          : "No loops made, so there is nothing to draw.",
    };
  }

  return { mode: "row", reason: 'Labelled "Row", so worked flat.' };
}

const CELL = 26; // px between neighbouring stitch cells
const RING_RADIUS = 62; // px radius of the stitch ring
const ROW_PADDING = 14;

/** Wraps long rows so a 180-stitch scarf row does not render off-screen. */
const PER_LINE = 18;

export function layoutRow(input: VisualInput): RowVisual {
  const { mode, reason } = chooseMode(input);
  const total = resultingCount(input.previousTotal ?? 0, input.steps);

  const plan = planCells(input.steps);
  const cells: StitchCell[] = [];

  for (const item of plan) {
    for (let copy = 0; copy < item.copies; copy += 1) {
      cells.push({
        index: cells.length,
        code: item.code,
        kind: item.kind,
        x: 0,
        y: 0,
        angle: 0,
      });
    }
    // Pairing is written BOTH ways. The renderer iterates cells and draws a
    // connector from each, so it should not have to care which cell came first.
    if (item.copies > 1) {
      const first = cells.length - item.copies;
      const last = cells.length - 1;
      cells[last].pairedWith = first;
      cells[first].pairedWith = last;
    }
  }

  if (cells.length === 0) {
    return { mode, cells: [], width: 0, height: 0, total: 0, reason };
  }

  if (mode === "circle") {
    // The ring is inscribed in the canvas, so the centre is simply size / 2.
    // Consumers (and tests) can rely on that without knowing RING_RADIUS.
    const size = RING_RADIUS * 2 + CELL;
    placeOnCircle(cells, size / 2);
    return { mode, cells, width: size, height: size, total, reason };
  }

  placeInRows(cells);
  const lines = Math.ceil(cells.length / PER_LINE);
  const width = Math.min(cells.length, PER_LINE) * CELL + ROW_PADDING * 2;
  const height = lines * CELL + ROW_PADDING * 2;
  return { mode, cells, width, height, total, reason };
}

// --- placement -------------------------------------------------------------

function placeOnCircle(cells: StitchCell[], centre: number) {
  const count = cells.length;
  cells.forEach((cell, index) => {
    // -90deg so the first stitch sits at the top, where a round usually starts.
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    cell.angle = angle;
    cell.x = centre + Math.cos(angle) * RING_RADIUS;
    cell.y = centre + Math.sin(angle) * RING_RADIUS;
  });
}

function placeInRows(cells: StitchCell[]) {
  cells.forEach((cell, index) => {
    const column = index % PER_LINE;
    const line = Math.floor(index / PER_LINE);
    cell.x = ROW_PADDING + column * CELL + CELL / 2;
    cell.y = ROW_PADDING + line * CELL + CELL / 2;
    cell.angle = 0;
  });
}

// --- planning --------------------------------------------------------------

interface PlannedCell {
  code: StitchCode;
  kind: CellKind;
  /** How many cells this execution occupies (an increase occupies two). */
  copies: number;
}

/**
 * Expands instructions into drawable cells — ONE CELL PER STITCH TOP.
 *
 * Two things this must get right, both of which are easy to skip:
 *
 *   1. `count` has to be expanded. "SC x 6" is six stitches, not one, and
 *      collapsing it would draw a 40-stitch round as a single cell.
 *   2. an INCREASE occupies TWO cells, because it leaves two stitch tops. That
 *      doubling is the entire visual point of an increase.
 *
 * Stitches that produce no loops (slip stitch, turning chain) are dropped: they
 * are worked but they are not loops on the row.
 */
function planCells(steps: PatternStep[]): PlannedCell[] {
  const planned: PlannedCell[] = [];

  const addStitch = (code: StitchCode, times: number) => {
    if (STITCH_CATALOG[code].produces === 0) return;
    for (let index = 0; index < times; index += 1) {
      planned.push({
        code,
        kind: kindOf(code),
        copies: code === "INC" ? 2 : 1,
      });
    }
  };

  for (const step of steps) {
    if (step.type === "STITCH") {
      addStitch(step.stitch, step.count);
      continue;
    }
    for (let repeat = 0; repeat < step.count; repeat += 1) {
      for (const child of step.steps) {
        addStitch(child.stitch, child.count);
      }
    }
  }

  return planned;
}

function kindOf(code: StitchCode): CellKind {
  if (code === "INC") return "increase";
  if (code === "DEC") return "decrease";
  return "stitch";
}