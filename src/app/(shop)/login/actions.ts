"use server";

import { authenticate, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { autoUpgradeTier } from "@/lib/member-tier";
import { setTierCookie, clearTierCookie } from "@/lib/tier-cookie";

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(
  identifier: string,
  password: string,
): Promise<LoginResult> {
  try {
    const sess = await authenticate(identifier, password);
    if (!sess) return { ok: false, error: "ຂໍ້ມູນເຂົ້າສູ່ລະບົບບໍ່ຖືກຕ້ອງ" };
    await setSessionCookie(sess);
    // Auto-upgrade tier — best-effort (never blocks login on failure)
    try {
      const tier = await autoUpgradeTier(sess.code);
      if (tier) await setTierCookie(tier);
    } catch {
      // ignore — tier not critical
    }
    return { ok: true };
  } catch (e) {
    console.error("login failed:", e);
    return { ok: false, error: "ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່" };
  }
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  await clearTierCookie();
}
