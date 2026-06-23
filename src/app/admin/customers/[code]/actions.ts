"use server";

import { revalidatePath } from "next/cache";
import { isManager, getAdminSession } from "@/lib/auth";
import { setCustomerTier } from "@/lib/member-tier";
import { logAudit } from "@/lib/audit";

export type TierResult = { ok: true } | { ok: false; error: string };

/** Assign / clear a customer's membership tier (manager-only — it's a discount). */
export async function assignTier(customerCode: string, groupSubCode: string | null): Promise<TierResult> {
  if (!(await isManager())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    const admin = await getAdminSession();
    await setCustomerTier(customerCode, groupSubCode, admin?.code);
    await logAudit({ action: "customer.tier", entity: customerCode, detail: groupSubCode ?? "cleared" });
    revalidatePath(`/admin/customers/${encodeURIComponent(customerCode)}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}
