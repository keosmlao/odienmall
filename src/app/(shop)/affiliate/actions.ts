"use server";

import { revalidatePath } from "next/cache";
import { getSession, getCustomerProfile } from "@/lib/auth";
import {
  requestAffiliateEmailVerification,
  verifyAffiliateEmailAndApply,
} from "@/lib/affiliates";

export type ApplyResult =
  | { ok: true; email?: string }
  | { ok: false; error: string };

/** Send a 6-digit OTP to the email stored on the signed-in ERP account. */
export async function requestAffiliateOtp(input: {
  email: string;
  bankCode: string;
  accountName: string;
  accountNo: string;
}): Promise<ApplyResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ" };
  try {
    await requestAffiliateEmailVerification({
      customerCode: session.code,
      profileEmail: input.email,
      bankCode: input.bankCode,
      accountName: input.accountName,
      accountNo: input.accountNo,
    });
    return { ok: true, email: input.email.trim().toLowerCase() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່" };
  }
}

/** Verify the OTP and create a pending affiliate application. */
export async function confirmAffiliateOtp(code: string): Promise<ApplyResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ" };
  try {
    const profile = await getCustomerProfile(session.code);
    await verifyAffiliateEmailAndApply({
      customerCode: session.code,
      name: profile?.name ?? session.name,
      phone: profile?.phone ?? null,
      code,
    });
    revalidatePath("/affiliate");
    revalidatePath("/admin/affiliates");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່" };
  }
}
