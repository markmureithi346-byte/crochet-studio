/**
 * THE STITCH CATALOGUE
 * ====================
 * This file is the single source of truth for what a stitch *is* and — crucially
 * — how many stitches it produces and consumes.
 *
 * THE ONE IDEA THAT MAKES CROCHET COMPUTABLE
 * ------------------------------------------
 * A stitch instruction is just a transition on a count of loops:
 *
 *      (stitches below)  --stitch-->  (stitches above)
 *
 * Every stitch has two numbers:
 *   consumes — how many existing stitches it uses up from the round below
 *   produces — how many new stitches it leaves in the row above
 *
 *   SC   : consumes 1, produces 1   -> neutral. 6 SC stays 6.
 *   INC  : consumes 1, produces 2   -> grows by 1. 6 INC turns 6 into 12.
 *   DEC  : consumes 2, produces 1   -> shrinks by 1.
 *   CH   : consumes 0, produces 1   -> grows by 1. This is a foundation chain.
 *
 * From those two numbers we can *derive* every total in the app:
 *
 *   rowTotal   = SUM(produces x count)
 *   netChange  = SUM((produces - consumes) x count)
 *   nextTotal  = previousTotal + netChange
 *
 * That is why the app can detect arithmetic mistakes in patterns. It is not
 * guessing — it is integer maths on a model of the craft that is true by
 * construction.
 *
 * WHAT THIS MODEL DOES NOT KNOW (be honest about this)
 * ---------------------------------------------------
 * It cannot know whether your shaping looks good, whether your tension is
 * consistent, whether you remembered to fasten off, or whether a decrease
 * should really happen on this row. `height` (in stitch units) is an
 * approximation used for dimension estimates, not a physical simulation.
 */

// --- Types ------------------------------------------------------------------

export type StitchCategory = "BASIC" | "SHAPING" | "SPECIAL" | "TECHNIQUE";

export interface StitchDefinition {
  /** Abbreviation written in the pattern, e.g. "SC". */
  code: string;
  /** Full name, e.g. "Single Crochet". */
  name: string;
  category: StitchCategory;
  /**
   * How many loops this stitch takes from the round below.
   * "How many stitch tops do I have to go through?"
   */
  consumes: number;
  /**
   * How many loops this stitch leaves in the row above.
   * "How many stitch tops will there be afterwards?"
   */
  produces: number;
  /**
   * Approximate height in units of one single crochet. Used for dimension
   * estimation only — it ignores yarn weight, tension and blocking.
   */
  height: number;
  /** Short plain-language explanation shown in the UI. */
  description: string;
}

// --- The catalogue ---------------------------------------------------------

export const STITCH_CATALOG = {
  CH: {
    code: "CH",
    name: "Chain",
    category: "BASIC",
    consumes: 0,
    produces: 1,
    height: 0.6,
    description: "The starting loop for almost everything. Adds height, no new loops.",
  },
  TCH: {
    code: "TCH",
    name: "Turning chain",
    category: "TECHNIQUE",
    consumes: 0,
    produces: 0,
    height: 0.6,
    description:
      "The chain that lifts your hook to the next row's height. It is NOT worked into, so it does not change the stitch count — unlike a foundation chain.",
  },
  MR: {
    code: "MR",
    name: "Magic Ring",
    category: "TECHNIQUE",
    consumes: 0,
    produces: 0,
    height: 0.4,
    description:
      "An adjustable loop that lets you start a round without a tail. It is a technique, not a stitch — it adds no loops of its own, and the stitches worked INTO it are what count.",
  },
  SLST: {
    code: "SLST",
    name: "Slip Stitch",
    category: "BASIC",
    consumes: 0,
    produces: 0,
    height: 0.3,
    description: "Joins rounds or moves across without adding height.",
  },
  SC: {
    code: "SC",
    name: "Single Crochet",
    category: "BASIC",
    consumes: 1,
    produces: 1,
    height: 1,
    description: "The workhorse stitch. One stitch in, one stitch out.",
  },
  HDC: {
    code: "HDC",
    name: "Half Double Crochet",
    category: "BASIC",
    consumes: 1,
    produces: 1,
    height: 1.5,
    description: "Taller than single crochet, same stitch count.",
  },
  DC: {
    code: "DC",
    name: "Double Crochet",
    category: "BASIC",
    consumes: 1,
    produces: 1,
    height: 2,
    description: "Twice the height of a single crochet, same stitch count.",
  },
  TR: {
    code: "TR",
    name: "Treble Crochet",
    category: "BASIC",
    consumes: 1,
    produces: 1,
    height: 3,
    description: "Three times the height of a single crochet.",
  },
  INC: {
    code: "INC",
    name: "Increase",
    category: "SHAPING",
    consumes: 1,
    produces: 2,
    height: 1,
    description: "Two stitches worked into one stitch. The round grows by one.",
  },
  DEC: {
    code: "DEC",
    name: "Decrease",
    category: "SHAPING",
    consumes: 2,
    produces: 1,
    height: 1,
    description: "Two stitches worked into one. The round shrinks by one.",
  },
  BLO: {
    code: "BLO",
    name: "Back Loop Only",
    category: "TECHNIQUE",
    consumes: 1,
    produces: 1,
    height: 1,
    description: "Work into the back loop only, leaving the front loop visible.",
  },
  FLO: {
    code: "FLO",
    name: "Front Loop Only",
    category: "TECHNIQUE",
    consumes: 1,
    produces: 1,
    height: 1,
    description: "Work into the front loop only. Used for a visible ridge.",
  },
  SK: {
    code: "SK",
    name: "Skip Stitch",
    category: "TECHNIQUE",
    consumes: 1,
    produces: 0,
    height: 0,
    description: "Skip a stitch without working into it.",
  },
  BOB: {
    code: "BOB",
    name: "Bobble",
    category: "SPECIAL",
    consumes: 1,
    produces: 1,
    height: 2,
    description: "Several stitches worked into one stitch to make a raised bobble.",
  },
  PUF: {
    code: "PUF",
    name: "Puff Stitch",
    category: "SPECIAL",
    consumes: 1,
    produces: 1,
    height: 1.5,
    description: "Several tall stitches gathered into one soft puffy stitch.",
  },
  SH: {
    code: "SH",
    name: "Shell",
    category: "SPECIAL",
    consumes: 1,
    produces: 5,
    height: 1.5,
    description: "Several stitches into one stitch, fanned out like a shell.",
  },
  CL: {
    code: "CL",
    name: "Cluster",
    category: "SPECIAL",
    consumes: 1,
    produces: 4,
    height: 1.5,
    description: "Stitches worked together and joined, forming a cluster.",
  },
} satisfies Record<string, StitchDefinition>;

// --- Derived helpers --------------------------------------------------------

/** Every valid stitch code, e.g. "SC" | "INC" | ... */
export type StitchCode = keyof typeof STITCH_CATALOG;

export const STITCH_CODES = Object.keys(STITCH_CATALOG) as StitchCode[];

export function isStitchCode(value: string): value is StitchCode {
  return value in STITCH_CATALOG;
}

export function getStitch(code: StitchCode): StitchDefinition {
  return STITCH_CATALOG[code];
}

/**
 * Stitches you can repeat in bulk. Magic ring and slip stitch are structural,
 * repeat pickers in the editor because they are not countable runs.
 */
export const REPEATABLE_STITCHES = STITCH_CODES.filter(
  (code) => code !== "MR" && code !== "SLST" && code !== "TCH",
);

/**
 * Stitches whose height in centimetres depends on the stitch itself.
 * Handy for a future "how tall will this be?" helper.
 */
export function heightInUnits(code: StitchCode): number {
  return STITCH_CATALOG[code].height;
}
