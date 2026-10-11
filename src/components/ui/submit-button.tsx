"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Submit button with a pending state.
 *
 * `useFormStatus` must live in its OWN component that is rendered *inside* the
 * <form>. It reads the status of the closest ancestor form — if you call it in
 * the same component that renders the form, it always reports "idle" and your
 * pending state never appears. That is a classic React footgun worth knowing.
 *
 * We also expose `aria-busy` so assistive tech knows the form is submitting,
 * and we keep the button width stable while loading (no layout shift).
 */
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      aria-busy={pending}
      disabled={pending || props.disabled}
      className={cn(className)}
      {...props}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

function Spinner() {
  return (
    <svg
      className="size-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
