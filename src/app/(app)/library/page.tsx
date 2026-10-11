import Link from "next/link";
import { Compass, Shapes } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/data/auth";
import { listPatterns } from "@/lib/data/patterns";
import { listProjects } from "@/lib/data/projects";
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  PROJECT_CATEGORIES,
  type Difficulty,
} from "@/lib/validation/domain";

export const metadata = { title: "Pattern library" };

/**
 * THE LIBRARY
 * -----------
 * Today this is YOUR library, organised by category. Sharing with other people
 * exists in the schema (`visibility`) but there is deliberately no community
 * feed here: a public catalogue with no moderation, no quality signal and no
 * search would be a worse experience than none at all.
 *
 * The honest position is stated on the page rather than hidden.
 */
export default async function LibraryPage() {
  const user = await requireUser();
  const [patterns, projects] = await Promise.all([listPatterns(user.id), listProjects(user.id)]);

  const madeCount = projects.filter((project) => project.status === "COMPLETED").length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Pattern library
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Everything you have designed, grouped by what you are making.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Patterns" value={patterns.length} />
        <Stat label="Projects" value={projects.length} />
        <Stat label="Finished" value={madeCount} />
        <Stat label="Categories" value={new Set(patterns.map((p) => p.category)).size} />
      </div>

      {patterns.length === 0 ? (
        <EmptyState
          icon={<Shapes className="size-5" aria-hidden="true" />}
          title="Your library is empty"
          description="Patterns you create or generate will be collected here, so you can find last winter's scarf when you need it."
          action={
            <Button asChild>
              <Link href="/patterns">Create a pattern</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {PROJECT_CATEGORIES.map((category) => {
            const inCategory = patterns.filter((pattern) => pattern.category === category);
            if (inCategory.length === 0) return null;

            return (
              <section key={category} aria-labelledby={`cat-${category}`}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 id={`cat-${category}`} className="font-display text-lg font-semibold text-ink">
                    {CATEGORY_LABELS[category]}
                  </h2>
                  <Badge tone="neutral">{inCategory.length}</Badge>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {inCategory.map((pattern) => (
                    <li key={pattern.id}>
                      <Card className="h-full transition-shadow hover:shadow-lift">
                        <Link href={`/patterns/${pattern.id}`} className="block rounded-xl p-4">
                          <h3 className="font-medium text-ink">{pattern.name}</h3>
                          <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
                            {pattern.description || "No description yet."}
                          </p>
                          <p className="mt-3 font-stitch text-xs text-ink-subtle">
                            {pattern.totalRows} rounds · {pattern.totalStitches} stitches ·{" "}
                            {DIFFICULTY_LABELS[pattern.difficulty as Difficulty] ??
                              pattern.difficulty}
                          </p>
                        </Link>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <section className="rounded-xl border border-line bg-surface-2 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Compass className="size-4" aria-hidden="true" />
          Discover other makers
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Public sharing is modelled in the database but not switched on. It needs
          search, moderation and a real reason to visit before it is worth
          building — a half-built social feed would be worse than none. Your
          patterns stay private by default, and there is no setting that can
          make them public by accident.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-subtle">{label}</p>
      <p className="mt-1 font-stitch text-2xl font-semibold text-ink">{value}</p>
    </Card>
  );
}
