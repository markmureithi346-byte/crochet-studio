import { cn } from "@/lib/utils";

/**
 * PROGRESS BAR
 * ------------
 * `role="progressbar"` + aria-valuenow/min/max is what makes this readable by a
 * screen reader ("78% complete"). A plain <div> with a width would be silent.
 *
 * The bar animates its width, but the transition is disabled under
 * prefers-reduced-motion by the global rule in globals.css.
 */
export function Progress({
  value,
  max = 100,
  label,
  showValue = true,
  className,
  tone = "accent",
}: {
  value: number;
  max?: number;
  label: string;
  showValue?: boolean;
  className?: string;
  tone?: "accent" | "moss" | "dusk";
}) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const toneClass = {
    accent: "bg-accent",
    moss: "bg-moss",
    dusk: "bg-dusk",
  }[tone];

  return (
    <div className={cn("space-y-1.5", className)}>
      {showValue ? (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-ink-muted">{label}</span>
          <span className="font-stitch font-medium text-ink">{percent}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-3"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", toneClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
