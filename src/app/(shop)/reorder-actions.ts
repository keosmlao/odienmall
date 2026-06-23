"use server";

import { getReorderCart, type ReorderLine } from "@/lib/reorder";

export type ReorderResult =
  | { ok: true; items: ReorderLine[]; skipped: string[] }
  | { ok: false; error: string };

/** Re-price a past order against the live catalog so the client can re-add it to cart. */
export async function reorder(orderNo: string): Promise<ReorderResult> {
  try {
    const res = await getReorderCart(orderNo);
    if (!res) return { ok: false, error: "ບໍ່ພົບອໍເດີ" };
    if (res.items.length === 0) {
      return { ok: false, error: "ສິນຄ້າໃນອໍເດີນີ້ໝົດສະຕັອກ ຫຼື ບໍ່ມີຂາຍແລ້ວ" };
    }
    return { ok: true, items: res.items, skipped: res.skipped };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ" };
  }
}
