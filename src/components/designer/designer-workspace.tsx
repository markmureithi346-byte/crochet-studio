"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boxes, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Viewport } from "@/components/three/viewport";
import { SHAPE_DESCRIPTORS, descriptorFor, type DesignSpec } from "@/lib/design/shapes";
import { SHAPE_LABELS, type ShapeType } from "@/lib/validation/domain";
import { saveDesignAction } from "@/app/(app)/designer/actions";

/**
 * THE 3D DESIGNER WORKSPACE
 * ========================
 * Left: tools. Centre: viewport. The viewport is the lazy-loaded component, so
 * Three.js only downloads when this page is actually visited.
 *
 * THE ONE-WAY DATA FLOW
 * ---------------------
 *   slider -> DesignSpec state -> geometryParams() -> <Viewport>
 *
 * One source of truth, one direction. There is no two-way binding with Three.js,
 * which is deliberate: it would mean the scene could drive the numbers, and the
 * numbers are what the pattern and the yarn estimate depend on.
 */
export function DesignerWorkspace({
  patternId,
  initialSpec,
}: {
  patternId?: string;
  initialSpec: DesignSpec;
}) {
  const router = useRouter();
  const [spec, setSpec] = useState<DesignSpec>(initialSpec);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const descriptor = useMemo(() => descriptorFor(spec.shape), [spec.shape]);

  function update(patch: Partial<DesignSpec>) {
    setSpec((current) => ({ ...current, ...patch }));
    setSaved(false);
  }

  function reset() {
    setSpec(initialSpec);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* ---- Tools ---- */}
      <div className="space-y-5">
        <div className="rounded-xl border border-line bg-surface p-4">
          <label htmlFor="shape" className="text-sm font-medium text-ink">
            Shape
          </label>
          <Select
            id="shape"
            className="mt-1.5"
            value={spec.shape}
            onChange={(event) => update({ shape: event.target.value as ShapeType })}
          >
            {SHAPE_DESCRIPTORS.map((entry) => (
              <option key={entry.shape} value={entry.shape}>
                {SHAPE_LABELS[entry.shape]}
              </option>
            ))}
          </Select>
          <p className="mt-2 text-xs text-ink-muted">{descriptor.description}</p>
        </div>

        <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
          <Slider
            id="width"
            label="Width"
            value={spec.widthCm}
            onChange={(value) => update({ widthCm: value })}
            disabled={!descriptor.usesWidth}
          />
          <Slider
            id="height"
            label="Height"
            value={spec.heightCm}
            onChange={(value) => update({ heightCm: value })}
            disabled={!descriptor.usesHeight}
          />
          <Slider
            id="depth"
            label="Depth"
            value={spec.depthCm}
            onChange={(value) => update({ depthCm: value })}
            disabled={!descriptor.usesDepth}
          />
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <label htmlFor="color" className="text-sm font-medium text-ink">
            Colour
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              id="color"
              type="color"
              value={spec.colorHex}
              onChange={(event) => update({ colorHex: event.target.value })}
              className="h-11 w-14 cursor-pointer rounded-md border border-line bg-surface"
            />
            <Input
              value={spec.colorHex.toUpperCase()}
              onChange={(event) => {
                const value = event.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(value)) update({ colorHex: value });
              }}
              aria-label="Colour hex value"
              className="font-stitch"
            />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Choose a colour from your yarn stash to keep them in step.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={reset}>
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
          {patternId ? (
            <Button
              size="sm"
              className="flex-1"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await saveDesignAction({
                    patternId,
                    name: "Design",
                    shape: spec.shape,
                    widthCm: spec.widthCm,
                    heightCm: spec.heightCm,
                    depthCm: spec.depthCm,
                    stitchCode: spec.stitchCode ?? null,
                    colorHex: spec.colorHex,
                  });
                  if (result.ok) {
                    setSaved(true);
                    router.refresh();
                  }
                })
              }
            >
              {saved ? "Saved" : "Save to pattern"}
            </Button>
          ) : null}
        </div>

        <p className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-xs text-ink-muted">
          <Badge tone="warning" className="mr-2">
            Illustrative
          </Badge>
          This is a parametric preview of the finished object — its shape,
          proportions and colour. It is not a simulation of individual stitches or
          yarn strands.
        </p>
      </div>

      {/* ---- Viewport ---- */}
      <div className="space-y-3">
        <div className="h-[380px] overflow-hidden rounded-xl border border-line bg-surface-3 lg:h-[520px]">
          <Viewport spec={spec} className="size-full" />
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-ink-subtle">
          <span className="flex items-center gap-1.5">
            <Boxes className="size-3.5" aria-hidden="true" />
            {spec.widthCm} × {spec.heightCm} × {spec.depthCm} cm
          </span>
          <span>Drag to orbit · scroll to zoom</span>
        </div>
      </div>
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={disabled ? "opacity-40" : undefined}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <span className="font-stitch text-sm text-ink-muted">{value} cm</span>
      </div>
      <input
        id={id}
        type="range"
        min={2}
        max={80}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 h-11 w-full cursor-pointer accent-[var(--accent)]"
      />
    </div>
  );
}
