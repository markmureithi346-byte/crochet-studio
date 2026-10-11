import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Start your studio
        </h1>
        <p className="text-sm text-ink-muted">
          Build patterns, preview them in 3D, and never lose your place again.
        </p>
      </div>

      <SignUpForm />
    </div>
  );
}
