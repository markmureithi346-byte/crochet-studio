/**
 * Environment variables — validated once, at import time.
 *
 * WHY THIS EXISTS
 * ---------------
 * If `DATABASE_URL` is missing, Prisma throws a wall of text deep inside a
 * query. If `AUTH_SECRET` is missing, Auth.js silently falls back to a
 * predictable dev secret — which is a real security hole.
 * By validating at the boundary we fail loudly and early, with a message that
 * tells you what to do.
 *
 * RULE: this file is server-only. Never import it from a Client Component,
 * because the values would be bundled into browser JavaScript.
 */
import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET must be at least 16 characters — generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

function load() {
  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables:\n${details}\n\nCopy .env.example to .env.local and fill it in.`,
    );
  }
  return parsed.data;
}

export const env = load();
