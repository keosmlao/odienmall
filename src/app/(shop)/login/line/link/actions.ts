"use server";

import { cookies } from "next/headers";
import { linkLineToCustomer, registerLineCustomer, setSessionCookie } from "@/lib/auth";
import { verifyPayload } from "@/lib/session";

const PENDING_COOKIE = "om_line_pending";
const PENDING_MAX_AGE = 15 * 60;

interface PendingLine {
  lineUserId: string;
  displayName?: string | null;
  pictureUrl?: string | null;
  email?: string | null;
}

export type LinkResult = { ok: true } | { ok: false; error: string };

async function readPending(): Promise<PendingLine | null> {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  const p = token ? verifyPayload<PendingLine>(token, PENDING_MAX_AGE) : null;
  return p?.lineUserId ? p : null;
}

async function finish(): Promise<void> {
  const jar = await cookies();
  jar.delete(PENDING_COOKIE);
  jar.delete("om_line_redirect");
}

const EXPIRED = "ໝົດເວລາເຊື່ອມຕໍ່ — ກະລຸນາ login ດ້ວຍ LINE ໃໝ່ອີກຄັ້ງ";

/** ເຄີຍ — existing customer: verify by phone + password (default 0000), bind LINE. */
export async function linkExistingAction(phone: string, password: string): Promise<LinkResult> {
  const pending = await readPending();
  if (!pending) return { ok: false, error: EXPIRED };

  const id = String(phone || "").trim();
  const pw = String(password || "") || "0000";
  if (!id) return { ok: false, error: "ກະລຸນາໃສ່ເບີໂທ" };

  const sess = await linkLineToCustomer(id, pw, {
    lineUserId: pending.lineUserId,
    displayName: pending.displayName ?? null,
    pictureUrl: pending.pictureUrl ?? null,
    email: pending.email ?? null,
  });
  if (!sess) return { ok: false, error: "ບໍ່ພົບເບີໂທ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ (ລະຫັດເລີ່ມຕົ້ນ 0000)" };

  await setSessionCookie(sess);
  await finish();
  return { ok: true };
}

/** ບໍ່ເຄີຍ — new member: create the ar_customer record, bind LINE, log in. */
export async function registerAction(name: string, phone: string): Promise<LinkResult> {
  const pending = await readPending();
  if (!pending) return { ok: false, error: EXPIRED };

  const res = await registerLineCustomer(
    {
      lineUserId: pending.lineUserId,
      displayName: pending.displayName ?? null,
      pictureUrl: pending.pictureUrl ?? null,
      email: pending.email ?? null,
    },
    { name, phone },
  );
  if (!res.ok) return { ok: false, error: res.error };

  await setSessionCookie(res.session);
  await finish();
  return { ok: true };
}
