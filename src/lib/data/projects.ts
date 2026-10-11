import { prisma } from "@/lib/db";
import type { PatternStep } from "@/lib/engine/stitch-math";
import { stepsFromDb } from "@/lib/engine/rows";

/**
 * PROJECT REPOSITORY
 * ==================
 * A Project is an instance of a Pattern being physically crocheted. The progress
 * model is deliberately simple and denormalised on purpose:
 *
 *   one ProjectRowProgress row per COMPLETED round
 *
 * From that alone we can derive "24 of 31 rounds", "how many stitches have I
 * done", and "where was I". Storing an explicit `currentRow` would be a second
 * source of truth that could disagree with the completed set — and the moment it
 * disagrees, the user loses their place. Less state = fewer bugs.
 */

export async function listProjects(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      pattern: { select: { id: true, name: true, totalRows: true } },
      progress: { select: { rowId: true, stitches: true, completedAt: true } },
      sessions: { select: { seconds: true } },
      _count: { select: { notes: true, photos: true } },
    },
  });
}

export async function getProject(userId: string, projectId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      pattern: {
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
            include: {
              rows: {
                orderBy: { sortOrder: "asc" },
                include: { steps: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      },
      progress: true,
      sessions: { orderBy: { startedAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      photos: { orderBy: { createdAt: "desc" } },
    },
  });
}

/** Every row of the pattern in order, flattened across sections. */
export async function getProjectRows(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: {
      pattern: {
        select: {
          sections: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              rows: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  label: true,
                  sortOrder: true,
                  totalStitches: true,
                  notes: true,
                  steps: { orderBy: { sortOrder: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!project?.pattern) return null;

  const completed = await prisma.projectRowProgress.findMany({
    where: { projectId },
    select: { rowId: true, completedAt: true, stitches: true },
  });
  const completedIds = new Set(completed.map((row) => row.rowId));

  return {
    sections: project.pattern.sections.map((section) => ({
      id: section.id,
      name: section.name,
      rows: section.rows.map((row) => ({
        id: row.id,
        label: row.label,
        totalStitches: row.totalStitches,
        notes: row.notes,
        steps: stepsFromDb(row.steps) as PatternStep[],
        completed: completedIds.has(row.id),
      })),
    })),
  };
}

export interface ProjectProgressSummary {
  totalRows: number;
  completedRows: number;
  percent: number;
  stitchesDone: number;
  stitchesTotal: number;
  currentLabel: string | null;
  currentStitchText: string | null;
}

/**
 * Derives the entire progress picture from the completed-row set.
 * Used by the dashboard, the project page and Crochet Mode, so all three can
 * never disagree about how far along someone is.
 */
export function summariseProgress(
  sections: Array<{ name: string; rows: Array<{ label: string; completed: boolean; totalStitches: number; steps?: PatternStep[] }> }>,
): ProjectProgressSummary {
  const allRows = sections.flatMap((section) =>
    section.rows.map((row) => ({ ...row, sectionName: section.name })),
  );
  const completedRows = allRows.filter((row) => row.completed).length;
  const totalRows = allRows.length;
  const stitchesDone = allRows
    .filter((row) => row.completed)
    .reduce((sum, row) => sum + row.totalStitches, 0);
  const stitchesTotal = allRows.reduce((sum, row) => sum + row.totalStitches, 0);

  const current = allRows.find((row) => !row.completed);

  return {
    totalRows,
    completedRows,
    percent: totalRows === 0 ? 0 : Math.round((completedRows / totalRows) * 100),
    stitchesDone,
    stitchesTotal,
    currentLabel: current?.label ?? null,
    currentStitchText: current?.steps?.length ? formatStepsForDisplay(current.steps) : null,
  };
}

function formatStepsForDisplay(steps: PatternStep[]): string {
  return steps
    .map((step) => {
      if (step.type === "STITCH") {
        return step.count > 1 ? `${step.stitch} × ${step.count}` : step.stitch;
      }
      const inner = step.steps.map((child) => child.stitch).join(", ");
      return `(${inner}) × ${step.count}`;
    })
    .join(", ");
}

export async function createProject(
  userId: string,
  input: { name: string; patternId?: string },
) {
  return prisma.project.create({
    data: {
      userId,
      name: input.name,
      patternId: input.patternId ?? null,
    },
  });
}

/**
 * Marks a round complete. Idempotent: completing twice does not double-count,
 * which matters because a double-tap on a phone is inevitable.
 */
export async function completeRow(userId: string, projectId: string, rowId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { patternId: true },
  });
  if (!project?.patternId) return { ok: false, error: "This project has no pattern." };

  const row = await prisma.patternRow.findFirst({
    where: { id: rowId, section: { patternId: project.patternId } },
    select: { id: true, totalStitches: true },
  });
  if (!row) return { ok: false, error: "Round not found." };

  await prisma.projectRowProgress.upsert({
    where: { projectId_rowId: { projectId, rowId } },
    create: { projectId, rowId, stitches: row.totalStitches },
    update: {},
  });

  await touchProject(projectId, userId);
  return { ok: true };
}

/** Undo. The user will mis-tap; being able to go back is not optional. */
export async function uncompleteRow(userId: string, projectId: string, rowId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) return { ok: false, error: "Project not found." };

  await prisma.projectRowProgress.deleteMany({ where: { projectId, rowId } });
  await touchProject(projectId, userId);
  return { ok: true };
}

export async function setProjectStatus(
  userId: string,
  projectId: string,
  status: string,
) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) return { ok: false, error: "Project not found." };

  await prisma.project.update({
    where: { id: projectId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });
  return { ok: true };
}

export async function addNote(userId: string, projectId: string, body: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) return { ok: false, error: "Project not found." };

  await prisma.projectNote.create({ data: { projectId, body } });
  await touchProject(projectId, userId);
  return { ok: true };
}

export async function startSession(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) return { ok: false, error: "Project not found." };

  const open = await prisma.projectSession.findFirst({
    where: { projectId, endedAt: null },
  });
  if (open) return { ok: true, alreadyRunning: true };

  await prisma.projectSession.create({ data: { projectId } });
  return { ok: true, alreadyRunning: false };
}

export async function stopSession(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) return { ok: false, error: "Project not found." };

  const open = await prisma.projectSession.findFirst({ where: { projectId, endedAt: null } });
  if (!open) return { ok: true, alreadyStopped: true };

  const seconds = Math.max(
    0,
    Math.round((Date.now() - open.startedAt.getTime()) / 1000),
  );
  await prisma.projectSession.update({
    where: { id: open.id },
    data: { endedAt: new Date(), seconds },
  });
  return { ok: true, seconds };
}

export async function deleteProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) return { ok: false, error: "Project not found." };
  await prisma.project.delete({ where: { id: projectId } });
  return { ok: true };
}

/** Keeps "recently edited" ordering honest after any mutation. */
async function touchProject(projectId: string, userId: string) {
  await prisma.project.updateMany({ where: { id: projectId, userId }, data: { updatedAt: new Date() } });
}
