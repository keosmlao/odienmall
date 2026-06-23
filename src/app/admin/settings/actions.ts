"use server";

import { revalidatePath } from "next/cache";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { isManager, getAdminSession } from "@/lib/auth";
import {
  setDevNotice,
  setAnnouncement,
  setBankTransfer,
  setBankQr,
  getBankTransfer,
  setOnepayRuntimeConfig,
  setCodEnabled,
  setHomePromotion,
} from "@/lib/settings";
import { logAudit } from "@/lib/audit";

type Result = { ok: true } | { ok: false; error: string };

const DENIED = "ບໍ່ໄດ້ຮັບອະນຸຍາດ";
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ");

export async function saveOnepayTestMode(input: {
  testMode: boolean;
  testAmount: number;
}): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  const testAmount = Math.round(Number(input.testAmount));
  if (!Number.isFinite(testAmount) || testAmount < 1 || testAmount > 100000) {
    return { ok: false, error: "ຍອດທົດສອບຕ້ອງຢູ່ລະຫວ່າງ 1–100,000 ₭" };
  }
  try {
    const by = (await getAdminSession())?.code;
    await setOnepayRuntimeConfig({ testMode: input.testMode, testAmount }, by);
    await logAudit({
      action: "settings.onepayTest",
      detail: `${input.testMode ? "enabled" : "disabled"}:${testAmount}`,
    });
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Toggle cash-on-delivery availability at checkout (manager only). */
export async function saveCodEnabled(enabled: boolean): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  try {
    const by = (await getAdminSession())?.code;
    await setCodEnabled(enabled, by);
    await logAudit({
      action: "settings.cod",
      detail: enabled ? "enabled" : "disabled",
    });
    revalidatePath("/checkout");
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Save the dev-notice toggle + text (manager only; writes ONLY ecom.dev_notice). */
export async function saveDevNotice(input: {
  enabled: boolean;
  title: string;
  message: string;
}): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };

  const title = input.title.trim();
  const message = input.message.trim();
  if (!title) return { ok: false, error: "ກະລຸນາໃສ່ຫົວຂໍ້" };
  if (!message) return { ok: false, error: "ກະລຸນາໃສ່ຂໍ້ຄວາມ" };

  try {
    const by = (await getAdminSession())?.code;
    await setDevNotice({ enabled: input.enabled, title, message }, by);
    await logAudit({ action: "settings.devNotice", detail: input.enabled ? "enabled" : "disabled" });
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ" };
  }
}

/** Save the announcement bar (manager only; writes ONLY ecom.announcement). */
export async function saveAnnouncement(input: {
  enabled: boolean;
  message: string;
  link: string;
}): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };

  const message = input.message.trim();
  const link = input.link.trim();
  if (input.enabled && !message) return { ok: false, error: "ກະລຸນາໃສ່ຂໍ້ຄວາມ" };
  if (link && !link.startsWith("/")) {
    return { ok: false, error: "ລິ້ງຕ້ອງເປັນເສັ້ນທາງພາຍໃນ (ຂຶ້ນຕົ້ນດ້ວຍ /)" };
  }

  try {
    const by = (await getAdminSession())?.code;
    await setAnnouncement({ enabled: input.enabled, message, link }, by);
    await logAudit({ action: "settings.announcement", detail: input.enabled ? "enabled" : "disabled" });
    // Bar shows site-wide → revalidate the storefront layout broadly.
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ" };
  }
}

export async function saveHomePromotion(input: {
  enabled: boolean;
  title: string;
  endsAt: string;
}): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  const title = input.title.trim();
  const endsAt = input.endsAt.trim();
  if (!title) return { ok: false, error: "ກະລຸນາໃສ່ຊື່ໂປຣໂມຊັນ" };
  if (input.enabled && !endsAt) return { ok: false, error: "ກະລຸນາກຳນົດວັນສິ້ນສຸດ" };
  if (endsAt && !Number.isFinite(Date.parse(endsAt))) {
    return { ok: false, error: "ວັນສິ້ນສຸດບໍ່ຖືກຕ້ອງ" };
  }
  if (input.enabled && Date.parse(endsAt) <= Date.now()) {
    return { ok: false, error: "ວັນສິ້ນສຸດຕ້ອງຢູ່ໃນອະນາຄົດ" };
  }
  try {
    const by = (await getAdminSession())?.code;
    await setHomePromotion({ enabled: input.enabled, title, endsAt: endsAt || null }, by);
    await logAudit({
      action: "settings.homePromotion",
      detail: input.enabled ? `${title}:${endsAt}` : "disabled",
    });
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Save the bank-transfer details (manager only; writes ONLY ecom.bank_transfer). */
export async function saveBankTransfer(input: {
  bankName: string;
  accountName: string;
  accountNo: string;
  note: string;
}): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };

  const bankName = input.bankName.trim();
  const accountName = input.accountName.trim();
  const accountNo = input.accountNo.trim();
  if (!bankName || !accountNo) {
    return { ok: false, error: "ກະລຸນາໃສ່ຊື່ທະນາຄານ ແລະ ເລກບັນຊີ" };
  }

  try {
    const by = (await getAdminSession())?.code;
    await setBankTransfer({ bankName, accountName, accountNo, note: input.note }, by);
    await logAudit({ action: "settings.bankTransfer", detail: `${bankName} ${accountNo}` });
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ" };
  }
}

const QR_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const QR_MAX = 3 * 1024 * 1024; // 3MB

/** Upload the bank/BCEL QR image (FormData: `file`). Writes ONLY public/uploads. */
export async function uploadBankQr(formData: FormData): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "ກະລຸນາເລືອກໄຟລ໌ QR" };
  if (!QR_EXT[file.type]) return { ok: false, error: "ຮອງຮັບສະເພາະ JPG, PNG, WEBP" };
  if (file.size > QR_MAX) return { ok: false, error: "ໄຟລ໌ໃຫຍ່ເກີນ 3MB" };

  try {
    const prev = (await getBankTransfer()).qrUrl;
    const dir = path.join(process.cwd(), "public", "uploads", "bank");
    await mkdir(dir, { recursive: true });
    const name = `qr-${randomUUID()}.${QR_EXT[file.type]}`;
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

    await setBankQr(`/uploads/bank/${name}`, (await getAdminSession())?.code);
    if (prev && prev.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", prev)).catch(() => {});
    }
    await logAudit({ action: "settings.bankQr", detail: "uploaded" });
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Remove the bank/BCEL QR image. */
export async function removeBankQr(): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: DENIED };
  try {
    const prev = (await getBankTransfer()).qrUrl;
    await setBankQr(null, (await getAdminSession())?.code);
    if (prev && prev.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", prev)).catch(() => {});
    }
    await logAudit({ action: "settings.bankQr", detail: "removed" });
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
