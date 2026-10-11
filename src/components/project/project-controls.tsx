"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteProjectFormAction,
  setProjectStatusAction,
} from "@/app/(app)/projects/actions";

/**
 * Status controls.
 *
 * `deleteProjectAction` redirects on success, so it is a <form action> rather
 * than a click handler. We still ask for confirmation here in the browser
 * because deleting months of tracking is not undoable — this is one of the few
 * places where friction is the right call.
 */
export function ProjectControls({
  projectId,
  status,
}: {
  projectId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function setStatus(next: string) {
    startTransition(async () => {
      await setProjectStatusAction({ projectId, status: next });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "ACTIVE" ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("PAUSED")}
        >
          <Pause aria-hidden="true" />
          Pause
        </Button>
      ) : null}

      {status !== "COMPLETED" ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("COMPLETED")}
        >
          <CheckCircle2 aria-hidden="true" />
          Mark finished
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("ACTIVE")}
        >
          <Play aria-hidden="true" />
          Reopen
        </Button>
      )}

      {confirming ? (
        <form action={deleteProjectFormAction} className="flex items-center gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <span className="text-xs text-ink-muted">Delete everything?</span>
          <Button type="submit" variant="danger" size="sm" disabled={isPending}>
            <Trash2 aria-hidden="true" />
            Yes, delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
      )}
    </div>
  );
}
