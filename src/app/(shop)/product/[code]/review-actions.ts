"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { getProductByCode } from "@/lib/catalog";
import { createReview } from "@/lib/reviews";

export type ReviewResult = { ok: true } | { ok: false; error: string };

export async function submitReview(
  productCode: string,
  rating: number,
  comment: string,
): Promise<ReviewResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ" };

  const r = Math.floor(Number(rating));
  if (!Number.isFinite(r) || r < 1 || r > 5) {
    return { ok: false, error: "ກະລຸນາໃຫ້ຄະແນນ 1-5 ດາວ" };
  }

  const product = await getProductByCode(productCode);
  if (!product) return { ok: false, error: "ບໍ່ພົບສິນຄ້າ" };

  try {
    await createReview({
      productCode,
      customerCode: session.code,
      customerName: session.name || session.code,
      rating: r,
      comment,
    });
    revalidatePath(`/product/${productCode}`);
    return { ok: true };
  } catch (e) {
    console.error("submitReview failed:", e);
    return { ok: false, error: "ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່" };
  }
}
