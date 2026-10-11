import { NextResponse, type NextRequest } from "next/server";

/**
 * PROXY (Next.js 16 renamed `middleware.ts` -> `proxy.ts`)
 * ======================================================
 * Its ONLY job: send signed-out visitors to /login before a protected page
 * renders. That is a user-experience optimisation, not a security control.
 *
 * READ THIS BEFORE ADDING A NEW PROTECTED ROUTE
 * ----------------------------------------------
 * 1. Server Actions are POSTs to the route they are rendered on. If you add an
 *    action to a page whose path is not in `matcher`, it gets NO proxy coverage.
 *    => Every action must still call `requireUser()` from the data layer.
 * 2. This file runs on every request including prefetches, so it must be cheap:
 *    we only look at the cookie, never at the database.
 * 3. This is an *optimistic* check. The JWT is signed so it cannot be forged, but
 *    a revoked or expired session could still pass this check. Real enforcement
 *    is `requireUser()` / `requireOwner()`.
 */

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

export function proxy(request: NextRequest) {
  const hasSessionCookie = SESSION_COOKIE_NAMES.some(
    (name) => request.cookies.get(name)?.value !== undefined,
  );

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    // Preserve where they were heading so login can send them back.
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/patterns/:path*",
    "/studio/:path*",
    "/crochet/:path*",
    "/designer/:path*",
    "/library/:path*",
    "/yarn/:path*",
    "/analytics/:path*",
    "/settings/:path*",
  ],
};
