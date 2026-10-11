"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createProjectAction, type ProjectActionState } from "@/app/(app)/projects/actions";

const INITIAL: ProjectActionState = {};

/**
 * A project can be started from a pattern, or from nothing at all.
 *
 * The "no pattern" case is real: plenty of people crochet from a book or a
 * friend's pattern and still want round tracking. We allow it rather than
 * pretending every project has to be one of yours.
 */
export function NewProjectForm({
  patterns,
}: {
  patterns: Array<{ id: string; name: string }>;
}) {
  const [state, formAction] = useActionState(createProjectAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field id="projectName" label="Project name" error={state.error}>
        <Input
          id="projectName"
          name="name"
          placeholder="Teddy Bear for Mia"
          required
          aria-invalid={Boolean(state.error)}
        />
      </Field>

      <Field
        id="patternId"
        label="Based on a pattern"
        hint="Optional — you can track rounds from any pattern, even a paper one."
      >
        <Select id="patternId" name="patternId" defaultValue="">
          <option value="">No pattern</option>
          {patterns.map((pattern) => (
            <option key={pattern.id} value={pattern.id}>
              {pattern.name}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton pendingLabel="Creating…">
        <Plus aria-hidden="true" />
        Create project
      </SubmitButton>
    </form>
  );
}
