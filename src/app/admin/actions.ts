"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  authenticateAdmin,
  setAdminCookie,
  clearAdminCookie,
  isAdmin,
  isManager,
  getAdminSession,
} from "@/lib/auth";
import {
  updateOrderStatus,
  getOrderByNo,
  adminDeleteOrder,
  getOrdersMissingSmlDoc,
  setOrderSaleCode,
} from "@/lib/orders";
import { allocateOrderToWarehouse } from "@/lib/order-warehouse";
import { query } from "@/lib/db";
import { materializePaidOrder } from "@/lib/onepay-store";
import {
  createSmlSaleOrder,
  confirmSmlSaleOrder,
  smlDirectWriteEnabled,
} from "@/lib/sml-sale-order";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, recordFailure, recordSuccess, LOCKOUT_MINUTES } from "@/lib/rate-limit";
import { setOrderShipping } from "@/lib/order-shipping";
import { addOrderNote, deleteOrderNote, type OrderNote } from "@/lib/order-notes";

export type AdminLoginResult = { ok: true } | { ok: false; error: string };

// Best-effort client IP from the proxy header (falls back when absent locally).
async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function adminLogin(
  username: string,
  password: string,
): Promise<AdminLoginResult> {
  // Per-IP throttle: limits total failed admin attempts (covers both per-account
  // and break-glass passcode brute-force, which would otherwise vary username).
  const key = `admin:${await clientIp()}`;
  if (!checkRateLimit(key).allowed) {
    return { ok: false, error: `ລອງເຂົ້າຫຼາຍຄັ້ງເກີນໄປ — ກະລຸນາລໍຖ້າ ${LOCKOUT_MINUTES} ນາທີ` };
  }

  const sess = await authenticateAdmin(username, password);
  if (!sess) {
    recordFailure(key);
    return { ok: false, error: "ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານ ບໍ່ຖືກຕ້ອງ" };
  }
  recordSuccess(key);
  await setAdminCookie(sess);
  return { ok: true };
}

export async function adminLogout(): Promise<void> {
  await clearAdminCookie();
}

export type ChangeStatusResult = { ok: true } | { ok: false; error: string };

export type SaleCodeResult =
  | { ok: true; name: string | null }
  | { ok: false; error: string };

/** Re-assign the salesperson (ພະນັກງານຂາຍ) on an order. Manager-only. */
export async function updateOrderSaleCode(
  orderNo: string,
  saleCode: string | null,
): Promise<SaleCodeResult> {
  if (!(await isManager())) return { ok: false, error: "ສະເພາະຜູ້ຈັດການ" };
  try {
    const res = await setOrderSaleCode(orderNo, saleCode);
    await logAudit({ action: "order.sale_code", entity: orderNo, detail: res.code ?? "(ລຶບ)" });
    revalidatePath(`/admin/orders/${orderNo}`);
    return { ok: true, name: res.name };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ບັນທຶກບໍ່ສຳເລັດ" };
  }
}

/**
 * Issue the bill (ອອກບິນ): allocate the whole order to ONE warehouse, then promote
 * the order's ic_trans from the ໃບສັ່ງຊື້ (flag 34) to the cash bill (flag 44 = paid),
 * stamp the chosen warehouse/shelf onto each line, and post the cash-book receipt
 * (cb_trans). Flag 44 IS the "paid" status — no separate status write.
 */
export async function saveOrderWarehouse(
  orderNo: string,
  whCode: string,
  transportCode: string,
): Promise<ChangeStatusResult> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    const order = await getOrderByNo(orderNo);
    if (!order) return { ok: false, error: "ບໍ່ພົບຄຳສັ່ງຊື້" };
    if (order.status !== "awaiting_confirmation") {
      return { ok: false, error: "ອອກບິນໄດ້ສະເພາະອໍເດີທີ່ຍັງເປັນ ໃບສັ່ງຊື້ (34)" };
    }
    if (!smlDirectWriteEnabled()) {
      return { ok: false, error: "SML_DIRECT_WRITE ຍັງປິດ — ບໍ່ສາມາດອອກບິນ SML" };
    }
    const admin = await getAdminSession();
    // Pick warehouse/shelf per line first (validated against live stock).
    await allocateOrderToWarehouse(orderNo, whCode, admin?.code);
    // 34 → 44 (= paid) + real warehouse + cb_trans, atomically.
    const docNo = await confirmSmlSaleOrder(orderNo, transportCode);
    await logAudit({
      action: "order.sml.issue",
      entity: orderNo,
      detail: `doc ${docNo}; wh ${whCode}; transport ${transportCode}; 34→44 + shipment`,
    });
    revalidatePath(`/admin/orders/${orderNo}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

/**
 * Backfill SML ໃບສັ່ງຊື້ (ic_trans flag 34) for orders created before direct
 * write was enabled. Idempotent per order. Requires SML_DIRECT_WRITE=1.
 */
export async function backfillSmlDocs(): Promise<
  { ok: true; created: number; failed: number } | { ok: false; error: string }
> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  if (!smlDirectWriteEnabled()) {
    return { ok: false, error: "SML_DIRECT_WRITE ຍັງປິດຢູ່ (ຕ້ອງ restart dev server ຫຼັງຕັ້ງເປັນ 1)" };
  }
  try {
    const orderNos = await getOrdersMissingSmlDoc();
    let created = 0;
    let failed = 0;
    for (const orderNo of orderNos) {
      try {
        const doc = await createSmlSaleOrder(orderNo);
        if (doc) created++;
      } catch {
        failed++;
      }
    }
    await logAudit({ action: "order.sml.backfill", entity: "*", detail: `created ${created}, failed ${failed}` });
    revalidatePath("/admin");
    return { ok: true, created, failed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

/** Admin: delete an order permanently (clearing test data). */
export async function deleteOrderAdmin(orderNo: string): Promise<ChangeStatusResult> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    const ok = await adminDeleteOrder(orderNo);
    if (!ok) return { ok: false, error: "ບໍ່ພົບຄຳສັ່ງຊື້" };
    await logAudit({ action: "order.delete", entity: orderNo, detail: "admin deleted" });
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

/** Lightweight poll: return current payment status for a pending order (no BCEL API call). */
export async function pollOrderPaymentStatus(orderNo: string): Promise<{ status: string }> {
  if (!(await isAdmin())) return { status: "unauthorized" };
  const { getOrderPayment } = await import("@/lib/onepay-store");
  const rec = await getOrderPayment(orderNo);
  return { status: rec?.status ?? "notfound" };
}

/** Admin: confirm a pending TRANSFER order is paid → mark paid + materialise to SML. */
export async function adminConfirmPayment(orderNo: string): Promise<ChangeStatusResult> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    await query(
      `update odg_ecom.onepay_payments set status='paid', paid_at=now()
        where order_no=$1 and sml_doc_no is null`,
      [orderNo],
    );
    // Best-effort: write to SML (ic_trans flag 34) when SML_DIRECT_WRITE is on.
    await materializePaidOrder(orderNo).catch((e) => console.error("materialize on confirm failed:", e));
    await logAudit({ action: "order.confirmPaid", entity: orderNo, detail: "admin confirmed transfer" });
    revalidatePath(`/admin/orders/${orderNo}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

export async function changeStatus(
  orderNo: string,
  status: string,
): Promise<ChangeStatusResult> {
  // Re-check admin server-side — never trust the client.
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    const ok = await updateOrderStatus(orderNo, status);
    if (!ok) return { ok: false, error: "ບໍ່ພົບຄຳສັ່ງຊື້" };
    await logAudit({ action: "order.status", entity: orderNo, detail: status });
    revalidatePath(`/admin/orders/${orderNo}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

export async function adminSearchProducts(q: string) {
  const { searchOrderProducts } = await import("@/lib/order-builder");
  if (!(await isAdmin())) return [];
  return searchOrderProducts(q);
}

/** Bulk cancel multiple orders at once (only cancellable statuses). */
export async function bulkCancelOrders(
  orderNos: string[],
): Promise<ChangeStatusResult> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  if (!orderNos || orderNos.length === 0) return { ok: false, error: "ບໍ່ໄດ້ເລືອກອໍເດີ" };
  const session = await getAdminSession();
  const errors: string[] = [];
  for (const orderNo of orderNos) {
    try {
      const ok = await updateOrderStatus(orderNo, "cancelled");
      if (ok) {
        await logAudit({
          action: "order.status",
          entity: orderNo,
          detail: `bulk cancelled by ${session?.code ?? "admin"}`,
        });
      } else {
        errors.push(orderNo);
      }
    } catch {
      errors.push(orderNo);
    }
  }
  revalidatePath("/admin");
  if (errors.length > 0) {
    return { ok: false, error: `ຍົກເລີກລົ້ມເຫລວ: ${errors.join(", ")}` };
  }
  return { ok: true };
}

/** Add an internal admin note to an order (not visible to customers). */
export async function addAdminOrderNote(
  orderNo: string,
  content: string,
): Promise<{ ok: boolean; note?: OrderNote; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    const session = await getAdminSession();
    const note = await addOrderNote(orderNo, content, session?.code);
    return { ok: true, note };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

/** Delete an internal admin note by id. */
export async function deleteAdminOrderNote(id: number): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  try {
    await deleteOrderNote(id);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Save tracking number and carrier for an order (visible to customer). */
export async function setTrackingNumber(
  orderNo: string,
  trackingNo: string,
  carrier: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    await setOrderShipping(orderNo, trackingNo || null, carrier || null);
    await logAudit({ action: "order.tracking", entity: orderNo, detail: `${carrier} ${trackingNo}`.trim() });
    revalidatePath(`/admin/orders/${encodeURIComponent(orderNo)}`);
    revalidatePath(`/order/${encodeURIComponent(orderNo)}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

