import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * THE DATA ACCESS LAYER (DAL) — this is where authorization actually happens.
 *
 * THE IMPORTANT LESSON
 * --------------------
 * `src/proxy.ts` redirects logged-out visitors before a page renders. That is a
 * UX convenience, NOT security. It runs on the edge of the app, is skipped for
 * Server Function (Server Action) POSTs on matched paths, and can be bypassed by
 * calling an API route directly.
 *
 * So every single piece of data access goes through the helpers below:
 *   - `requireUser()`  -> refuses to continue without a session
 *   - `requireOwner()` -> refuses to continue unless you own the row
 *
 * If a query can leak data, it must take a `userId` and filter by it. That
 * single habit is what prevents "user A sees user B's private projects".
 */

/**
 * `cache()` from React deduplicates this function within a single request.
 * Without it, a page that renders a header avatar and a dashboard list would
 * call `auth()` twice. It does not persist across requests.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? "Crocheter",
  };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** For pages behind auth. Redirects to /login when there is no session. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Throws instead of redirecting, for use inside Server Actions and route
 * handlers where a redirect would be a confusing response.
 */
export async function requireUserOrThrow(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("You must be signed in to do that.");
  }
  return user;
}

/** Logged-in users should not see the marketing/login pages. */
export async function redirectIfSignedIn(): Promise<void> {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
}
