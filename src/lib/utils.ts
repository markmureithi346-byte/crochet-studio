import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names and resolves Tailwind conflicts.
 *
 * twMerge matters because it understands the *last* utility wins rule for
 * conflicting Tailwind classes: `cn("p-2", "p-4")` returns `"p-4"`, not
 * `"p-2 p-4"`, which would be ambiguous in the generated CSS.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
