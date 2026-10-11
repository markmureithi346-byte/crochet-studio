"use client";

import dynamic from "next/dynamic";
import type { DesignSpec } from "@/lib/design/shapes";
import type { ViewAngle } from "./model-viewport";

/**
 * LAZY-LOADED VIEWPORT WRAPPER
 * ===========================
 * Three.js is ~600KB gzipped. No page should pay for it unless it shows a 3D
 * view, so the import is deferred AND skipped on the server:
 *
 *   ssr: false        — there is nothing meaningful to render on a server, and
 *                       Three.js touches `window` during module evaluation.
 *   loading: fallback — gives React something to paint while the chunk
 *                       downloads, instead of a blank rectangle.
 *
 * RULE (Next.js 16): `ssr: false` only works inside a Client Component. This
 * file exists solely to be that Client Component, which lets any Server
 * Component drop in `<Viewport spec={...} />` with no ceremony.
 */
const ModelViewport = dynamic(() => import("./model-viewport").then((mod) => mod.ModelViewport), {
  ssr: false,
  loading: () => <ViewportSkeleton />,
});

export function Viewport({
  spec,
  angle = "perspective",
  className,
}: {
  spec: DesignSpec;
  angle?: ViewAngle;
  className?: string;
}) {
  return <ModelViewport spec={spec} angle={angle} className={className} />;
}

function ViewportSkeleton() {
  return (
    <div
      className="size-full animate-pulse bg-surface-3"
      role="status"
      aria-label="Loading 3D preview"
    >
      <span className="sr-only">Loading 3D preview…</span>
    </div>
  );
}

export type { ViewAngle };
