"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireUserOrThrow } from "@/lib/data/auth";
import { prisma } from "@/lib/db";
import {
  addNote,
  completeRow,
  createProject,
  deleteProject,
  setProjectStatus,
  stopSession,
  startSession,
  uncompleteRow,
} from "@/lib/data/projects";
import { createProjectSchema, noteSchema } from "@/lib/validation/pattern";

/**
 * PROJECT SERVER ACTIONS
 * ======================
 * The one to study here is `completeRowAction`. It is the button a crocheter
 * presses twenty times an hour, so it has to be:
 *   - idempotent (double-tapping must not double-count)
 *   - reversible (mistakes happen, usually on a phone, usually mid-stitch)
 *   - cheap (no aggregate queries — the progress summary is derived on read)
 */

export type ProjectActionState = { error?: string };

export async function createProjectAction(
  _previous: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const user = await requireUserOrThrow();

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    patternId: formData.get("patternId")?.toString() || undefined,
  });
  if (!parsed.success) return { error: "Give the project a name." };

  const project = await createProject(user.id, parsed.data);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}

export async function completeRowAction(input: {
  projectId: string;
  rowId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUserOrThrow();
  const result = await completeRow(user.id, input.projectId, input.rowId);
  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/crochet/${input.projectId}`);
  revalidatePath("/dashboard");
  return result;
}

export async function uncompleteRowAction(input: {
  projectId: string;
  rowId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUserOrThrow();
  const result = await uncompleteRow(user.id, input.projectId, input.rowId);
  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/crochet/${input.projectId}`);
  return result;
}

export async function setProjectStatusAction(input: {
  projectId: string;
  status: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUserOrThrow();
  const allowed = new Set(["ACTIVE", "PAUSED", "COMPLETED"]);
  if (!allowed.has(input.status)) return { ok: false, error: "Unknown status." };

  const result = await setProjectStatus(user.id, input.projectId, input.status);
  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return result;
}

export async function addNoteAction(
  _previous: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const user = await requireUserOrThrow();
  const parsed = noteSchema.safeParse({
    projectId: formData.get("projectId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error instanceof ZodError ? parsed.error.issues[0].message : "Invalid note." };
  }

  const result = await addNote(user.id, parsed.data.projectId, parsed.data.body);
  revalidatePath(`/projects/${parsed.data.projectId}`);
  return result.ok ? {} : { error: result.error ?? "Could not save the note." };
}

export async function deleteNoteAction(input: { projectId: string; noteId: string }) {
  const user = await requireUserOrThrow();
  // Ownership is proven through the parent project, not assumed from the note id.
  const { count } = await prisma.projectNote.deleteMany({
    where: { id: input.noteId, projectId: input.projectId, project: { userId: user.id } },
  });
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: count > 0 };
}

/**
 * PHOTO UPLOAD
 * ------------
 * Validation happens here on the server: extension, declared MIME type and byte
 * size are all attacker-controlled. Only real image types are accepted, and the
 * file is renamed to a generated id so a malicious filename can never escape the
 * storage directory.
 */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function uploadPhotoAction(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  storageKey?: string;
}> {
  const user = await requireUserOrThrow();

  const projectId = formData.get("projectId")?.toString();
  const file = formData.get("photo");

  if (!projectId || !(file instanceof File)) {
    return { ok: false, error: "Choose a photo first." };
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { id: true },
  });
  if (!project) return { ok: false, error: "Project not found." };

  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) {
    return { ok: false, error: "That file type is not supported. Use a JPEG, PNG, WebP or GIF." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "That photo is larger than 8MB." };
  }

  const { saveFile } = await import("@/lib/storage");
  const bytes = Buffer.from(await file.arrayBuffer());
  // Random name: the original filename is user input and is never used in a path.
  const storageKey = `projects/${projectId}/${crypto.randomUUID()}.${extension}`;

  try {
    await saveFile(storageKey, bytes);
  } catch (error) {
    console.error("[photos] save failed", error);
    return { ok: false, error: "The photo could not be saved. Try again." };
  }

  await prisma.projectPhoto.create({
    data: {
      projectId,
      storageKey,
      caption: formData.get("caption")?.toString().slice(0, 200) ?? "",
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, storageKey };
}

export async function deletePhotoAction(input: { projectId: string; photoId: string }) {
  const user = await requireUserOrThrow();
  const photo = await prisma.projectPhoto.findFirst({
    where: { id: input.photoId, projectId: input.projectId, project: { userId: user.id } },
  });
  if (!photo) return { ok: false };

  await prisma.projectPhoto.delete({ where: { id: photo.id } });
  const { deleteFile } = await import("@/lib/storage");
  await deleteFile(photo.storageKey).catch(() => undefined);

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

export async function toggleSessionAction(input: { projectId: string }) {
  const user = await requireUserOrThrow();
  const open = await prisma.projectSession.findFirst({
    where: { projectId: input.projectId, endedAt: null, project: { userId: user.id } },
  });
  const result = open
    ? await stopSession(user.id, input.projectId)
    : await startSession(user.id, input.projectId);

  revalidatePath(`/projects/${input.projectId}`);
  return result;
}

/**
 * Form-shaped variant: a <form action> must resolve to void or Promise<void>,
 * so this wrapper swallows the result and relies on the redirect inside.
 */
export async function deleteProjectFormAction(formData: FormData): Promise<void> {
  const projectId = formData.get("projectId")?.toString();
  if (!projectId) return;
  await deleteProjectAction({ projectId });
}

export async function deleteProjectAction(input: { projectId: string }) {
  const user = await requireUserOrThrow();
  const result = await deleteProject(user.id, input.projectId);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  if (result.ok) redirect("/projects");
  return result;
}
