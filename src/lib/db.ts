import { PrismaClient } from "@prisma/client";

/**
 * A single Prisma client for the whole app.
 *
 * WHY THE globalThis TRICK
 * -----------------------
 * Next.js hot-reloads modules in development. Without the cache, every reload
 * would open a brand-new database connection pool, and SQLite (like Postgres)
 * has a limited number of connections. Old pools leak until they time out.
 * We stash the client on `globalThis` so it survives hot reloads.
 *
 * In production this is irrelevant — the module is loaded once — but it is the
 * standard pattern and costs nothing.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
