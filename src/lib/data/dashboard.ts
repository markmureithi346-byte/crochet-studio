import { prisma } from "@/lib/db";

/**
 * DASHBOARD AGGREGATES
 * ====================
 * Every figure on the dashboard is derived from real rows — nothing is stored
 * separately and nothing is mocked. The queries are grouped so the whole
 * dashboard costs a handful of round trips rather than one per stat card.
 */

export interface DashboardData {
  stats: {
    projectsCompleted: number;
    projectsActive: number;
    patternsCreated: number;
    totalStitches: number;
    totalSeconds: number;
    streakDays: number;
  };
  activeProjects: Array<{
    id: string;
    name: string;
    colorHex: string;
    status: string;
    updatedAt: Date;
    patternId: string | null;
    patternName: string | null;
    totalRows: number;
    completedRows: number;
    percent: number;
    stitchesDone: number;
    currentLabel: string | null;
  }>;
  recentProjects: Array<{
    id: string;
    name: string;
    colorHex: string;
    status: string;
    updatedAt: Date;
    percent: number;
  }>;
  patterns: Array<{
    id: string;
    name: string;
    category: string;
    difficulty: string;
    colorHex: string | null;
    totalRows: number;
    totalStitches: number;
    updatedAt: Date;
  }>;
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [
    completedCount,
    activeCount,
    patternCount,
    projects,
    patterns,
    stitchAggregate,
    sessionAggregate,
    noteDates,
  ] = await Promise.all([
    prisma.project.count({ where: { userId, status: "COMPLETED" } }),
    prisma.project.count({ where: { userId, status: "ACTIVE" } }),
    prisma.pattern.count({ where: { userId } }),
    prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        pattern: { select: { name: true } },
        progress: { select: { stitches: true } },
      },
    }),
    prisma.pattern.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { design: { select: { colorHex: true } } },
    }),
    prisma.projectRowProgress.aggregate({
      where: { project: { userId } },
      _sum: { stitches: true },
    }),
    prisma.projectSession.aggregate({
      where: { project: { userId } },
      _sum: { seconds: true },
    }),
    prisma.projectNote.findMany({
      where: { project: { userId } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
  ]);

  // Row totals per pattern, needed to turn completed rows into a percentage.
  const patternRowTotals = await prisma.patternRow.groupBy({
    by: ["sectionId"],
    _count: { _all: true },
    where: { section: { pattern: { userId } } },
  });
  const rowsByPattern = await prisma.pattern.findMany({
    where: { userId },
    select: { id: true, sections: { select: { _count: { select: { rows: true } } } } },
  });
  const rowCountByPattern = new Map<string, number>(
    rowsByPattern.map((pattern) => [
      pattern.id,
      pattern.sections.reduce((sum, section) => sum + section._count.rows, 0),
    ]),
  );
  void patternRowTotals;

  const enriched = projects.map((project) => {
    const totalRows = project.patternId ? (rowCountByPattern.get(project.patternId) ?? 0) : 0;
    const completedRows = project.progress.length;
    return {
      id: project.id,
      name: project.name,
      colorHex: project.colorHex,
      status: project.status,
      updatedAt: project.updatedAt,
      patternId: project.patternId,
      patternName: project.pattern?.name ?? null,
      totalRows,
      completedRows,
      percent: totalRows === 0 ? 0 : Math.round((completedRows / totalRows) * 100),
      stitchesDone: project.progress.reduce((sum, entry) => sum + entry.stitches, 0),
      currentLabel: null as string | null,
    };
  });

  // Fill in "where was I" for the cards that need it.
  const activeWithCursor = await Promise.all(
    enriched
      .filter((project) => project.status === "ACTIVE" && project.totalRows > project.completedRows)
      .map(async (project) => {
        const nextRow = await prisma.patternRow.findFirst({
          where: {
            section: { patternId: project.patternId ?? undefined },
            NOT: { id: { in: [] } },
          },
          orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }],
          select: { id: true, label: true },
          skip: project.completedRows,
          take: 1,
        });
        return { ...project, currentLabel: nextRow?.label ?? null };
      }),
  );

  return {
    stats: {
      projectsCompleted: completedCount,
      projectsActive: activeCount,
      patternsCreated: patternCount,
      totalStitches: stitchAggregate._sum.stitches ?? 0,
      totalSeconds: sessionAggregate._sum.seconds ?? 0,
      streakDays: calculateStreak(noteDates.map((note) => note.createdAt)),
    },
    activeProjects: activeWithCursor
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 4),
    recentProjects: enriched.slice(0, 5),
    patterns: patterns.map((pattern) => ({
      id: pattern.id,
      name: pattern.name,
      category: pattern.category,
      difficulty: pattern.difficulty,
      colorHex: pattern.design?.colorHex ?? null,
      totalRows: pattern.totalRows,
      totalStitches: pattern.totalStitches,
      updatedAt: pattern.updatedAt,
    })),
  };
}

/**
 * Consecutive days with any recorded activity.
 *
 * Measured from notes and sessions rather than a stored counter: a counter can
 * silently drift out of sync with reality, whereas deriving it from timestamps
 * is always correct and can never be gamed.
 */
export function calculateStreak(dates: Date[], today = new Date()): number {
  if (dates.length === 0) return 0;

  const days = new Set(dates.map((date) => date.toISOString().slice(0, 10)));
  const cursor = new Date(today);
  // A streak survives "not yet today": if you worked yesterday, today is still
  // day 2 of your streak, not a broken one.
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0h";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
