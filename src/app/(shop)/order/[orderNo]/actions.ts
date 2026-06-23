"use server";

import QRCode from "qrcode";
import { getOrderByNo } from "@/lib/orders";
import {
  refreshPaymentStatus,
  forceRegenerate,
  confirmPaymentByCallback,
} from "@/lib/onepay-store";

export type CheckPaymentResult = {
  status: string;
  paid: boolean;
  payerName: string | null;
};

/** Re-check BCEL OnePay payment status for an order (called from the QR card). */
export async function checkOrderPayment(orderNo: string): Promise<CheckPaymentResult> {
  const rec = await refreshPaymentStatus(orderNo);
  return {
    status: rec?.status ?? "notfound",
    paid: rec?.status === "paid",
    payerName: rec?.payerName ?? null,
  };
}

/**
 * Mark the order paid after the BCEL One PubNub realtime event fires in the
 * browser (onepay.js subscribe → onpaid). When the API is enabled this is
 * re-verified against checkonepayqr inside confirmPaymentByCallback.
 */
export async function confirmOrderPaid(
  orderNo: string,
  info?: { ticket?: string; fccRef?: string; payerName?: string },
): Promise<CheckPaymentResult> {
  const res = await confirmPaymentByCallback({ invoiceId: orderNo, info });
  return {
    status: res.ok ? "paid" : "notfound",
    paid: res.ok,
    payerName: info?.payerName ?? null,
  };
}

export type RegenerateResult =
  | { ok: true; qrDataUrl: string; amount: number; expiresAt: string | null; status: string }
  | { ok: false; error: string };

/** Generate a fresh QR (new 3-minute window) after the previous one expired. */
export async function regenerateOrderQr(orderNo: string): Promise<RegenerateResult> {
  const order = await getOrderByNo(orderNo);
  if (!order) return { ok: false, error: "ບໍ່ພົບອໍເດີ" };
  const amount = order.subtotal + order.shippingFee;
  const rec = await forceRegenerate(orderNo, amount, `ອໍເດີ ${orderNo}`);
  if (!rec) return { ok: false, error: "ບໍ່ສາມາດສ້າງ QR ໃໝ່ໄດ້" };
  const qrDataUrl = await QRCode.toDataURL(rec.qrc, { width: 280, margin: 1 });
  return { ok: true, qrDataUrl, amount: rec.amount, expiresAt: rec.expiresAt, status: rec.status };
}
