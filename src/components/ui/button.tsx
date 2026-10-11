import { Slot } from "@/components/ui/slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * THE BUTTON
 * ----------
 * `class-variance-authority` (cva) lets us declare every visual variant as data
 * in one place instead of scattering conditional class strings across a hundred
 * components. Adding a new look later is a one-line change here, and the whole
 * app stays consistent for free.
 *
 * `asChild` lets a button render as a <Link> (or <a>) while keeping the exact
 * same styling and keyboard behaviour. This is why we render a single `Slot`
 * component instead of duplicating the class list.
 */
const buttonVariants = cva(
  // Base: focus-visible ring comes from globals.css, so it is identical app-wide.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // `text-on-accent` (not hardcoded white) because a light accent in dark
        // mode needs dark label text to stay readable.
        primary:
          "bg-accent text-on-accent shadow-soft hover:bg-accent-hover hover:shadow-lift",
        secondary:
          "bg-surface text-ink border border-line hover:bg-surface-3 hover:border-line-strong",
        ghost: "text-ink-muted hover:bg-surface-3 hover:text-ink",
        danger: "bg-danger-solid text-white hover:opacity-90",
        outline: "border border-line-strong text-ink hover:bg-surface-3",
      },
      size: {
        // Minimum heights are >= 44px on md+ so touch targets meet WCAG 2.5.5.
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render the child element instead of a <button> (e.g. a next/link). */
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
