import "server-only";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

// ── Single upload abstraction for ALL user/admin uploads ─────────────────────
// (product images, brand logos, banners, bank QR, transfer slips, review photos).
//
// By default writes under public/uploads (served statically). Two env knobs make
// it survive non-ephemeral deploys WITHOUT code changes:
//   UPLOADS_DIR          — absolute path to a PERSISTENT disk (e.g. a mounted
//                          volume on a VPS/container) instead of public/uploads.
//   UPLOADS_PUBLIC_BASE  — URL prefix the files are served from (default /uploads).
//
// To move to true object storage (S3 / R2 / Vercel Blob) on serverless, implement
// the remote branch in saveUpload/deleteUpload HERE — every call site already
// goes through this one module, so it's a single-file change.

const ROOT = process.env.UPLOADS_DIR?.trim() || path.join(process.cwd(), "public", "uploads");
const BASE = (process.env.UPLOADS_PUBLIC_BASE?.trim() || "/uploads").replace(/\/$/, "");

/** Persist bytes under <subdir>/<filename>; returns the public URL. */
export async function saveUpload(subdir: string, filename: string, bytes: Buffer): Promise<string> {
  const dir = path.join(ROOT, subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);
  return `${BASE}/${subdir}/${filename}`;
}

/** True if a stored URL belongs to our upload store (vs an external/overlay URL). */
export function isManagedUpload(url: string | null | undefined): boolean {
  return !!url && url.startsWith(`${BASE}/`);
}

/** Best-effort delete of a previously saved upload (no-op for external URLs). */
export async function deleteUpload(url: string | null | undefined): Promise<void> {
  if (!isManagedUpload(url)) return;
  const rel = url!.slice(BASE.length + 1); // strip "<BASE>/"
  // Guard against path traversal in stored URLs.
  if (rel.includes("..")) return;
  try {
    await unlink(path.join(ROOT, rel));
  } catch {
    // already gone / unreadable — ignore
  }
}
