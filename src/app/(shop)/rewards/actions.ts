"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { throttle } from "@/lib/rate-limit";
import { redeemReward, type RedeemResult } from "@/lib/rewards";
import { lineNotifyAdmin } from "@/lib/line-notify";

export async function redeemRewardAction(promoCode: string): Promise<RedeemResult> {
  const session = await getSession();
  if (!session?.code) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ" };

  // Anti-spam: max 10 redemption attempts per customer per 15 min.
  if (!throttle(`redeem:${session.code}`, 10, 15 * 60 * 1000)) {
    return { ok: false, error: "ດຳເນີນການຫຼາຍເກີນໄປ ກະລຸນາລໍຖ້າ" };
  }

  const res = await redeemReward(session.code, String(promoCode || "").trim());
  if (res.ok) {
    lineNotifyAdmin(
      `\n[OdienMall] ຂໍແລກຂອງລາງວັນ\nລູກຄ້າ: ${session.name || session.code}\nລະຫັດ: ${promoCode}`,
    ).catch(() => {});
    revalidatePath("/rewards");
    revalidatePath("/account/rewards");
  }
  return res;
}
