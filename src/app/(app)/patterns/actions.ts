"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireUserOrThrow } from "@/lib/data/auth";
import {
  createPattern,
  createProjectFromPattern,
  savePattern,
  saveVersion,
} from "@/lib/data/patterns";
import {
  createPatternSchema,
  generatePatternSchema,
  savePatternSchema,
} from "@/lib/validation/pattern";
import { generatePattern } from "@/lib/engine/generate";
import { upsertDesign } from "@/lib/data/designs";
import { prisma } from "@/lib/db";

/**
 * PATTERN SERVER ACTIONS
 * ======================
 * Every mutation re-checks the session (`requireUserOrThrow`) even though the
 * pages are already behind the proxy. That is deliberate: Server Actions are
 * POST endpoints reachable directly, so each one must stand on its own.
 *
 * The pattern: parse -> authorise -> mutate -> revalidate -> redirect.
 * `redirect()` throws, so it must always be the LAST statement.
 */

export type PatternActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function fieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

export async function createPatternAction(
  _previous: PatternActionState,
  formData: FormData,
): Promise<PatternActionState> {
  const user = await requireUserOrThrow();

  const parsed = createPatternSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    difficulty: formData.get("difficulty") ?? "BEGINNER",
  });

  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const pattern = await createPattern(user.id, parsed.data);
  revalidatePath("/patterns");
  redirect(`/patterns/${pattern.id}`);
}

export async function savePatternAction(input: unknown): Promise<{
  ok: boolean;
  error?: string;
  totalRows?: number;
  totalStitches?: number;
  errors?: number;
  warnings?: number;
}> {
  const user = await requireUserOrThrow();

  const parsed = savePatternSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That pattern could not be read. Check the rounds and try again." };
  }

  try {
    const result = await savePattern(user.id, parsed.data);
    if (result.ok) {
      revalidatePath("/patterns");
      revalidatePath(`/patterns/${parsed.data.patternId}`);
      revalidatePath("/dashboard");
    }
    return result;
  } catch (error) {
    console.error("[patterns] save failed", error);
    return { ok: false, error: "We could not save your pattern. Your changes were not lost — try again." };
  }
}

export async function saveVersionAction(input: {
  patternId: string;
  label: string;
  notes: string;
}): Promise<{ ok: boolean; version?: number; error?: string }> {
  const user = await requireUserOrThrow();
  const result = await saveVersion(user.id, input.patternId, {
    label: input.label.slice(0, 60),
    notes: input.notes.slice(0, 500),
  });
  if (result.ok) revalidatePath(`/patterns/${input.patternId}`);
  return result;
}

export async function deletePatternAction(patternId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUserOrThrow();
  // deleteMany with userId = ownership check + delete in one statement.
  const { count } = await prisma.pattern.deleteMany({ where: { id: patternId, userId: user.id } });
  revalidatePath("/patterns");
  if (count === 0) return { ok: false, error: "Pattern not found." };
  redirect("/patterns");
}

/**
 * Turns the generator's output into a real, saved pattern.
 *
 * The generator runs HERE, on the server, for the same reason the editor
 * validates here: it is pure logic, and the client is not a trust boundary.
 */
export async function generatePatternAction(
  _previous: PatternActionState,
  formData: FormData,
): Promise<PatternActionState> {
  const user = await requireUserOrThrow();

  const parsed = generatePatternSchema.safeParse({
    shape: formData.get("shape"),
    widthCm: Number(formData.get("widthCm")),
    heightCm: Number(formData.get("heightCm")),
    depthCm: formData.get("depthCm") ? Number(formData.get("depthCm")) : undefined,
    yarnWeight: formData.get("yarnWeight") ?? "DK",
    hookMm: formData.get("hookMm") ? Number(formData.get("hookMm")) : undefined,
    patternName: formData.get("patternName") ?? "New pattern",
  });

  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const generated = generatePattern(parsed.data);
  if (!generated.ok) {
    return { error: generated.reason };
  }

  const pattern = await createPattern(user.id, {
    name: parsed.data.patternName,
    category: "OTHER",
    difficulty: "BEGINNER",
    description: `Generated from a ${parsed.data.shape.toLowerCase()} design of ${parsed.data.widthCm} × ${parsed.data.heightCm}cm. ${generated.assumptions.join(" ")}`,
  });

  const saveResult = await savePattern(user.id, {
    patternId: pattern.id,
    name: parsed.data.patternName,
    description: pattern.description,
    details: {
      category: "OTHER",
      difficulty: "BEGINNER",
      hookSizeMm: parsed.data.hookMm ?? null,
      yarnWeight: parsed.data.yarnWeight,
      finishedWidthCm: parsed.data.widthCm,
      finishedHeightCm: parsed.data.heightCm,
      gaugeStitches: generated.gauge.stitchesPer10cm,
      gaugeRows: generated.gauge.rowsPer10cm,
    },
    materials: [],
    sections: generated.sections.map((section) => ({
      name: section.name,
      rows: section.rows.map((row) => ({
        label: row.label,
        notes: row.notes ?? "",
        expectedStitches: null,
        steps: row.steps,
      })),
    })),
  });

  if (!saveResult.ok) {
    return { error: saveResult.error ?? "The pattern was generated but could not be saved." };
  }

  // Attach the 3D design so the preview matches what was generated.
  await upsertDesign(user.id, {
    patternId: pattern.id,
    name: parsed.data.patternName,
    shape: parsed.data.shape,
    widthCm: parsed.data.widthCm,
    heightCm: parsed.data.heightCm,
    depthCm: parsed.data.depthCm ?? parsed.data.widthCm,
    stitchCode: null,
    colorHex: "#6b6b73",
    params: JSON.stringify({ generated: true, totalRows: generated.totalRows }),
  });

  revalidatePath("/patterns");
  redirect(`/patterns/${pattern.id}`);
}

/** Starts crocheting a pattern. Creates the project and jumps into it. */
export async function startProjectAction(
  _previous: PatternActionState,
  formData: FormData,
): Promise<PatternActionState> {
  const user = await requireUserOrThrow();
  const patternId = formData.get("patternId")?.toString();
  if (!patternId) return { error: "Which pattern?" };

  const project = await createProjectFromPattern(user.id, { patternId });
  if (!project) return { error: "Pattern not found." };

  revalidatePath("/projects");
  redirect(`/crochet/${project.id}`);
}
