import { readFileSync } from "node:fs";

/**
 * RENDER CHECK
 * ============
 * Asserts what the SERVER-rendered HTML can actually prove about a pattern page.
 *
 * An earlier version of this file failed 12/13 checks while the app was working
 * correctly, because it asserted things that only exist after hydration (the
 * edit toolbar) or on patterns with multiple sections (the section jump nav).
 * A check that fails when the code is right teaches you to ignore checks, so
 * this version only asserts what is genuinely observable here.
 *
 * Usage: node scripts/check-render.mjs <patternId> [cookieFile]
 */
const patternId = process.argv[2];
const cookieFile = process.argv[3] ?? "cookies.txt";

if (!patternId) {
  console.error("usage: node scripts/check-render.mjs <patternId> [cookieFile]");
  process.exit(1);
}

/**
 * Netscape cookie-file parsing.
 *
 * The subtlety: curl writes HttpOnly cookies as `#HttpOnly_<name>`, so a naive
 * "skip comments" filter silently drops the session cookie and every check then
 * runs against the LOGIN page and fails for the wrong reason.
 */
const cookies = readFileSync(cookieFile, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line) => line.startsWith("#HttpOnly_") || !line.startsWith("#"))
  .map((line) => (line.startsWith("#HttpOnly_") ? line.slice("#HttpOnly_".length) : line))
  .map((line) => {
    const parts = line.split("\t");
    return `${parts[parts.length - 2]}=${parts[parts.length - 1]}`;
  })
  .join("; ");

const response = await fetch(`http://127.0.0.1:3000/patterns/${patternId}`, {
  headers: { cookie: cookies },
});
const html = await response.text();

let failures = 0;
function check(label, condition, extra = "") {
  console.log(`${condition ? "  PASS" : "  FAIL"}  ${label}${extra ? ` (${extra})` : ""}`);
  if (!condition) failures += 1;
}

/** Pulls the number out of a `<dt>Label</dt><dd class=..>Value` pair. */
function stat(label) {
  const match = html.match(new RegExp(`${label}<\\/dt><dd[^>]*>([^<]+)`));
  return match?.[1]?.trim() ?? "";
}

console.log(`\nRendered ${html.length} bytes for pattern ${patternId}\n`);

// --- Did we even get the right page? ---------------------------------------
check("HTTP 200", response.status === 200, `status ${response.status}`);
check("not redirected to login", !html.includes("Welcome back"));
check("no application error", !html.includes("Application error"));

// --- The redesign -----------------------------------------------------------
check(
  "position rail present (where am I)",
  html.includes("Progress through pattern"),
);
check(
  "rail shows a round position",
  /round\s*<!-- -->\d+<!-- -->\s*of/.test(html),
);
check(
  "flat rows, not the old card-in-card markup",
  !html.includes("rounded-lg border bg-surface p-3"),
);
check("read mode is the default", html.includes('aria-pressed="true"'));

// --- Real data, not zeros ---------------------------------------------------
const rounds = stat("Rounds");
const finished = stat("Finished count");
const estimate = stat("Estimate");

check("round count is non-zero", /^\d+$/.test(rounds) && Number(rounds) > 0, rounds);
// Values look like "22 st", so compare the leading number, not Number() of the
// whole string (which would be NaN and fail on correct output).
const finishedNumber = Number((finished.match(/^\d+/) ?? ["0"])[0]);
check("finished count is non-zero", finishedNumber > 0, finished);
check(
  "gauge-derived size estimate shown",
  estimate.includes("×") && estimate.includes("cm"),
  estimate,
);
check(
  "validation rendered",
  /Arithmetic checks out|problem|to check|note/i.test(html),
);

// --- Read mode content ------------------------------------------------------
const roundRows = (html.match(/font-stitch text-\[15px\]/g) ?? []).length;
check("read mode renders stitch notation rows", roundRows > 0, `${roundRows} rows`);

console.log(
  `\n  stats: ${rounds} rounds · ${finished} · ${estimate || "no estimate"}\n`,
);
console.log(
  failures === 0 ? "All render checks passed.\n" : `\n${failures} render check(s) FAILED.\n`,
);
process.exitCode = failures === 0 ? 0 : 1;