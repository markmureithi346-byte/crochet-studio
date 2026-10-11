import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, Check, Clock, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/project/crochet-mode";
import { PhotoUploader } from "@/components/project/photo-uploader";
import { AddNoteForm } from "@/components/project/add-note-form";
import { ProjectControls } from "@/components/project/project-controls";
import { requireUser } from "@/lib/data/auth";
import { getProject } from "@/lib/data/projects";
import { publicUrlFor } from "@/lib/storage";

export const metadata = { title: "Project" };

export default async function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const user = await requireUser();

  const project = await getProject(user.id, projectId);
  if (!project) notFound();

  // Flatten the pattern's rows in reading order. The completed set is a Set for
  // O(1) lookup — this list can be a few hundred rows.
  const sections = (project.pattern?.sections ?? []).map((section) => ({
    name: section.name,
    rows: section.rows.map((row) => ({
      id: row.id,
      label: row.label,
      completed: project.progress.some((entry) => entry.rowId === row.id),
    })),
  }));

  const allRows = sections.flatMap((section) =>
    section.rows.map((row) => ({ ...row, sectionName: section.name })),
  );
  const completedCount = allRows.filter((row) => row.completed).length;
  const totalRows = allRows.length;
  const stitchesDone = project.progress.reduce((sum, entry) => sum + entry.stitches, 0);
  const totalSeconds = project.sessions.reduce((sum, session) => sum + session.seconds, 0);
  const nextRow = allRows.find((row) => !row.completed);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/projects">
            <ArrowLeft aria-hidden="true" />
            Projects
          </Link>
        </Button>
        <ProjectControls projectId={project.id} status={project.status} />
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            {project.name}
          </h1>
          <StatusPill status={project.status} />
        </div>
        <p className="text-sm text-ink-muted">
          {project.pattern?.name ?? "No pattern attached"} · started{" "}
          {new Date(project.startedAt).toLocaleDateString()}
        </p>
      </header>

      {/* ---- Progress ---- */}
      <Card>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Progress
              value={completedCount}
              max={Math.max(1, totalRows)}
              label={`${completedCount} of ${totalRows} rounds`}
              tone={project.status === "COMPLETED" ? "moss" : "accent"}
            />
          </div>
          <Stat label="Current round" value={nextRow?.label ?? "Finished"} />
          <Stat
            label="Stitches done"
            value={`${stitchesDone}`}
            hint={nextRow ? `next: ${nextRow.label}` : undefined}
          />
          <Stat label="Time spent" value={formatTime(totalSeconds)} />
        </CardContent>
      </Card>

      {totalRows > 0 ? (
        <div className="flex justify-center">
          <Button asChild size="lg">
            <Link href={`/crochet/${project.id}`}>
              <Check aria-hidden="true" />
              {completedCount === 0 ? "Start crocheting" : "Continue"}
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ---- Round list ---- */}
        <section aria-labelledby="rounds-heading" className="space-y-4">
          <h2 id="rounds-heading" className="font-display text-xl font-semibold text-ink">
            Rounds
          </h2>

          {totalRows === 0 ? (
            <EmptyState
              icon={<Clock className="size-5" aria-hidden="true" />}
              title="No rounds to track"
              description="Attach one of your patterns and its rounds will appear here, ready to tick off one at a time."
              action={
                <Button asChild>
                  <Link href="/patterns">Choose a pattern</Link>
                </Button>
              }
            />
          ) : (
            <ol className="space-y-1.5">
              {allRows.map((row, index) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                >
                  <span
                    className={
                      row.completed
                        ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-white"
                        : "flex size-5 shrink-0 items-center justify-center rounded-full border border-line-strong"
                    }
                    aria-hidden="true"
                  >
                    {row.completed ? <Check className="size-3" /> : null}
                  </span>
                  <span className="font-stitch w-24 shrink-0 text-xs text-ink-subtle">
                    {row.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-stitch text-ink">
                    {row.completed ? "Done" : "Not started"}
                  </span>
                  <span className="font-stitch text-xs text-ink-subtle">#{index + 1}</span>
                  <span className="sr-only">{row.completed ? "Completed" : "Not completed"}</span>
                </li>
              ))}
            </ol>
          )}

          {/* ---- Notes ---- */}
          <section aria-labelledby="notes-heading" className="space-y-3 pt-4">
            <h2 id="notes-heading" className="font-display text-xl font-semibold text-ink">
              Notes
            </h2>
            <AddNoteForm projectId={project.id} />

            {project.notes.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Nothing noted yet. Write down the things you will want to
                remember — the tension you used on a round, where you changed
                colour, what you would do differently.
              </p>
            ) : (
              <ul className="space-y-2">
                {project.notes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-lg border border-line bg-surface px-4 py-3 text-sm"
                  >
                    <p className="text-ink">{note.body}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-subtle">
                      <MessageSquarePlus className="size-3" aria-hidden="true" />
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>

        {/* ---- Photos + sessions ---- */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="size-4" aria-hidden="true" />
                Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUploader
                projectId={project.id}
                photos={project.photos.map((photo) => ({
                  id: photo.id,
                  storageKey: publicUrlFor(photo.storageKey),
                  caption: photo.caption,
                  createdAt: photo.createdAt,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4" aria-hidden="true" />
                Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {project.sessions.length === 0 ? (
                <p className="text-ink-muted">
                  No time logged yet. Toggle the timer in crochet mode.
                </p>
              ) : (
                <>
                  {project.sessions.slice(0, 6).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-2 border-b border-line pb-1.5 last:border-0 last:pb-0"
                    >
                      <span className="text-ink-muted">
                        {new Date(session.startedAt).toLocaleDateString()}
                      </span>
                      <span className="font-stitch text-ink">
                        {session.endedAt ? formatTime(session.seconds) : "running"}
                      </span>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-ink-subtle">
                    Total {formatTime(totalSeconds)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-ink-subtle">{label}</p>
      <p className="mt-0.5 font-stitch text-lg font-medium text-ink">{value}</p>
      {hint ? <p className="text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0h";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
