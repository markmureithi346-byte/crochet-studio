/**
 * WRITE-PATH INTEGRITY TEST
 * =========================
 * Reads passing proves very little: an app can render beautifully and save
 * nothing. This exercises the actual WRITE path — `savePattern()` from
 * src/lib/data/patterns.ts — against a real database, then verifies the result.
 *
 * It specifically tests the highest-risk behaviour in the product: editing a
 * pattern that somebody has already started crocheting. Those rounds must
 * survive, or a user loses their place because they tidied a pattern.
 *
 * Run it with tsx:  npm run check:write
 */
import { prisma } from "../src/lib/db";
import { savePattern, createPattern } from "../src/lib/data/patterns";
import { getProjectRows, summariseProgress } from "../src/lib/data/projects";
import { validateRows } from "../src/lib/engine/validate";
import type { PatternStep } from "../src/lib/engine/stitch-math";
import { rowToEngineRow } from "../src/lib/engine/rows";
import { savePatternSchema } from "../src/lib/validation/pattern";

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? "  PASS" : "  FAIL"}  ${label}`);
  if (!condition) failures += 1;
}

function section(
  name: string,
  rows: Array<{
    id?: string;
    label: string;
    notes: string;
    expectedStitches: number | null;
    steps: PatternStep[];
  }>,
) {
  return { name, rows };
}

async function main() {
  const user = await prisma.user.findFirst({ where: { email: "demo@crochet.studio" } });
  if (!user) throw new Error("Run `npm run db:seed` first.");

  const pattern = await prisma.pattern.findFirst({
    where: { userId: user.id, name: "Teddy Bear" },
    include: { sections: { include: { rows: { include: { steps: true } } } } },
  });
  if (!pattern) throw new Error("Teddy Bear pattern not found.");

  const project = await prisma.project.findFirst({
    where: { patternId: pattern.id, userId: user.id },
    include: { progress: true },
  });
  if (!project) throw new Error("Demo project not found.");

  console.log(`\nPattern "${pattern.name}" with ${project.progress.length} completed rounds.\n`);

  // ---------------------------------------------------------------------
  console.log("1. Saving the pattern back unchanged must be lossless");
  const before = await prisma.patternRow.count({ where: { section: { patternId: pattern.id } } });

  const draft = pattern.sections.map((sec) => ({
    id: sec.id,
    name: sec.name,
    rows: sec.rows.map((row) => ({
      id: row.id,
      label: row.label,
      notes: row.notes,
      expectedStitches: row.expectedStitches,
      steps: row.steps.map((step) =>
        step.type === "GROUP"
          ? {
              type: "GROUP" as const,
              count: step.count,
              steps: JSON.parse(step.groupJson ?? "[]").map((child: { stitch: string; count: number }) => ({
                type: "STITCH" as const,
                stitch: child.stitch,
                count: child.count,
              })),
            }
          : { type: "STITCH" as const, stitch: step.stitchCode!, count: step.count },
      ),
    })),
  }));

  const parsed = savePatternSchema.parse({
    patternId: pattern.id,
    name: pattern.name,
    description: pattern.description,
    details: {
      category: pattern.category,
      difficulty: pattern.difficulty,
      hookSizeMm: pattern.hookSizeMm,
      yarnWeight: pattern.yarnWeight,
      finishedWidthCm: pattern.finishedWidthCm,
      finishedHeightCm: pattern.finishedHeightCm,
      gaugeStitches: pattern.gaugeStitches,
      gaugeRows: pattern.gaugeRows,
    },
    sections: draft,
    materials: [],
  });

  const result = await savePattern(user.id, parsed);
  check(`save succeeded (${result.error ?? "no error"})`, result.ok);
  check(`row count unchanged (${before} -> ${await prisma.patternRow.count({ where: { section: { patternId: pattern.id } } })})`,
    (await prisma.patternRow.count({ where: { section: { patternId: pattern.id } } })) === before);

  // ---------------------------------------------------------------------
  console.log("\n2. Progress survives an edit");
  const progressAfter = await prisma.projectRowProgress.count({ where: { projectId: project.id } });
  check(`all ${progressAfter} progress rows still present`, progressAfter === project.progress.length);

  // ---------------------------------------------------------------------
  console.log("\n3. Deleting a round that has been crocheted is refused");
  const protectedRowId = project.progress[0].rowId;
  // Re-validate through the schema instead of spreading the already-parsed
  // value: the schema is the gate that proves a CLIENT-SUPPLIED payload would
  // be accepted, which is what we actually want to test here.
  const trimmed = savePatternSchema.parse({
    patternId: pattern.id,
    name: pattern.name,
    description: pattern.description,
    details: parsed.details,
    materials: [],
    sections: draft.map((sec, i) =>
      i === 0
        ? { ...sec, rows: sec.rows.filter((row) => row.id !== protectedRowId) }
        : sec,
    ),
  });
  const refused = await savePattern(user.id, trimmed);
  check(`refused: ${refused.error ? "yes" : "NO — it deleted crocheted work"}`, refused.ok === false);
  const stillThere = await prisma.patternRow.count({ where: { id: protectedRowId } });
  check("the protected round still exists in the database", stillThere === 1);

  // ---------------------------------------------------------------------
  console.log("\n4. Adding a round is accepted and totals recomputed");
  const withNewRound = savePatternSchema.parse({
    patternId: pattern.id,
    name: pattern.name,
    description: pattern.description,
    details: parsed.details,
    materials: [],
    sections: draft.map((sec, i) =>
      i === 0
        ? {
            ...sec,
            rows: [
              ...sec.rows,
              {
                label: "Test round",
                notes: "added by the write test",
                expectedStitches: null,
                steps: [{ type: "STITCH", stitch: "SC", count: 12 }],
              },
            ],
          }
        : sec,
    ),
  });
  const added = await savePattern(user.id, withNewRound);
  check(`save succeeded (${added.error ?? "no error"})`, added.ok);
  const after = await prisma.patternRow.count({ where: { section: { patternId: pattern.id } } });
  check(`row count grew by one (${before} -> ${after})`, after === before + 1);
  check("totals were recomputed by the engine", (added.totalRows ?? 0) === after);

  // ---------------------------------------------------------------------
  console.log("\n5. The saved pattern still validates cleanly");
  const fresh = await prisma.pattern.findFirst({
    where: { id: pattern.id },
    include: { sections: { include: { rows: { include: { steps: true } } } } },
  });
  const rows = fresh!.sections.flatMap((sec) => sec.rows.map(rowToEngineRow));
  const validation = validateRows(rows);
  check(`no arithmetic errors (${validation.errorCount} errors, ${validation.warningCount} warnings)`,
    validation.errorCount === 0);

  // ---------------------------------------------------------------------
  console.log("\n6. Progress summary stays correct");
  const rowsForProject = await getProjectRows(user.id, project.id);
  const summary = summariseProgress(
    rowsForProject!.sections.map((sec) => ({
      name: sec.name,
      rows: sec.rows.map((row) => ({
        label: row.label,
        completed: row.completed,
        totalStitches: row.totalStitches,
        steps: row.steps,
      })),
    })),
  );
  check(
    `completed=${summary.completedRows} percent=${summary.percent}% current=${summary.currentLabel}`,
    summary.completedRows === project.progress.length,
  );

  // ---------------------------------------------------------------------
  console.log("\n7. A brand new pattern can be created and saved");
  const created = await createPattern(user.id, {
    name: "Write test pattern",
    category: "OTHER",
    difficulty: "BEGINNER",
  });
  const createdSave = await savePattern(user.id, {
    patternId: created.id,
    name: "Write test pattern",
    description: "",
    details: {
      category: "OTHER",
      difficulty: "BEGINNER",
      hookSizeMm: null,
      yarnWeight: null,
      finishedWidthCm: null,
      finishedHeightCm: null,
      gaugeStitches: null,
      gaugeRows: null,
    },
    materials: [],
    sections: [section("BODY", [
      { label: "Round 1", notes: "", expectedStitches: null, steps: [{ type: "STITCH", stitch: "CH", count: 6 }] },
      { label: "Round 2", notes: "", expectedStitches: null, steps: [{ type: "STITCH", stitch: "INC", count: 6 }] },
      { label: "Round 3", notes: "", expectedStitches: 12, steps: [{ type: "GROUP", count: 6, steps: [
        { type: "STITCH", stitch: "SC", count: 1 },
        { type: "STITCH", stitch: "INC", count: 1 },
      ] }] },
    ])],
  });
  check(`created and saved (${createdSave.error ?? "no error"})`, createdSave.ok);
  check(`finished count is 18 (got ${createdSave.totalStitches})`, createdSave.totalStitches === 18);

  const newRows = await prisma.pattern.findFirst({
    where: { id: created.id },
    include: { sections: { include: { rows: true } } },
  });
  check("Round 3 stored total is 18", newRows!.sections[0].rows[2].totalStitches === 18);

  // --- cleanup ------------------------------------------------------------
  // Delete ONLY what this script created. An earlier version of this file
  // deleted the whole pattern and recreated it without its sections, which
  // silently destroyed the demo data — a good reminder that a test script is
  // still a script with side effects, and cleanup has to be surgical.
  await prisma.pattern.delete({ where: { id: created.id } });
  const addedRow = await prisma.patternRow.findFirst({
    where: { notes: "added by the write test" },
    select: { id: true },
  });
  if (addedRow) {
    await prisma.patternRow.delete({ where: { id: addedRow.id } });
  }
  console.log("\n  (test data removed)\n");

  console.log(
    failures === 0
      ? "All write-path checks passed.\n"
      : `\n${failures} write-path check(s) FAILED.\n`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error("Write-path check could not run:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
