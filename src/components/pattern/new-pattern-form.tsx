"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createPatternAction, type PatternActionState } from "@/app/(app)/patterns/actions";
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  PROJECT_CATEGORIES,
  DIFFICULTIES,
} from "@/lib/validation/domain";

const INITIAL: PatternActionState = {};

/**
 * The first question a new pattern asks: "what are you making?"
 *
 * The category does real work later — it suggests a 3D shape and a difficulty
 * baseline — so it is asked up front rather than buried in settings. We make it
 * optional (Other always exists) because forcing a choice here would be
 * friction, not guidance.
 */
export function NewPatternForm() {
  const [state, formAction] = useActionState(createPatternAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <fieldset>
        <legend className="text-sm font-medium text-ink">What are you making?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PROJECT_CATEGORIES.map((category) => (
            <label
              key={category}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm transition-colors has-[:checked]:border-ink has-[:checked]:bg-surface-3 hover:bg-surface-3"
            >
              <input
                type="radio"
                name="category"
                value={category}
                defaultChecked={category === "AMIGURUMI"}
                className="size-4 accent-[var(--accent)]"
              />
              {CATEGORY_LABELS[category]}
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="newPatternName" label="Project name" error={state.fieldErrors?.name}>
        <Input
          id="newPatternName"
          name="name"
          placeholder="Teddy Bear"
          required
          aria-invalid={Boolean(state.fieldErrors?.name)}
        />
      </Field>

      <Field id="difficulty" label="Difficulty">
        <Select id="difficulty" name="difficulty" defaultValue="BEGINNER">
          {DIFFICULTIES.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {DIFFICULTY_LABELS[difficulty]}
            </option>
          ))}
        </Select>
      </Field>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <SubmitButton block pendingLabel="Creating…">
        <Plus aria-hidden="true" />
        Create pattern
      </SubmitButton>
    </form>
  );
}
