/**
 * The Next.js route that Auth.js mounts its handlers on.
 *
 * In Next 16 the file is `route.ts` (not `page.tsx`) and the params are a
 * Promise — `await context.params`.
 *
 * The catch-all `[...nextauth]` segment is required: Auth.js installs several
 * endpoints under this prefix (signin, signout, callback, session, csrf).
 */
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
