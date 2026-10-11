import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Form field.
 *
 * ACCESSIBILITY NOTES (these are requirements, not extras)
 * ------------------------------------------------------
 * - Every input has a real <label>, linked by id/htmlFor.
 * - Error text is tied to the input with aria-describedby and announced via
 *   role="alert", so a screen reader reads the problem when it appears.
 * - aria-invalid marks the field as invalid for assistive tech.
 * We do not rely on colour alone to signal an error â€” the message text is
 * always present.
 */
export function Input({
  className,
  type = "text",
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      id={id}
      type={type}
      className={cn(
        "h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink",
        "placeholder:text-ink-subtle",
        "transition-colors duration-150",
        "hover:border-line-strong",
        "focus:border-accent focus:outline-none",
        "aria-invalid:border-danger aria-invalid:focus:border-danger",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  id,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      id={id}
      className={cn(
        "w-full min-h-24 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink",
        "placeholder:text-ink-subtle transition-colors duration-150",
        "hover:border-line-strong focus:border-accent focus:outline-none",
        "aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  id,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      id={id}
      className={cn(
        "h-11 w-full appearance-none rounded-lg border border-line bg-surface px-3 pr-8 text-sm text-ink",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22%236e675c%22%3E%3Cpath%20d%3D%22M4.5%206.5L8%2010l3.5-3.5z%22%2F%3E%3C%2Fsvg%3E')]",
        "bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat",
        "transition-colors duration-150 hover:border-line-strong focus:border-accent focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm font-medium text-ink",
        className,
      )}
      {...props}
    />
  );
}

/** Consistent error line under a field. */
export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-sm text-danger">
      {children}
    </p>
  );
}

/** Label + control + error, with the wiring already done. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
