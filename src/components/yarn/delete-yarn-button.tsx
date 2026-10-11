"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteYarnAction } from "@/app/(app)/designer/actions";

export function DeleteYarnButton({ yarnId }: { yarnId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Remove yarn from stash"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await deleteYarnAction(yarnId);
        })
      }
    >
      <Trash2 aria-hidden="true" />
    </Button>
  );
}
