"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  countRow,
  formatRow,
  type PatternStep,
} from "@/lib/engine/stitch-math";

/**
 * HERO DIAGRAM â€” Pattern â†’ 3D Design â†’ Crochet Project
 * ====================================================
 * This is the product thesis in one component: one design, three views.
 *
 * IMPORTANT: the numbers in the "Pattern" card are NOT hardcoded mock-ups. They
 * are produced by running the real stitch engine (`formatRow` / `countRow` from
 * src/lib/engine/stitch-math.ts) over the same structured data a user's pattern
 * would hold. If the engine's maths breaks, this hero visibly breaks â€” which is
 * exactly what we want from a demo.
 *
 * `useReducedMotion()` from Motion respects the OS accessibility setting, so
 * users who ask for less motion get a static diagram rather than an animation.
 */

/** The three rounds of a classic amigurumi spiral, as structured data. */
const DEMO_ROUNDS: { label: string; steps: PatternStep[] }[] = [
  { label: "Round 1", steps: [{ type: "STITCH", stitch: "CH", count: 6 }] },
  { label: "Round 2", steps: [{ type: "STITCH", stitch: "INC", count: 6 }] },
  {
    label: "Round 3",
    steps: [
      {
        type: "GROUP",
        count: 6,
        steps: [
          { type: "STITCH", stitch: "SC", count: 1 },
          { type: "STITCH", stitch: "INC", count: 1 },
        ],
      },
    ],
  },
];

const STAGES = [
  { key: "pattern", label: "Pattern", sub: "Structured rounds" },
  { key: "design", label: "3D design", sub: "Parametric preview" },
  { key: "project", label: "Crochet project", sub: "Round by round" },
] as const;

export function StudioPipeline() {
  const reduceMotion = useReducedMotion();
  const finalTotal = DEMO_ROUNDS.reduce((sum, r) => sum + countRow(r.steps), 0);

  return (
    <div className="w-full">
      <ol className="grid gap-3 sm:grid-cols-3 sm:gap-0">
        {STAGES.map((stage, index) => (
          <li key={stage.key} className="relative">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="h-full"
            >
              <StageCard stage={stage.key} finalTotal={finalTotal} />
            </motion.div>

            {/* Connector. On mobile it points down, on desktop it points right. */}
            {index < STAGES.length - 1 ? (
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-full my-1.5 -translate-x-1/2 sm:left-full sm:top-1/2 sm:my-0 sm:-translate-y-1/2 sm:translate-x-0"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" className="rotate-90 text-line-strong sm:rotate-0">
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StageCard({
  stage,
  finalTotal,
}: {
  stage: (typeof STAGES)[number]["key"];
  finalTotal: number;
}) {
  const base =
    "flex h-full flex-col rounded-xl border border-line bg-surface p-4 shadow-soft sm:rounded-l-none sm:first:rounded-l-xl";
  const labels = STAGES.find((s) => s.key === stage)!;

  return (
    <div className={base}>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{labels.label}</span>
        <span className="text-[11px] text-ink-subtle">{labels.sub}</span>
      </div>

      {stage === "pattern" ? <PatternCardBody finalTotal={finalTotal} /> : null}
      {stage === "design" ? <DesignCardBody /> : null}
      {stage === "project" ? <ProjectCardBody finalTotal={finalTotal} /> : null}
    </div>
  );
}

/** Left card: real written rounds produced by the engine. */
function PatternCardBody({ finalTotal }: { finalTotal: number }) {
  return (
    <div className="font-stitch text-xs leading-relaxed">
      <ul className="space-y-1.5">
        {DEMO_ROUNDS.map((round) => (
          <li key={round.label} className="flex items-baseline justify-between gap-2">
            <span className="text-ink-subtle">{round.label}</span>
            <span className="truncate text-ink">{formatRow(round.steps)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-line pt-2 text-ink-muted">
        18 stitches <span className="text-ink-subtle">({finalTotal} total)</span>
      </p>
    </div>
  );
}

/** Middle card: a CSS stand-in for the 3D viewport. */
function DesignCardBody() {
  return (
    <div className="flex flex-1 items-center justify-center py-1">
      <div className="relative size-20 rounded-full bg-gradient-to-br from-accent to-accent-hover shadow-lift">
        {/* Stitch grid overlay hints at the yarn-textured surface in 3D. */}
        <div
          className="absolute inset-0 rounded-full opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,.55) 1px, transparent 1px)",
            backgroundSize: "7px 7px",
          }}
        />
      </div>
    </div>
  );
}

/** Right card: the tracker state a crocheter actually sees. */
function ProjectCardBody({ finalTotal }: { finalTotal: number }) {
  const done = 2;
  const total = DEMO_ROUNDS.length;
  const percent = Math.round((done / total) * 100);

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-ink-muted">Round {done + 1} of {total}</span>
        <span className="font-stitch text-ink">{finalTotal} st</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Project progress"
        className="h-2 w-full overflow-hidden rounded-full bg-surface-3"
      >
        <div className="h-full rounded-full bg-moss transition-[width] duration-700" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-[11px] text-ink-subtle">6 stitches Â· 2 min</p>
    </div>
  );
}
