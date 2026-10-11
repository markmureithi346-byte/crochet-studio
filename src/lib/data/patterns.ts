import { prisma } from "@/lib/db";
import { countRow } from "@/lib/engine/stitch-math";
import { rowToEngineRow, stepsToDb } from "@/lib/engine/rows";
import { validateRows } from "@/lib/engine/validate";
import type { SavePatternInput } from "@/lib/validation/pattern";

/**
 * PATTERN REPOSITORY
 * ==================
 * EVERY function here takes a `userId` and filters by it.
 *
 * That is the entire authorization model for patterns: you can only ever reach
 * rows where `userId` matches. There is no "get pattern by id and check later"
 * pattern here, because forgetting that check once is a data breach.
 */

const patternInclude = {
  sections: {
    orderBy: { sortOrder: "asc" },
    include: {
      rows: {
        orderBy: { sortOrder: "asc" },
        include: { steps: { orderBy: { sortOrder: "asc" } } },
      },
    },
  },
  materials: { orderBy: { sortOrder: "asc" } },
  versions: { orderBy: { version: "desc" }, take: 10 },
  design: true,
} as const;

export type FullPattern = NonNullable<Awaited<ReturnType<typeof getPattern>>>;

export async function listPatterns(userId: string) {
  return prisma.pattern.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { rows: { select: { totalStitches: true } } },
      },
      _count: { select: { projects: true } },
    },
  });
}

/** Returns null when the pattern does not exist OR belongs to someone else. */
export async function getPattern(userId: string, patternId: string) {
  return prisma.pattern.findFirst({
    where: { id: patternId, userId },
    include: patternInclude,
  });
}

export async function createPattern(
  userId: string,
  input: { name: string; category: string; difficulty: string; description?: string },
) {
  return prisma.pattern.create({
    data: {
      userId,
      name: input.name,
      category: input.category,
      difficulty: input.difficulty,
      description: input.description ?? "",
      // Every pattern starts with one empty section so the editor has somewhere
      // to put the first round.
      sections: { create: [{ name: "BODY", sortOrder: 0 }] },
    },
  });
}

export interface SavePatternResult {
  ok: boolean;
  error?: string;
  totalRows: number;
  totalStitches: number;
  errors: number;
  warnings: number;
}

/**
 * Saves the editor's draft.
 *
 * DESIGN DECISION: id-preserving diff.
 * Rows the user kept keep their id and are updated in place; new rows are
 * created; removed rows are deleted. A naive "delete everything and recreate"
 * would be simpler but would DESTROY the progress rows of anyone who had
 * already started crocheting the pattern, because those rows reference row ids
 * with a foreign key. Deleting a row that has progress is refused and reported
 * instead of silently destroying work.
 */
export async function savePattern(
  userId: string,
  input: SavePatternInput,
): Promise<SavePatternResult> {
  const existing = await getPattern(userId, input.patternId);
  if (!existing) {
    return { ok: false, error: "Pattern not found.", totalRows: 0, totalStitches: 0, errors: 0, warnings: 0 };
  }

  // --- Recompute totals from the draft (never trust the client) -----------
  const engineRows = input.sections.flatMap((section) =>
    section.rows.map((row, index) => ({
      id: row.id,
      label: row.label,
      notes: row.notes,
      expectedStitches: row.expectedStitches,
      steps: row.steps,
      _sort: index,
    })),
  );

  const validation = validateRows(
    engineRows.map((row) => ({
      id: row.id,
      label: row.label,
      steps: row.steps,
      expectedStitches: row.expectedStitches,
    })),
  );

  // `Pattern.totalStitches` means "how many stitches are in the finished piece"
  // — i.e. the count the LAST row produces. It is a display figure, not a sum of
  // work done. Total *work* is derived from progress rows at tracking time.
  const lastRowSteps = [...input.sections]
    .flatMap((section) => section.rows)
    .at(-1)?.steps;
  const finishedStitches = lastRowSteps ? countRow(lastRowSteps) : 0;

  const existingRowIds = new Set(
    existing.sections.flatMap((section) => section.rows.map((row) => row.id)),
  );
  const keptRowIds = new Set(
    input.sections.flatMap((section) => section.rows.map((row) => row.id).filter(Boolean) as string[]),
  );
  const removedRowIds = [...existingRowIds].filter((id) => !keptRowIds.has(id));

  // Refuse to delete rows that a project has already recorded progress against.
  if (removedRowIds.length) {
    const inUse = await prisma.projectRowProgress.count({
      where: { rowId: { in: removedRowIds } },
    });
    if (inUse > 0) {
      return {
        ok: false,
        error:
          "Some rounds you removed are already part of a project you have started, so they were kept. Finish or delete that project first.",
        totalRows: validation.totalRows,
        totalStitches: existing.totalStitches,
        errors: validation.errorCount,
        warnings: validation.warningCount,
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    // Clear materials and rewrite them (small, ordered, no external references).
    await tx.patternMaterial.deleteMany({ where: { patternId: existing.id } });
    if (input.materials.length) {
      await tx.patternMaterial.createMany({
        data: input.materials
          .filter((material) => material.label.trim())
          .map((material, sortOrder) => ({
            patternId: existing.id,
            sortOrder,
            label: material.label,
            detail: material.detail,
            quantity: material.quantity,
          })),
      });
    }

    // Remove sections that are gone.
    const keptSectionIds = input.sections
      .map((section) => section.id)
      .filter(Boolean) as string[];
    const existingSectionIds = existing.sections.map((section) => section.id);
    const removedSectionIds = existingSectionIds.filter((id) => !keptSectionIds.includes(id));

    if (removedSectionIds.length) {
      await tx.patternSection.deleteMany({ where: { id: { in: removedSectionIds } } });
    }
    if (removedRowIds.length) {
      await tx.patternRow.deleteMany({ where: { id: { in: removedRowIds } } });
    }

    for (const [sectionIndex, section] of input.sections.entries()) {
      const sectionData = {
        name: section.name,
        sortOrder: sectionIndex,
      };

      const sectionRecord = section.id
        ? await tx.patternSection.update({ where: { id: section.id }, data: sectionData })
        : await tx.patternSection.create({ data: { ...sectionData, patternId: existing.id } });

      for (const [rowIndex, row] of section.rows.entries()) {
        const rowTotal = countRow(row.steps);
        const rowData = {
          label: row.label,
          sortOrder: rowIndex,
          totalStitches: rowTotal,
          expectedStitches: row.expectedStitches,
          notes: row.notes,
        };

        const rowRecord = row.id
          ? await tx.patternRow.update({ where: { id: row.id }, data: rowData })
          : await tx.patternRow.create({ data: { ...rowData, sectionId: sectionRecord.id } });

        // Steps have no external references, so replacing them wholesale is
        // safe and avoids a fiddly three-way diff.
        await tx.patternRowStep.deleteMany({ where: { rowId: rowRecord.id } });
        if (row.steps.length) {
          await tx.patternRowStep.createMany({
            data: stepsToDb(row.steps).map((step) => ({ ...step, rowId: rowRecord.id })),
          });
        }
      }
    }

    await tx.pattern.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        description: input.description,
        category: input.details.category,
        difficulty: input.details.difficulty,
        hookSizeMm: input.details.hookSizeMm,
        yarnWeight: input.details.yarnWeight,
        finishedWidthCm: input.details.finishedWidthCm,
        finishedHeightCm: input.details.finishedHeightCm,
        gaugeStitches: input.details.gaugeStitches,
        gaugeRows: input.details.gaugeRows,
        totalRows: validation.totalRows,
        totalStitches: finishedStitches,
      },
    });
  });

  return {
    ok: true,
    totalRows: validation.totalRows,
    totalStitches: finishedStitches,
    errors: validation.errorCount,
    warnings: validation.warningCount,
  };
}

/** Replaces materials + rows with an immutable JSON snapshot of the pattern. */
export async function saveVersion(
  userId: string,
  patternId: string,
  input: { label: string; notes: string },
): Promise<{ ok: boolean; version?: number; error?: string }> {
  const pattern = await getPattern(userId, patternId);
  if (!pattern) return { ok: false, error: "Pattern not found." };

  const latest = await prisma.patternVersion.findFirst({
    where: { patternId },
    orderBy: { version: "desc" },
  });
  const version = (latest?.version ?? 0) + 1;

  await prisma.patternVersion.create({
    data: {
      patternId,
      version,
      label: input.label,
      notes: input.notes,
      snapshot: JSON.stringify({
        name: pattern.name,
        description: pattern.description,
        totalRows: pattern.totalRows,
        totalStitches: pattern.totalStitches,
        materials: pattern.materials,
        sections: pattern.sections.map((section) => ({
          name: section.name,
          rows: section.rows.map((row) => ({
            label: row.label,
            totalStitches: row.totalStitches,
            expectedStitches: row.expectedStitches,
            notes: row.notes,
            steps: row.steps.map((step) => ({
              type: step.type,
              stitchCode: step.stitchCode,
              count: step.count,
              groupJson: step.groupJson,
              note: step.note,
            })),
          })),
        })),
      }),
    },
  });

  return { ok: true, version };
}

/** Turns a pattern into a real project, pre-filling nothing — progress starts at zero. */
export async function createProjectFromPattern(
  userId: string,
  input: { patternId: string; name?: string },
) {
  const pattern = await prisma.pattern.findFirst({
    where: { id: input.patternId, userId },
  });
  if (!pattern) return null;

  return prisma.project.create({
    data: {
      userId,
      patternId: pattern.id,
      name: input.name?.trim() || pattern.name,
    },
  });
}

export async function getValidation(userId: string, patternId: string) {
  const pattern = await getPattern(userId, patternId);
  if (!pattern) return null;
  const rows = pattern.sections.flatMap((section) => section.rows);
  return validateRows(rows.map(rowToEngineRow));
}
