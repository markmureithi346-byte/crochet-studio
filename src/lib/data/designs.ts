import { prisma } from "@/lib/db";
import type { DesignSpec } from "@/lib/design/shapes";
import type { ShapeType } from "@/lib/validation/domain";

/**
 * DESIGN REPOSITORY
 * =================
 * A Design is the parametric spec behind a 3D preview: shape + dimensions +
 * colour. It is a 1:1 optional companion to a Pattern.
 *
 * Why it is separate from Pattern: a hand-written pattern can have a preview
 * without ever having been "designed", and a generated design produces a
 * pattern. Keeping them apart means neither feature has to pretend the other
 * exists.
 */

export async function getDesign(userId: string, patternId: string) {
  return prisma.design.findFirst({ where: { userId, patternId } });
}

export async function listDesigns(userId: string) {
  return prisma.design.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { pattern: { select: { id: true, name: true } } },
  });
}

export async function upsertDesign(
  userId: string,
  input: {
    patternId: string;
    name: string;
    shape: string;
    widthCm: number;
    heightCm: number;
    depthCm: number;
    stitchCode: string | null;
    colorHex: string;
    params: string;
  },
) {
  // Confirm the pattern belongs to this user before writing a design for it —
  // otherwise the patternId is an id-guessing oracle.
  const pattern = await prisma.pattern.findFirst({
    where: { id: input.patternId, userId },
    select: { id: true },
  });
  if (!pattern) return null;

  return prisma.design.upsert({
    where: { patternId: input.patternId },
    create: { userId, ...input },
    update: {
      name: input.name,
      shape: input.shape,
      widthCm: input.widthCm,
      heightCm: input.heightCm,
      depthCm: input.depthCm,
      stitchCode: input.stitchCode,
      colorHex: input.colorHex,
      params: input.params,
    },
  });
}

export async function deleteDesign(userId: string, patternId: string) {
  const result = await prisma.design.deleteMany({ where: { patternId, userId } });
  return result.count > 0;
}

/** DB row -> the shape spec the 3D component needs. */
export function toDesignSpec(
  design: { shape: string; widthCm: number; heightCm: number; depthCm: number; colorHex: string; stitchCode: string | null },
): DesignSpec {
  return {
    shape: design.shape as ShapeType,
    widthCm: design.widthCm,
    heightCm: design.heightCm,
    depthCm: design.depthCm,
    colorHex: design.colorHex,
    stitchCode: design.stitchCode,
  };
}
