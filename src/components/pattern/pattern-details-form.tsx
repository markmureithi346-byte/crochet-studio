"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  PROJECT_CATEGORIES,
  DIFFICULTIES,
  YARN_WEIGHT_LABELS,
  YARN_WEIGHTS,
} from "@/lib/validation/domain";

export interface PatternDetails {
  category: string;
  difficulty: string;
  hookSizeMm: number | null;
  yarnWeight: string | null;
  finishedWidthCm: number | null;
  finishedHeightCm: number | null;
  gaugeStitches: number | null;
  gaugeRows: number | null;
}

export interface MaterialDraft {
  label: string;
  detail: string;
  quantity: string;
}

/**
 * THE SPEC SHEET
 * ==============
 * The fields that used to be read-only. They matter because they are the bridge
 * between stitch counts and centimetres:
 *
 *   gauge (stitches per 10cm)  x  stitch count  =  width in cm
 *
 * With a gauge set, the editor can show a live finished-size estimate. Without
 * one it says so instead of guessing — a confident wrong size is worse than no
 * size at all.
 */
export function PatternDetailsForm({
  details,
  materials,
  onDetailsChange,
  onMaterialsChange,
}: {
  details: PatternDetails;
  materials: MaterialDraft[];
  onDetailsChange: (patch: Partial<PatternDetails>) => void;
  onMaterialsChange: (materials: MaterialDraft[]) => void;
}) {
  function updateMaterial(index: number, patch: Partial<MaterialDraft>) {
    onMaterialsChange(
      materials.map((material, i) => (i === index ? { ...material, ...patch } : material)),
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="detail-category">Category</Label>
            <Select
              id="detail-category"
              value={details.category}
              onChange={(event) => onDetailsChange({ category: event.target.value })}
            >
              {PROJECT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="detail-difficulty">Difficulty</Label>
            <Select
              id="detail-difficulty"
              value={details.difficulty}
              onChange={(event) => onDetailsChange({ difficulty: event.target.value })}
            >
              {DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {DIFFICULTY_LABELS[difficulty]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            id="detail-hook"
            label="Hook size"
            unit="mm"
            value={details.hookSizeMm}
            step={0.5}
            onChange={(value) => onDetailsChange({ hookSizeMm: value })}
          />
          <div className="space-y-1.5">
            <Label htmlFor="detail-yarn">Yarn weight</Label>
            <Select
              id="detail-yarn"
              value={details.yarnWeight ?? ""}
              onChange={(event) =>
                onDetailsChange({ yarnWeight: event.target.value || null })
              }
            >
              <option value="">Not specified</option>
              {YARN_WEIGHTS.map((weight) => (
                <option key={weight} value={weight}>
                  {YARN_WEIGHT_LABELS[weight]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface-2 p-3">
          <p className="text-xs font-medium text-ink">Gauge</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Measure a swatch and count 10cm. This is what turns stitch counts into centimetres.
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-3">
            <NumberField
              id="detail-gauge-stitches"
              label="Stitches"
              unit="per 10cm"
              value={details.gaugeStitches}
              step={0.5}
              onChange={(value) => onDetailsChange({ gaugeStitches: value })}
            />
            <NumberField
              id="detail-gauge-rows"
              label="Rows"
              unit="per 10cm"
              value={details.gaugeRows}
              step={0.5}
              onChange={(value) => onDetailsChange({ gaugeRows: value })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            id="detail-width"
            label="Finished width"
            unit="cm"
            value={details.finishedWidthCm}
            step={1}
            onChange={(value) => onDetailsChange({ finishedWidthCm: value })}
          />
          <NumberField
            id="detail-height"
            label="Finished height"
            unit="cm"
            value={details.finishedHeightCm}
            step={1}
            onChange={(value) => onDetailsChange({ finishedHeightCm: value })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink">Materials</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onMaterialsChange([...materials, { label: "", detail: "", quantity: "" }])
              }
            >
              <Plus aria-hidden="true" />
              Add
            </Button>
          </div>

          {materials.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-xs text-ink-subtle">
              No materials listed yet.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {materials.map((material, index) => (
                <li key={index} className="flex items-center gap-1.5">
                  <Input
                    value={material.label}
                    onChange={(event) => updateMaterial(index, { label: event.target.value })}
                    placeholder="Hook"
                    aria-label={`Material ${index + 1} name`}
                    className="h-9 w-32 text-sm"
                  />
                  <Input
                    value={material.detail}
                    onChange={(event) => updateMaterial(index, { detail: event.target.value })}
                    placeholder="3.0mm"
                    aria-label={`Material ${index + 1} detail`}
                    className="h-9 flex-1 text-sm"
                  />
                  <Input
                    value={material.quantity}
                    onChange={(event) => updateMaterial(index, { quantity: event.target.value })}
                    placeholder="1"
                    aria-label={`Material ${index + 1} quantity`}
                    className="h-9 w-16 text-center font-stitch text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() =>
                      onMaterialsChange(materials.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove material ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Numeric input that treats an empty box as "not specified" (null). */
function NumberField({
  id,
  label,
  unit,
  value,
  step,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: number | null;
  step: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} <span className="font-normal text-ink-subtle">({unit})</span>
      </Label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        value={value ?? ""}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === "" ? null : Number(raw));
        }}
        className="h-11 w-full rounded-lg border border-line bg-surface px-3 font-stitch text-sm"
      />
    </div>
  );
}