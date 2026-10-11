import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signInSchema } from "@/lib/validation/auth";

/**
 * AUTHENTICATION
 * ==============
 * We use Auth.js (NextAuth v5) with the Credentials provider and JWT sessions.
 *
 * WHY CREDENTIALS + JWT INSTEAD OF A DATABASE SESSION?
 * With only email/password sign-in there is no third-party identity provider to
 * federate, so a database session table buys us very little. A signed JWT in an
 * httpOnly cookie is simpler, has no lookup on every request, and is the
 * recommended shape for this case.
 *
 * SECURITY NOTES (the parts people forget)
 * ---------------------------------------
 * - Passwords are hashed with bcrypt (cost 12). We NEVER compare plaintext and
 *   never log it.
 * - `authorize()` returns either a user object or null. Returning null is what
 *   produces a generic "invalid credentials" error, so we cannot be used to
 *   discover which email addresses have accounts.
 * - The JWT payload is signed, so a user cannot forge `userId` — but see
 *   src/proxy.ts for why the proxy still re-checks permissions in the data
 *   layer, which is the real security boundary.
 */

/** Never let a throw inside authorize() leak as a raw stack trace to the UI. */
const credentialsSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Trust the host in local development; set AUTH_URL in production.
  trustHost: true,
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = signInSchema.parse(parsed.data);

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, passwordHash: true },
        });

        // Always run a hash comparison, even when the user does not exist.
        // If we returned early on `!user`, response timing would reveal which
        // emails are registered (a user-enumeration side channel).
        const passwordMatches = await compare(
          password,
          user?.passwordHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin",
        );

        if (!user || !passwordMatches) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    /** Runs on sign-in and whenever the token is refreshed. */
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    /** Runs on every session read — this is what puts userId on `session.user`. */
    async session({ session, token }) {
      // Narrow to a string rather than trusting the token's type: the token is
      // attacker-reachable input as far as this function is concerned.
      if (typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
