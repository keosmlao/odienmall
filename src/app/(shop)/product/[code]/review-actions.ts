"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { saveUpload, readImageUpload } from "@/lib/storage";
import { throttle } from "@/lib/rate-limit";
import { getSession } from "@/lib/auth";
import { getProductByCode } from "@/lib/catalog";
import { createReview } from "@/lib/reviews";

export type ReviewResult = { ok: true } | { ok: false; error: string };

export async function submitReview(
  productCode: string,
  rating: number,
  comment: string,
  photoUrl?: string | null,
): Promise<ReviewResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ" };

  const r = Math.floor(Number(rating));
  if (!Number.isFinite(r) || r < 1 || r > 5) {
    return { ok: false, error: "ກະລຸນາໃຫ້ຄະແນນ 1-5 ດາວ" };
  }

  const product = await getProductByCode(productCode);
  if (!product) return { ok: false, error: "ບໍ່ພົບສິນຄ້າ" };

  // Anti-spam: max 5 reviews per customer per 15 min.
  if (!throttle(`review:${session.code}`, 5, 15 * 60 * 1000)) {
    return { ok: false, error: "ສົ່ງຣີວິວຫຼາຍເກີນໄປ ກະລຸນາລໍຖ້າ" };
  }

  try {
    await createReview({
      productCode,
      customerCode: session.code,
      customerName: session.name || session.code,
      rating: r,
      comment,
      photoUrl: photoUrl ?? null,
    });
    revalidatePath(`/product/${productCode}`);
    return { ok: true };
  } catch (e) {
    console.error("submitReview failed:", e);
    return { ok: false, error: "ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່" };
  }
}

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

/** Upload a review photo (logged-in customers). Returns a public URL to attach. */
export async function uploadReviewPhoto(formData: FormData): Promise<UploadResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ" };
  const file = formData.get("photo");
  if (!(file instanceof File)) return { ok: false, error: "ກະລຸນາເລືອກຮູບ" };
  if (!throttle(`review-photo:${session.code}`, 10, 15 * 60 * 1000)) {
    return { ok: false, error: "ອັບໂຫຼດຫຼາຍເກີນໄປ ກະລຸນາລໍຖ້າ" };
  }
  try {
    const img = await readImageUpload(file, 8 * 1024 * 1024);
    const fname = `${randomUUID().slice(0, 12)}.${img.ext}`;
    const url = await saveUpload("reviews", fname, img.bytes);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ອັບໂຫຼດບໍ່ສຳເລັດ" };
  }
}
