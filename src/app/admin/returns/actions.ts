"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, getAdminSession } from "@/lib/auth";
import { setReturnStatus, type ReturnStatus } from "@/lib/returns";
import { logAudit } from "@/lib/audit";

export type ReturnAdminResult = { ok: true } | { ok: false; error: string };

export async function setReturn(
  id: number,
  status: ReturnStatus,
  adminNote?: string,
): Promise<ReturnAdminResult> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    const admin = await getAdminSession();
    const ok = await setReturnStatus(id, status, admin?.code, adminNote);
    if (!ok) return { ok: false, error: "ບໍ່ພົບຄຳຮ້ອງ" };
    await logAudit({ action: "return.status", entity: String(id), detail: status });
    revalidatePath("/admin/returns");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}
