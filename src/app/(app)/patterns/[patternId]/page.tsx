import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Boxes, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PatternEditor } from "@/components/pattern/pattern-editor";
import { StartProjectForm } from "@/components/pattern/start-project-form";
import { Viewport } from "@/components/three/viewport";
import { requireUser } from "@/lib/data/auth";
import { getPattern } from "@/lib/data/patterns";
import { getDesign, toDesignSpec } from "@/lib/data/designs";
import { suggestShape } from "@/lib/design/shapes";
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  YARN_WEIGHT_LABELS,
  type ProjectCategory,
  type Difficulty,
  type YarnWeight,
} from "@/lib/validation/domain";

/**
 * THE PATTERN PAGE
 * ----------------
 * One page, three jobs, which is why the editor has its own Read mode:
 *   Edit  — change rounds (the editor)
 *   Read  — follow the pattern (same data, no controls)
 *   Start — turn it into a project you can track
 *
 * The 3D preview is lazily loaded and only rendered when a design exists, so
 * opening a text pattern never downloads Three.js.
 */
export default async function PatternPage({ params }: PageProps<"/patterns/[patternId]">) {
  const { patternId } = await params;
  const user = await requireUser();

  // `getPattern` filters by userId, so another user's id returns 404 rather than
  // 403 — we do not confirm that the id exists at all.
  const pattern = await getPattern(user.id, patternId);
  if (!pattern) notFound();

  const design = await getDesign(user.id, pattern.id);
  const spec = design
    ? toDesignSpec(design)
    : {
        shape: suggestShape(pattern.category),
        widthCm: pattern.finishedWidthCm ?? 25,
        heightCm: pattern.finishedHeightCm ?? 25,
        depthCm: pattern.finishedWidthCm ?? 25,
        colorHex: "#8d8d94",
        stitchCode: null,
      };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/patterns">
            <ArrowLeft aria-hidden="true" />
            Patterns
          </Link>
        </Button>
        <Badge tone="neutral">
          {CATEGORY_LABELS[pattern.category as ProjectCategory] ?? pattern.category}
        </Badge>
        <Badge tone="neutral">
          {DIFFICULTY_LABELS[pattern.difficulty as Difficulty] ?? pattern.difficulty}
        </Badge>
        {pattern.yarnWeight ? (
          <Badge tone="neutral">
            {YARN_WEIGHT_LABELS[pattern.yarnWeight as YarnWeight] ?? pattern.yarnWeight}
            {pattern.hookSizeMm ? ` · ${pattern.hookSizeMm}mm hook` : ""}
          </Badge>
        ) : null}
      </div>

      {/*
        Layout: the editor gets the room it needs, and the sidebar is a quiet
        rail rather than a column of equal weight. Previously both were given
        equal prominence, which made the pattern feel like one panel among
        several — when the pattern IS the page.
      */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
        <PatternEditor
          pattern={{
            id: pattern.id,
            name: pattern.name,
            description: pattern.description,
            category: pattern.category,
            difficulty: pattern.difficulty,
            hookSizeMm: pattern.hookSizeMm,
            yarnWeight: pattern.yarnWeight,
            finishedWidthCm: pattern.finishedWidthCm,
            finishedHeightCm: pattern.finishedHeightCm,
            gaugeStitches: pattern.gaugeStitches,
            gaugeRows: pattern.gaugeRows,
            totalStitches: pattern.totalStitches,
            versions: pattern.versions.map((version) => ({
              id: version.id,
              version: version.version,
              label: version.label,
              createdAt: version.createdAt,
            })),
            materials: pattern.materials.map((material) => ({
              id: material.id,
              label: material.label,
              detail: material.detail,
              quantity: material.quantity,
            })),
            sections: pattern.sections.map((section) => ({
              id: section.id,
              name: section.name,
              rows: section.rows.map((row) => ({
                id: row.id,
                label: row.label,
                sortOrder: row.sortOrder,
                totalStitches: row.totalStitches,
                expectedStitches: row.expectedStitches,
                notes: row.notes,
                steps: row.steps,
              })),
            })),
          }}
        />

        {/* ---- Sidebar: preview + start ---- */}
        <aside className="space-y-4 xl:sticky xl:top-40 xl:self-start">
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="h-44 bg-surface-3">
              <Viewport spec={spec} />
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">3D preview</p>
                {design ? (
                  <Badge tone="success">Linked</Badge>
                ) : (
                  <Badge tone="warning">Estimate</Badge>
                )}
              </div>
              <p className="text-xs text-ink-muted">
                {design
                  ? "Sized from the design attached to this pattern."
                  : "Guessed from the category. Open the designer to set real dimensions."}
              </p>
              <Button asChild variant="secondary" size="sm" block>
                <Link href={`/designer?pattern=${pattern.id}`}>
                  <Boxes aria-hidden="true" />
                  {design ? "Edit in designer" : "Open designer"}
                </Link>
              </Button>
            </div>
          </div>

          {pattern.materials.length > 0 ? (
            <div className="rounded-xl border border-line bg-surface p-4">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-ink-subtle">
                Materials
              </h2>
              <ul className="mt-2 space-y-1.5">
                {pattern.materials.map((material) => (
                  <li key={material.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-ink-muted">
                      {material.label}
                      {material.detail ? ` — ${material.detail}` : ""}
                    </span>
                    {material.quantity ? (
                      <span className="font-stitch text-xs text-ink">{material.quantity}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-subtle">
                Edit these under Spec in the editor.
              </p>
            </div>
          ) : null}

          <div className="rounded-xl border border-line bg-surface p-4">
            <h2 className="flex items-center gap-2 text-sm font-medium text-ink">
              <Hammer className="size-4" aria-hidden="true" />
              Make it
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Creates a project you can track round by round.
            </p>
            <div className="mt-3">
              <StartProjectForm patternId={pattern.id} patternName={pattern.name} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
