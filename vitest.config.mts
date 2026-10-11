import { defineConfig } from "vitest/config";

/**
 * The test runner is configured for *pure logic only* — no React, no database,
 * no network. Everything under `src/lib/engine` and `src/lib/crochet` is
 * deliberately written as pure functions so it can be tested in isolation.
 *
 * Why it matters: the stitch arithmetic is the one part of this app that must
 * be correct. If `countStep()` is wrong, a crocheter will physically make the
 * wrong number of stitches and waste yarn. Tests are our guarantee.
 *
 * Vite resolves the `@/*` path alias natively (`resolve.tsconfigPaths`), so no
 * plugin is needed.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
