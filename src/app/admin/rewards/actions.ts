"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { isAdmin, getAdminSession } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";
import {
  setRewardImage,
  deleteRewardImage,
  togglePinReward,
  getRedemptionById,
  setRedemptionStatus,
} from "@/lib/rewards-admin";
import { issueRewardRequisition } from "@/lib/reward-requisition";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

type Result = { ok: true } | { ok: false; error: string };
const DENIED = "ບໍ່ໄດ້ຮັບອະນຸຍາດ";
const msg = (e: unknown) => (e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ");

const MAX_SIZE = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function revalidate() {
  revalidatePath("/admin/rewards");
  revalidatePath("/rewards");
}

export async function uploadPromotionImage(formData: FormData): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  const session = await getAdminSession();

  const promoCode = String(formData.get("promoCode") ?? "").trim();
  if (!promoCode) return { ok: false, error: "ບໍ່ພົບລະຫັດໂປຣ" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "ກະລຸນາເລືອກໄຟລ໌ຮູບ" };
  if (!EXT[file.type]) return { ok: false, error: "ຮອງຮັບສະເພາະ JPG, PNG, WEBP, GIF" };
  if (file.size > MAX_SIZE) return { ok: false, error: "ໄຟລ໌ໃຫຍ່ເກີນ 5MB" };

  try {
    const name = `${randomUUID()}.${EXT[file.type]}`;
    const url = await saveUpload(
      `rewards/${promoCode.replace(/[^A-Za-z0-9_-]/g, "_")}`,
      name,
      Buffer.from(await file.arrayBuffer()),
    );
    await setRewardImage(promoCode, url, session?.code ?? "admin");
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function pinPromotion(promoCode: string, pinned: boolean): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    await togglePinReward(promoCode, pinned);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function removePromotionImage(promoCode: string): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    await deleteRewardImage(promoCode);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

// ── Redemption fulfilment ────────────────────────────────────────────────────

function revalidateRedemptions(id?: number) {
  revalidatePath("/admin/rewards/redemptions");
  if (id) revalidatePath(`/admin/rewards/redemptions/${id}`);
}

/** Allocate the requisition to a warehouse + issue it (flag → 44, delivery).
 *  Mirrors order ອອກບິນ but for the ໃບຂໍເບີກ; no cash-book (paid with points). */
export async function issueRedemption(
  id: number,
  whCode: string,
  transportCode: string,
): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    const r = await getRedemptionById(id);
    if (!r) return { ok: false, error: "ບໍ່ພົບລາຍການ" };
    if (!r.smlDocNo) return { ok: false, error: "ຍັງບໍ່ມີໃບຂໍເບີກ (ກວດ SML_DIRECT_WRITE)" };
    if (r.status === "fulfilled") return { ok: false, error: "ອອກໃບເບີກແລ້ວ" };

    await issueRewardRequisition(r.smlDocNo, whCode, transportCode);
    await setRedemptionStatus(id, "fulfilled", { transportCode });
    await logAudit({ action: "reward.redemption.issue", entity: String(id), detail: `${r.smlDocNo} → ${whCode}/${transportCode}` });
    if (r.customerCode) {
      await notify(r.customerCode, {
        type: "promo",
        title: "ຂອງລາງວັນພ້ອມຈັດສົ່ງ 🎁",
        body: `${r.rewardName} — ກຳລັງດຳເນີນການຈັດສົ່ງ`,
        link: "/account/rewards",
      }).catch(() => {});
    }
    revalidateRedemptions(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Reject a redemption — frees the reserved points (reserved excludes rejected). */
export async function rejectRedemption(id: number, note?: string): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    const r = await getRedemptionById(id);
    if (!r) return { ok: false, error: "ບໍ່ພົບລາຍການ" };
    if (r.status === "fulfilled") return { ok: false, error: "ອອກໃບເບີກແລ້ວ ຍົກເລີກບໍ່ໄດ້" };
    await setRedemptionStatus(id, "rejected", { note: note?.trim() || "ປະຕິເສດໂດຍ admin" });
    await logAudit({ action: "reward.redemption.reject", entity: String(id), detail: r.rewardName });
    if (r.customerCode) {
      await notify(r.customerCode, {
        type: "promo",
        title: "ການແລກລາງວັນຖືກປະຕິເສດ",
        body: `${r.rewardName} — ແຕ້ມ ${r.pointsSpent.toLocaleString()} ຖືກຄືນແລ້ວ`,
        link: "/account/rewards",
      }).catch(() => {});
    }
    revalidateRedemptions(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Mark approved (acknowledged, not yet issued). */
export async function approveRedemption(id: number): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: DENIED };
  try {
    await setRedemptionStatus(id, "approved");
    await logAudit({ action: "reward.redemption.approve", entity: String(id) });
    revalidateRedemptions(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}
