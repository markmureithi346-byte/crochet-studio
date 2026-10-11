import { generatePattern } from "../src/lib/engine/generate";
import { resultingCount, netChangeOfRow, formatRow } from "../src/lib/engine/stitch-math";

/**
 * Walks every generated pattern and asserts the count NEVER SHRINKS during a
 * base spiral. A circle that gets smaller while it is being built is
 * impossible crochet — you cannot work 12 stitches into 9.
 */
const shapes = ["PANEL", "BOX", "CYLINDER", "TORUS", "CONE", "SPHERE"] as const;

let failures = 0;

for (const shape of shapes) {
  const result = generatePattern({
    shape,
    widthCm: 30,
    heightCm: 25,
    depthCm: 18,
    yarnWeight: "DK",
  });

  if (!result.ok) {
    console.log(`${shape}: generator refused -> ${result.reason}`);
    continue;
  }

  console.log(`\n${shape}  (${result.totalRows} rounds)`);
  let running: number | null = null;
  let worstDrop = 0;
  const show = shape === "BOX" ? 10 : shape === "CONE" || shape === "SPHERE" ? 12 : 4;

  result.sections.forEach((section, si) => {
    console.log(`  [${section.name}]`);
    section.rows.slice(0, show).forEach((row, index) => {
      const change = netChangeOfRow(row.steps);
      const total = running === null
        ? row.steps.reduce((s, st) => s + (st.type === "STITCH" ? st.count * (st.stitch === "INC" ? 2 : 1) : 0), 0)
        : resultingCount(running, row.steps);

      const dropped = running !== null && total < running && si === 0 && index < 6;
      if (dropped) worstDrop = Math.max(worstDrop, running! - total);

      console.log(
        `    ${row.label.padEnd(10)} ${String(total).padStart(4)}  ${change >= 0 ? "+" : ""}${change}  ${formatRow(row.steps).slice(0, 46)}`,
      );
      running = total;
    });
    if (section.rows.length > show) {
      console.log(`    ... ${section.rows.length - show} more rounds`);
      for (const row of section.rows.slice(show)) {
        running = resultingCount(running ?? 0, row.steps);
      }
    }
  });

  if (worstDrop > 0) {
    console.log(`  !! count DROPPED by ${worstDrop} during the base — impossible`);
    failures += 1;
  }
}

console.log(failures === 0 ? "\nNo impossible counts." : `\n${failures} shape(s) broken.`);
process.exitCode = failures === 0 ? 0 : 1;