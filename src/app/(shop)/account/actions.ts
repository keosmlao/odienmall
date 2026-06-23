"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { deleteOrder, cancelMyOrder } from "@/lib/orders";

export type DeleteOrderResult = { ok: true } | { ok: false; error: string };

/** Delete the signed-in customer's own order (pending/cancelled only). */
export async function deleteMyOrder(orderNo: string): Promise<DeleteOrderResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບ" };
  try {
    const ok = await deleteOrder(orderNo, session.code);
    if (!ok) {
      return { ok: false, error: "ລົບບໍ່ໄດ້ — ລົບໄດ້ສະເພາະອໍເດີ້ທີ່ລໍຖ້າ ຫຼື ຍົກເລີກແລ້ວ" };
    }
    revalidatePath("/account");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ" };
  }
}

/** Cancel the signed-in customer's own UNPAID COD order. */
export async function cancelOrder(orderNo: string): Promise<DeleteOrderResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບ" };
  try {
    const res = await cancelMyOrder(orderNo, session.code);
    if (res.ok) {
      revalidatePath("/account");
      revalidatePath(`/order/${orderNo}`);
    }
    return res;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ" };
  }
}
