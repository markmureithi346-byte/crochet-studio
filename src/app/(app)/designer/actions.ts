"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireUserOrThrow } from "@/lib/data/auth";
import { createYarn, deleteYarn, updateYarnQuantity } from "@/lib/data/yarn";
import { upsertDesign } from "@/lib/data/designs";
import { yarnSchema } from "@/lib/validation/pattern";

export type YarnActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createYarnAction(
  _previous: YarnActionState,
  formData: FormData,
): Promise<YarnActionState> {
  const user = await requireUserOrThrow();

  const parsed = yarnSchema.safeParse({
    brand: formData.get("brand") ?? "",
    name: formData.get("name"),
    colorName: formData.get("colorName"),
    colorHex: formData.get("colorHex") ?? "#6b6b73",
    weight: formData.get("weight") ?? "DK",
    metersPerSkein: formData.get("metersPerSkein") ? Number(formData.get("metersPerSkein")) : null,
    gramsPerSkein: formData.get("gramsPerSkein") ? Number(formData.get("gramsPerSkein")) : 100,
    quantity: formData.get("quantity") ? Number(formData.get("quantity")) : 1,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error instanceof ZodError ? parsed.error.issues : []) {
      const key = issue.path.join(".") || "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  await createYarn(user.id, parsed.data);
  revalidatePath("/yarn");
  return {};
}

export async function deleteYarnAction(yarnId: string) {
  const user = await requireUserOrThrow();
  const ok = await deleteYarn(user.id, yarnId);
  revalidatePath("/yarn");
  return { ok };
}

export async function updateYarnQuantityAction(input: { yarnId: string; quantity: number }) {
  const user = await requireUserOrThrow();
  const ok = await updateYarnQuantity(user.id, input.yarnId, Math.max(0, Math.floor(input.quantity)));
  revalidatePath("/yarn");
  return { ok };
}

/** Saves the 3D design attached to a pattern. */
export async function saveDesignAction(input: {
  patternId: string;
  name: string;
  shape: string;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  stitchCode: string | null;
  colorHex: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUserOrThrow();

  const design = await upsertDesign(user.id, {
    patternId: input.patternId,
    name: input.name.slice(0, 80),
    shape: input.shape,
    widthCm: clamp(input.widthCm, 1, 200),
    heightCm: clamp(input.heightCm, 1, 200),
    depthCm: clamp(input.depthCm, 1, 200),
    stitchCode: input.stitchCode,
    colorHex: /^#[0-9a-fA-F]{6}$/.test(input.colorHex) ? input.colorHex : "#6b6b73",
    params: "{}",
  });

  if (!design) return { ok: false, error: "Pattern not found." };

  revalidatePath(`/designer?pattern=${input.patternId}`);
  revalidatePath(`/patterns/${input.patternId}`);
  return { ok: true };
}

export async function createDesignFromPatternAction(input: {
  patternId: string;
  name: string;
  shape: string;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  colorHex: string;
}) {
  const result = await saveDesignAction({ ...input, stitchCode: null });
  if (result.ok) redirect(`/designer?pattern=${input.patternId}`);
  return result;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
