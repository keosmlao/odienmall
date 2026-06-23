"use server";

import { getSession } from "@/lib/auth";
import { isSubscribed, subscribeAlert, unsubscribeAlert } from "@/lib/product-alerts";

export type AlertResult = { ok: true; on: boolean } | { ok: false; error: string };

/** Toggle the back-in-stock / price-drop alert for the current customer. */
export async function toggleAlert(productCode: string): Promise<AlertResult> {
  const session = await getSession();
  if (!session?.code) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ" };
  try {
    const on = await isSubscribed(session.code, productCode);
    if (on) {
      await unsubscribeAlert(session.code, productCode);
      return { ok: true, on: false };
    }
    await subscribeAlert(session.code, productCode);
    return { ok: true, on: true };
  } catch {
    return { ok: false, error: "ຜິດພາດ ລອງໃໝ່" };
  }
}

export async function getAlertState(productCode: string): Promise<boolean> {
  const session = await getSession();
  return session?.code ? isSubscribed(session.code, productCode) : false;
}
