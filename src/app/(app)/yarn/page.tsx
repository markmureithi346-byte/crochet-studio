import { Package, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { YarnForm } from "@/components/yarn/yarn-form";
import { DeleteYarnButton } from "@/components/yarn/delete-yarn-button";
import { requireUser } from "@/lib/data/auth";
import { listYarns, yarnTotals } from "@/lib/data/yarn";
import { YARN_WEIGHT_LABELS, type YarnWeight } from "@/lib/validation/domain";

export const metadata = { title: "Yarn inventory" };

export default async function YarnPage() {
  const user = await requireUser();
  const [yarns, totals] = await Promise.all([listYarns(user.id), yarnTotals(user.id)]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Yarn inventory
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          What you actually own, so estimates have something real to work from.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Skeins" value={totals.skeins} />
        <Stat label="Colours" value={totals.colours} />
        <Stat label="Total grams" value={totals.grams.toLocaleString()} />
        <Stat label="Total metres" value={totals.meters.toLocaleString()} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit p-5">
          <h2 className="font-display text-lg font-semibold text-ink">Add yarn</h2>
          <div className="mt-4">
            <YarnForm />
          </div>
        </Card>

        <section aria-labelledby="stash-heading" className="space-y-3">
          <h2 id="stash-heading" className="font-display text-xl font-semibold text-ink">
            Your stash
          </h2>

          {yarns.length === 0 ? (
            <EmptyState
              icon={<Package className="size-5" aria-hidden="true" />}
              title="No yarn yet"
              description="Add a few skeins and you will get range estimates instead of guesses when you generate a pattern."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {yarns.map((yarn) => (
                <li key={yarn.id}>
                  <Card className="flex h-full items-start gap-3 p-4">
                    <span
                      className="mt-0.5 size-10 shrink-0 rounded-lg border border-line"
                      style={{ backgroundColor: yarn.colorHex }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-medium text-ink">{yarn.name}</h3>
                          <p className="truncate text-xs text-ink-muted">
                            {[yarn.brand, yarn.colorName].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <DeleteYarnButton yarnId={yarn.id} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">
                          {YARN_WEIGHT_LABELS[yarn.weight as YarnWeight] ?? yarn.weight}
                        </Badge>
                        <Badge tone="neutral">{yarn.gramsPerSkein}g</Badge>
                        {yarn.metersPerSkein ? (
                          <Badge tone="neutral">{yarn.metersPerSkein}m</Badge>
                        ) : null}
                        <Badge tone="accent">
                          {yarn.quantity} {yarn.quantity === 1 ? "skein" : "skeins"}
                        </Badge>
                      </div>
                      {yarn._count.materials > 0 ? (
                        <p className="mt-2 text-xs text-ink-subtle">
                          Used by {yarn._count.materials} pattern
                          {yarn._count.materials === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          <p className="flex items-center gap-2 pt-2 text-xs text-ink-subtle">
            <Trash2 className="size-3.5" aria-hidden="true" />
            Removing yarn never deletes patterns — it only unlinks the material.
          </p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-subtle">{label}</p>
      <p className="mt-1 font-stitch text-xl font-semibold text-ink">{value}</p>
    </Card>
  );
}
