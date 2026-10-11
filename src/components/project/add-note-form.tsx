"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { addNoteAction, type ProjectActionState } from "@/app/(app)/projects/actions";

const INITIAL: ProjectActionState = {};

/**
 * Notes are timestamped automatically — a note without a time is much less
 * useful three weeks later when you are wondering which round you were on.
 */
export function AddNoteForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState(addNoteAction, INITIAL);

  return (
    <form action={formAction} className="space-y-2" noValidate>
      <input type="hidden" name="projectId" value={projectId} />
      <label htmlFor="note-body" className="sr-only">
        Add a note
      </label>
      <Textarea
        id="note-body"
        name="body"
        placeholder="Used slightly tighter tension on this section…"
        required
        className="min-h-20"
      />
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="sm">
        <Send aria-hidden="true" />
        Add note
      </Button>
    </form>
  );
}
