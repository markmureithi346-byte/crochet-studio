import { notFound } from "next/navigation";
import Link from "next/link";
import { Boxes, RotateCcw } from "lucide-react";
import { DesignerWorkspace } from "@/components/designer/designer-workspace";
import { requireUser } from "@/lib/data/auth";
import { getDesign, toDesignSpec } from "@/lib/data/designs";
import { getPattern } from "@/lib/data/patterns";
import { suggestShape } from "@/lib/design/shapes";
import type { DesignSpec } from "@/lib/design/shapes";
import { SHAPE_LABELS } from "@/lib/validation/domain";

export const metadata = { title: "3D designer" };

const DEFAULT_SPEC: DesignSpec = {
  shape: "CYLINDER",
  widthCm: 28,
  heightCm: 30,
  depthCm: 28,
  colorHex: "#8d8d94",
  stitchCode: "SC",
};

export default async function DesignerPage({ searchParams }: PageProps<"/designer">) {
  const user = await requireUser();
  const params = await searchParams;
  const patternId = typeof params.pattern === "string" ? params.pattern : undefined;

  // The designer has two modes: standalone, or editing the design attached to a
  // pattern. The pattern route decides which by whether an id is in the URL —
  // there is no mode toggle to forget to persist.
  let spec = DEFAULT_SPEC;
  let patternName: string | null = null;

  if (patternId) {
    const pattern = await getPattern(user.id, patternId);
    if (!pattern) notFound();
    patternName = pattern.name;

    const design = await getDesign(user.id, patternId);
    spec = design
      ? toDesignSpec(design)
      : {
          shape: suggestShape(pattern.category),
          widthCm: pattern.finishedWidthCm ?? 28,
          heightCm: pattern.finishedHeightCm ?? 30,
          depthCm: pattern.finishedWidthCm ?? 28,
          colorHex: "#8d8d94",
          // A pattern has no dominant-stitch column of its own; the design
          // record holds it when one exists.
          stitchCode: null,
        };
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Boxes className="size-4" aria-hidden="true" />
          {patternName ? (
            <Link href={`/patterns/${patternId}`} className="underline underline-offset-4">
              {patternName}
            </Link>
          ) : (
            <span>Standalone preview</span>
          )}
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">
          3D designer
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Change the dimensions and the preview follows — the same numbers the
          pattern generator and yarn estimate use. Currently {SHAPE_LABELS[spec.shape].toLowerCase()}.
        </p>
      </header>

      <DesignerWorkspace patternId={patternId} initialSpec={spec} />

      <p className="flex items-center gap-2 text-xs text-ink-subtle">
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Changes here are saved to the pattern, so its preview and dimensions stay
        in step.
      </p>
    </div>
  );
}
