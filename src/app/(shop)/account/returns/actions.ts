"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { createReturnRequest } from "@/lib/returns";

export async function submitReturnAction(
  orderNo: string,
  reason: string,
  detail: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ກາລຸນາເຂົ້າສູ່ລະບົບ" };

  const result = await createReturnRequest({
    orderNo,
    customerCode: session.code,
    reason,
    detail: detail || undefined,
  });

  if (result.ok) {
    revalidatePath("/account/returns");
  }

  return result;
}
