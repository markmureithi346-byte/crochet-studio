import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

/**
 * In Next 16 `searchParams` is a Promise — it must be awaited.
 * We forward `callbackUrl` so signing in returns the user to where they were
 * heading. `redirectIfSignedIn()` in the auth layout already handles the
 * already-signed-in case.
 */
export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Welcome back
        </h1>
        <p className="text-sm text-ink-muted">
          Sign in to pick up where you left off.
        </p>
      </div>

      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}
