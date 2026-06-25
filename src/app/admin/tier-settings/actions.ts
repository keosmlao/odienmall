"use server";

import { revalidatePath } from "next/cache";
import { isManager, getAdminSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Save an override configuration for a member tier.
 * Only managers are authorized to perform this operation.
 */
export async function saveTierOverride(
  tierCode: string,
  discountPct: number,
  minSpend: number,
): Promise<Result> {
  if (!tierCode) {
    return { ok: false, error: "ບໍ່ພົບລະຫັດຂັ້ນສະມາຊິກ" };
  }

  // Auth gate
  if (!(await isManager())) {
    return { ok: false, error: "ສະເພາະຜູ້ຈັດການເທົ່ານັ້ນ" };
  }

  // Validate limits
  if (discountPct < 0 || discountPct > 100 || isNaN(discountPct)) {
    return { ok: false, error: "ສ່ວນຫຼຸດຕ້ອງຢູ່ລະຫວ່າງ 0% ຫາ 100%" };
  }

  if (minSpend < 0 || isNaN(minSpend)) {
    return { ok: false, error: "ຍອດຂັ້ນຕ່ຳຕ້ອງບໍ່ຫຼຸດກວ່າ 0 ₭" };
  }

  try {
    const session = await getAdminSession();
    const actorCode = session?.code ?? "unknown";

    // Upsert into ecom.tier_overrides
    await query(
      `insert into odg_ecom.tier_overrides (tier_code, discount_pct, min_spend, updated_by, updated_at)
       values ($1, $2, $3, $4, now())
       on conflict (tier_code) do update
          set discount_pct = excluded.discount_pct,
              min_spend = excluded.min_spend,
              updated_by = excluded.updated_by,
              updated_at = now()`,
      [tierCode, discountPct, minSpend, actorCode],
    );

    // Audit logging
    await logAudit({
      action: "tier.override",
      entity: tierCode,
      detail: `discount=${discountPct}%, minSpend=${minSpend} LAK`,
    });

    // Revalidate affected paths
    revalidatePath("/admin/tier-settings");
    revalidatePath("/account");
    revalidatePath("/");

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ",
    };
  }
}
