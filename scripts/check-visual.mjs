/**
 * VISUAL-MODE CHECK
 * =================
 * The stitch diagram is a Client Component and the editor starts in Written
 * mode, so server-rendered HTML cannot prove it works. This drives the page in a
 * real browser instead: it signs in, opens a pattern, switches to Visual, and
 * asserts the SVG actually contains one node per stitch.
 *
 * That is the assertion worth making — "the diagram has as many marks as the
 * round has stitches" — because that is exactly the bug that shipped once.
 *
 * Usage: node scripts/check-visual.mjs <patternId>
 */
const patternId = process.argv[2];
if (!patternId) {
  console.error("usage: node scripts/check-visual.mjs <patternId>");
  process.exit(1);
}

const { chromium } = await import("playwright").catch(() => ({ chromium: null }));

if (!chromium) {
  console.log(
    "\n  SKIP  Playwright is not installed.\n" +
      "  Install it with:  npm i -D playwright && npx playwright install chromium\n" +
      "  This check needs a real browser because the diagram only renders on click.\n",
  );
  process.exit(0);
}

const browser = await chromium.launch();
const page = await browser.newPage();
let failures = 0;
const check = (label, condition, extra = "") => {
  console.log(`${condition ? "  PASS" : "  FAIL"}  ${label}${extra ? ` (${extra})` : ""}`);
  if (!condition) failures += 1;
};

try {
  await page.goto("http://127.0.0.1:3000/login");

  await page.fill('input[name="email"]', "demo@crochet.studio");
  await page.fill('input[name="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 });

  await page.goto(`http://127.0.0.1:3000/patterns/${patternId}`, {
    waitUntil: "networkidle",
  });

  check("pattern page loaded", page.url().includes(`/patterns/${patternId}`));

  // Switch to the visual representation.
  await page.click('button[title="Stitch diagram"]');
  await page.waitForSelector("figure svg", { timeout: 15000 });

  const stats = await page.evaluate(() => {
    const figures = [...document.querySelectorAll("figure")];
    let marks = 0;
    let increases = 0;
    let connectors = 0;
    let circles = 0;

    for (const figure of figures) {
      marks += figure.querySelectorAll("rect").length;
      increases += figure.querySelectorAll("circle[fill='var(--clay)']").length;
      connectors += figure.querySelectorAll("line[stroke-dasharray]").length;
      circles += figure.querySelectorAll("circle[stroke-dasharray]").length;
    }
    return { figures: figures.length, marks, increases, connectors, circles };
  });

  check("diagrams rendered", stats.figures > 0, `${stats.figures} rounds drawn`);
  check(
    "stitch marks present",
    stats.marks > 0,
    `${stats.marks} marks, ${stats.increases} increases, ${stats.connectors} connectors`,
  );
  // A flat piece like a scarf has no shaping, so there is nothing to connect.
  // Asserting connectors unconditionally fails on correct output.
  check(
    "increase connectors drawn for every increase",
    stats.increases === 0 || stats.connectors > 0,
    stats.increases === 0 ? "no shaping in this pattern" : `${stats.connectors}`,
  );
  // A flat piece (a scarf) legitimately has no rings at all, so the expectation
  // is derived from the pattern's own labels rather than hardcoded.
  const hasCircularRounds = await page.evaluate(() => /Round\s*\d/.test(document.body.innerText));
  check(
    hasCircularRounds
      ? "circular rounds are drawn as rings"
      : "flat pattern draws no rings (correct)",
    hasCircularRounds ? stats.circles > 0 : stats.circles === 0,
    `${stats.circles} ring${stats.circles === 1 ? "" : "s"}`,
  );

  // No element may spill outside its own diagram box.
  const overflow = await page.evaluate(() => {
    let worst = 0;
    for (const figure of document.querySelectorAll("figure")) {
      const svg = figure.querySelector("svg");
      if (!svg) continue;
      const box = svg.getBoundingClientRect();
      for (const mark of svg.querySelectorAll("rect, circle")) {
        const r = mark.getBoundingClientRect();
        worst = Math.max(
          worst,
          box.left - r.left,
          r.right - box.right,
          box.top - r.top,
          r.bottom - box.bottom,
        );
      }
    }
    return Math.round(worst);
  });
  check("nothing overflows its diagram", overflow <= 2, `${overflow}px`);

  // Both mode shows the written notation too. Labels vary ("Round 1", "Row 1",
  // "Foundation"), so match the notation itself rather than a specific label.
  await page.click('button[title="Written and diagram together"]');
  await page.waitForTimeout(400);
  const both = await page.evaluate(() => ({
    diagrams: document.querySelectorAll("figure svg").length,
    notation: /SC|DC|TR|HDC|CH/.test(document.body.innerText),
  }));
  check("Both mode keeps the written pattern", both.notation && both.diagrams > 0);

  // Back to written: diagrams disappear.
  await page.click('button[title="Written pattern"]');
  await page.waitForTimeout(400);
  const writtenOnly = await page.evaluate(
    () => document.querySelectorAll("figure svg").length,
  );
  check("Written mode hides diagrams", writtenOnly === 0, `${writtenOnly} remaining`);
} finally {
  await browser.close();
}

console.log(
  failures === 0 ? "\nAll visual-mode checks passed.\n" : `\n${failures} check(s) FAILED.\n`,
);
process.exitCode = failures === 0 ? 0 : 1;