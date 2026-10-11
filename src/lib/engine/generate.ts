import {
  countRow,
  resultingCount,
  type PatternStep,
  type StitchStep,
} from "./stitch-math";
import {
  adjustGaugeForHook,
  cmToStitches,
  defaultGauge,
  nearestEvenlyDivisible,
  TYPICAL_HOOK_MM,
  type Gauge,
} from "./dimensions";
import {
  cylinderAreaCm2,
  estimateYarn,
  rectangularAreaCm2,
  sphereAreaCm2,
  withSkeinSize,
  type YarnEstimate,
} from "./yarn";
import type { StitchCode } from "@/lib/crochet/stitches";
import { SHAPES, type ShapeType } from "@/lib/validation/domain";

/**
 * PATTERN GENERATOR
 * =================
 * THE HONEST SCOPE OF THIS FILE
 *
 * This generates patterns for a small set of *standard constructions* that
 * crochet patterns genuinely use:
 *
 *   flat rectangle .... scarves, blankets, panels, simple bags
 *   circle base + sides  round-bottomed bags, baskets
 *   cylinder ......... cups, hats without a brim, bowls
 *   torus ............ rings, bag bases
 *   cone / taper .... hats, planters, widening or narrowing tubes
 *   sphere ........... amigurumi heads and bodies
 *
 * It CANNOT generate shaped garments, motifs that need sewing, complex colour
 * work, or anything requiring judgment about aesthetics. For an unsupported
 * request it returns `{ ok: false, reason }` rather than inventing a pattern.
 * A generator that quietly produces nonsense is worse than no generator.
 *
 * Every result carries `assumptions` — the things the user must verify.
 */

export interface GeneratorInput {
  shape: ShapeType;
  widthCm: number;
  heightCm: number;
  depthCm?: number;
  stitch?: StitchCode;
  yarnWeight?: string;
  hookMm?: number;
  gramsPerSkein?: number;
}

export interface GeneratedRow {
  label: string;
  steps: PatternStep[];
  notes?: string;
}

export interface GeneratedSection {
  name: string;
  rows: GeneratedRow[];
}

export type GenerationResult =
  | {
      ok: true;
      shape: ShapeType;
      sections: GeneratedSection[];
      gauge: Gauge;
      assumptions: string[];
      warnings: string[];
      yarn?: YarnEstimate;
      totalRows: number;
      finalCount: number;
    }
  | { ok: false; shape: ShapeType; reason: string; suggestion?: string };

/** Stitch used when the user does not choose one. */
const DEFAULT_STITCH: StitchCode = "SC";

export function generatePattern(input: GeneratorInput): GenerationResult {
  const shape = input.shape;

  // An unsupported shape must fail loudly. Falling back to a different shape
  // would hand the user a pattern for an object they did not ask for, which is
  // the worst possible failure mode for a generator.
  if (!SHAPES.includes(shape)) {
    return {
      ok: false,
      shape,
      reason: `"${String(shape)}" is not a shape this generator understands.`,
      suggestion:
        "Supported today: flat panel, bag with circular base, cylinder, ring, cone and sphere.",
    };
  }

  const stitch = input.stitch ?? DEFAULT_STITCH;
  const yarnWeight = input.yarnWeight ?? "DK";
  const baseGauge = defaultGauge(yarnWeight);
  const hookMm = input.hookMm ?? TYPICAL_HOOK_MM[yarnWeight] ?? 4;
  const gauge = adjustGaugeForHook(baseGauge, TYPICAL_HOOK_MM[yarnWeight] ?? 4, hookMm);

  const assumptions: string[] = [];
  const warnings: string[] = [];

  assumptions.push(
    `Gauge assumed ${gauge.stitchesPer10cm} st and ${gauge.rowsPer10cm} rows per 10cm for ${yarnWeight.toLowerCase()} weight with a ${hookMm}mm hook.`,
  );
  assumptions.push("Gauge is the biggest source of error. Measure a swatch and adjust.");

  const result = (() => {
    switch (shape) {
      case "PANEL":
        return flatRectangle(input, stitch, gauge, assumptions, warnings);
      case "BOX":
        return bagWithBase(input, stitch, gauge, assumptions, warnings);
      case "CYLINDER":
      case "TORUS":
        return cylinder(input, stitch, gauge, assumptions, warnings, shape);
      case "CONE":
        return cone(input, stitch, gauge, assumptions, warnings);
      case "SPHERE":
        return sphere(input, stitch, gauge, assumptions, warnings);
      default:
        return flatRectangle(input, stitch, gauge, assumptions, warnings);
    }
  })();

  if (!result) {
    return {
      ok: false,
      shape,
      reason: `A ${shape.toLowerCase()} cannot be generated yet.`,
      suggestion:
        "Supported today: flat panel, bag with circular base, cylinder, ring, cone and sphere.",
    };
  }

  const sections = result.sections;
  const allRows = sections.flatMap((section) => section.rows);
  const totalRows = allRows.length;
  const finalCount = allRows.length ? countRow(allRows[allRows.length - 1].steps) : 0;

  return {
    ok: true,
    shape,
    sections,
    gauge,
    assumptions,
    warnings,
    yarn: result.yarn,
    totalRows,
    finalCount,
  };
}

// --- strategies ------------------------------------------------------------

interface StrategyOutput {
  sections: GeneratedSection[];
  yarn?: YarnEstimate;
}

function flatRectangle(
  input: GeneratorInput,
  stitch: StitchCode,
  gauge: Gauge,
  assumptions: string[],
  warnings: string[],
): StrategyOutput {
  const stitches = Math.max(4, cmToStitches(input.widthCm, gauge));
  const bodyRows = Math.max(1, Math.round((input.heightCm / 10) * gauge.rowsPer10cm));

  const rows: GeneratedRow[] = [
    {
      label: "Foundation",
      steps: [{ type: "STITCH", stitch: "CH", count: stitches }],
      notes: `Chain ${stitches}. This is the width of the piece.`,
    },
    ...Array.from({ length: bodyRows }, (_, index) => ({
      label: `Row ${index + 2}`,
      steps: [
        { type: "STITCH", stitch: "TCH", count: 1 } as PatternStep,
        { type: "STITCH", stitch, count: stitches - 1 } as PatternStep,
      ],
      notes: index === 0 ? `First body row is one stitch short (no turning chain counted).` : undefined,
    })),
  ];

  assumptions.push(
    `Width of ${input.widthCm}cm becomes ${stitches} stitches at ${gauge.stitchesPer10cm} st/10cm.`,
  );
  assumptions.push("Row height depends on stitch height, so the finished length will vary.");

  if (stitches % 2 !== 0) {
    warnings.push(
      `${stitches} is an odd stitch count — edges may drift slightly. Adjust the gauge or add one stitch.`,
    );
  }

  return {
    sections: [{ name: "BODY", rows }],
    yarn: withSkeinSize(
      estimateYarn({ areaCm2: rectangularAreaCm2(input.widthCm, input.heightCm), yarnWeight: input.yarnWeight }),
      input.gramsPerSkein ?? 50,
    ),
  };
}

function bagWithBase(
  input: GeneratorInput,
  stitch: StitchCode,
  gauge: Gauge,
  assumptions: string[],
  warnings: string[],
): StrategyOutput {
  const baseDiameterCm = Math.max(4, Math.min(input.depthCm ?? input.widthCm * 0.6, input.widthCm));

  // Round the side count to a multiple of 6 so the base spiral lands on it
  // exactly. A target of 27 would leave a final round that cannot be worked.
  const targetStitches = Math.max(
    12,
    nearestEvenlyDivisible(cmToStitches(Math.PI * input.widthCm, gauge), 6),
  );

  const start = magicRingStart(stitch);
  const baseRows = increaseTo(6, targetStitches, stitch, "Round", 1);
  const bodyStitches = resultingAfter(6, baseRows);

  const sideCount = Math.max(1, Math.round((input.heightCm / 10) * gauge.rowsPer10cm));
  const sideRows = straightRounds(
    sideCount,
    bodyStitches,
    stitch,
    "Row",
    1,
    "Work into every stitch of the last round. Chain 1 at the start of each row.",
  );

  assumptions.push(
    `Base spiral grows 6 stitches a round to ${bodyStitches}, which is about ${Math.round(
      (bodyStitches / gauge.stitchesPer10cm) * 10,
    )}cm across at this gauge.`,
  );
  assumptions.push("Sides are worked in straight rows on the live stitches of the last round.");
  warnings.push("Handles and finishing are not generated — add them by hand.");

  return {
    sections: [
      { name: "BASE", rows: [start, ...baseRows] },
      { name: "SIDES", rows: sideRows },
    ],
    yarn: withSkeinSize(
      estimateYarn({
        areaCm2: rectangularAreaCm2(input.widthCm, input.heightCm, {
          gusset: true,
          thicknessCm: baseDiameterCm,
        }),
        yarnWeight: input.yarnWeight,
      }),
      input.gramsPerSkein ?? 50,
    ),
  };
}

function cylinder(
  input: GeneratorInput,
  stitch: StitchCode,
  gauge: Gauge,
  assumptions: string[],
  warnings: string[],
  shape: ShapeType,
): StrategyOutput {
  const target = Math.max(12, nearestEvenlyDivisible(cmToStitches(Math.PI * input.widthCm, gauge), 6));
  const start = magicRingStart(stitch);
  const baseRows = increaseTo(6, target, stitch, "Round", 1);
  const bodyStitches = resultingAfter(6, baseRows);

  const heightRows = Math.max(1, Math.round((input.heightCm / 10) * gauge.rowsPer10cm));
  const sideRows = straightRounds(
    heightRows,
    bodyStitches,
    stitch,
    "Round",
    baseRows.length + 1,
    "The first side round draws the edge in slightly — that is normal.",
  );

  assumptions.push(
    `Diameter ${input.widthCm}cm works out to ${bodyStitches} stitches around at this gauge.`,
  );
  if (shape === "TORUS") {
    warnings.push(
      "A ring-shaped base needs a different transition — check these rounds before working them.",
    );
  }

  return {
    sections: [{ name: "BODY", rows: [start, ...baseRows, ...sideRows] }],
    yarn: withSkeinSize(
      estimateYarn({
        areaCm2: cylinderAreaCm2(input.widthCm, input.heightCm),
        yarnWeight: input.yarnWeight,
      }),
      input.gramsPerSkein ?? 50,
    ),
  };
}

function cone(
  input: GeneratorInput,
  stitch: StitchCode,
  gauge: Gauge,
  assumptions: string[],
  warnings: string[],
): StrategyOutput {
  const topDiameter = Math.max(4, input.depthCm ?? 10);
  const top = Math.max(6, nearestEvenlyDivisible(cmToStitches(Math.PI * topDiameter, gauge), 6));
  const bottom = Math.max(top + 6, nearestEvenlyDivisible(cmToStitches(Math.PI * input.widthCm, gauge), 6));

  const start = magicRingStart(stitch);
  const growRows = increaseTo(6, bottom, stitch, "Round", 1);
  const taperRows = decreaseTo(bottom, top, "Round", growRows.length + 1);

  const heightRows = Math.max(1, Math.round((input.heightCm / 10) * gauge.rowsPer10cm));
  const endStitches = Math.max(6, resultingAfter(bottom, taperRows));
  const straightRows = straightRounds(
    Math.max(0, heightRows - growRows.length - taperRows.length),
    endStitches,
    stitch,
    "Round",
    growRows.length + taperRows.length + 1,
  );

  assumptions.push(
    `Grows 6 a round to ${bottom}, then tapers ${Math.round((bottom / gauge.stitchesPer10cm) * 10)}cm → ${Math.round(
      (endStitches / gauge.stitchesPer10cm) * 10,
    )}cm.`,
  );
  warnings.push("Cone shaping is approximate. Check it against the silhouette you want.");

  return {
    sections: [{ name: "BODY", rows: [start, ...growRows, ...taperRows, ...straightRows] }],
    yarn: withSkeinSize(
      estimateYarn({
        areaCm2: cylinderAreaCm2((input.widthCm + (input.depthCm ?? 10)) / 2, input.heightCm),
        yarnWeight: input.yarnWeight,
      }),
      input.gramsPerSkein ?? 50,
    ),
  };
}

function sphere(
  input: GeneratorInput,
  stitch: StitchCode,
  gauge: Gauge,
  assumptions: string[],
  warnings: string[],
): StrategyOutput {
  // A sphere peaks near the equator, then you work without increases to close.
  const peak = Math.max(18, nearestEvenlyDivisible(cmToStitches(Math.PI * input.widthCm, gauge), 6));
  const heightStitches = Math.max(12, cmToStitches(input.heightCm, gauge));

  const start = magicRingStart(stitch);
  const growRows = increaseTo(6, peak, stitch, "Round", 1);
  const equator = resultingAfter(6, growRows);

  const halfRows = Math.max(1, Math.round(heightStitches / 2));
  const straightCount = Math.max(1, halfRows - growRows.length);
  const straightRows = straightRounds(
    straightCount,
    equator,
    stitch,
    "Round",
    growRows.length + 1,
    "This is the equator — start stuffing here.",
  );

  // Closing: work two stitches into one until the top pulls shut.
  const closeRows = decreaseTo(equator, 6, "Round", growRows.length + straightRows.length + 1);

  assumptions.push(
    `Diameter ${input.widthCm}cm works out to about ${equator} stitches at the equator.`,
  );
  warnings.push(
    "Spheres depend on stuffing for their shape, and on decreasing without gaps to close the top.",
  );

  return {
    sections: [{ name: "BODY", rows: [start, ...growRows, ...straightRows, ...closeRows] }],
    yarn: withSkeinSize(
      estimateYarn({ areaCm2: sphereAreaCm2(input.widthCm), yarnWeight: input.yarnWeight }),
      input.gramsPerSkein ?? 50,
    ),
  };
}
// --- spiral helpers --------------------------------------------------------

/**
 * Largest divisor of `value` that is <= `max`.
 *
 * Used to space increases evenly around a round. "6 INC in each of 4 stitches"
 * is arithmetic a crocheter cannot execute when 18 does not divide by 4 — and
 * uneven spacing is precisely what makes a circle pucker.
 */
function largestDivisorUpTo(value: number, max: number): number {
  if (max < 1) return 1;
  for (let divisor = Math.min(max, value); divisor >= 1; divisor -= 1) {
    if (value % divisor === 0) return divisor;
  }
  return 1;
}

/**
 * Rounds that take a circle from `from` up to `to`, increasing evenly.
 *
 * THE ARITHMETIC THAT MATTERS
 * ---------------------------
 * A group of `(n SC + 1 INC)` consumes n+1 and produces n+2, so it is worth
 * exactly +1. To gain `growth` stitches you therefore need `growth` GROUPS,
 * not one group of `growth` — getting that backwards produces rounds like
 * "(SC, INC) x 1", which grows the piece by one stitch instead of six and
 * cannot be worked at all.
 *
 * With `step` = 6 this yields the classic amigurumi spiral:
 *   6 -> (INC) x 6 -> 12 -> (SC, INC) x 6 -> 18 -> (SC x 2, INC) x 6 -> 24
 */
function increaseTo(
  from: number,
  to: number,
  stitch: StitchCode,
  labelPrefix: string,
  startIndex: number,
  step = 6,
): GeneratedRow[] {
  const rows: GeneratedRow[] = [];
  let current = from;

  while (current < to) {
    const growth = Math.min(step, to - current);
    // Each group adds exactly 1, so we need `growth` groups.
    const groups = growth;
    // And those groups must divide the current count evenly.
    const evenGroups = largestDivisorUpTo(current, groups);
    const plain = Math.floor(current / evenGroups) - 1;

    if (plain < 0) break;

    // A group whose plain count is 0 is written as bare increases: "(INC) x 6"
    // rather than "(0 SC, INC) x 6". Zero is not workable notation.
    const children: StitchStep[] = [];
    if (plain > 0) children.push({ type: "STITCH", stitch, count: plain });
    children.push({ type: "STITCH", stitch: "INC", count: 1 });

    rows.push({
      label: `${labelPrefix} ${startIndex + rows.length}`,
      steps: [
        {
          type: "GROUP",
          count: evenGroups,
          steps: children,
        },
      ],
      notes:
        rows.length === 0 && from === 6
          ? "The base increase that turns the circle's corners correctly."
          : undefined,
    });

    current += evenGroups;
  }

  return rows;
}

/** Rounds that taper a circle from `from` down to `to`, decreasing evenly. */
function decreaseTo(
  from: number,
  to: number,
  labelPrefix: string,
  startIndex: number,
  step = 6,
): GeneratedRow[] {
  const rows: GeneratedRow[] = [];
  let current = from;

  while (current > to) {
    const shrink = Math.min(step, current - to);
    const groups = largestDivisorUpTo(current, shrink);
    const plain = Math.floor(current / groups) - 1;
    if (plain < 0) break;

    const children: StitchStep[] = [];
    if (plain > 0) children.push({ type: "STITCH", stitch: "SC", count: plain });
    children.push({ type: "STITCH", stitch: "DEC", count: 1 });

    rows.push({
      label: `${labelPrefix} ${startIndex + rows.length}`,
      steps: [
        {
          type: "GROUP",
          count: groups,
          steps: children,
        },
      ],
      notes: `Decrease once in each of ${groups} stitches.`,
    });

    current -= groups;
  }

  return rows;
}

/** Straight rounds that hold the stitch count steady. */
function straightRounds(
  count: number,
  perRound: number,
  stitch: StitchCode,
  labelPrefix: string,
  startIndex: number,
  firstRoundNote?: string,
): GeneratedRow[] {
  return Array.from({ length: count }, (_, index) => ({
    label: `${labelPrefix} ${startIndex + index}`,
    steps: [{ type: "STITCH", stitch, count: perRound }],
    notes: index === 0 ? firstRoundNote : undefined,
  }));
}

/**
 * The magic-ring start every circular piece begins with.
 *
 * Note what is NOT in the steps: the ring itself (MR) and the turning chain
 * (CH) are techniques, not counted stitches — the round contains exactly the 6
 * stitches worked INTO the ring. Counting them would start a classic spiral at
 * 9 stitches instead of 6, and every subsequent increase would be wrong.
 */
function magicRingStart(stitch: StitchCode): GeneratedRow {
  return {
    label: "Base",
    steps: [{ type: "STITCH", stitch, count: 6 }],
    notes:
      "Work 6 stitches into a magic ring. Chain 1 at the start of each round (the chain is not counted).",
  };
}

/** Resolves the final stitch count a generated circle actually lands on. */
/**
 * The stitch count a generated sequence actually LEAVES you with.
 *
 * It has to walk the rows applying `resultingCount` rather than add up the last
 * row's produced loops, because for an increase round those differ:
 * `(SC, INC) x 6` produces 18 loops but moves a 9-stitch circle to 15.
 */
function resultingAfter(from: number, rows: GeneratedRow[]): number {
  let running = from;
  for (const row of rows) running = resultingCount(running, row.steps);
  return running;
}

