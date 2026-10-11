/**
 * AUTHORIZATION ISOLATION TEST
 * ===========================
 * The single most important security property in a multi-user app: one user's
 * data must never be reachable by another.
 *
 * This runs against the DEV server with real HTTP requests and real sessions,
 * because a unit test with a mocked database cannot prove the auth checks are
 * actually wired into the queries.
 *
 * Usage:  node scripts/check-isolation.mjs [baseUrl]
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://127.0.0.1:3111";
const prisma = new PrismaClient();

async function signIn(email) {
  const jar = [];
  const get = async (url) => {
    const res = await fetch(`${BASE}${url}`, { headers: { cookie: jar.join("; ") } });
    res.headers.getSetCookie?.().forEach((c) => jar.push(c.split(";")[0]));
    return res;
  };

  await get("/api/auth/csrf");
  const csrfRes = await get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: jar.join("; "),
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password: "demo1234",
      callbackUrl: `${BASE}/dashboard`,
    }).toString(),
  });
  res.headers.getSetCookie?.().forEach((c) => jar.push(c.split(";")[0]));

  const session = await (await get("/api/auth/session")).json();
  return { jar, email: session?.user?.email };
}

function jarHeader(jar) {
  return jar.join("; ");
}

async function get(jar, path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie: jarHeader(jar) },
    redirect: "manual",
  });
  return res;
}

let failures = 0;
function check(label, condition) {
  console.log(`${condition ? "  PASS" : "  FAIL"}  ${label}`);
  if (!condition) failures += 1;
}

async function main() {
  const amara = await signIn("demo@crochet.studio");
  const maya = await signIn("maya@crochet.studio");

  console.log(`\nsigned in: ${amara.email} and ${maya.email}\n`);
  if (!amara.email || !maya.email) {
    console.error("Could not sign in both users. Is the server running and seeded?");
    process.exit(1);
  }

  // Maya's private pattern.
  const mayaPattern = await prisma.pattern.findFirst({
    where: { user: { email: "maya@crochet.studio" } },
  });

  console.log("1. Maya's pattern is hidden from Amara");
  const asAmara = await get(amara.jar, `/patterns/${mayaPattern.id}`);
  check(`GET /patterns/<maya's> as Amara -> 404 (got ${asAmara.status})`, asAmara.status === 404);

  console.log("\n2. Maya's pattern is reachable by Maya");
  const asMaya = await get(maya.jar, `/patterns/${mayaPattern.id}`);
  check(`GET /patterns/<maya's> as Maya -> 200 (got ${asMaya.status})`, asMaya.status === 200);

  console.log("\n3. Amara's dashboard does not leak Maya's projects");
  const dash = await (await get(amara.jar, "/dashboard")).text();
  check(
    "Maya's 'Secret Amigurumi Dragon' pattern does not appear",
    !dash.includes("Secret Amigurumi Dragon"),
  );

  console.log("\n4. Amara's pattern list does not leak Maya's patterns");
  const list = await (await get(amara.jar, "/patterns")).text();
  check("Secret Amigurumi Dragon absent from /patterns", !list.includes("Secret Amigurumi Dragon"));
  check("but Amara's own Teddy Bear is present", list.includes("Teddy Bear"));

  console.log("\n5. Anonymous access is redirected to login");
  const anon = await get([], "/dashboard");
  check(
    `GET /dashboard anonymous -> 307 to /login (got ${anon.status})`,
    anon.status === 307 && (anon.headers.get("location") ?? "").includes("/login"),
  );

  console.log("\n6. Photo files require ownership");
  const photo = await prisma.projectPhoto.findFirst({ include: { project: true } });
  if (photo) {
    const asOwner = await get(amara.jar, `/files/${photo.storageKey}`);
    check(`owner can read their own file (got ${asOwner.status})`, asOwner.status === 200);

    const asOther = await get(maya.jar, `/files/${photo.storageKey}`);
    check(`another user cannot (got ${asOther.status})`, asOther.status === 404);

    const anonFile = await get([], `/files/${photo.storageKey}`);
    check(`anonymous cannot (got ${anonFile.status})`, anonFile.status === 401);
  } else {
    console.log("  SKIP  no uploaded photos in this database");
  }

  console.log(
    failures === 0
      ? "\nAll isolation checks passed.\n"
      : `\n${failures} isolation check(s) FAILED.\n`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error("Isolation check could not run:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
