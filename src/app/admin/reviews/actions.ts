"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { setReviewHidden, deleteReview } from "@/lib/reviews-admin";
import { logAudit } from "@/lib/audit";

type Result = { ok: true } | { ok: false; error: string };

const DENIED = "ບໍ່ໄດ້ຮັບອະນຸຍາດ";
const msg = (e: unknown) => (e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ");

// Hiding/deleting a review changes the product's rating → revalidate its pages.
function revalidate(productCode: string | null) {
  revalidatePath("/admin/reviews");
  if (productCode) {
    revalidatePath(`/product/${productCode}`);
    revalidatePath("/");
  }
}

/** Hide or show a review (reversible). Any admin may moderate. */
export async function toggleReviewHidden(id: string, hidden: boolean): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    const code = await setReviewHidden(id, hidden);
    await logAudit({ action: hidden ? "review.hide" : "review.show", entity: code, detail: `review #${id}` });
    revalidate(code);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Permanently delete a review. */
export async function removeReview(id: string): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    const code = await deleteReview(id);
    await logAudit({ action: "review.delete", entity: code, detail: `review #${id}` });
    revalidate(code);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}
