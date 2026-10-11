import { z } from "zod";

/**
 * Auth form schemas.
 *
 * Note the deliberate password rules: minimum 8 characters, and we require a
 * letter and a number. Modern guidance (NIST SP 800-63B) is that length matters
 * far more than symbol complexity, so we keep the rule simple rather than
 * forcing "P@ssw0rd!" patterns that people write down on a sticky note.
 */

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "That password is suspiciously long")
  .regex(/[a-zA-Z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tell us what to call you")
    .max(60, "That name is a bit long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
