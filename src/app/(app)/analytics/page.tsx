import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/data/auth";
import { formatDuration, getDashboardData } from "@/lib/data/dashboard";
import { listProjects } from "@/lib/data/projects";
import { listPatterns } from "@/lib/data/patterns";

export const metadata = { title: "Analytics" };

/**
 * ANALYTICS
 * ---------
 * Everything here is derived from real rows at read time — there are no
 * pre-aggregated counters that can drift out of sync with reality.
 *
 * What we deliberately do NOT chart: "stitches per hour" or "skill level".
 * Both would look impressive and both would be invented precision. Tension,
 * interruptions and life make per-hour stitch rates meaningless.
 */
export default async function AnalyticsPage() {
  const user = await requireUser();
  const [data, projects, patterns] = await Promise.all([
    getDashboardData(user.id),
    listProjects(user.id),
    listPatterns(user.id),
  ]);

  const rowTotals = new Map<string, number>(
    patterns.map((pattern) => [
      pattern.id,
      pattern.sections.reduce((sum, section) => sum + section.rows.length, 0),
    ]),
  );

  const perProject = projects.map((project) => {
    const total = project.patternId ? (rowTotals.get(project.patternId) ?? 0) : 0;
    const done = project.progress.length;
    return {
      id: project.id,
      name: project.name,
      status: project.status,
      done,
      total,
      percent: total === 0 ? 0 : Math.round((done / total) * 100),
      seconds: project.sessions.reduce((sum, session) => sum + session.seconds, 0),
      stitches: project.progress.reduce((sum, entry) => sum + entry.stitches, 0),
    };
  });

  const totalSeconds = perProject.reduce((sum, project) => sum + project.seconds, 0);
  const totalStitches = perProject.reduce((sum, project) => sum + project.stitches, 0);

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={<TrendingUp className="size-5" aria-hidden="true" />}
          title="Nothing to measure yet"
          description="Once you start a project, this page shows where your time and stitches actually go."
          action={
            <Button asChild>
              <Link href="/projects">Start a project</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Derived from your own records. No vanity metrics, no invented scores.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total time" value={formatDuration(totalSeconds)} />
        <Stat label="Stitches" value={totalStitches.toLocaleString()} />
        <Stat label="Patterns written" value={data.stats.patternsCreated} />
        <Stat label="Day streak" value={data.stats.streakDays} />
      </dl>

      <Card>
        <CardHeader>
          <CardTitle>Progress by project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {perProject.map((project) => (
            <div key={project.id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <Link
                  href={`/projects/${project.id}`}
                  className="truncate font-medium text-ink underline-offset-4 hover:underline"
                >
                  {project.name}
                </Link>
                <span className="shrink-0 font-stitch text-xs text-ink-muted">
                  {project.done}/{project.total} · {formatDuration(project.seconds)}
                </span>
              </div>
              <Progress
                value={project.done}
                max={Math.max(1, project.total)}
                label={`${project.name} progress`}
                showValue={false}
                tone={project.status === "COMPLETED" ? "moss" : "accent"}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What this page will not tell you</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-ink-muted">
          <p>
            There is no “crocheting speed” score. Stitches per hour depends
            entirely on tension, interruptions and how small your hands are — it
            would measure your life, not your craft.
          </p>
          <p>
            There is also no skill rating. A beginner who finished six projects
            knows more than an expert who abandoned one.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge tone="neutral">honest by design</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className="mt-1 font-stitch text-xl font-semibold text-ink">{value}</dd>
    </Card>
  );
}
