"use server";

import { revalidatePath } from "next/cache";
import { isManager, getAdminSession, listSalespeople, type Salesperson } from "@/lib/auth";
import { setSalesTarget, deleteSalesTarget } from "@/lib/sales-link";
import { logAudit } from "@/lib/audit";

export type SaveTargetResult = { ok: true } | { ok: false; error: string };

/** Salespeople available to pick when adding a target. Manager-only. */
export async function salespeopleOptions(): Promise<Salesperson[]> {
  if (!(await isManager())) return [];
  return listSalespeople();
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Set a salesperson's target for a month ('YYYY-MM'). Manager-only. */
export async function saveSalesTarget(saleCode: string, month: string, amount: number): Promise<SaveTargetResult> {
  if (!(await isManager())) return { ok: false, error: "ສະເພາະຜູ້ຈັດການ" };
  const code = (saleCode || "").trim();
  const m = (month || "").trim();
  if (!code) return { ok: false, error: "ບໍ່ພົບພະນັກງານຂາຍ" };
  if (!MONTH_RE.test(m)) return { ok: false, error: "ກະລຸນາເລືອກເດືອນ" };
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, error: "ຈຳນວນບໍ່ຖືກຕ້ອງ" };
  try {
    const admin = await getAdminSession();
    await setSalesTarget(code, m, amount, admin?.code);
    await logAudit({ action: "sales.target", entity: code, detail: `${m}: ${Math.round(amount)} LAK` });
    revalidatePath("/admin/sales-targets");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ບັນທຶກບໍ່ສຳເລັດ" };
  }
}

/** Remove a salesperson's target for a month. Manager-only. */
export async function removeSalesTarget(saleCode: string, month: string): Promise<SaveTargetResult> {
  if (!(await isManager())) return { ok: false, error: "ສະເພາະຜູ້ຈັດການ" };
  try {
    await deleteSalesTarget(saleCode, month);
    await logAudit({ action: "sales.target.remove", entity: saleCode, detail: month });
    revalidatePath("/admin/sales-targets");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ລຶບບໍ່ສຳເລັດ" };
  }
}
