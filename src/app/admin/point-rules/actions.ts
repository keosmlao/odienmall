"use server";

import { revalidatePath } from "next/cache";
import { isManager, getAdminSession } from "@/lib/auth";
import { savePointRules, type PointRules } from "@/lib/engage-points";
import { logAudit } from "@/lib/audit";

type Result = { ok: true } | { ok: false; error: string };

export async function savePointRulesAction(input: PointRules): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  // Clamp to sane ranges.
  const clampNum = (n: number, lo: number, hi: number) =>
    Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
  const clampInt = (n: number, lo: number, hi: number) =>
    Number.isInteger(n) ? Math.min(hi, Math.max(lo, n)) : lo;

  const rules: PointRules = {
    addressEnabled: !!input.addressEnabled,
    addressPoints: clampNum(Number(input.addressPoints), 0, 1000),
    birthdayEnabled: !!input.birthdayEnabled,
    birthdayPoints: clampNum(Number(input.birthdayPoints), 0, 1000),
    collectEnabled: !!input.collectEnabled,
    collectPoints: clampNum(Number(input.collectPoints), 0, 1000),
    collectMaxPerDay: clampInt(Number(input.collectMaxPerDay), 0, 100),
    shareEnabled: !!input.shareEnabled,
    sharePoints: clampNum(Number(input.sharePoints), 0, 1000),
    shareMaxPerDay: clampInt(Number(input.shareMaxPerDay), 0, 100),
  };

  try {
    await savePointRules(rules, (await getAdminSession())?.code);
    await logAudit({ action: "points.rules", detail: JSON.stringify(rules) });
    revalidatePath("/admin/point-rules");
    revalidatePath("/account");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ບັນທຶກບໍ່ສຳເລັດ" };
  }
}
