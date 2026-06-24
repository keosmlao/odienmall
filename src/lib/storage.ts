import "server-only";
import { unlink } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { query, queryOne } from "./db";

// ── Single upload abstraction for ALL user/admin uploads ─────────────────────
// (product images, brand logos, banners, bank QR, transfer slips, review photos).
//
// New uploads are stored in odg_ecom.upload_blobs as bytea and served through the
// /api/uploads route. Legacy /uploads/... files remain readable/deletable for
// existing data already written to disk.

const ROOT =
  process.env.UPLOADS_DIR?.trim() ||
  path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads");
const BASE = (process.env.UPLOADS_PUBLIC_BASE?.trim() || "/uploads").replace(/\/$/, "");
const DB_BASE = "/api/uploads";

export function getUploadStoreInfo(): {
  root: string;
  base: string;
  usingPersistentDir: boolean;
  mode: "database";
} {
  return {
    root: ROOT,
    base: DB_BASE,
    usingPersistentDir: true,
    mode: "database",
  };
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

function inferContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";
}

/** Persist bytes under <subdir>/<filename>; returns the public URL. */
export async function saveUpload(subdir: string, filename: string, bytes: Buffer): Promise<string> {
  const id = randomUUID();
  const safeSubdir = subdir.replace(/^\/+|\/+$/g, "");
  const safeFilename = filename.replace(/[\\/]/g, "_");
  await query(
    `insert into odg_ecom.upload_blobs (id, subdir, filename, content_type, size_bytes, data)
     values ($1, $2, $3, $4, $5, $6)`,
    [id, safeSubdir, safeFilename, inferContentType(safeFilename), bytes.length, bytes],
  );
  return `${DB_BASE}/${id}/${encodeURIComponent(safeFilename)}`;
}

/** True if a stored URL belongs to our upload store (vs an external/overlay URL). */
export function isManagedUpload(url: string | null | undefined): boolean {
  return !!url && (url.startsWith(`${DB_BASE}/`) || url.startsWith(`${BASE}/`));
}

export interface StoredUploadBlob {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  data: Buffer;
}

export async function getUploadBlob(id: string): Promise<StoredUploadBlob | null> {
  const row = await queryOne<{
    id: string;
    filename: string;
    content_type: string;
    size_bytes: number;
    data: Buffer;
  }>(
    `select id, filename, content_type, size_bytes, data
       from odg_ecom.upload_blobs
      where id = $1`,
    [id],
  );
  return row
    ? {
        id: row.id,
        filename: row.filename,
        contentType: row.content_type,
        sizeBytes: row.size_bytes,
        data: row.data,
      }
    : null;
}

/** Best-effort delete of a previously saved upload (no-op for external URLs). */
export async function deleteUpload(url: string | null | undefined): Promise<void> {
  if (!isManagedUpload(url)) return;
  if (url!.startsWith(`${DB_BASE}/`)) {
    const id = url!.slice(DB_BASE.length + 1).split("/")[0];
    if (!/^[0-9a-f-]{36}$/i.test(id)) return;
    await query(`delete from odg_ecom.upload_blobs where id = $1`, [id]).catch(() => {});
    return;
  }
  const rel = url!.slice(BASE.length + 1); // strip "<BASE>/"
  // Guard against path traversal in stored URLs.
  if (rel.includes("..")) return;
  try {
    await unlink(path.join(/*turbopackIgnore: true*/ ROOT, rel));
  } catch {
    // already gone / unreadable — ignore
  }
}
