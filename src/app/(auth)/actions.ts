"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

/**
 * AUTH SERVER ACTIONS
 * ==================
 * Server Actions are POST endpoints. They are reachable directly — not only via
 * our UI — so each one must independently:
 *   1. validate its input (never trust the client, even though the form is ours)
 *   2. do the work on the server
 *   3. return a typed result the UI can render
 *
 * `useActionState` expects the signature (previousState, formData) => newState,
 * which is why `previousState` comes first even though we rarely need it.
 */

export type AuthActionState = {
  error?: string;
  /** Keyed by field name so each input can show its own message. */
  fieldErrors?: Record<string, string>;
};

const INITIAL: AuthActionState = {};

/** Turn a Zod error into the flat `{ field: message }` shape our forms expect. */
function fieldErrorsFrom(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }) {
  const flat = error.flatten().fieldErrors;
  const result: Record<string, string> = {};
  for (const [key, messages] of Object.entries(flat)) {
    if (messages?.[0]) result[key] = messages[0];
  }
  return result;
}

/**
 * A single error message for everything that is not field-specific.
 *
 * We deliberately do NOT distinguish "no such user" from "wrong password" —
 * telling an attacker which emails are registered is a real security leak.
 */
const GENERIC_CREDENTIAL_ERROR = "That email and password combination is not right.";

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { name, email, password } = parsed.data;

  // bcrypt cost 12 is a deliberate security/performance trade-off: roughly
  // 250ms per hash on typical hardware, which is the standard recommendation.
  const passwordHash = await hash(password, 12);

  try {
    await prisma.user.create({ data: { name, email, passwordHash } });
  } catch (error) {
    // Unique constraint violation = email already registered.
    if (isUniqueConstraintError(error)) {
      return {
        fieldErrors: {
          email: "An account already uses this email. Try signing in instead.",
        },
      };
    }
    // Never leak a raw driver error to the user. Log server-side, return a
    // human message.
    console.error("[auth] sign-up failed", error);
    return { error: "We could not create your account. Please try again." };
  }

  // Sign the new user straight in so they land on the dashboard, not a login
  // form. NOTE: `signIn` throws a redirect — it must be the LAST statement, and
  // must never be wrapped in try/catch (we would swallow the redirect).
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return INITIAL;
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: formData.get("callbackUrl")?.toString() || "/dashboard",
    });
  } catch (error) {
    // AuthError with type CredentialsSignin == our provider rejected the user.
    if (error instanceof AuthError) {
      return { error: GENERIC_CREDENTIAL_ERROR };
    }
    // Anything else that is not a redirect is a genuine problem.
    if (isRedirectError(error)) throw error;
    console.error("[auth] sign-in failed", error);
    return { error: "Something went wrong signing you in. Please try again." };
  }

  return INITIAL;
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

// --- error helpers ----------------------------------------------------------

/** Narrow an unknown error without importing Prisma's internal types. */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Auth.js signals success by throwing a special redirect error. We must
 * re-throw it, otherwise the user would sit on the login page after a
 * successful sign-in instead of being redirected.
 */
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export { redirect };
