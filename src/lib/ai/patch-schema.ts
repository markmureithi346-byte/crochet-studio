import { z } from "zod";
import { SHAPES } from "@/lib/validation/domain";

/**
 * THE AI ASSISTANT — CONTRACT ONLY, NO MODEL
 * =========================================
 *
 * WHY THIS FILE EXISTS WITH NO AI IN IT
 * -------------------------------------
 * The hard part of an AI crochet assistant is NOT the model. It is deciding what
 * a model is ALLOWED to do. If a language model can emit stitch counts, it will
 * eventually emit a wrong one, and a crocheter will physically make the wrong
 * number of stitches.
 *
 * So the architecture is inverted from the usual:
 *
 *   1. The model proposes a JSON patch matching `designPatchSchema` — a small,
 *      closed set of parameter changes.
 *   2. Zod validates the patch's SHAPE on the server.
 *   3. The ENGINE re-computes every affected round itself.
 *   4. The user sees a diff and presses Apply, or Cancel.
 *
 * The model never writes a stitch count. It can only change inputs like
 * dimensions, and the arithmetic is ours. That makes silently wrong output
 * structurally impossible.
 *
 * There is no API key in this file, no fetch call, and no client-side secret.
 * When this is switched on, the key lives server-side only.
 */

/** The ONLY things a proposal is allowed to change. */
export const designPatchSchema = z.object({
  rationale: z
    .string()
    .min(10, "Explain the change in a sentence a crocheter can check")
    .max(600),
  changes: z
    .array(
      z.object({
        field: z.enum(["widthCm", "heightCm", "depthCm", "shape", "colorHex", "stitchCode"]),
        from: z.union([z.number(), z.string(), z.null()]),
        to: z.union([z.number(), z.string()]),
        /** Units are shown to the user: "cm", "stitch", "hex colour". */
        unit: z.string().max(20).optional(),
      }),
    )
    .min(1, "A proposal must change something"),
});

export type DesignPatch = z.infer<typeof designPatchSchema>;

/**
 * Validates a patch against the CURRENT design, before it is shown.
 *
 * Rejecting a patch that does not apply is the safety net: "make the bag 5cm
 * wider" should be refused if there is no width dimension to change.
 */
export function validatePatchAgainst(
  patch: DesignPatch,
  current: { widthCm: number; heightCm: number; depthCm: number; shape: string; colorHex: string },
): { ok: true; patch: DesignPatch } | { ok: false; reason: string } {
  const parsed = designPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message ?? "That proposal is not valid." };
  }

  for (const change of parsed.data.changes) {
    const field = change.field as keyof typeof current;
    if (!(field in current)) {
      return { ok: false, reason: `"${change.field}" is not something this design has.` };
    }
    if (change.field === "shape" && !SHAPES.includes(change.to as never)) {
      return { ok: false, reason: `"${change.to}" is not a shape we support.` };
    }
    if (change.field === "colorHex" && !/^#[0-9a-fA-F]{6}$/.test(String(change.to))) {
      return { ok: false, reason: "That is not a valid colour." };
    }
    if (change.field === "widthCm" && (Number(change.to) <= 0 || Number(change.to) > 500)) {
      return { ok: false, reason: "That width is not physically sensible." };
    }
  }

  return { ok: true, patch: parsed.data };
}

/** Applies a validated patch. Only ever called after explicit user approval. */
export function applyPatch<T extends Record<string, unknown>>(
  design: T,
  patch: DesignPatch,
): T {
  const next = { ...design };
  for (const change of patch.changes) {
    const key = change.field as keyof T;
    const value = change.unit === "cm" || typeof design[key] === "number" ? Number(change.to) : change.to;
    next[key] = value as T[keyof T];
  }
  return next;
}

export interface AiRoadmapItem {
  title: string;
  detail: string;
  status: "ready" | "planned";
}

/**
 * Rendered on the settings page. Being explicit about which parts exist stops
 * the assistant section from reading as a feature that quietly does nothing.
 */
export const AI_ROADMAP: AiRoadmapItem[] = [
  {
    title: "Patch contract and validation",
    detail: "a closed schema of allowed changes, validated on the server before display",
    status: "ready",
  },
  {
    title: "Approval flow",
    detail: "changes are shown as a before/after diff with Apply and Cancel",
    status: "ready",
  },
  {
    title: "Explain a round in plain language",
    detail: "the safest assistant feature: it reads the pattern, it does not change it",
    status: "planned",
  },
  {
    title: "Natural language to a design spec",
    detail: "'a small handbag, 30cm wide, round base' becomes structured parameters",
    status: "planned",
  },
  {
    title: "Pattern rewriting",
    detail: "changing a dimension and regenerating affected rounds through the engine",
    status: "planned",
  },
  {
    title: "Import from photographs",
    detail: "reading a scanned pattern reliably — genuinely hard, not scheduled",
    status: "planned",
  },
];
