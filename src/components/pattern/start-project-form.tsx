"use client";

import { useActionState } from "react";
import { Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startProjectAction, type PatternActionState } from "@/app/(app)/patterns/actions";

const INITIAL: PatternActionState = {};

/**
 * "Start project" turns a pattern into something you track.
 *
 * It is a separate object from the pattern on purpose: you might make the same
 * pattern three times, in three different colours, at three different gauges.
 * Progress belongs to YOUR instance, never to the shared instructions.
 */
export function StartProjectForm({
  patternId,
  patternName,
}: {
  patternId: string;
  patternName: string;
}) {
  const [state, formAction] = useActionState(startProjectAction, INITIAL);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="patternId" value={patternId} />
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" block>
        <Hammer aria-hidden="true" />
        Start project
      </Button>
      <p className="text-center text-xs text-ink-subtle">from {patternName}</p>
    </form>
  );
}
