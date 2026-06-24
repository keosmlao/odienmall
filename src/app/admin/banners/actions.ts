"use server";

import { randomUUID } from "crypto";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { getAdminSession, isManager } from "@/lib/auth";
import {
  createBanner,
  deleteBannerById,
  getBannerImage,
  setBannerImage,
  updateBanner,
  type HomeBannerInput,
} from "@/lib/banners";
import { logAudit } from "@/lib/audit";

type Result = { ok: true; id?: number } | { ok: false; error: string };

const DENIED = "ບໍ່ໄດ້ຮັບອະນຸຍາດ";
const MAX_SIZE = 6 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const HEX = /^#[0-9a-f]{6}$/i;

function validate(input: HomeBannerInput): string | null {
  if (!input.title.trim()) return "ກະລຸນາໃສ່ຫົວຂໍ້";
  if (!input.buttonText.trim()) return "ກະລຸນາໃສ່ຂໍ້ຄວາມປຸ່ມ";
  if (!input.link.startsWith("/")) return "ລິ້ງຕ້ອງຂຶ້ນຕົ້ນດ້ວຍ /";
  if (!HEX.test(input.backgroundFrom) || !HEX.test(input.backgroundTo)) {
    return "ສີຕ້ອງເປັນຮູບແບບ #RRGGBB";
  }
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 999) {
    return "ລຳດັບຕ້ອງຢູ່ລະຫວ່າງ 0–999";
  }
  return null;
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/banners");
}

export async function addBanner(input: HomeBannerInput): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  const error = validate(input);
  if (error) return { ok: false, error };
  try {
    const by = (await getAdminSession())?.code;
    const id = await createBanner(input, by);
    await logAudit({ action: "banner.create", entity: String(id), detail: input.title });
    refresh();
    return { ok: true, id };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "ຜິດພາດ" };
  }
}

export async function saveBanner(id: number, input: HomeBannerInput): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "Banner ບໍ່ຖືກຕ້ອງ" };
  const error = validate(input);
  if (error) return { ok: false, error };
  try {
    const by = (await getAdminSession())?.code;
    await updateBanner(id, input, by);
    await logAudit({ action: "banner.update", entity: String(id), detail: input.title });
    refresh();
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "ຜິດພາດ" };
  }
}

export async function uploadBannerImage(formData: FormData): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  const id = Number(formData.get("id"));
  const file = formData.get("file");
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "Banner ບໍ່ຖືກຕ້ອງ" };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "ກະລຸນາເລືອກຮູບ" };
  }
  if (!EXT[file.type]) return { ok: false, error: "ຮອງຮັບ JPG, PNG ແລະ WEBP" };
  if (file.size > MAX_SIZE) return { ok: false, error: "ໄຟລ໌ໃຫຍ່ເກີນ 6MB" };
  try {
    const previous = await getBannerImage(id);
    const name = `${id}-${randomUUID()}.${EXT[file.type]}`;
    const url = await saveUpload("banners", name, Buffer.from(await file.arrayBuffer()));
    await setBannerImage(id, url, (await getAdminSession())?.code);
    await deleteUpload(previous);
    await logAudit({ action: "banner.image.upload", entity: String(id), detail: url });
    refresh();
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "ຜິດພາດ" };
  }
}

export async function removeBannerImage(id: number): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  try {
    const previous = await getBannerImage(id);
    await setBannerImage(id, null, (await getAdminSession())?.code);
    await deleteUpload(previous);
    await logAudit({ action: "banner.image.remove", entity: String(id) });
    refresh();
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "ຜິດພາດ" };
  }
}

export async function deleteBanner(id: number): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  try {
    const previous = await getBannerImage(id);
    await deleteBannerById(id);
    await deleteUpload(previous);
    await logAudit({ action: "banner.delete", entity: String(id) });
    refresh();
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "ຜິດພາດ" };
  }
}
