import { notFound } from "next/navigation";
import { CrochetMode, type CrochetRowView } from "@/components/project/crochet-mode";
import { requireUser } from "@/lib/data/auth";
import { getProjectRows } from "@/lib/data/projects";

export const metadata = { title: "Crochet mode" };

/**
 * CROCHET MODE — a bare, full-screen surface.
 *
 * Deliberately NOT inside the app shell: the sidebar and its links are exactly
 * the kind of thing you mis-tap with yarn-y fingers. One instruction, one
 * button, nothing else.
 *
 * The rows are flattened with their section name attached, because the editor
 * shows sections and the tracker has to know when you cross from BODY to ARMS.
 */
export default async function CrochetModePage({
  params,
}: PageProps<"/crochet/[projectId]">) {
  const { projectId } = await params;
  const user = await requireUser();

  const [project, data] = await Promise.all([
    getProjectName(user.id, projectId),
    getProjectRows(user.id, projectId),
  ]);

  if (!data || !project) notFound();

  const rows: CrochetRowView[] = data.sections.flatMap((section) =>
    section.rows.map((row) => ({
      id: row.id,
      label: row.label,
      sectionName: section.name,
      totalStitches: row.totalStitches,
      notes: row.notes,
      steps: row.steps,
      completed: row.completed,
    })),
  );

  return <CrochetMode projectId={projectId} projectName={project} rows={rows} />;
}

async function getProjectName(userId: string, projectId: string) {
  const { prisma } = await import("@/lib/db");
  const row = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { name: true },
  });
  return row?.name ?? null;
}
