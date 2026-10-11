import * as React from "react";

/**
 * Slot merges our props onto a single child element.
 *
 * This is the one small piece of shadcn-style plumbing worth understanding: it
 * lets `<Button asChild><Link href="/x">Go</Link></Button>` produce a <Link>
 * that looks exactly like a button. Without it you would duplicate the button
 * class list onto every link.
 *
 * NOTE ON TYPES: we deliberately type the child as `Record<string, unknown>` and
 * build a plain object before cloning. That keeps TypeScript happy without
 * `any` — `React.cloneElement` otherwise rejects our prop object because an
 * interface has no index signature.
 */
export const Slot = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }
>(function Slot({ children, ...props }, ref) {
  if (!React.isValidElement<Record<string, unknown>>(children)) return null;

  const childProps = children.props;
  const childClassName =
    typeof childProps.className === "string" ? childProps.className : undefined;

  const merged: Record<string, unknown> = {
    ...props,
    ...childProps,
    // Child classes come last so a caller can override our defaults.
    className: [props.className, childClassName].filter(Boolean).join(" "),
    ref,
  };

  return React.cloneElement(children, merged);
});
