/**
 * Domain validation — the shared vocabulary of the app.
 *
 * These Zod schemas are used in three places on purpose:
 *   1. validating a Server Action payload before it touches the database
 *   2. typing form state
 *   3. deriving the TypeScript union types used across the UI
 *
 * Because SQLite has no native enums, the database stores plain strings. These
 * schemas are therefore the actual enforcement point — which is why they live
 * in one file instead of being duplicated.
 */
import { z } from "zod";

export const PROJECT_CATEGORIES = [
  "AMIGURUMI",
  "BLANKET",
  "BAG",
  "HAT",
  "SWEATER",
  "SCARF",
  "HOME_DECOR",
  "OTHER",
] as const;

export const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

export const VISIBILITIES = ["PRIVATE", "UNLISTED", "PUBLIC"] as const;

export const YARN_WEIGHTS = [
  "LACE",
  "FINGERING",
  "SPORT",
  "DK",
  "WORSTED",
  "ARAN",
  "BULKY",
  "SUPER_BULKY",
] as const;

export const PROJECT_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED"] as const;

/** Shapes supported by the 3D shape registry. Keep in sync with src/lib/design/shapes.ts */
export const SHAPES = [
  "SPHERE",
  "CYLINDER",
  "CONE",
  "TUBE",
  "BOX",
  "PANEL",
  "TORUS",
] as const;

export const categorySchema = z.enum(PROJECT_CATEGORIES);
export const difficultySchema = z.enum(DIFFICULTIES);
export const visibilitySchema = z.enum(VISIBILITIES);
export const yarnWeightSchema = z.enum(YARN_WEIGHTS);
export const projectStatusSchema = z.enum(PROJECT_STATUSES);
export const shapeSchema = z.enum(SHAPES);

export type ProjectCategory = z.infer<typeof categorySchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type Visibility = z.infer<typeof visibilitySchema>;
export type YarnWeight = z.infer<typeof yarnWeightSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ShapeType = z.infer<typeof shapeSchema>;

// --- Human labels (single source of truth for display text) ----------------

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  AMIGURUMI: "Amigurumi",
  BLANKET: "Blanket",
  BAG: "Bag",
  HAT: "Hat",
  SWEATER: "Sweater",
  SCARF: "Scarf",
  HOME_DECOR: "Home decor",
  OTHER: "Other",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const YARN_WEIGHT_LABELS: Record<YarnWeight, string> = {
  LACE: "Lace",
  FINGERING: "Fingering",
  SPORT: "Sport",
  DK: "Double knit",
  WORSTED: "Worsted",
  ARAN: "Aran",
  BULKY: "Bulky",
  SUPER_BULKY: "Super bulky",
};

export const SHAPE_LABELS: Record<ShapeType, string> = {
  SPHERE: "Sphere",
  CYLINDER: "Cylinder",
  CONE: "Cone",
  TUBE: "Tube",
  BOX: "Box",
  PANEL: "Flat panel",
  TORUS: "Ring / bag base",
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: "In progress",
  PAUSED: "Paused",
  COMPLETED: "Finished",
};

// --- Shared field rules -----------------------------------------------------

/** Dimensions must be physically plausible: > 0 and <= 500cm. */
export const dimensionSchema = z
  .number()
  .positive("Must be greater than 0")
  .max(500, "That is larger than 5 metres — probably a typo");

export const stitchCountSchema = z
  .number()
  .int("Must be a whole number")
  .nonnegative("Cannot be negative")
  .max(100_000, "That seems too large — check the number");
