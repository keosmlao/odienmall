"use server";

import { revalidatePath } from "next/cache";
import { isManager } from "@/lib/auth";
import {
  setAffiliateStatus,
  payAffiliate,
  setRate,
  deleteRate,
} from "@/lib/affiliates";
import type { AffiliateStatus, RateScope } from "@/lib/affiliate-constants";
import { logAudit } from "@/lib/audit";

type Result = { ok: true } | { ok: false; error: string };

const DENIED = "ບໍ່ໄດ້ຮັບອະນຸຍາດ";
const msg = (e: unknown) => (e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ");

export async function changeAffiliateStatus(
  code: string,
  status: AffiliateStatus,
): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  try {
    const ok = await setAffiliateStatus(code, status);
    if (!ok) return { ok: false, error: "ບໍ່ພົບນາຍໜ້າ" };
    await logAudit({ action: "affiliate.status", entity: code, detail: status });
    revalidatePath("/admin/affiliates");
    revalidatePath(`/admin/affiliates/${code}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function payCommission(
  code: string,
): Promise<{ ok: true; amount: number } | { ok: false; error: string }> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  try {
    const amount = await payAffiliate(code);
    await logAudit({ action: "affiliate.payout", entity: code, detail: `${amount} ₭` });
    revalidatePath(`/admin/affiliates/${code}`);
    revalidatePath("/admin/affiliates");
    return { ok: true, amount };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function saveRate(input: {
  scope: RateScope;
  refKey?: string | null;
  ratePct: number;
}): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  try {
    await setRate(input);
    await logAudit({ action: "affiliate.rate", entity: input.refKey ?? input.scope, detail: `${input.ratePct}%` });
    revalidatePath("/admin/affiliates/rates");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function removeRate(id: number): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  try {
    await deleteRate(id);
    await logAudit({ action: "affiliate.rate.delete", entity: String(id) });
    revalidatePath("/admin/affiliates/rates");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}
