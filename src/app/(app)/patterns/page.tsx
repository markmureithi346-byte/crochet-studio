import Link from "next/link";
import { Shapes, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/data/auth";
import { listPatterns } from "@/lib/data/patterns";
import { GeneratePatternForm } from "@/components/pattern/generate-form";
import { NewPatternForm } from "@/components/pattern/new-pattern-form";
import { CATEGORY_LABELS, DIFFICULTY_LABELS, type ProjectCategory, type Difficulty } from "@/lib/validation/domain";

export const metadata = { title: "Pattern studio" };

export default async function PatternsPage() {
  const user = await requireUser();
  const patterns = await listPatterns(user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Pattern studio
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every pattern is structured data, so the stitch totals and the checks are
          computed rather than typed.
        </p>
      </header>

      {/* ---- Create ---- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shapes className="size-4" aria-hidden="true" />
              Start from a blank page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NewPatternForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" aria-hidden="true" />
              Generate from dimensions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GeneratePatternForm />
          </CardContent>
        </Card>
      </div>

      {/* ---- List ---- */}
      <section aria-labelledby="your-patterns">
        <h2 id="your-patterns" className="mb-4 font-display text-xl font-semibold text-ink">
          Your patterns
        </h2>

        {patterns.length === 0 ? (
          <EmptyState
            icon={<Shapes className="size-5" aria-hidden="true" />}
            title="No patterns yet"
            description="A pattern here becomes anything you want to make — a project to track, a 3D preview to check your dimensions."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {patterns.map((pattern) => {
              const rowCount = pattern.sections.reduce(
                (sum, section) => sum + section.rows.length,
                0,
              );
              return (
                <li key={pattern.id}>
                  <Card className="h-full transition-shadow hover:shadow-lift">
                    <Link
                      href={`/patterns/${pattern.id}`}
                      className="block h-full rounded-xl p-5 focus-visible:outline-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-lg font-semibold text-ink">
                          {pattern.name}
                        </h3>
                        <Badge tone="neutral">
                          {CATEGORY_LABELS[pattern.category as ProjectCategory] ?? pattern.category}
                        </Badge>
                      </div>

                      {pattern.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
                          {pattern.description}
                        </p>
                      ) : null}

                      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs">
                        <div>
                          <dt className="text-ink-subtle">Rounds</dt>
                          <dd className="font-stitch text-sm text-ink">{rowCount}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-subtle">Stitches</dt>
                          <dd className="font-stitch text-sm text-ink">{pattern.totalStitches}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-subtle">Level</dt>
                          <dd className="text-sm text-ink">
                            {DIFFICULTY_LABELS[pattern.difficulty as Difficulty] ??
                              pattern.difficulty}
                          </dd>
                        </div>
                      </dl>

                      {pattern._count.projects > 0 ? (
                        <p className="mt-3 text-xs text-ink-muted">
                          In progress as {pattern._count.projects} project
                          {pattern._count.projects === 1 ? "" : "s"}
                        </p>
                      ) : (
                        <p className="mt-3">
                          <span className="text-xs font-medium text-ink-muted underline underline-offset-4">
                            Start a project
                          </span>
                        </p>
                      )}
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-xs text-ink-subtle">
          Tip: open a pattern and use <strong>Read</strong> mode to follow it
          without the editor chrome.
        </p>
      </section>
    </div>
  );
}
