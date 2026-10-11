import Link from "next/link";
import { Plus, NotebookPen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/data/auth";
import { listPatterns } from "@/lib/data/patterns";
import { listProjects } from "@/lib/data/projects";
import { NewProjectForm } from "@/components/project/new-project-form";
import { StatusPill } from "@/components/project/crochet-mode";

export const metadata = { title: "My projects" };

export default async function ProjectsPage() {
  const user = await requireUser();
  const [projects, patterns] = await Promise.all([listProjects(user.id), listPatterns(user.id)]);

  const rowTotals = new Map<string, number>(
    patterns.map((pattern) => [
      pattern.id,
      pattern.sections.reduce((sum, section) => sum + section.rows.length, 0),
    ]),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">My projects</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Real objects you are making, and where each one got to.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" aria-hidden="true" />
            New project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NewProjectForm
            patterns={patterns.map((pattern) => ({ id: pattern.id, name: pattern.name }))}
          />
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <EmptyState
          icon={<NotebookPen className="size-5" aria-hidden="true" />}
          title="Nothing on the hook"
          description="Start a project from one of your patterns and this is where you will come back to it — with the round you stopped on, waiting."
          action={
            patterns.length > 0 ? (
              <Button asChild>
                <Link href="/patterns">Choose a pattern</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/patterns">Create a pattern first</Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => {
            const totalRows = project.patternId ? (rowTotals.get(project.patternId) ?? 0) : 0;
            const done = project.progress.length;

            return (
              <li key={project.id}>
                <Card className="h-full transition-shadow hover:shadow-lift">
                  <Link href={`/projects/${project.id}`} className="block rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-semibold text-ink">{project.name}</h3>
                      <StatusPill status={project.status} />
                    </div>

                    <p className="mt-1 text-xs text-ink-subtle">
                      {project.pattern?.name ?? "No pattern"} ·{" "}
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </p>

                    <div className="mt-4">
                      <Progress
                        value={done}
                        max={Math.max(1, totalRows)}
                        label={`${done} of ${totalRows} rounds`}
                        tone={project.status === "COMPLETED" ? "moss" : "accent"}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                      <span>
                        {project._count.notes} note{project._count.notes === 1 ? "" : "s"} ·{" "}
                        {project._count.photos} photo{project._count.photos === 1 ? "" : "s"}
                      </span>
                      <span className="font-stitch">
                        {project.progress.reduce((sum, entry) => sum + entry.stitches, 0)} st
                      </span>
                    </div>
                  </Link>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
