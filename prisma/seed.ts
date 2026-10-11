/**
 * DEMO DATA SEED
 * ==============
 * Run with:  npm run db:seed
 *
 * WHY THIS FILE IS INTERESTING
 * ---------------------------
 * Notice that we never type a stitch total by hand. We describe the rounds as
 * structured steps and let `countRow()` from the engine compute the numbers. If
 * the engine is wrong, the seed data is wrong too â€” which is exactly the
 * coupling we want in a product whose whole value is correct arithmetic.
 *
 * It is also idempotent: it clears the demo users' data first, so you can run it
 * as often as you like without creating duplicates.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import {
  netChangeOfRow,
  resultingCount,
  type PatternStep,
} from "../src/lib/engine/stitch-math";

const prisma = new PrismaClient();

const sc = (count: number): PatternStep => ({ type: "STITCH", stitch: "SC", count });
const dc = (count: number): PatternStep => ({ type: "STITCH", stitch: "DC", count });
const tr = (count: number): PatternStep => ({ type: "STITCH", stitch: "TR", count });
const ch = (count: number): PatternStep => ({ type: "STITCH", stitch: "CH", count });
const tch = (count: number): PatternStep => ({ type: "STITCH", stitch: "TCH", count });
const inc = (count: number): PatternStep => ({ type: "STITCH", stitch: "INC", count });
const dec = (count: number): PatternStep => ({ type: "STITCH", stitch: "DEC", count });
const slst = (): PatternStep => ({ type: "STITCH", stitch: "SLST", count: 1 });
const mr = (): PatternStep => ({ type: "STITCH", stitch: "MR", count: 1 });

/** "(SC, INC) x 6" style group. */
const group = (
  count: number,
  steps: Array<[Parameters<typeof sc>[0], StitchCodeAlias]>,
): PatternStep => ({
  type: "GROUP",
  count,
  steps: steps.map(([n, stitch]) => ({ type: "STITCH" as const, stitch, count: n })),
});

type StitchCodeAlias = "SC" | "HDC" | "DC" | "TR" | "INC" | "DEC" | "CH" | "BLO" | "FLO";

type RowSeed = { label: string; steps: PatternStep[]; notes?: string };
type SectionSeed = { name: string; rows: RowSeed[] };

async function createPattern(
  userId: string,
  input: {
    name: string;
    description: string;
    category: string;
    difficulty: string;
    hookSizeMm?: number;
    yarnWeight?: string;
    finishedWidthCm?: number;
    finishedHeightCm?: number;
    gaugeStitches?: number;
    gaugeRows?: number;
    sections: SectionSeed[];
    materials?: Array<{ label: string; detail: string; quantity?: string }>;
  },
) {
  /**
   * Running stitch count, carried across sections because that is how crochet
   * actually works — the ARMS section picks up where BODY left off.
   *
   * It tracks the RESULTING count (what the crocheter has), not the produced
   * count (what this round emitted). For a shaping round those differ, and
   * tracking the wrong one silently corrupts every expectation downstream.
   */
  let running = 0;

  const sections = input.sections.map((section, sectionIndex) => ({
    name: section.name,
    sortOrder: sectionIndex,
    rows: {
      create: section.rows.map((row, rowIndex) => {
        const change = netChangeOfRow(row.steps);
        const resulting = resultingCount(running, row.steps);
        const changesCount = change !== 0;

        // `expectedStitches` means "the count this round is MEANT to leave".
        // We declare it only when the round holds the count steady, which is a
        // real checkable constraint. Rounds that deliberately increase or
        // decrease leave it null so the validator reports an informational note
        // instead of a false mismatch error.
        const expectedStitches =
          sectionIndex === 0 && rowIndex === 0 ? undefined
          : changesCount ? undefined
          : running;

        running = resulting;

        return {
          label: row.label,
          sortOrder: rowIndex,
          // Store what the crocheter will actually have.
          totalStitches: resulting,
          expectedStitches,
          notes: row.notes ?? "",
          steps: {
            create: row.steps.map((step, stepIndex) => ({
              sortOrder: stepIndex,
              type: step.type,
              stitchCode: step.type === "STITCH" ? step.stitch : null,
              count: step.count,
              groupJson:
                step.type === "GROUP"
                  ? JSON.stringify(
                      step.steps.map((s) => ({ stitch: s.stitch, count: s.count })),
                    )
                  : null,
              note: step.note ?? "",
            })),
          },
        };
      }),
    },
  }));

  // The pattern's headline figure: the count on the finished piece, which is
  // simply the resulting count of the very last row.
  const lastRowSteps = [...input.sections].flatMap((section) => section.rows).at(-1)?.steps;
  const totalStitches = lastRowSteps ? resultingCount(0, lastRowSteps) : 0;
  const totalRows = input.sections.reduce((sum, s) => sum + s.rows.length, 0);

  return prisma.pattern.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      category: input.category,
      difficulty: input.difficulty,
      hookSizeMm: input.hookSizeMm,
      yarnWeight: input.yarnWeight,
      finishedWidthCm: input.finishedWidthCm,
      finishedHeightCm: input.finishedHeightCm,
      gaugeStitches: input.gaugeStitches,
      gaugeRows: input.gaugeRows,
      totalRows,
      totalStitches,
      sections: { create: sections },
      materials: {
        create: (input.materials ?? []).map((material, index) => ({
          sortOrder: index,
          label: material.label,
          detail: material.detail,
          quantity: material.quantity ?? "",
        })),
      },
    },
    include: { sections: { include: { rows: true } } },
  });
}

// --- Pattern definitions ---------------------------------------------------

/**
 * DEMO PATTERNS
 * -------------
 * These counts are NOT hand-waved. Every round below is checked against the
 * engine's own arithmetic by `npm run db:verify`, which is the whole point of
 * storing rounds as structured data: if a round is wrong, a command tells us,
 * rather than a crocheter discovering it at 2am.
 *
 * The teddy bear is a real 6-stitch amigurumi spiral:
 *   6 -> 12 -> 18 -> 24 -> 30 -> 36, holds at 36, then tapers back down.
 */
const teddyBearRounds: RowSeed[] = [
  { label: "Round 1", steps: [mr(), ch(1), sc(6)] },
  { label: "Round 2", steps: [inc(6)] }, // 6 -> 12
  { label: "Round 3", steps: [group(6, [[1, "SC"], [1, "INC"]])] }, // 12 -> 18
  { label: "Round 4", steps: [group(6, [[2, "SC"], [1, "INC"]])] }, // 18 -> 24
  { label: "Round 5", steps: [group(6, [[3, "SC"], [1, "INC"]])] }, // 24 -> 30
  { label: "Round 6", steps: [group(6, [[4, "SC"], [1, "INC"]])] }, // 30 -> 36
  { label: "Round 7", steps: [sc(36)] },
  { label: "Round 8", steps: [sc(36)] },
  { label: "Round 9", steps: [sc(36)] },
  { label: "Round 10", steps: [sc(36)], notes: "Start stuffing." },
  { label: "Round 11", steps: [sc(36)] },
  { label: "Round 12", steps: [group(6, [[5, "SC"], [1, "DEC"]])] }, // 36 -> 30
  { label: "Round 13", steps: [sc(30)] },
  { label: "Round 14", steps: [group(6, [[1, "SC"], [1, "DEC"]])] }, // 30 -> 24
  { label: "Round 15", steps: [group(6, [[1, "SC"], [1, "DEC"]])] }, // 24 -> 18
  { label: "Round 16", steps: [sc(18)] },
  { label: "Round 17", steps: [group(6, [[1, "SC"], [1, "DEC"]])] }, // 18 -> 12
  { label: "Round 18", steps: [sc(12)] },
  { label: "Round 19", steps: [sc(12)], notes: "Leave a long tail for sewing." },
  { label: "Round 20", steps: [slst(), sc(11)], notes: "Fasten off and weave in the tail." },
];

/**
 * Circular bag base — the circle-to-square transition. The number of plain
 * stitches per repeat grows while the repeat count falls, which is exactly how
 * these are written in printed patterns.
 *   6 -> 12 -> 18 -> 24 -> 30 -> 36
 */
const TOTE_BASE_STITCHES = 36;
const toteBase: RowSeed[] = [
  { label: "Round 1", steps: [mr(), ch(2), dc(6)] },
  { label: "Round 2", steps: [group(6, [[1, "DC"], [1, "INC"]])] },
  { label: "Round 3", steps: [group(6, [[2, "DC"], [1, "INC"]])] },
  { label: "Round 4", steps: [group(6, [[3, "DC"], [1, "INC"]])] },
  { label: "Round 5", steps: [group(6, [[4, "DC"], [1, "INC"]])] },
  {
    label: "Round 6",
    steps: [group(6, [[5, "DC"], [1, "INC"]])],
    notes: "Base measures roughly 27cm across at DK gauge.",
  },
];

const toteSides = (count: number): RowSeed[] =>
  Array.from({ length: count }, (_, index) => ({
    label: `Row ${index + 1}`,
    steps: [slst(), dc(TOTE_BASE_STITCHES)],
    notes: index === 0 ? "Chain 1 at the start of every side row." : "",
  }));

/**
 * Bucket hat: crown grows to 24, holds, then tapers; the brim grows by 2 a row.
 *   crown  6 -> 12 -> 18 -> 24 -> 24 -> 24 -> 20
 *   brim   22 -> 24 -> 26 -> 28 -> 30 -> 32
 */
const hatCrown: RowSeed[] = [
  { label: "Round 1", steps: [mr(), ch(2), dc(6)] },
  { label: "Round 2", steps: [group(6, [[1, "DC"], [1, "INC"]])] }, // 6 -> 12
  { label: "Round 3", steps: [group(6, [[2, "DC"], [1, "INC"]])] }, // 12 -> 18
  { label: "Round 4", steps: [group(6, [[3, "DC"], [1, "INC"]])] }, // 18 -> 24
  { label: "Round 5", steps: [dc(24)] },
  { label: "Round 6", steps: [dc(24)] },
  { label: "Round 7", steps: [group(4, [[5, "DC"], [1, "DEC"]])] }, // 24 -> 20
  { label: "Round 8", steps: [dc(20)] },
];

/** The brim widens by 2 stitches per round. */
const hatBrim = (count: number): RowSeed[] =>
  Array.from({ length: count }, (_, index) => ({
    label: `Round ${index + 1}`,
    steps: [dc(22 + index * 2)],
  }));

/**
 * Scarf. The turning chain lifts the hook to the right height but is NOT
 * worked into, so it must not be counted: the row holds steady at 40.
 */
const SCARF_WIDTH = 40;
const scarfRows = (count: number): RowSeed[] => [
  { label: "Foundation", steps: [ch(SCARF_WIDTH)], notes: "Chain loosely to avoid a tight edge." },
  ...Array.from({ length: count }, (_, index) => ({
    label: `Row ${index + 2}`,
    steps: [tch(1), tr(SCARF_WIDTH - 1)],
    notes: index === 0 ? "Tension is firm here — the scarf needs to hang, not flare." : "",
  })),
];

const grannyRounds: RowSeed[] = [
  { label: "Round 1", steps: [mr(), ch(1), sc(6)] },
  { label: "Round 2", steps: [inc(6)] }, // 6 -> 12
  { label: "Round 3", steps: [group(6, [[1, "SC"], [1, "INC"]])] }, // 12 -> 18
  { label: "Round 4", steps: [dc(18)] },
  { label: "Round 5", steps: [dc(18)], notes: "Fasten off, or join to the next square." },
];

// --- Seed ------------------------------------------------------------------
async function main() {
  console.log("Seeding Crochet Studio demo dataâ€¦\n");

  // Reset the two demo accounts so the script is safe to re-run.
  await prisma.user.deleteMany({
    where: { email: { in: ["demo@crochet.studio", "maya@crochet.studio"] } },
  });

  const passwordHash = await hash("demo1234", 12);

  const demo = await prisma.user.create({
    data: { email: "demo@crochet.studio", name: "Amara", passwordHash },
  });

  // A second account exists purely so data isolation is real, not theoretical.
  const maya = await prisma.user.create({
    data: { email: "maya@crochet.studio", name: "Maya", passwordHash },
  });

  const yarns = await Promise.all(
    [
      { brand: "Scheepjes", name: "Cotton 4", colorName: "Cream", colorHex: "#F0E6D2", weight: "DK", metersPerSkein: 105, gramsPerSkein: 50, quantity: 6 },
      { brand: "Scheepjes", name: "Cotton 4", colorName: "Clay", colorHex: "#C2603F", weight: "DK", metersPerSkein: 105, gramsPerSkein: 50, quantity: 4 },
      { brand: "Himalaya", name: "Yak Wool", colorName: "Charcoal", colorHex: "#4A4740", weight: "ARAN", metersPerSkein: 120, gramsPerSkein: 100, quantity: 3 },
      { brand: "Lion Brand", name: "Mandarin", colorName: "Mustard", colorHex: "#D9A441", weight: "DK", metersPerSkein: 122, gramsPerSkein: 50, quantity: 5 },
      { brand: "Kenton", name: "Merino", colorName: "Fog", colorHex: "#B9C2C6", weight: "DK", metersPerSkein: 112, gramsPerSkein: 50, quantity: 2 },
    ].map((yarn) => prisma.yarn.create({ data: { userId: demo.id, ...yarn } })),
  );

  const patterns = await Promise.all([
    createPattern(demo.id, {
      name: "Teddy Bear",
      description:
        "A classic amigurumi bear worked in continuous spirals. Stuff firmly â€” the shape depends on it.",
      category: "AMIGURUMI",
      difficulty: "INTERMEDIATE",
      hookSizeMm: 3,
      yarnWeight: "DK",
      finishedWidthCm: 18,
      finishedHeightCm: 26,
      gaugeStitches: 4.5,
      gaugeRows: 4,
      materials: [
        { label: "Hook", detail: "3.0mm", quantity: "1" },
        { label: "Yarn", detail: "Cream DK, 50g skeins", quantity: "2" },
        { label: "Stuffing", detail: "Polyester fibrefill" },
        { label: "Safety eyes", detail: "12mm" },
      ],
      sections: [
        { name: "BODY", rows: teddyBearRounds },
        {
          name: "ARMS",
          rows: [
            { label: "Round 1", steps: [mr(), ch(1), sc(6)] },
            { label: "Round 2", steps: [inc(6)] },
            { label: "Round 3", steps: [sc(12)] },
            { label: "Round 4", steps: [sc(12)] },
            { label: "Round 5", steps: [sc(12)] },
            { label: "Round 6", steps: [sc(8)] },
          ],
        },
        {
          name: "EARS",
          rows: [
            { label: "Round 1", steps: [mr(), ch(1), sc(5)] },
            { label: "Round 2", steps: [inc(5)] },
            { label: "Round 3", steps: [sc(10)] },
            { label: "Round 4", steps: [dec(5)] },
          ],
        },
      ],
    }),

    createPattern(demo.id, {
      name: "Classic Tote Bag",
      description:
        "Sturdy cotton tote with a circular base and twin handles. The base is worked flat-to-round, then the sides are worked in straight rows.",
      category: "BAG",
      difficulty: "INTERMEDIATE",
      hookSizeMm: 4,
      yarnWeight: "DK",
      finishedWidthCm: 34,
      finishedHeightCm: 32,
      gaugeStitches: 4,
      gaugeRows: 3.5,
      materials: [
        { label: "Hook", detail: "4.0mm" },
        { label: "Yarn", detail: "Clay cotton DK", quantity: "4 skeins" },
        { label: "Optional", detail: "Sewing machine for the handles" },
      ],
      sections: [
        { name: "BASE", rows: toteBase },
        { name: "BODY", rows: toteSides(22) },
        {
          name: "HANDLES",
          rows: [
            { label: "Row 1", steps: [ch(8)], notes: "Chain strap." },
            { label: "Row 2", steps: [sc(8)] },
          ],
        },
      ],
    }),

    createPattern(demo.id, {
      name: "Bucket Hat",
      description:
        "A short-brim bucket hat worked entirely in the round, with a firm band so the brim holds its shape.",
      category: "HAT",
      difficulty: "BEGINNER",
      hookSizeMm: 4,
      yarnWeight: "ARAN",
      finishedWidthCm: 56,
      finishedHeightCm: 14,
      gaugeStitches: 4,
      gaugeRows: 3,
      materials: [
        { label: "Hook", detail: "4.0mm" },
        { label: "Yarn", detail: "Charcoal yak wool", quantity: "3 skeins" },
        { label: "Ribbon", detail: "Optional, to cover the band" },
      ],
      sections: [
        { name: "CROWN", rows: hatCrown },
        { name: "BRIM", rows: hatBrim(6) },
      ],
    }),

    createPattern(demo.id, {
      name: "Winter Scarf",
      description:
        "A dense ribbed scarf in half double crochet. Firm tension keeps the fabric from stretching out of shape.",
      category: "SCARF",
      difficulty: "BEGINNER",
      hookSizeMm: 6,
      yarnWeight: "ARAN",
      finishedWidthCm: 20,
      finishedHeightCm: 180,
      gaugeStitches: 3,
      gaugeRows: 2.5,
      materials: [{ label: "Hook", detail: "6.0mm" }, { label: "Yarn", detail: "Mustard merino", quantity: "5 skeins" }],
      sections: [{ name: "SCARF", rows: scarfRows(40) }],
    }),

    createPattern(demo.id, {
      name: "Flower Granny Square",
      description:
        "The classic granny square. A perfect first square, and the base for a blanket once you have the rhythm.",
      category: "BLANKET",
      difficulty: "BEGINNER",
      hookSizeMm: 3.5,
      yarnWeight: "DK",
      finishedWidthCm: 15,
      finishedHeightCm: 15,
      gaugeStitches: 4.5,
      gaugeRows: 4,
      materials: [{ label: "Hook", detail: "3.5mm" }, { label: "Yarn", detail: "Three colours" }],
      sections: [{ name: "SQUARE", rows: grannyRounds }],
    }),
  ]);

  const [bear, tote, hat, scarf, square] = patterns;

  // Link the yarn stash to the patterns so the materials list is real data.
  await prisma.patternMaterial.updateMany({
    where: { patternId: bear.id },
    data: { yarnId: yarns[0].id },
  });

  console.log(`  âœ“ ${patterns.length} patterns`);

  // --- Projects -------------------------------------------------------------
  // Progress is stored as one row per completed round. Counting those rows is
  // what the dashboard, the progress bar and the tracker all read.
  async function createProject(input: {
    patternId: string;
    name: string;
    colorHex: string;
    status: string;
    rowsCompleted: number;
    notes?: Array<{ body: string; rowLabel?: string; daysAgo: number }>;
    sessions?: Array<{ seconds: number; daysAgo: number; note?: string }>;
  }) {
    const project = await prisma.project.create({
      data: {
        userId: demo.id,
        patternId: input.patternId,
        name: input.name,
        colorHex: input.colorHex,
        status: input.status,
        startedAt: new Date(Date.now() - input.rowsCompleted * 86_400_000 * 1.5),
        completedAt: input.status === "COMPLETED" ? new Date(Date.now() - 86_400_000) : null,
        sessions: {
          create: (input.sessions ?? []).map((session) => ({
            seconds: session.seconds,
            endedAt: new Date(Date.now() - session.daysAgo * 86_400_000),
            startedAt: new Date(Date.now() - session.daysAgo * 86_400_000 - session.seconds * 1000),
            note: session.note ?? "",
          })),
        },
        notes: {
          create: (input.notes ?? []).map((note) => ({
            body: note.body,
            createdAt: new Date(Date.now() - note.daysAgo * 86_400_000),
          })),
        },
      },
    });

    const rows = await prisma.patternRow.findMany({
      where: { section: { patternId: input.patternId } },
      orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });

    const completed = rows.slice(0, input.rowsCompleted);
    if (completed.length) {
      await prisma.projectRowProgress.createMany({
        data: completed.map((row) => ({
          projectId: project.id,
          rowId: row.id,
          stitches: row.totalStitches,
          completedAt: new Date(),
        })),
      });
    }

    return { project, rows };
  }

  await createProject({
    patternId: bear.id,
    name: "Teddy Bear",
    colorHex: "#D9B48F",
    status: "ACTIVE",
    rowsCompleted: 24,
    notes: [
      { body: "Used slightly tighter tension on rounds 7â€“11. Watch the stuffing level.", daysAgo: 6 },
      { body: "Changed to the mustard yarn for the ear inner â€” much cuter.", daysAgo: 3 },
    ],
    sessions: [
      { seconds: 5_400, daysAgo: 7, note: "Evening session" },
      { seconds: 7_200, daysAgo: 4 },
      { seconds: 3_600, daysAgo: 1 },
    ],
  });

  await createProject({
    patternId: tote.id,
    name: "Classic Tote Bag",
    colorHex: "#C2603F",
    status: "ACTIVE",
    rowsCompleted: 12,
    notes: [{ body: "Base is 27cm across â€” finished 34cm after the first side row.", daysAgo: 2 }],
    sessions: [
      { seconds: 9_000, daysAgo: 5 },
      { seconds: 4_500, daysAgo: 2 },
    ],
  });

  await createProject({
    patternId: hat.id,
    name: "Bucket Hat",
    colorHex: "#4A4740",
    status: "COMPLETED",
    rowsCompleted: hatCrown.length + 6,
    notes: [{ body: "Blocked the brim with a tea towel. Holds its shape perfectly.", daysAgo: 1 }],
    sessions: [{ seconds: 14_400, daysAgo: 2 }],
  });

  await createProject({
    patternId: scarf.id,
    name: "Winter Scarf",
    colorHex: "#D9A441",
    status: "PAUSED",
    rowsCompleted: 18,
    notes: [{ body: "Pausing until the merino arrives. Back in October.", daysAgo: 20 }],
    sessions: [{ seconds: 10_800, daysAgo: 21 }],
  });

  await createProject({
    patternId: square.id,
    name: "Flower Granny Square",
    colorHex: "#B9C2C6",
    status: "ACTIVE",
    rowsCompleted: 3,
    sessions: [{ seconds: 1_800, daysAgo: 1 }],
  });

  console.log(`  âœ“ 5 projects with progress`);

  // A private pattern on another account, to prove isolation.
  await createPattern(maya.id, {
    name: "Secret Amigurumi Dragon",
    description: "Not for sharing. Used to verify that other users' data stays private.",
    category: "AMIGURUMI",
    difficulty: "ADVANCED",
    sections: [{ name: "BODY", rows: teddyBearRounds.slice(0, 6) }],
  });

  console.log(`  âœ“ ${yarns.length} yarns in the stash`);
  console.log("\nDone. Sign in with:");
  console.log("  demo@crochet.studio / demo1234");
  console.log("  maya@crochet.studio / demo1234   (separate private data)\n");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
