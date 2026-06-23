"use server";

import { revalidatePath } from "next/cache";
import { isManager, getAdminSession } from "@/lib/auth";
import {
  createVoucher,
  updateVoucher,
  setVoucherActive,
  deleteVoucher,
  type VoucherInput,
} from "@/lib/vouchers";
import { logAudit } from "@/lib/audit";

export type VoucherResult = { ok: true } | { ok: false; error: string };

function parse(form: FormData): VoucherInput & { id?: number } {
  const num = (k: string): number | null => {
    const v = String(form.get(k) ?? "").trim();
    return v === "" ? null : Number(v);
  };
  const kind = String(form.get("kind") ?? "percent") === "amount" ? "amount" : "percent";
  return {
    id: form.get("id") ? Number(form.get("id")) : undefined,
    code: String(form.get("code") ?? "").trim().toUpperCase(),
    kind,
    value: Number(form.get("value") ?? 0),
    minSubtotal: num("minSubtotal") ?? 0,
    maxDiscount: kind === "percent" ? num("maxDiscount") : null,
    startsAt: (String(form.get("startsAt") ?? "").trim() || null),
    expiresAt: (String(form.get("expiresAt") ?? "").trim() || null),
    usageLimit: num("usageLimit"),
    perCustomerLimit: num("perCustomerLimit") ?? 1,
    active: form.get("active") != null,
    note: String(form.get("note") ?? "").trim() || null,
  };
}

export async function saveVoucher(form: FormData): Promise<VoucherResult> {
  if (!(await isManager())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    const data = parse(form);
    if (!data.code) return { ok: false, error: "ກະລຸນາໃສ່ໂຄ້ດ" };
    if (!(data.value > 0)) return { ok: false, error: "ມູນຄ່າຕ້ອງ > 0" };
    if (data.id) {
      await updateVoucher(data.id, data);
    } else {
      const admin = await getAdminSession();
      await createVoucher(data, admin?.code);
    }
    await logAudit({ action: "voucher.save", entity: data.code, detail: data.id ? "edit" : "create" });
    revalidatePath("/admin/vouchers");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

export async function toggleVoucher(id: number, active: boolean): Promise<VoucherResult> {
  if (!(await isManager())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    await setVoucherActive(id, active);
    await logAudit({ action: "voucher.toggle", entity: String(id), detail: active ? "on" : "off" });
    revalidatePath("/admin/vouchers");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

export async function removeVoucher(id: number): Promise<VoucherResult> {
  if (!(await isManager())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    await deleteVoucher(id);
    await logAudit({ action: "voucher.delete", entity: String(id), detail: "deleted" });
    revalidatePath("/admin/vouchers");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}
