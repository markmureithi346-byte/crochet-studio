import { describe, expect, it } from "vitest";
import {
  countRow,
  countStep,
  formatRow,
  formatStep,
  netChangeOfRow,
  resultingCount,
  type PatternStep,
} from "@/lib/engine/stitch-math";

/**
 * These tests are the safety net for the whole product.
 *
 * If the arithmetic here is wrong, a real crocheter physically works the wrong
 * number of stitches and wastes yarn. Everything else in the app — validation,
 * progress bars, the 3D height estimate — is downstream of these functions.
 */
describe("stitch mathematics", () => {
  it("counts a plain stitch run", () => {
    const step: PatternStep = { type: "STITCH", stitch: "SC", count: 6 };
    expect(countStep(step)).toBe(6);
  });

  it("counts an increase as two stitches from one", () => {
    const step: PatternStep = { type: "STITCH", stitch: "INC", count: 6 };
    // 6 INC x 2 produced each = 12
    expect(countStep(step)).toBe(12);
  });

  it("counts a repeat group by multiplying the group by the repeat count", () => {
    const step: PatternStep = {
      type: "GROUP",
      count: 6,
      steps: [
        { type: "STITCH", stitch: "SC", count: 1 },
        { type: "STITCH", stitch: "INC", count: 1 },
      ],
    };
    // one group = 1 SC (1) + 1 INC (2) = 3, repeated 6 times = 18
    expect(countStep(step)).toBe(18);
  });

  it("computes net growth across a spiral", () => {
    const round1: PatternStep[] = [{ type: "STITCH", stitch: "CH", count: 6 }];
    const round2: PatternStep[] = [{ type: "STITCH", stitch: "INC", count: 6 }];
    const round3: PatternStep[] = [
      { type: "GROUP", count: 6, steps: [
        { type: "STITCH", stitch: "SC", count: 1 },
        { type: "STITCH", stitch: "INC", count: 1 },
      ] },
    ];

    // Chain of 6, then grow: 6 -> 12 -> 18
    expect(countRow(round1)).toBe(6);
    expect(countRow(round1) + netChangeOfRow(round2)).toBe(12);
    expect(12 + netChangeOfRow(round3)).toBe(18);
  });

  it("reports a decrease as negative growth", () => {
    expect(netChangeOfRow([{ type: "STITCH", stitch: "DEC", count: 3 }])).toBe(-3);
  });

  it("treats a slip stitch as producing nothing", () => {
    expect(countStep({ type: "STITCH", stitch: "SLST", count: 1 })).toBe(0);
  });

  it("formats steps the way a printed pattern does", () => {
    expect(formatStep({ type: "STITCH", stitch: "SC", count: 6 })).toBe("SC × 6");
    expect(formatStep({ type: "STITCH", stitch: "SC", count: 1 })).toBe("SC");
    expect(
      formatStep({
        type: "GROUP",
        count: 6,
        steps: [
          { type: "STITCH", stitch: "SC", count: 1 },
          { type: "STITCH", stitch: "INC", count: 1 },
        ],
      }),
    ).toBe("(SC, INC) × 6");
  });

  it("distinguishes loops produced from stitches resulting", () => {
    // (5 SC + 1 DEC) x 6:
    //   produced = 6 groups x (5 SC x1 + 1 DEC x1)  = 6 x 6 = 36 loops
    //   consumed = 6 groups x (5 SC x1 + 1 DEC x2)  = 6 x 7 = 42 loops
    //   net      = -6, so a 36-stitch round becomes 30.
    // Reporting the produced figure (36) as "the stitch count" would be simply
    // wrong: you would have 30 stitches, not 36.
    const shaping: PatternStep[] = [
      { type: "GROUP", count: 6, steps: [
        { type: "STITCH", stitch: "SC", count: 5 },
        { type: "STITCH", stitch: "DEC", count: 1 },
      ] },
    ];

    expect(countRow(shaping)).toBe(36); // loops produced
    expect(netChangeOfRow(shaping)).toBe(-6); // net change
    expect(resultingCount(36, shaping)).toBe(30); // what you actually have
  });

  it("resultingCount reduces to the produced count for a first round", () => {
    const foundation: PatternStep[] = [{ type: "STITCH", stitch: "CH", count: 6 }];
    expect(resultingCount(0, foundation)).toBe(6);
  });

  it("resultingCount keeps a steady round steady", () => {
    const steady: PatternStep[] = [{ type: "STITCH", stitch: "SC", count: 30 }];
    expect(resultingCount(30, steady)).toBe(30);
  });

  it("a turning chain does not change the stitch count", () => {
    // The turning chain lifts the hook; it is not worked into.
    const row: PatternStep[] = [
      { type: "STITCH", stitch: "TCH", count: 1 },
      { type: "STITCH", stitch: "DC", count: 29 },
    ];
    expect(resultingCount(30, row)).toBe(30);
  });

  it("formats a full row with several steps", () => {
    expect(
      formatRow([
        { type: "STITCH", stitch: "SLST", count: 1 },
        { type: "STITCH", stitch: "SC", count: 6 },
        { type: "GROUP", count: 3, steps: [
          { type: "STITCH", stitch: "DC", count: 1 },
          { type: "STITCH", stitch: "TR", count: 1 },
        ] },
      ]),
    ).toBe("SLST, SC × 6, (DC, TR) × 3");
  });

  it("sums several steps into one row total", () => {
    expect(
      countRow([
        { type: "STITCH", stitch: "CH", count: 4 },
        { type: "STITCH", stitch: "DC", count: 4 },
        { type: "STITCH", stitch: "INC", count: 2 },
      ]),
    ).toBe(4 + 4 + 4);
  });
});
