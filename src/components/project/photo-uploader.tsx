"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadPhotoAction, deletePhotoAction } from "@/app/(app)/projects/actions";

/**
 * PROJECT PHOTOS
 * --------------
 * Photos form a visual timeline of the real object. Note what the upload does
 * NOT do: it trusts nothing. The extension, MIME type and size are all checked
 * on the server, and the stored filename is a fresh uuid — so a malicious
 * filename can never influence where a file is written.
 *
 * We also preview the chosen file locally with an object URL, which is a
 * browser-only concern and therefore belongs in a Client Component.
 */
export function PhotoUploader({
  projectId,
  photos,
}: {
  projectId: string;
  photos: Array<{ id: string; storageKey: string; caption: string; createdAt: Date }>;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    // Cheap client-side guard for a fast, friendly message. The real check is
    // on the server; this is only here to avoid a round trip.
    if (file.size > 8 * 1024 * 1024) {
      setError("That photo is larger than 8MB.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("photo", file);
    const caption = formData.get("caption")?.toString() ?? "";

    startTransition(async () => {
      const result = await uploadPhotoAction(formData);
      if (!result.ok) {
        setError(result.error ?? "Upload failed.");
        setPreview(null);
      } else {
        setPreview(null);
        // Reset so the same file can be chosen again.
        if (inputRef.current) inputRef.current.value = "";
      }
    });
    void caption;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm text-ink transition-colors hover:bg-surface-3 focus-within:outline-2 focus-within:outline-offset-2">
          <Camera className="size-4" aria-hidden="true" />
          {isPending ? "Uploading…" : "Add photo"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleChange}
            disabled={isPending}
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>

      {preview ? (
        // Local preview only — never rendered from user-controlled HTML.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Selected photo preview"
          className="h-24 w-24 rounded-lg object-cover"
        />
      ) : null}

      {photos.length > 0 ? (
        <ol className="space-y-2">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2"
            >
              {/* Served through our own authorised route, not a public path. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/files/${photo.storageKey}`}
                alt={photo.caption || "Project photo"}
                className="size-14 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{photo.caption || "Progress photo"}</p>
                <p className="text-xs text-ink-subtle">
                  {new Date(photo.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete photo"
                onClick={() =>
                  startTransition(async () => {
                    await deletePhotoAction({ projectId, photoId: photo.id });
                  })
                }
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-muted">
          No photos yet. A picture at the end of every session turns into a
          timeline of how the piece actually came together.
        </p>
      )}
    </div>
  );
}
