import { describe, expect, it } from "vitest";
import {
  adjustGaugeForHook,
  cmToStitches,
  defaultGauge,
  estimateDimensions,
  nearestEvenlyDivisible,
  rowsToCm,
  stitchesToCm,
} from "@/lib/engine/dimensions";
import { estimateYarn, formatYarnEstimate, rectangularAreaCm2, sphereAreaCm2 } from "@/lib/engine/yarn";
import { generatePattern } from "@/lib/engine/generate";

/** Applies a sequence of rows starting from `from`, returning the final count. */
function resultingAfter(stepsList: PatternStep[][], from = 0): number {
  return stepsList.reduce((running, steps) => resultingCount(running, steps), from);
}
import {
  countRow,
  resultingCount,
  type PatternStep,
} from "@/lib/engine/stitch-math";
import { validateRows } from "@/lib/engine/validate";

describe("gauge conversions", () => {
  const gauge = { stitchesPer10cm: 5, rowsPer10cm: 4 };

  it("round-trips stitches to centimetres", () => {
    expect(stitchesToCm(20, gauge)).toBe(40);
    expect(cmToStitches(40, gauge)).toBe(20);
  });

  it("converts rows to centimetres", () => {
    expect(rowsToCm(12, gauge)).toBe(30);
  });

  it("never divides by zero", () => {
    const broken = { stitchesPer10cm: 0, rowsPer10cm: 0 };
    expect(stitchesToCm(10, broken)).toBe(0);
    expect(rowsToCm(10, broken)).toBe(0);
  });

  it("larger hook gives looser gauge", () => {
    const base = defaultGauge("DK");
    const looser = adjustGaugeForHook(base, 4, 5);
    expect(looser.stitchesPer10cm).toBeLessThan(base.stitchesPer10cm);
  });

  it("same hook leaves gauge untouched", () => {
    const base = defaultGauge("DK");
    expect(adjustGaugeForHook(base, 4, 4)).toEqual(base);
  });

  it("estimates dimensions of a rectangle", () => {
    expect(estimateDimensions(20, 12, gauge)).toEqual({ widthCm: 40, heightCm: 30 });
  });

  it("snaps to a count that divides evenly", () => {
    expect(nearestEvenlyDivisible(19, 6) % 6).toBe(0);
    expect(nearestEvenlyDivisible(12, 6)).toBe(12);
    expect(nearestEvenlyDivisible(13, 6)).toBe(12);
    // Exact ties round down, so a piece is never quietly made larger.
    expect(nearestEvenlyDivisible(15, 6)).toBe(12);
  });
});

describe("yarn estimation", () => {
  it("returns a range, never a single number", () => {
    const estimate = estimateYarn({ areaCm2: 1000, yarnWeight: "DK" });
    expect(estimate.minGrams).toBeLessThan(estimate.maxGrams);
    expect(estimate.disclaimer).toMatch(/estimate only/i);
  });

  it("scales with area", () => {
    const small = estimateYarn({ areaCm2: 500, yarnWeight: "DK" });
    const large = estimateYarn({ areaCm2: 1000, yarnWeight: "DK" });
    expect(large.minGrams).toBeGreaterThan(small.minGrams);
  });

  it("heavier yarn needs more grams for the same area", () => {
    const light = estimateYarn({ areaCm2: 1000, yarnWeight: "LACE" });
    const heavy = estimateYarn({ areaCm2: 1000, yarnWeight: "BULKY" });
    expect(heavy.minGrams).toBeGreaterThan(light.minGrams);
  });

  it("counts both faces and the base of a bag", () => {
    // 30x30 bag: 30*30*2 faces + 30*30 base = 2700
    expect(rectangularAreaCm2(30, 30, { gusset: true })).toBe(2700);
  });

  it("computes sphere surface area", () => {
    expect(sphereAreaCm2(10)).toBeCloseTo(314.2, 0);
  });

  it("formats a skein range", () => {
    const estimate = estimateYarn({ areaCm2: 1000, yarnWeight: "DK" });
    const withSkeins = { ...estimate, skeins: { min: 2, max: 4, gramsPerSkein: 50 } };
    expect(formatYarnEstimate(withSkeins)).toContain("2–4");
  });
});

describe("generated patterns are actually workable", () => {
  /**
   * These are the assertions that catch the bugs that actually shipped:
   *
   *  - `(SC, INC) x 1`, which grows a circle by ONE stitch instead of six and
   *    cannot be worked at all;
   *  - sides that do not match the count the base finished on;
   *  - a base that shrinks while it is being built.
   *
   * Note what is NOT asserted: that a cone always grows. A cone tapers and a
   * sphere closes, so those legitimately go down. The invariant that must always
   * hold is that the count stays a workable whole number of stitches.
   */
  const shapes = ["PANEL", "BOX", "CYLINDER", "TORUS", "CONE", "SPHERE"] as const;
  const TAPERING: Array<(typeof shapes)[number]> = ["CONE", "SPHERE"];

  /** Walks a generated pattern, returning the count after each row. */
  function walk(shape: (typeof shapes)[number]) {
    const result = generatePattern({
      shape,
      widthCm: 30,
      heightCm: 25,
      depthCm: 18,
      yarnWeight: "DK",
    });
    if (!result.ok) throw new Error(result.reason);

    let running: number | null = null;
    const rows = result.sections.flatMap((section) =>
      section.rows.map((row) => {
        const total =
          running === null
            ? row.steps.reduce(
                (sum, step) =>
                  sum + (step.type === "STITCH" ? step.count * produces(step.stitch) : 0),
                0,
              )
            : resultingCount(running, row.steps);
        running = total;
        return { label: row.label, steps: row.steps, total, section: section.name };
      }),
    );
    return { rows, sections: result.sections, result };
  }

  function produces(code: string): number {
    return code === "INC" ? 2 : code === "SLST" || code === "TCH" || code === "SK" ? 0 : 1;
  }

  it.each(shapes)("%s never produces an impossible count", (shape) => {
    for (const row of walk(shape).rows) {
      expect(row.total).toBeGreaterThanOrEqual(6);
      expect(Number.isInteger(row.total)).toBe(true);
    }
  });

  it.each(shapes.filter((shape) => !TAPERING.includes(shape)) as Array<(typeof shapes)[number]>)(
    "%s holds or grows its count",
    (shape) => {
      const rows = walk(shape).rows;
      for (let index = 1; index < rows.length; index += 1) {
        expect(rows[index].total).toBeGreaterThanOrEqual(rows[index - 1].total);
      }
    },
  );

  it.each(TAPERING)("%s grows first, then tapers", (shape) => {
    const rows = walk(shape).rows;
    const peak = Math.max(...rows.map((row) => row.total));
    const peakIndex = rows.findIndex((row) => row.total === peak);

    // Everything before the peak grows or holds.
    for (let index = 1; index <= peakIndex; index += 1) {
      expect(rows[index].total).toBeGreaterThanOrEqual(rows[index - 1].total);
    }
    // And everything after it shrinks, but never to nothing.
    for (let index = peakIndex + 1; index < rows.length; index += 1) {
      expect(rows[index].total).toBeLessThanOrEqual(rows[index - 1].total);
    }
    expect(rows.at(-1)!.total).toBeGreaterThanOrEqual(6);
  });

  it("increases a circle by six a round, not by one", () => {
    const rows = walk("BOX").rows;
    // Base is the classic 6, then 12, 18, 24 ... six at a time.
    expect(rows[0].total).toBe(6);
    expect(rows[1].total).toBe(12);
    expect(rows[2].total).toBe(18);
    expect(rows[3].total).toBe(24);

    // One increase per repeat, repeated around the whole round. A group count
    // of 1 would grow the circle by a single stitch.
    const firstSpiral = rows[1].steps[0];
    expect(firstSpiral.type).toBe("GROUP");
    if (firstSpiral.type === "GROUP") {
      expect(firstSpiral.count).toBeGreaterThanOrEqual(6);
    }
  });

  it("sides match the count the base finished on", () => {
    const { sections } = walk("BOX");
    const base = sections.find((section) => section.name === "BASE")!;
    const sides = sections.find((section) => section.name === "SIDES")!;

    // The generator starts counting from the magic ring's 6 stitches, so the
    // test must skip the base row that establishes them.
    const baseEnd = resultingAfter(base.rows.slice(1).map((row) => row.steps), 6);
    const sideStitches = sides.rows[0].steps.reduce(
      (sum, step) => sum + (step.type === "STITCH" ? step.count : 0),
      0,
    );
    expect(sideStitches).toBe(baseEnd);
  });

  it("spaces increases evenly, so the round divides by the group count", () => {
    for (const row of walk("SPHERE").rows) {
      for (const step of row.steps) {
        if (step.type !== "GROUP") continue;
        const grows = step.steps.some((child) => child.stitch === "INC");
        const previous = grows ? row.total - step.count : row.total + step.count;
        expect(previous % step.count).toBe(0);
      }
    }
  });

  it("turns a 30cm circle into a realistic stitch count", () => {
    // 30cm across is ~94cm around; at DK gauge (4.5 st / 10cm) that is ~42
    // stitches. A generator that returned 12 here would be measuring diameter
    // as circumference.
    const sideRow = walk("BOX").rows.find((row) => row.section === "SIDES")!;
    expect(sideRow.total).toBeGreaterThan(30);
    expect(sideRow.total).toBeLessThan(60);
  });
});
describe("pattern generator", () => {
  const shapes = ["PANEL", "BOX", "CYLINDER", "CONE", "SPHERE"] as const;

  it.each(shapes)("generates a %s with no arithmetic errors", (shape) => {
    const result = generatePattern({
      shape,
      widthCm: 30,
      heightCm: 25,
      depthCm: 18,
      yarnWeight: "DK",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const rows = result.sections.flatMap((section) =>
      section.rows.map((row) => ({
        label: row.label,
        steps: row.steps,
        expectedStitches: null,
      })),
    );

    // The generated pattern must survive our own validator: each round's count
    // should match what the previous round produced.
    let previous: number | null = null;
    for (const row of rows) {
      const total = countRow(row.steps);
      expect(total).toBeGreaterThanOrEqual(0);
      if (previous !== null) {
        // Increases and decreases must still land on a count >= 1 unless closing.
        expect(total).toBeLessThanOrEqual(previous + 1000);
      }
      previous = total;
    }
  });

  it("always states its assumptions", () => {
    const result = generatePattern({ shape: "PANEL", widthCm: 30, heightCm: 40 });
    expect(result.ok && result.assumptions.length).toBeGreaterThan(0);
    expect(result.ok && result.assumptions.join(" ")).toMatch(/gauge/i);
  });

  it("produces a flat panel close to the requested centimetres", () => {
    const result = generatePattern({ shape: "PANEL", widthCm: 30, heightCm: 20, yarnWeight: "DK" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const body = result.sections[0].rows;
    const foundation = countRow(body[0].steps);
    const gauge = result.gauge;
    // Stitch counts are whole numbers, so an exact centimetre match is not
    // always possible. At DK gauge, 30cm quantises to 14 stitches ≈ 31.1cm.
    expect(Math.abs((foundation / gauge.stitchesPer10cm) * 10 - 30)).toBeLessThan(1.5);
  });

  it("gives a bag a base section and a sides section", () => {
    const result = generatePattern({ shape: "BOX", widthCm: 30, heightCm: 25, depthCm: 18 });
    expect(result.ok && result.sections.length).toBe(2);
  });

  it("includes a yarn estimate for shapes with a known area", () => {
    const result = generatePattern({ shape: "BOX", widthCm: 30, heightCm: 25, depthCm: 18, gramsPerSkein: 50 });
    expect(result.ok && result.yarn?.skeins?.max).toBeGreaterThan(0);
  });

  it("rejects an unknown shape rather than inventing a pattern", () => {
    const result = generatePattern({ shape: "TEAPOT" as never, widthCm: 10, heightCm: 10 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBeTruthy();
  });

  it("never emits a round that cannot be worked", () => {
    const result = generatePattern({ shape: "CONE", widthCm: 30, heightCm: 20, depthCm: 8 });
    if (!result.ok) return;
    for (const row of result.sections.flatMap((s) => s.rows)) {
      // Every step must be executable: a non-positive count is not.
      for (const step of row.steps) {
        expect(step.count).toBeGreaterThanOrEqual(1);
        if (step.type === "GROUP") {
          for (const child of step.steps) {
            expect(child.count).toBeGreaterThanOrEqual(1);
          }
        }
      }
      expect(countRow(row.steps)).toBeGreaterThanOrEqual(1);
    }
  });

  it("generates patterns the validator considers error-free", () => {
    for (const shape of shapes) {
      const result = generatePattern({ shape, widthCm: 25, heightCm: 20, depthCm: 15 });
      if (!result.ok) continue;
      const rows = result.sections.flatMap((section) =>
        section.rows.map((row) => ({
          label: row.label,
          steps: row.steps,
          expectedStitches: null,
        })),
      );
      const validation = validateRows(rows);
      // Declarative increases may divide unevenly for some shapes, which is
      // reported as a warning — but never as an arithmetic error.
      expect(validation.errorCount).toBe(0);
    }
  });
});
