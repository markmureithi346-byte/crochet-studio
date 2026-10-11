"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createYarnAction, type YarnActionState } from "@/app/(app)/designer/actions";
import { YARN_WEIGHT_LABELS, YARN_WEIGHTS } from "@/lib/validation/domain";

const INITIAL: YarnActionState = {};

export function YarnForm() {
  const [state, formAction] = useActionState(createYarnAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="brand" label="Brand" error={state.fieldErrors?.brand}>
          <Input id="brand" name="brand" placeholder="Scheepjes" />
        </Field>
        <Field id="name" label="Yarn" error={state.fieldErrors?.name}>
          <Input id="name" name="name" placeholder="Cotton 4" required />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="colorName" label="Colour" error={state.fieldErrors?.colorName}>
          <Input id="colorName" name="colorName" placeholder="Cream" required />
        </Field>
        <Field id="colorHex" label="Swatch" error={state.fieldErrors?.colorHex}>
          <div className="flex items-center gap-2">
            <input
              id="colorHex"
              name="colorHex"
              type="color"
              defaultValue="#8d8d94"
              className="h-11 w-14 cursor-pointer rounded-md border border-line bg-surface"
            />
            <span className="text-xs text-ink-subtle">Pick a colour</span>
          </div>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="weight" label="Weight">
          <Select id="weight" name="weight" defaultValue="DK">
            {YARN_WEIGHTS.map((weight) => (
              <option key={weight} value={weight}>
                {YARN_WEIGHT_LABELS[weight]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="quantity" label="Skeins owned" error={state.fieldErrors?.quantity}>
          <Input id="quantity" name="quantity" type="number" min={0} max={999} defaultValue={1} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="gramsPerSkein" label="Grams per skein" error={state.fieldErrors?.gramsPerSkein}>
          <Input id="gramsPerSkein" name="gramsPerSkein" type="number" min={1} defaultValue={50} />
        </Field>
        <Field
          id="metersPerSkein"
          label="Metres per skein"
          hint="Optional — used for length estimates"
          error={state.fieldErrors?.metersPerSkein}
        >
          <Input id="metersPerSkein" name="metersPerSkein" type="number" min={0} />
        </Field>
      </div>

      <SubmitButton pendingLabel="Adding…">
        <Plus aria-hidden="true" />
        Add to stash
      </SubmitButton>
    </form>
  );
}
