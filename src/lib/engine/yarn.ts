/**
 * YARN ESTIMATION
 * ===============
 * READ THIS BEFORE TRUSTING THE NUMBER
 *
 * This is an area estimate, not a promise. It multiplies the surface area of the
 * piece by a coverage factor for the yarn weight. It ignores:
 *   - your tension (the single biggest variable — easily ±25%)
 *   - whether the piece is worked flat or in the round
 *   - seams, edgings, handles, lining
 *   - how tightly the fabric is blocked
 *
 * That is why the output is a RANGE, and why the UI must always show the
 * disclaimer alongside it. A tool that returned a single confident number would
 * be lying to you about something you will spend real money on.
 */

import { round1 } from "./dimensions";

/**
 * Grams of yarn needed to cover 100 cm², by yarn weight, in single crochet.
 * Calibrated against common commercial patterns; treat as ±20%.
 */
const GRAMS_PER_100CM2: Record<string, number> = {
  LACE: 9,
  FINGERING: 12,
  SPORT: 16,
  DK: 19,
  WORSTED: 23,
  ARAN: 27,
  BULKY: 33,
  SUPER_BULKY: 39,
};

/** Additional fabric that is not part of the visible faces: edgings, seams. */
const TRIM_ALLOWANCE = 1.12;

export interface YarnEstimateInput {
  /** Total surface area in cm² (count both faces, the base, etc.). */
  areaCm2: number;
  yarnWeight?: string | null;
}

export interface YarnEstimate {
  minGrams: number;
  maxGrams: number;
  /** Skeins needed if we know the skein size. */
  skeins?: { min: number; max: number; gramsPerSkein: number };
  assumptions: string[];
  disclaimer: string;
}

const DISCLAIMER =
  "Estimate only. Actual usage depends on your tension, hook size and how tightly you work. Make a swatch first.";

export function estimateYarn({
  areaCm2,
  yarnWeight,
}: YarnEstimateInput): YarnEstimate {
  const coverage = GRAMS_PER_100CM2[yarnWeight ?? "DK"] ?? GRAMS_PER_100CM2.DK;
  const centre = areaCm2 * (coverage / 100) * TRIM_ALLOWANCE;

  return {
    minGrams: round1(centre * 0.8),
    maxGrams: round1(centre * 1.25),
    assumptions: [
      `Coverage assumed ${coverage}g per 100 cm² for ${(yarnWeight ?? "DK").toLowerCase()} weight.`,
      `Includes a ${Math.round((TRIM_ALLOWANCE - 1) * 100)}% allowance for edgings and seams.`,
      "Range is ±20–25% to account for tension.",
    ],
    disclaimer: DISCLAIMER,
  };
}

/** Converts a gram range into skein counts, rounding the upper bound up. */
export function withSkeinSize(
  estimate: YarnEstimate,
  gramsPerSkein: number,
): YarnEstimate {
  if (!gramsPerSkein || gramsPerSkein <= 0) return estimate;
  return {
    ...estimate,
    skeins: {
      min: Math.ceil(estimate.minGrams / gramsPerSkein),
      max: Math.ceil(estimate.maxGrams / gramsPerSkein),
      gramsPerSkein,
    },
  };
}

/** Surface area of a simple rectangular piece (front + back + base). */
export function rectangularAreaCm2(
  widthCm: number,
  heightCm: number,
  options: { gusset?: boolean; thicknessCm?: number } = {},
): number {
  const { gusset = false, thicknessCm = 4 } = options;
  const faces = widthCm * heightCm * 2;
  const base = gusset ? widthCm * widthCm : widthCm * thicknessCm;
  return faces + base;
}

/** Surface area of a cylinder/cup, counting the inside wall too. */
export function cylinderAreaCm2(circumferenceCm: number, heightCm: number): number {
  return circumferenceCm * heightCm * 2;
}

/** Surface area of a sphere from its diameter. */
export function sphereAreaCm2(diameterCm: number): number {
  const r = diameterCm / 2;
  return round1(4 * Math.PI * r * r);
}

export function formatYarnEstimate(estimate: YarnEstimate): string {
  const base = `${Math.round(estimate.minGrams)}–${Math.round(estimate.maxGrams)}g`;
  if (!estimate.skeins) return base;
  const { min, max, gramsPerSkein } = estimate.skeins;
  return min === max
    ? `${base} (${min} × ${gramsPerSkein}g skein)`
    : `${base} (${min}–${max} × ${gramsPerSkein}g skeins)`;
}
