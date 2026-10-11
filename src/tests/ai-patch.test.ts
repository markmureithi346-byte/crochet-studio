import { describe, expect, it } from "vitest";
import {
  applyPatch,
  designPatchSchema,
  validatePatchAgainst,
} from "@/lib/ai/patch-schema";

/**
 * The AI contract is the safety mechanism of the whole product.
 *
 * These tests exist to prove a model CANNOT talk its way into an invalid or
 * nonsensical design change, whatever it emits.
 */
const design = { widthCm: 30, heightCm: 25, depthCm: 18, shape: "TUBE", colorHex: "#8d8d94" };

describe("AI design patch contract", () => {
  it("accepts a sensible width change", () => {
    const result = validatePatchAgainst(
      {
        rationale: "Widening the body by 5cm to fit more.",
        changes: [{ field: "widthCm", from: 30, to: 35, unit: "cm" }],
      },
      design,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a rationale that says nothing", () => {
    const result = validatePatchAgainst(
      { rationale: "ok", changes: [{ field: "widthCm", from: 30, to: 35 }] },
      design,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an empty change list", () => {
    const parsed = designPatchSchema.safeParse({ rationale: "Nothing to change here.", changes: [] });
    expect(parsed.success).toBe(false);
  });

  it("rejects a field the design does not have", () => {
    const result = validatePatchAgainst(
      {
        rationale: "Trying to change a field that does not exist on this design.",
        changes: [{ field: "widthCm", from: 30, to: 35 }, { field: "colourway" as never, from: null, to: "x" }],
      },
      design,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a shape we do not support", () => {
    const result = validatePatchAgainst(
      {
        rationale: "Turning the bag into a shape we cannot render.",
        changes: [{ field: "shape", from: "TUBE", to: "OCTOPUS" }],
      },
      design,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid hex colour", () => {
    const result = validatePatchAgainst(
      {
        rationale: "Setting a colour that is not actually a colour value.",
        changes: [{ field: "colorHex", from: "#8d8d94", to: "reddish" }],
      },
      design,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects physically impossible dimensions", () => {
    const result = validatePatchAgainst(
      {
        rationale: "Setting the width to a thousand centimetres wide.",
        changes: [{ field: "widthCm", from: 30, to: 1000 }],
      },
      design,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/sensible/i);
  });

  it("applies only after approval, and only the stated fields", () => {
    const patch = designPatchSchema.parse({
      rationale: "Widening the body by 5cm to fit more.",
      changes: [{ field: "widthCm", from: 30, to: 35, unit: "cm" }],
    });
    const next = applyPatch(design, patch);
    expect(next.widthCm).toBe(35);
    // Untouched fields stay untouched.
    expect(next.heightCm).toBe(25);
    expect(next.shape).toBe("TUBE");
  });

  it("never mutates the original design object", () => {
    const patch = designPatchSchema.parse({
      rationale: "Widening the body by 5cm to fit more.",
      changes: [{ field: "widthCm", from: 30, to: 35, unit: "cm" }],
    });
    applyPatch(design, patch);
    expect(design.widthCm).toBe(30);
  });
});
