"use client";

import { useActionState } from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { generatePatternAction, type PatternActionState } from "@/app/(app)/patterns/actions";
import { SHAPE_DESCRIPTORS } from "@/lib/design/shapes";
import { SHAPE_LABELS, YARN_WEIGHT_LABELS, YARN_WEIGHTS } from "@/lib/validation/domain";

const INITIAL: PatternActionState = {};

/**
 * PATTERN GENERATOR FORM
 * ----------------------
 * Submits straight to a Server Action. The generator runs on the SERVER, because
 * it is pure logic and the client is not a trust boundary.
 *
 * The form is honest about its scope: the shape list only contains constructions
 * we can actually generate, and the hint text says the result is a starting
 * point that needs checking.
 */
export function GeneratePatternForm() {
  const [state, formAction] = useActionState(generatePatternAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Field id="patternName" label="Name it" error={state.fieldErrors?.patternName}>
        <Input id="patternName" name="patternName" defaultValue="My new pattern" required />
      </Field>

      <Field id="shape" label="What shape?" hint={shapeHint}>
        <Select id="shape" name="shape" defaultValue="BOX">
          {SHAPE_DESCRIPTORS.map((entry) => (
            <option key={entry.shape} value={entry.shape}>
              {SHAPE_LABELS[entry.shape]} — {entry.description}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id="widthCm" label="Width (cm)" error={state.fieldErrors?.widthCm}>
          <Input
            id="widthCm"
            name="widthCm"
            type="number"
            min={2}
            max={200}
            step={1}
            defaultValue={30}
            required
          />
        </Field>
        <Field id="heightCm" label="Height (cm)" error={state.fieldErrors?.heightCm}>
          <Input
            id="heightCm"
            name="heightCm"
            type="number"
            min={2}
            max={200}
            step={1}
            defaultValue={25}
            required
          />
        </Field>
      </div>

      <Field
        id="depthCm"
        label="Depth / base (cm)"
        hint="Used by bags and spheres. Ignored for flat shapes."
        error={state.fieldErrors?.depthCm}
      >
        <Input id="depthCm" name="depthCm" type="number" min={2} max={200} step={1} defaultValue={18} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id="yarnWeight" label="Yarn weight">
          <Select id="yarnWeight" name="yarnWeight" defaultValue="DK">
            {YARN_WEIGHTS.map((weight) => (
              <option key={weight} value={weight}>
                {YARN_WEIGHT_LABELS[weight]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="hookMm" label="Hook (mm)" hint="Leave blank for a typical hook">
          <Input id="hookMm" name="hookMm" type="number" min={1} max={25} step={0.5} defaultValue={4} />
        </Field>
      </div>

      <SubmitButton block pendingLabel="Generating…" variant="secondary">
        <Sparkles aria-hidden="true" />
        Generate a starting pattern
      </SubmitButton>

      <p className="text-xs text-ink-subtle">
        The generator builds standard constructions only — flat panels, circular
        bases, cylinders, cones and spheres. It will not invent shaped garments or
        motifs, and every result lists the assumptions you need to check.
      </p>
    </form>
  );
}

const shapeHint = "Each shape maps to a construction we can generate reliably.";
