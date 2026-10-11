import type { DefaultSession } from "next-auth";

/**
 * Auth.js type augmentation.
 *
 * By default `session.user` has no `id`. We add it so server code can do
 * `session.user.id` with full type safety instead of casting to `any`.
 * This is the standard Auth.js pattern — declaring the shape here teaches
 * TypeScript about it everywhere.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}
