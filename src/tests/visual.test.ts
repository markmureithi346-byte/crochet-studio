import { describe, expect, it } from "vitest";
import { chooseMode, layoutRow, type VisualInput } from "@/lib/engine/visual";
import type { PatternStep } from "@/lib/engine/stitch-math";

const round = (steps: PatternStep[], previousTotal: number | null, label = "Round 3"): VisualInput => ({
  label,
  steps,
  previousTotal,
});

describe("visual stitch layout", () => {
  it("places exactly as many cells as the round leaves", () => {
    // 6 SC from 6: six cells.
    const visual = layoutRow(round([{ type: "STITCH", stitch: "SC", count: 6 }], 6));
    expect(visual.cells).toHaveLength(6);
    expect(visual.total).toBe(6);
  });

  it("draws an increase as two cells, which is the whole point", () => {
    const visual = layoutRow(round([{ type: "STITCH", stitch: "INC", count: 3 }], 6));
    // 3 increases x 2 cells each.
    expect(visual.cells).toHaveLength(6);
    expect(visual.cells.every((cell) => cell.kind === "increase")).toBe(true);
  });

  it("pairs the two cells of an increase so the renderer can connect them", () => {
    const visual = layoutRow(round([{ type: "STITCH", stitch: "INC", count: 2 }], 6));
    expect(visual.cells[0].pairedWith).toBe(1);
    expect(visual.cells[1].pairedWith).toBe(0);
  });

  it("draws a decrease as one cell", () => {
    const visual = layoutRow(round([{ type: "STITCH", stitch: "DEC", count: 3 }], 12));
    expect(visual.cells).toHaveLength(3);
    expect(visual.cells.every((cell) => cell.kind === "decrease")).toBe(true);
  });

  it("expands repeat groups into their constituent stitches", () => {
    const visual = layoutRow(
      round(
        [
          {
            type: "GROUP",
            count: 6,
            steps: [
              { type: "STITCH", stitch: "SC", count: 1 },
              { type: "STITCH", stitch: "INC", count: 1 },
            ],
          },
        ],
        12,
      ),
    );
    // 6 x (1 SC + 1 INC) => 6 single cells + 6 paired cells = 18.
    expect(visual.cells).toHaveLength(18);
    expect(visual.cells.filter((cell) => cell.kind === "stitch")).toHaveLength(6);
    expect(visual.cells.filter((cell) => cell.kind === "increase")).toHaveLength(12);
  });

  it("does not mistake a long foundation chain for a circle", () => {
    // A scarf starts with a 40-stitch chain. That makes loops, but it is flat
    // work — drawing it as a ring would be nonsense.
    const visual = layoutRow(
      round([{ type: "STITCH", stitch: "CH", count: 40 }], null, "Foundation"),
    );
    expect(visual.mode).toBe("row");
  });

  it("treats a small first round as a circular base", () => {
    // 6 stitches into a magic ring IS a circle.
    const visual = layoutRow(round([{ type: "STITCH", stitch: "SC", count: 6 }], null, "Start"));
    expect(visual.mode).toBe("circle");
  });

  it("lays a circle out around a ring", () => {
    const visual = layoutRow(round([{ type: "STITCH", stitch: "SC", count: 12 }], 12));
    expect(visual.mode).toBe("circle");
    expect(visual.width).toBe(visual.height);

    // Every cell must sit the same distance from the centre.
    const centre = visual.width / 2;
    const distances = visual.cells.map(
      (cell) => Math.hypot(cell.x - centre, cell.y - centre),
    );
    const spread = Math.max(...distances) - Math.min(...distances);
    expect(spread).toBeLessThan(0.001);
  });

  it("lays a flat row out left to right", () => {
    const visual = layoutRow(round([{ type: "STITCH", stitch: "DC", count: 20 }], 20, "Row 4"));
    expect(visual.mode).toBe("row");
    const xs = visual.cells.map((cell) => cell.x);
    expect(Math.min(...xs)).toBeLessThan(Math.max(...xs));
    expect(visual.width).toBeLessThan(600);
  });

  it("wraps a very long row instead of running off the page", () => {
    const visual = layoutRow(round([{ type: "STITCH", stitch: "SC", count: 180 }], 180, "Row 9"));
    const ys = visual.cells.map((cell) => cell.y);
    // More than one line was needed.
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(20);
    expect(visual.width).toBeLessThan(560);
  });

  it("always explains which rule chose the layout", () => {
    expect(chooseMode(round([], 6)).reason).toMatch(/./);
    expect(chooseMode(round([], null, "Row 1")).reason).toMatch(/./);
  });

  it("treats a Round label as circular and a Row label as flat", () => {
    expect(chooseMode(round([{ type: "STITCH", stitch: "SC", count: 6 }], 6, "Round 5")).mode).toBe("circle");
    expect(chooseMode(round([{ type: "STITCH", stitch: "SC", count: 6 }], 6, "Row 5")).mode).toBe("row");
  });

  it("falls back to structure when the label is unhelpful", () => {
    // Not labelled "Round", but it increases, so it has to be a round.
    const decision = chooseMode(
      round([{ type: "STITCH", stitch: "INC", count: 6 }], 6, "next bit"),
    );
    expect(decision.mode).toBe("circle");
    expect(decision.reason).toMatch(/count changes/i);
  });

  it("handles an empty round without throwing", () => {
    const visual = layoutRow(round([], 0));
    expect(visual.cells).toHaveLength(0);
    expect(visual.width).toBe(0);
  });
});