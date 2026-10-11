import { describe, expect, it } from "vitest";
import { validateRows, type EngineRow } from "@/lib/engine/validate";

/**
 * The validator's contract is deliberately narrow: it reports what it can prove
 * and stays silent about everything else. These tests pin down both halves —
 * including that it does NOT cry wolf on legitimate shaping.
 */
const inc = (count: number) => ({ type: "STITCH", stitch: "INC", count }) as const;
const dec = (count: number) => ({ type: "STITCH", stitch: "DEC", count }) as const;
const ch = (count: number) => ({ type: "STITCH", stitch: "CH", count }) as const;
const group = (count: number, steps: Array<{ stitch: "SC" | "INC" | "DEC"; count: number }>) =>
  ({ type: "GROUP", count, steps: steps.map((s) => ({ type: "STITCH" as const, ...s })) }) as const;

describe("validateRows", () => {
  it("passes a correct amigurumi spiral silently", () => {
    const rows: EngineRow[] = [
      { label: "Round 1", steps: [ch(6)] },
      // Increase rounds deliberately change the count, so no expected value is
      // declared: that is what triggers the informational note instead.
      { label: "Round 2", steps: [inc(6)] },
      { label: "Round 3", steps: [group(6, [{ stitch: "SC", count: 1 }, { stitch: "INC", count: 1 }])], expectedStitches: 18 },
    ];

    const result = validateRows(rows);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.finalCount).toBe(18);
  });

  it("flags a round that does not produce the expected count", () => {
    const rows: EngineRow[] = [
      { label: "Round 1", steps: [ch(6)] },
      // 6 INC turns a 6-stitch round into 12. The pattern claims 6.
      { label: "Round 2", steps: [inc(6)], expectedStitches: 6 },
    ];

    const result = validateRows(rows);
    const issue = result.issues.find((i) => i.code === "COUNT_MISMATCH");
    expect(issue?.level).toBe("error");
    expect(issue?.message).toContain("12");
    expect(issue?.message).toContain("6");
  });

  it("flags a decrease that cannot divide evenly", () => {
    // 18 stitches with 5 decreases cannot be spaced evenly -> lumpy fabric.
    const rows: EngineRow[] = [
      { label: "Round 1", steps: [ch(18)] },
      { label: "Round 2", steps: [dec(5)] },
    ];

    const result = validateRows(rows);
    expect(result.issues.some((i) => i.code === "UNEVEN_DECREASE")).toBe(true);
  });

  it("does not warn when the decrease divides evenly", () => {
    const rows: EngineRow[] = [
      { label: "Round 1", steps: [ch(24)] },
      { label: "Round 2", steps: [dec(6)] },
    ];

    const result = validateRows(rows);
    expect(result.issues.some((i) => i.code === "UNEVEN_DECREASE")).toBe(false);
  });

  it("stays quiet about a deliberate increase that divides evenly", () => {
    const rows: EngineRow[] = [
      { label: "Round 1", steps: [ch(12)] },
      { label: "Round 2", steps: [group(6, [{ stitch: "SC", count: 1 }, { stitch: "INC", count: 1 }])] },
    ];

    const result = validateRows(rows);
    expect(result.issues.filter((i) => i.level !== "info")).toHaveLength(0);
  });

  it("notes a silent change in stitch count as information, not an error", () => {
    // 20 ch -> then 5 INC: the count becomes 25 with no declared target.
    const rows: EngineRow[] = [
      { label: "Row 1", steps: [ch(20)] },
      { label: "Row 2", steps: [inc(5)] },
    ];

    const result = validateRows(rows);
    const issue = result.issues.find((i) => i.code === "SILENT_CHANGE");
    expect(issue?.level).toBe("info");
    expect(result.errorCount).toBe(0);
  });

  it("reports an empty row as an error", () => {
    const result = validateRows([{ label: "Round 1", steps: [] }]);
    expect(result.issues[0].code).toBe("EMPTY_ROW");
  });

  it("detects a row that closes the piece", () => {
    const rows: EngineRow[] = [{ label: "Round 1", steps: [ch(6)] }, { label: "Round 2", steps: [dec(6)] }];
    const result = validateRows(rows);
    expect(result.issues.some((i) => i.code === "JOIN")).toBe(true);
  });

  it("rejects a stitch code it does not know", () => {
    const rows: EngineRow[] = [
      { label: "Round 1", steps: [{ type: "STITCH", stitch: "XYZ" as never, count: 1 }] },
    ];
    const result = validateRows(rows);
    expect(result.issues[0].code).toBe("UNKNOWN_STITCH");
  });

  it("counts total rows", () => {
    expect(validateRows([{ label: "a", steps: [ch(1)] }, { label: "b", steps: [ch(1)] }]).totalRows).toBe(2);
  });
});
