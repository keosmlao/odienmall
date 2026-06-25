"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { isAdmin, getAdminSession } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";
import { setPromotionImage, deletePromotionImage, togglePinPromotion } from "@/lib/promotions-admin";

type Result = { ok: true } | { ok: false; error: string };
const DENIED = "ບໍ່ໄດ້ຮັບອະນຸຍາດ";
const msg = (e: unknown) => (e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ");

const MAX_SIZE = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function revalidate() {
  revalidatePath("/admin/promotions");
  revalidatePath("/promotions");
}

export async function uploadPromotionImage(formData: FormData): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  const session = await getAdminSession();

  const promoCode = String(formData.get("promoCode") ?? "").trim();
  if (!promoCode) return { ok: false, error: "ບໍ່ພົບລະຫັດໂປຣ" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "ກະລຸນາເລືອກໄຟລ໌ຮູບ" };
  if (!EXT[file.type]) return { ok: false, error: "ຮອງຮັບສະເພາະ JPG, PNG, WEBP, GIF" };
  if (file.size > MAX_SIZE) return { ok: false, error: "ໄຟລ໌ໃຫຍ່ເກີນ 5MB" };

  try {
    const name = `${randomUUID()}.${EXT[file.type]}`;
    const url = await saveUpload(
      `promotions/${promoCode.replace(/[^A-Za-z0-9_-]/g, "_")}`,
      name,
      Buffer.from(await file.arrayBuffer()),
    );
    await setPromotionImage(promoCode, url, session?.code ?? "admin");
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function pinPromotion(promoCode: string, pinned: boolean): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    await togglePinPromotion(promoCode, pinned);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function removePromotionImage(promoCode: string): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    await deletePromotionImage(promoCode);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}
