/**
 * DIMENSIONS & GAUGE
 * ==================
 * Crochet is measured in two units that mean nothing to each other:
 *   stitches (what you count)  <->  centimetres (what you measure)
 *
 * The bridge is GAUGE: how many stitches and rows you fit into 10cm with a given
 * yarn and hook, at YOUR tension.
 *
 * This is the honest limit of the whole approach: gauge varies enormously
 * between crocheters. The same pattern in the same yarn can be 20% smaller in
 * one person's hands than another's. So every number here is derived from a
 * gauge value that the user can — and should — measure with a swatch, and the
 * defaults are explicitly labelled as starting points, not facts.
 */

/** Stitches and rows per 10cm. */
export interface Gauge {
  stitchesPer10cm: number;
  rowsPer10cm: number;
}

export function stitchesToCm(stitches: number, gauge: Gauge): number {
  if (gauge.stitchesPer10cm <= 0) return 0;
  return (stitches / gauge.stitchesPer10cm) * 10;
}

export function cmToStitches(cm: number, gauge: Gauge): number {
  if (gauge.stitchesPer10cm <= 0) return 0;
  return Math.round((cm / 10) * gauge.stitchesPer10cm);
}

export function rowsToCm(rows: number, gauge: Gauge): number {
  if (gauge.rowsPer10cm <= 0) return 0;
  return (rows / gauge.rowsPer10cm) * 10;
}

/**
 * Dimensions of a rectangular piece.
 *
 * `totalRows` should be the number of rows after the foundation chain, because
 * a foundation chain does not add usable height in the same way.
 */
export function estimateDimensions(
  stitches: number,
  totalRows: number,
  gauge: Gauge,
): { widthCm: number; heightCm: number } {
  return {
    widthCm: Math.round(stitchesToCm(stitches, gauge) * 10) / 10,
    heightCm: Math.round(rowsToCm(totalRows, gauge) * 10) / 10,
  };
}

/**
 * Starting gauges per yarn weight, in single crochet with the usual hook.
 *
 * THESE ARE ROUGH STARTS, NOT TRUTH. They exist so the app is useful before a
 * user has measured anything; the UI must label them as estimates. Real gauge
 * depends on hook size, yarn brand and the individual's tension.
 */
export const DEFAULT_GAUGE_BY_WEIGHT: Record<string, Gauge> = {
  LACE: { stitchesPer10cm: 8, rowsPer10cm: 8 },
  FINGERING: { stitchesPer10cm: 7, rowsPer10cm: 7 },
  SPORT: { stitchesPer10cm: 6, rowsPer10cm: 6 },
  DK: { stitchesPer10cm: 4.5, rowsPer10cm: 4 },
  WORSTED: { stitchesPer10cm: 4, rowsPer10cm: 3.5 },
  ARAN: { stitchesPer10cm: 3.5, rowsPer10cm: 3 },
  BULKY: { stitchesPer10cm: 3, rowsPer10cm: 2.5 },
  SUPER_BULKY: { stitchesPer10cm: 2.5, rowsPer10cm: 2 },
};

export function defaultGauge(yarnWeight?: string | null): Gauge {
  return DEFAULT_GAUGE_BY_WEIGHT[yarnWeight ?? "DK"] ?? DEFAULT_GAUGE_BY_WEIGHT.DK;
}

/**
 * Adjusts a gauge when the user picks a hook larger or smaller than usual.
 *
 * Rule of thumb: each 0.5mm step changes roughly 10–15% of gauge. We use a
 * gentle compounding model and cap the result so an absurd hook cannot produce
 * a physically impossible gauge.
 *
 * DIRECTION MATTERS: a bigger hook makes bigger stitches, so you fit FEWER of
 * them in 10cm. That is why we DIVIDE rather than multiply — getting this
 * backwards would silently report a 5mm hook as denser than a 3mm one.
 */
export function adjustGaugeForHook(base: Gauge, baseHookMm: number, actualHookMm: number): Gauge {
  if (baseHookMm <= 0 || actualHookMm <= 0) return base;
  const steps = (actualHookMm - baseHookMm) / 0.5;
  if (steps === 0) return base;
  const factor = Math.pow(1.12, steps);
  return {
    stitchesPer10cm: clamp(round1(base.stitchesPer10cm / factor), 1, 14),
    rowsPer10cm: clamp(round1(base.rowsPer10cm / factor), 1, 14),
  };
}

/** Rough hook size that goes with each yarn weight, for the generator UI. */
export const TYPICAL_HOOK_MM: Record<string, number> = {
  LACE: 2,
  FINGERING: 2.5,
  SPORT: 3.5,
  DK: 4,
  WORSTED: 5,
  ARAN: 6,
  BULKY: 8,
  SUPER_BULKY: 10,
};

/**
 * Nearest stitch count that divides evenly by `factor`.
 *
 * This is how the generator avoids producing a circle that cannot be worked:
 * "make 1 increase in each of 7 stitches" is arithmetic the crocheter cannot
 * execute, so the generator adjusts the count instead of producing it.
 *
 * Ties round DOWN, so a piece is never quietly made larger than requested.
 */
export function nearestEvenlyDivisible(total: number, factor: number): number {
  if (factor <= 0) return total;
  const lower = Math.floor(total / factor) * factor;
  const upper = lower + factor;
  return total - lower <= upper - total ? lower : upper;
}

/** Round to one decimal place without float noise (12.300000000000001). */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
