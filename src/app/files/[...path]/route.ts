import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveStoragePath } from "@/lib/storage";

/**
 * SERVING UPLOADED PHOTOS
 * =======================
 * Route Handlers in Next 16 are NOT cached by default, and `params` is a
 * Promise that must be awaited.
 *
 * AUTHORIZATION: the file path is NOT a capability. Anyone who knows the URL
 * could read it, so before streaming a single byte we check that the requesting
 * user actually owns the project the photo belongs to.
 *
 * This is exactly why the storage key contains a random uuid rather than a
 * guessable filename.
 */

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  context: RouteContext<"/files/[...path]">,
) {
  const { path: segments } = await context.params;
  const storageKey = segments.join("/");

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to view photos." }, { status: 401 });
  }

  const photo = await prisma.projectPhoto.findFirst({
    where: {
      storageKey,
      project: { userId: session.user.id },
    },
    select: { storageKey: true },
  });

  if (!photo) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const absolute = resolveStoragePath(photo.storageKey);
    const info = await stat(absolute);
    const extension = photo.storageKey.split(".").pop()?.toLowerCase() ?? "jpg";
    const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

    const nodeStream = createReadStream(absolute) as unknown as NodeWebReadableStream;

    return new Response(nodeStream as unknown as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        // Immutable: the filename is a uuid, so the bytes never change.
        "Cache-Control": "private, max-age=31536000, immutable",
        // Defence in depth against an image being interpreted as a document.
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[files] read failed", error);
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
