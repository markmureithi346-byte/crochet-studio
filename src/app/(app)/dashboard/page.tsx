import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  FileText,
  Hammer,
  Package,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/data/auth";
import { formatDuration, getDashboardData } from "@/lib/data/dashboard";
import { StatusPill } from "@/components/project/crochet-mode";
import { CATEGORY_LABELS, type ProjectCategory } from "@/lib/validation/domain";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-sm text-ink-muted">{greeting()}, {user.name.split(" ")[0]}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">
          Continue creating.
        </h1>
      </header>

      {/* ---- Continue working ---- */}
      <section aria-labelledby="continue-heading" className="space-y-4">
        <h2 id="continue-heading" className="font-display text-xl font-semibold text-ink">
          Continue working
        </h2>

        {data.activeProjects.length === 0 ? (
          <EmptyState
            icon={<Hammer className="size-5" aria-hidden="true" />}
            title="Nothing on the hook right now"
            description="Start a project from one of your patterns and it will wait here for you — round by round, exactly where you stopped."
            action={
              <Button asChild>
                <Link href="/projects">
                  Start a project
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {data.activeProjects.map((project) => (
              <li key={project.id}>
                <Card className="h-full transition-shadow hover:shadow-lift">
                  <Link href={`/crochet/${project.id}`} className="block rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: project.colorHex }}
                          aria-hidden="true"
                        />
                        <h3 className="font-display text-lg font-semibold text-ink">
                          {project.name}
                        </h3>
                      </div>
                      <StatusPill status={project.status} />
                    </div>

                    <div className="mt-4">
                      <Progress
                        value={project.completedRows}
                        max={Math.max(1, project.totalRows)}
                        label={`Row ${project.completedRows + 1} of ${project.totalRows}`}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                      <span>{project.currentLabel ?? "Next round ready"}</span>
                      <span className="font-stitch">{project.stitchesDone} stitches</span>
                    </div>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- Statistics ---- */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="mb-4 font-display text-xl font-semibold text-ink">
          Your numbers
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="In progress" value={data.stats.projectsActive} />
          <Stat label="Finished" value={data.stats.projectsCompleted} />
          <Stat label="Patterns" value={data.stats.patternsCreated} />
          <Stat label="Stitches done" value={data.stats.totalStitches.toLocaleString()} />
          <Stat label="Time crocheting" value={formatDuration(data.stats.totalSeconds)} />
          <Stat
            label="Day streak"
            value={data.stats.streakDays}
            icon={<TrendingUp className="size-3.5" aria-hidden="true" />}
          />
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- Recent ---- */}
        <section aria-labelledby="recent-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="recent-heading" className="font-display text-xl font-semibold text-ink">
              Recently touched
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/projects">
                All projects
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {data.recentProjects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line-strong bg-surface-2 px-4 py-6 text-center text-sm text-ink-muted">
              Nothing yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.recentProjects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-3"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: project.colorHex }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{project.name}</span>
                    <span className="font-stitch text-xs text-ink-muted">{project.percent}%</span>
                    <span className="hidden text-xs text-ink-subtle sm:inline">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- Designs ---- */}
        <section aria-labelledby="designs-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="designs-heading" className="font-display text-xl font-semibold text-ink">
              Your designs
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/patterns">
                All patterns
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {data.patterns.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line-strong bg-surface-2 px-4 py-6 text-center text-sm text-ink-muted">
              No patterns yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.patterns.map((pattern) => (
                <li key={pattern.id}>
                  <Link
                    href={`/patterns/${pattern.id}`}
                    className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{pattern.name}</span>
                      <span className="block text-xs text-ink-subtle">
                        {CATEGORY_LABELS[pattern.category as ProjectCategory] ?? pattern.category}
                      </span>
                    </span>
                    <span className="font-stitch text-xs text-ink-muted">
                      {pattern.totalRows}r · {pattern.totalStitches}st
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ---- Quick actions ---- */}
      <section aria-labelledby="quick-heading">
        <h2 id="quick-heading" className="mb-4 font-display text-xl font-semibold text-ink">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/patterns"
            icon={<FileText className="size-4" aria-hidden="true" />}
            label="New pattern"
            detail="Write or generate one"
          />
          <QuickAction
            href="/projects"
            icon={<Hammer className="size-4" aria-hidden="true" />}
            label="New project"
            detail="Track your progress"
          />
          <QuickAction
            href="/designer"
            icon={<Boxes className="size-4" aria-hidden="true" />}
            label="Open 3D designer"
            detail="Check your dimensions"
          />
          <QuickAction
            href="/yarn"
            icon={<Package className="size-4" aria-hidden="true" />}
            label="Add yarn"
            detail="Update your stash"
          />
          <QuickAction
            href="/patterns"
            icon={<Sparkles className="size-4" aria-hidden="true" />}
            label="Generate a pattern"
            detail="From a shape and size"
          />
        </div>
      </section>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <dt className="flex items-center gap-1 text-xs text-ink-subtle">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-stitch text-2xl font-semibold text-ink">{value}</dd>
    </Card>
  );
}

function QuickAction({
  href,
  icon,
  label,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-3 hover:border-line-strong"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-ink-muted">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block truncate text-xs text-ink-subtle">{detail}</span>
      </span>
    </Link>
  );
}
