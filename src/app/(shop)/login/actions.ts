"use server";

import { authenticate, setSessionCookie, clearSessionCookie } from "@/lib/auth";

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(
  identifier: string,
  password: string,
): Promise<LoginResult> {
  try {
    const sess = await authenticate(identifier, password);
    if (!sess) return { ok: false, error: "ຂໍ້ມູນເຂົ້າສູ່ລະບົບບໍ່ຖືກຕ້ອງ" };
    await setSessionCookie(sess);
    return { ok: true };
  } catch (e) {
    console.error("login failed:", e);
    return { ok: false, error: "ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່" };
  }
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
}
