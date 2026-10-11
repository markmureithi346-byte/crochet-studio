"use client";

import { useMemo } from "react";
import { layoutRow, type RowVisual, type VisualInput } from "@/lib/engine/visual";
import { cn } from "@/lib/utils";

/**
 * STITCH DIAGRAM
 * ==============
 * The visual half of the pattern: where each stitch lands, drawn rather than
 * described.
 *
 * WHY AN INCREASE IS DRAWN AS TWO CELLS WITH A CONNECTOR
 * ---------------------------------------------------
 * "6 INC" reads as a number. The reason the circle turns a corner is that two
 * stitches come out of one stitch. Drawing it that way makes the geometry
 * visible, which is the thing a written pattern cannot do.
 *
 * ACCESSIBILITY
 * -------------
 * The SVG is decorative: the same information is always available as text in
 * the written view, which is why the diagram is `aria-hidden`. Announcing "36
 * circles at various positions" would be noise. Colour is never the only signal
 * either — shaping carries a +/− glyph as well.
 *
 * PERFORMANCE
 * -----------
 * Memoised on the round's inputs, and it draws with plain SVG paths rather than
 * a charting library: a 180-stitch row is 180 nodes, which is nothing, and this
 * way we control the marks so they look like stitches rather than dots.
 */
export function StitchDiagram({
  input,
  className,
  showReason = false,
}: {
  input: VisualInput;
  className?: string;
  showReason?: boolean;
}) {
  const visual = useMemo(() => layoutRow(input), [input]);

  if (visual.cells.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs text-ink-subtle">
        Nothing to draw yet — this round has no instructions.
      </p>
    );
  }

  return (
    <figure className={cn("space-y-2", className)}>
      <div className="overflow-x-auto">
        <svg
          width={visual.width}
          height={visual.height}
          viewBox={`0 0 ${visual.width} ${visual.height}`}
          role="img"
          aria-hidden="true"
          className="mx-auto block select-none"
        >
          {/* The working line in a flat row — stitches are worked back along it. */}
          {visual.mode === "row" ? (
            <WorkingLine visual={visual} />
          ) : (
            <RingGuide visual={visual} />
          )}

          {/* Connectors first so they sit under the stitch marks. */}
          {visual.cells.map((cell) =>
            cell.kind === "increase" && cell.pairedWith !== undefined && cell.index < cell.pairedWith ? (
              <IncreaseConnector key={`c-${cell.index}`} visual={visual} index={cell.index} />
            ) : null,
          )}

          {visual.cells.map((cell) => (
            <StitchMark key={cell.index} cell={cell} />
          ))}
        </svg>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-[11px] text-ink-subtle">
        <span className="flex items-center gap-2">
          {visual.mode === "circle" ? (
            <>
              <Mark kind="stitch" /> <span>stitch</span>
              <Mark kind="increase" /> <span>increase (2 into 1)</span>
            </>
          ) : (
            <>
              <Mark kind="stitch" /> <span>stitch</span>
              {visual.cells.some((cell) => cell.kind === "decrease") ? (
                <>
                  <Mark kind="decrease" /> <span>decrease (2 into 1)</span>
                </>
              ) : null}
            </>
          )}
        </span>
        {showReason ? <span className="italic">{visual.reason}</span> : null}
      </figcaption>
    </figure>
  );
}

/** One stitch top, drawn to suggest the stitch rather than as a dot. */
function StitchMark({
  cell,
}: {
  cell: RowVisual["cells"][number];
}) {
  const fill =
    cell.kind === "increase" ? "var(--clay)" : cell.kind === "decrease" ? "var(--dusk)" : "var(--ink)";

  if (cell.kind === "stitch") {
    // A short bar: reads as a stitch top without pretending to be fabric.
    return (
      <rect
        x={cell.x - 5}
        y={cell.y - 5}
        width={10}
        height={10}
        rx={2.5}
        fill={fill}
        opacity={0.55}
      />
    );
  }

  return (
    <g>
      <circle cx={cell.x} cy={cell.y} r={6.5} fill={fill} opacity={0.9} />
      <text
        x={cell.x}
        y={cell.y + 3.4}
        textAnchor="middle"
        fontSize={9}
        fontWeight={700}
        fill="var(--surface)"
      >
        {cell.kind === "increase" ? "+" : "−"}
      </text>
    </g>
  );
}

/** The two halves of an increase, joined so the "2 into 1" is visible. */
function IncreaseConnector({ visual, index }: { visual: RowVisual; index: number }) {
  const a = visual.cells[index];
  const b = visual.cells[a.pairedWith!];
  if (!a || !b) return null;

  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;

  return (
    <g>
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke="var(--clay)"
        strokeWidth={1.5}
        strokeDasharray="3 3"
        opacity={0.6}
      />
      {/* A tick on the round below, showing where both stitches came from. */}
      <circle cx={midX} cy={midY} r={1.8} fill="var(--clay)" opacity={0.8} />
    </g>
  );
}

function RingGuide({ visual }: { visual: RowVisual }) {
  const centre = visual.width / 2;
  return (
    <circle
      cx={centre}
      cy={centre}
      r={Math.min(centre - 12, 60)}
      fill="none"
      stroke="var(--line)"
      strokeWidth={1}
      strokeDasharray="2 5"
    />
  );
}

function WorkingLine({ visual }: { visual: RowVisual }) {
  const first = visual.cells[0];
  const last = visual.cells[visual.cells.length - 1];
  if (!first || !last) return null;

  return (
    <line
      x1={first.x}
      y1={last.y + 16}
      x2={last.x}
      y2={last.y + 16}
      stroke="var(--line)"
      strokeWidth={1}
    />
  );
}

/** Tiny inline mark used in the legend. */
function Mark({ kind }: { kind: "stitch" | "increase" | "decrease" }) {
  if (kind === "stitch") {
    return <span className="inline-block size-2 rounded-[2px] bg-ink/55" aria-hidden="true" />;
  }
  return (
    <span
      className={cn(
        "inline-flex size-3.5 items-center justify-center rounded-full text-[9px] font-bold text-surface",
        kind === "increase" ? "bg-clay" : "bg-dusk",
      )}
      aria-hidden="true"
    >
      {kind === "increase" ? "+" : "−"}
    </span>
  );
}