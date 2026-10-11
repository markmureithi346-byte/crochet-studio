import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Surface container. `as` lets a card be a <section>, <article> or <li>
 * depending on the semantics the page needs — a card is not always a div.
 */
export function Card({
  className,
  as,
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  // Cast to ComponentType rather than ElementType: TS resolves the props of a
  // bare ElementType union to `never`, which rejects every prop we pass.
  const Comp = (as ?? "div") as React.ComponentType<React.HTMLAttributes<HTMLElement>>;
  return (
    <Comp
      className={cn(
        "rounded-xl border border-line bg-surface shadow-soft",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1 p-5 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-medium text-ink", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-ink-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-3 border-t border-line p-5", className)} {...props} />
  );
}
