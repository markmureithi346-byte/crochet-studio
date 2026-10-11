import { z } from "zod";
import { STITCH_CODES } from "@/lib/crochet/stitches";
import {
  DIFFICULTIES,
  PROJECT_CATEGORIES,
  YARN_WEIGHTS,
  shapeSchema,
} from "@/lib/validation/domain";

/**
 * EDITOR PAYLOAD SCHEMAS
 * ----------------------
 * The editor is a client component holding an in-progress draft. When the user
 * saves, the whole draft is posted to a Server Action — so the draft is
 * UNTRUSTED INPUT and must be validated on the server exactly like a form.
 *
 * A discriminated union on `type` is what makes the two step shapes type-safe:
 * TypeScript narrows on the discriminant, so a GROUP step is never read as if
 * it were a STITCH.
 */

/**
 * `z.enum(STITCH_CODES)` infers the literal union of stitch codes, so
 * `stitch` stays `"SC" | "INC" | ...` all the way to the engine.
 *
 * Casting to `[string, ...string[]]` here would widen it back to `string` and
 * force `as never` casts later — losing the safety the union provides.
 */
const stitchCodeSchema = z.enum(STITCH_CODES);

const stitchStepSchema = z.object({
  type: z.literal("STITCH"),
  stitch: stitchCodeSchema,
  count: z.number().int().min(1, "Count must be at least 1").max(1000, "That is too many stitches"),
  note: z.string().max(300).optional(),
});

const groupStepSchema = z.object({
  type: z.literal("GROUP"),
  count: z.number().int().min(1).max(500),
  steps: z
    .array(
      z.object({
        // Nested steps carry the same discriminant as top-level ones, so
        // `GroupStep.steps` can be typed `StitchStep[]` with no casting.
        type: z.literal("STITCH"),
        stitch: stitchCodeSchema,
        count: z.number().int().min(1).max(100),
      }),
    )
    .min(1, "A repeat needs at least one stitch"),
  note: z.string().max(300).optional(),
});

export const patternStepSchema = z.discriminatedUnion("type", [
  stitchStepSchema,
  groupStepSchema,
]);

export const draftRowSchema = z.object({
  /** Absent for rows the user just added. */
  id: z.string().optional(),
  label: z.string().trim().min(1).max(40),
  notes: z.string().max(500).default(""),
  expectedStitches: z.number().int().min(0).max(100_000).nullable().default(null),
  steps: z.array(patternStepSchema).max(60),
});

export const draftSectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(40),
  rows: z.array(draftRowSchema).max(400),
});

export const materialSchema = z.object({
  label: z.string().trim().max(60).default(""),
  detail: z.string().max(120).default(""),
  quantity: z.string().max(40).default(""),
});

/**
 * The pattern's spec sheet: what it is, what you need, and how big it comes out.
 *
 * Gauge is the important one. Without it, stitch counts cannot be turned into
 * centimetres at all — it is the bridge between the two units. Optional, because
 * many patterns are written before anyone swatches, but when present the editor
 * can show a live finished-size estimate.
 */
export const patternDetailsSchema = z.object({
  category: z.enum(PROJECT_CATEGORIES).default("OTHER"),
  difficulty: z.enum(DIFFICULTIES).default("BEGINNER"),
  hookSizeMm: z.number().min(0).max(25).nullable().default(null),
  yarnWeight: z.enum(YARN_WEIGHTS).nullable().default(null),
  finishedWidthCm: z.number().min(1).max(500).nullable().default(null),
  finishedHeightCm: z.number().min(1).max(500).nullable().default(null),
  gaugeStitches: z.number().min(1).max(20).nullable().default(null),
  gaugeRows: z.number().min(1).max(20).nullable().default(null),
});

export const savePatternSchema = z.object({
  patternId: z.string().min(1),
  name: z.string().trim().min(1, "Give the pattern a name").max(80),
  description: z.string().max(1000).default(""),
  details: patternDetailsSchema.default({
    category: "OTHER",
    difficulty: "BEGINNER",
    hookSizeMm: null,
    yarnWeight: null,
    finishedWidthCm: null,
    finishedHeightCm: null,
    gaugeStitches: null,
    gaugeRows: null,
  }),
  sections: z.array(draftSectionSchema).min(1, "A pattern needs at least one section").max(20),
  materials: z.array(materialSchema).max(20).default([]),
});

export type SavePatternInput = z.infer<typeof savePatternSchema>;
export type DraftRow = z.infer<typeof draftRowSchema>;
export type DraftSection = z.infer<typeof draftSectionSchema>;

export const createPatternSchema = z.object({
  name: z.string().trim().min(1, "Give your pattern a name").max(80),
  category: z.enum([
    "AMIGURUMI",
    "BLANKET",
    "BAG",
    "HAT",
    "SWEATER",
    "SCARF",
    "HOME_DECOR",
    "OTHER",
  ]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("BEGINNER"),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Give your project a name").max(80),
  patternId: z.string().min(1).optional(),
});

export const generatePatternSchema = z.object({
  shape: shapeSchema,
  widthCm: z.number().min(1).max(500),
  heightCm: z.number().min(1).max(500),
  depthCm: z.number().min(1).max(500).optional(),
  yarnWeight: z
    .enum(["LACE", "FINGERING", "SPORT", "DK", "WORSTED", "ARAN", "BULKY", "SUPER_BULKY"])
    .default("DK"),
  hookMm: z.number().min(1).max(25).optional(),
  patternName: z.string().trim().min(1).max(80).default("New pattern"),
});

export const noteSchema = z.object({
  projectId: z.string().min(1),
  body: z.string().trim().min(1, "Write something first").max(1000),
});

export const yarnSchema = z.object({
  brand: z.string().trim().max(60).default(""),
  name: z.string().trim().min(1, "Which yarn is it?").max(60),
  colorName: z.string().trim().min(1, "What colour?").max(40),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #C2603F")
    .default("#6b6b73"),
  weight: z
    .enum(["LACE", "FINGERING", "SPORT", "DK", "WORSTED", "ARAN", "BULKY", "SUPER_BULKY"])
    .default("DK"),
  metersPerSkein: z.number().int().min(0).max(5000).nullable().default(null),
  gramsPerSkein: z.number().int().min(1).max(2000).default(100),
  quantity: z.number().int().min(0).max(999).default(1),
});
