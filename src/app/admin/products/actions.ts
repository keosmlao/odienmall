"use server";

import { revalidatePath } from "next/cache";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { randomUUID } from "crypto";
import { isAdmin, getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  setProductHidden,
  setProductFeatured,
  setProductDescription,
  setProductShortDescription,
  setProductPriceNote,
  bulkSetFlag,
  addProductImage,
  deleteProductImage,
  setPrimaryImage,
  getProductImages,
  upsertProductSpec,
  deleteProductSpec,
} from "@/lib/products-admin";

type Result = { ok: true } | { ok: false; error: string };

const DENIED = "ບໍ່ໄດ້ຮັບອະນຸຍາດ";
const msg = (e: unknown) => (e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ");

const MAX_FILES = 8; // images per product
const MAX_SIZE = 5 * 1024 * 1024; // 5MB each
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Product codes are alphanumeric+dash, but sanitise before using in a path.
const safeCode = (code: string) => code.replace(/[^A-Za-z0-9_-]/g, "_");

// All writes hit ONLY odg_ecom.* and public/uploads — the ERP stays read-only.
function revalidate(code: string) {
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${code}`);
  revalidatePath("/");
  revalidatePath(`/product/${code}`);
}

// --- image gallery ----------------------------------------------------------

/** Upload one or more image files (FormData: `code`, `files`). */
export async function uploadProductImages(formData: FormData): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { ok: false, error: "ບໍ່ພົບລະຫັດສິນຄ້າ" };

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "ກະລຸນາເລືອກໄຟລ໌ຮູບ" };

  try {
    const existing = await getProductImages(code);
    if (existing.length + files.length > MAX_FILES) {
      return { ok: false, error: `ສູງສຸດ ${MAX_FILES} ຮູບຕໍ່ສິນຄ້າ` };
    }
    // Validate everything before writing anything.
    for (const f of files) {
      if (!EXT[f.type]) return { ok: false, error: "ຮອງຮັບສະເພາະ JPG, PNG, WEBP, GIF" };
      if (f.size > MAX_SIZE) return { ok: false, error: "ໄຟລ໌ໃຫຍ່ເກີນ 5MB" };
    }

    const sc = safeCode(code);
    for (const f of files) {
      const name = `${randomUUID()}.${EXT[f.type]}`;
      const url = await saveUpload(`products/${sc}`, name, Buffer.from(await f.arrayBuffer()));
      await addProductImage(code, url);
    }
    revalidate(code);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Add an image by external URL (no upload). */
export async function addProductImageUrl(code: string, url: string): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  const clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) return { ok: false, error: "URL ຕ້ອງຂຶ້ນຕົ້ນດ້ວຍ http(s)://" };
  try {
    await addProductImage(code, clean);
    revalidate(code);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Delete a gallery image (and its uploaded file, best-effort). */
export async function removeProductImage(id: number, code: string): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    const url = await deleteProductImage(id, code);
    await deleteUpload(url);
    revalidate(code);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Make an image the primary (card / thumbnail) one. */
export async function makeImagePrimary(id: number, code: string): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    await setPrimaryImage(id, code);
    revalidate(code);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

// --- flags ------------------------------------------------------------------

/** Save the featured + hidden flags (edit page). */
export async function saveProductFlags(
  code: string,
  isHidden: boolean,
  isFeatured: boolean,
): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    const by = (await getAdminSession())?.code;
    await setProductHidden(code, isHidden, by);
    await setProductFeatured(code, isFeatured, by);
    await logAudit({ action: "product.flags", entity: code, detail: `hidden=${isHidden}, featured=${isFeatured}` });
    revalidate(code);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Save the app-owned description override (empty clears → ERP text shows). */
export async function saveProductDescription(code: string, description: string): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    const by = (await getAdminSession())?.code;
    await setProductDescription(code, description.trim() || null, by);
    await logAudit({ action: "product.description", entity: code, detail: description.trim() ? "set" : "cleared" });
    revalidate(code);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Save the app-owned short description (shown in the buy box, near price). */
export async function saveShortDescription(
  code: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    const session = await getAdminSession();
    await setProductShortDescription(code, text.trim() || null, session?.code);
    await logAudit({ action: "product.short_description", entity: code, detail: text.slice(0, 80) });
    revalidatePath(`/product/${code}`);
    revalidatePath(`/admin/products/${code}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

/** Save the price note shown instead of generic "ສອບຖາມລາຄາ" for no-price items. */
export async function savePriceNote(
  code: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    const session = await getAdminSession();
    await setProductPriceNote(code, text.trim() || null, session?.code);
    revalidatePath(`/product/${code}`);
    revalidatePath(`/admin/products/${code}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

/** Apply one flag change to many selected products at once. */
export async function bulkUpdateProducts(
  codes: string[],
  action: "hide" | "show" | "feature" | "unfeature",
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  const clean = [...new Set(codes.map((c) => String(c).trim()).filter(Boolean))];
  if (clean.length === 0) return { ok: false, error: "ບໍ່ໄດ້ເລືອກສິນຄ້າ" };

  const map = {
    hide: ["is_hidden", true],
    show: ["is_hidden", false],
    feature: ["is_featured", true],
    unfeature: ["is_featured", false],
  } as const;
  const [column, value] = map[action];

  try {
    const by = (await getAdminSession())?.code;
    const count = await bulkSetFlag(clean, column, value, by);
    await logAudit({ action: `product.bulk.${action}`, entity: `${count} ລາຍການ`, detail: clean.slice(0, 20).join(", ") });
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { ok: true, count };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Inline list toggle: hide / show. */
export async function toggleProductHidden(code: string, hidden: boolean): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    await setProductHidden(code, hidden, (await getAdminSession())?.code);
    revalidate(code);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Inline list toggle: featured / not. */
export async function toggleProductFeatured(code: string, featured: boolean): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    await setProductFeatured(code, featured, (await getAdminSession())?.code);
    revalidate(code);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

// --- product specifications --------------------------------------------------

export async function saveProductSpec(
  productCode: string,
  spec: { id?: number; label: string; value: string; sortOrder?: number },
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  if (!spec.label?.trim() || !spec.value?.trim()) return { ok: false, error: "ກະລຸນາໃສ່ຂໍ້ມູນ" };
  try {
    await upsertProductSpec(productCode, spec);
    revalidatePath(`/product/${productCode}`);
    revalidatePath(`/admin/products/${productCode}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

export async function removeProductSpec(
  productCode: string,
  specId: number,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    await deleteProductSpec(specId, productCode);
    revalidatePath(`/product/${productCode}`);
    revalidatePath(`/admin/products/${productCode}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}
