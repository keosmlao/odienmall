"use server";

import { revalidatePath } from "next/cache";
import { isManager, getAdminSession } from "@/lib/auth";
import { setCommissionRate, deleteCommissionRate, recordCommissionPayout } from "@/lib/sales-link";
import { logAudit } from "@/lib/audit";

export type RateResult = { ok: true } | { ok: false; error: string };

/** Record a commission payment to a salesperson. Manager-only. */
export async function payCommission(saleCode: string, amount: number, note?: string): Promise<RateResult> {
  if (!(await isManager())) return { ok: false, error: "ສະເພາະຜູ້ຈັດການ" };
  const code = (saleCode || "").trim();
  if (!code) return { ok: false, error: "ບໍ່ພົບພະນັກງານຂາຍ" };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "ຈຳນວນບໍ່ຖືກຕ້ອງ" };
  try {
    const admin = await getAdminSession();
    await recordCommissionPayout(code, amount, admin?.code, note);
    await logAudit({ action: "sales.commission.payout", entity: code, detail: `${Math.round(amount)} LAK` });
    revalidatePath("/admin/sales-commission");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ບັນທຶກບໍ່ສຳເລັດ" };
  }
}

/** Set the global default commission rate (%). Manager-only. */
export async function saveCommissionDefault(pct: number): Promise<RateResult> {
  if (!(await isManager())) return { ok: false, error: "ສະເພາະຜູ້ຈັດການ" };
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { ok: false, error: "ເປີເຊັນບໍ່ຖືກຕ້ອງ (0–100)" };
  try {
    const admin = await getAdminSession();
    await setCommissionRate(null, pct, admin?.code);
    await logAudit({ action: "sales.commission.default", entity: "__default__", detail: `${pct}%` });
    revalidatePath("/admin/sales-commission");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ບັນທຶກບໍ່ສຳເລັດ" };
  }
}

/** Set a per-salesperson commission override (%). Manager-only. */
export async function saveCommissionOverride(saleCode: string, pct: number): Promise<RateResult> {
  if (!(await isManager())) return { ok: false, error: "ສະເພາະຜູ້ຈັດການ" };
  const code = (saleCode || "").trim();
  if (!code) return { ok: false, error: "ກະລຸນາເລືອກພະນັກງານຂາຍ" };
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { ok: false, error: "ເປີເຊັນບໍ່ຖືກຕ້ອງ (0–100)" };
  try {
    const admin = await getAdminSession();
    await setCommissionRate(code, pct, admin?.code);
    await logAudit({ action: "sales.commission.rate", entity: code, detail: `${pct}%` });
    revalidatePath("/admin/sales-commission");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ບັນທຶກບໍ່ສຳເລັດ" };
  }
}

/** Remove a per-salesperson override (reverts to default). Manager-only. */
export async function removeCommissionOverride(saleCode: string): Promise<RateResult> {
  if (!(await isManager())) return { ok: false, error: "ສະເພາະຜູ້ຈັດການ" };
  try {
    await deleteCommissionRate(saleCode);
    await logAudit({ action: "sales.commission.remove", entity: saleCode, detail: "removed" });
    revalidatePath("/admin/sales-commission");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ລຶບບໍ່ສຳເລັດ" };
  }
}
