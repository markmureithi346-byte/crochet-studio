"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { signInAction, type AuthActionState } from "@/app/(auth)/actions";

const INITIAL_STATE: AuthActionState = {};

/**
 * WHY THIS IS A CLIENT COMPONENT
 * ------------------------------
 * `useActionState` needs React state, so this file needs "use client". The form
 * itself is a Server Component concept â€” we just cannot wire up the state here.
 *
 * Server Actions + useActionState replace the three things we would otherwise
 * hand-roll: a pending state, a field-level error channel, and a router
 * refresh after mutation. All three come from React itself.
 */
export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction] = useActionState(signInAction, INITIAL_STATE);

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

      {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}

      <Field id="email" label="Email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
        />
      </Field>

      <Field id="password" label="Password" error={state.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
        />
      </Field>

      <SubmitButton block size="lg" pendingLabel="Signing inâ€¦">
        Sign in
      </SubmitButton>

      <p className="text-center text-sm text-ink-muted">
        New here?{" "}
        <Link
          href="/signup"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}

/** Small helper kept next to the form that uses it. */
export function AuthFooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-accent underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

export { Button };
