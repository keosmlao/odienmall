"use server";

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { isAdmin, getAdminSession } from "@/lib/auth";
import { getBrandOverlay, setBrandOverlay } from "@/lib/brands-admin";
import { logAudit } from "@/lib/audit";

type Result = { ok: true } | { ok: false; error: string };
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
const MAX_SIZE = 3 * 1024 * 1024;
const safeCode = (code: string) => code.replace(/[^A-Za-z0-9_-]/g, "_");

function refresh(code: string) {
  revalidatePath("/");
  revalidatePath("/brands");
  revalidatePath(`/brand/${encodeURIComponent(code)}`);
  revalidatePath("/admin/brands");
}

async function removeLocal(url: string | null) {
  if (url?.startsWith("/uploads/brands/")) {
    await unlink(path.join(process.cwd(), "public", url)).catch(() => {});
  }
}

export async function uploadBrandLogo(formData: FormData): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  const code = String(formData.get("code") ?? "").trim();
  const file = formData.get("file");
  if (!code) return { ok: false, error: "ບໍ່ພົບ brand" };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "ກະລຸນາເລືອກຮູບ" };
  if (!EXT[file.type]) return { ok: false, error: "ຮອງຮັບ JPG, PNG, WEBP, SVG" };
  if (file.size > MAX_SIZE) return { ok: false, error: "ໄຟລ໌ໃຫຍ່ເກີນ 3MB" };
  try {
    const previous = await getBrandOverlay(code);
    const dir = path.join(process.cwd(), "public", "uploads", "brands", safeCode(code));
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.${EXT[file.type]}`;
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    const url = `/uploads/brands/${safeCode(code)}/${name}`;
    await setBrandOverlay(code, url, (await getAdminSession())?.code);
    await removeLocal(previous);
    await logAudit({ action: "brand.logo.upload", entity: code, detail: url });
    refresh(code);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

export async function saveBrandLogoUrl(code: string, value: string): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  const url = value.trim();
  if (url && !/^https?:\/\//i.test(url)) {
    return { ok: false, error: "URL ຕ້ອງຂຶ້ນຕົ້ນດ້ວຍ http:// ຫຼື https://" };
  }
  try {
    const previous = await getBrandOverlay(code);
    await setBrandOverlay(code, url || null, (await getAdminSession())?.code);
    await removeLocal(previous);
    await logAudit({ action: "brand.logo.url", entity: code, detail: url || "cleared" });
    refresh(code);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

export async function removeBrandLogo(code: string): Promise<Result> {
  return saveBrandLogoUrl(code, "");
}
