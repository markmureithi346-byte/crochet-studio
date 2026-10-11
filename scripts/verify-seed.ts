import { PrismaClient } from "@prisma/client";
import { netChangeOfRow, resultingCount } from "../src/lib/engine/stitch-math";
import { parseGroupJson } from "../src/lib/engine/rows";
import type { PatternStep } from "../src/lib/engine/stitch-math";

const prisma = new PrismaClient();

/**
 * SEED INTEGRITY CHECK
 * ====================
 * Run with:  npm run db:verify
 *
 * This asserts the INVARIANTS the app depends on, directly against the
 * database. It is deliberately independent of the seed script — a seed script
 * that wrote its own expectations could agree with a broken engine forever.
 *
 * What it proves:
 *   1. Every row's stored `totalStitches` matches what the engine computes.
 *   2. Where a pattern declares an expected count, the row matches it.
 *   3. Where a pattern declares no expected count and the count changed, the
 *      engine reports it as INFORMATION, never as an error.
 *   4. No row produces an impossible count.
 */
async function main() {
  const patterns = await prisma.pattern.findMany({
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          rows: { orderBy: { sortOrder: "asc" }, include: { steps: true } },
        },
      },
    },
  });

  const problems: string[] = [];
  let rowsChecked = 0;
  let errorCount = 0;
  let infoCount = 0;

  for (const pattern of patterns) {
    // The running count carries ACROSS sections, exactly as crochet does: the
    // ARMS section picks up where BODY left off.
    let running = 0;

    for (const section of pattern.sections) {
      for (const [index, row] of section.rows.entries()) {
        const steps: PatternStep[] = row.steps.map((step) => {
          if (step.type === "GROUP") {
            return {
              type: "GROUP" as const,
              count: step.count,
              steps: parseGroupJson(step.groupJson),
            };
          }
          return {
            type: "STITCH" as const,
            stitch: (step.stitchCode ?? "SC") as PatternStep extends { stitch: infer S } ? S : never,
            count: step.count,
          };
        });

        const change = netChangeOfRow(steps);
        const resulting = resultingCount(running, steps);
        rowsChecked += 1;

        // 1. Stored total must equal the count the crocheter will have.
        if (row.totalStitches !== resulting) {
          problems.push(
            `${pattern.name} / ${section.name} / ${row.label}: stored ${row.totalStitches} but engine computes ${resulting}`,
          );
        }

        // 2. A declared expectation must hold.
        if (row.expectedStitches !== null && row.expectedStitches !== resulting) {
          errorCount += 1;
          problems.push(
            `${pattern.name} / ${section.name} / ${row.label}: declares ${row.expectedStitches} but leaves ${resulting}`,
          );
        }

        // 3. Count changed without a declaration => information, not an error.
        if (index > 0 && row.expectedStitches === null && change !== 0) {
          infoCount += 1;
        }

        // 4. Impossible counts.
        if (resulting < 0 || resulting > 5000) {
          problems.push(
            `${pattern.name} / ${section.name} / ${row.label}: impossible stitch count ${resulting}`,
          );
        }

        running = resulting;
      }
    }
  }

  const [users, projects, progress, yarns] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.projectRowProgress.count(),
    prisma.yarn.count(),
  ]);

  console.log(
    `users=${users} patterns=${patterns.length} projects=${projects} progress=${progress} yarns=${yarns}`,
  );
  console.log(
    `rows=${rowsChecked} declaredErrors=${errorCount} intentionalChanges=${infoCount} problems=${problems.length}`,
  );
  for (const problem of problems.slice(0, 12)) console.log("  !", problem);

  if (problems.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Verification failed to run:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
