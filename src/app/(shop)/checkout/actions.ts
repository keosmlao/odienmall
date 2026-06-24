"use server";

import { cookies } from "next/headers";
import QRCode from "qrcode";
import { createOrder, priceCart, OrderError } from "@/lib/orders";
import type { OrderInputItem } from "@/lib/orders";
import { getSession } from "@/lib/auth";
import { getCustomerAddress, createCustomerAddress } from "@/lib/addresses";
import { composeAddress } from "@/lib/lao-locations";
import { getOrCreateOrderQr, materializeCodOrder } from "@/lib/onepay-store";
import { onepayEnabled } from "@/lib/onepay";
import { toPaymentMethod } from "@/lib/payment-constants";
import { validateVoucher } from "@/lib/vouchers";
import { getBalance, previewRedeem, POINT_VALUE, MIN_REDEEM } from "@/lib/loyalty";
import { getCustomerTier, getMemberDiscountPct } from "@/lib/member-tier";
import { getAffiliateByCustomer } from "@/lib/affiliates";
import { searchOrderCustomers, type OrderCustomerHit } from "@/lib/order-builder";

export interface PlaceOrderInput {
  name: string;
  phone: string;
  /** Pick a saved address (logged-in only) — resolved & validated server-side. */
  addressId?: number | null;
  /** …or a one-off / new structured address. */
  province?: string;
  district?: string;
  village?: string;
  detail?: string;
  /** When logged-in + a new address: also save it to the address book. */
  saveAddress?: boolean;
  note?: string;
  paymentMethod?: string;
  shippingMethod?: string;
  voucherCode?: string | null;
  pointsToUse?: number;
  /** Affiliate placing the order on behalf of a customer (commission to them). */
  onBehalf?: boolean;
  items: OrderInputItem[];
}

/** Loyalty + membership info for the checkout. Zeros for guests. */
export async function getCheckoutLoyalty(): Promise<{
  balance: number;
  pointValue: number;
  minRedeem: number;
  memberPct: number;
  memberTier: string | null;
}> {
  const session = await getSession();
  if (!session?.code) {
    return { balance: 0, pointValue: POINT_VALUE, minRedeem: MIN_REDEEM, memberPct: 0, memberTier: null };
  }
  // memberPct must match what createOrder actually applies — the baseline
  // MEMBER_DEFAULT_PCT (3%) for any logged-in member, raised by their tier.
  // Using tier.discountPct alone hid the 3% baseline discount at checkout.
  const [balance, tier, memberPct] = await Promise.all([
    getBalance(session.code),
    getCustomerTier(session.code),
    getMemberDiscountPct(session.code),
  ]);
  return {
    balance,
    pointValue: POINT_VALUE,
    minRedeem: MIN_REDEEM,
    memberPct,
    memberTier: tier?.name ?? null,
  };
}

/** Customer lookup for an affiliate placing an order on behalf (active affiliates only). */
export async function lookupCustomers(q: string): Promise<OrderCustomerHit[]> {
  const session = await getSession();
  if (!session) return [];
  const aff = await getAffiliateByCustomer(session.code);
  if (aff?.status !== "active") return [];
  return searchOrderCustomers(q);
}

export type PreviewPointsResult =
  | { ok: true; points: number; discount: number }
  | { ok: false; error: string };

/** Validate a points-redemption against the (server-repriced) cart. */
export async function previewPoints(points: number, items: OrderInputItem[]): Promise<PreviewPointsResult> {
  try {
    const session = await getSession();
    if (!session?.code) return { ok: false, error: "ຕ້ອງເຂົ້າສູ່ລະບົບກ່ອນ" };
    const { subtotal } = await priceCart(items);
    return await previewRedeem(session.code, points, subtotal);
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    return { ok: false, error: "ກວດແຕ້ມບໍ່ສຳເລັດ" };
  }
}

export type PreviewVoucherResult =
  | { ok: true; code: string; discount: number; subtotal: number; total: number }
  | { ok: false; error: string };

/** Validate a voucher against the (server-repriced) cart for the checkout UI. */
export async function previewVoucher(
  code: string,
  items: OrderInputItem[],
): Promise<PreviewVoucherResult> {
  try {
    const session = await getSession();
    const { subtotal } = await priceCart(items);
    const res = await validateVoucher(code, subtotal, session?.code ?? null);
    if (!res.ok) return res;
    return {
      ok: true,
      code: res.voucher.code,
      discount: res.discount,
      subtotal,
      total: Math.max(0, subtotal - res.discount),
    };
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    return { ok: false, error: "ກວດໂຄ້ດບໍ່ສຳເລັດ" };
  }
}

export interface OrderQrPayload {
  qrDataUrl: string;
  /** Real order total. */
  amount: number;
  /** Amount encoded in the QR (different only in test mode). */
  qrAmount: number;
  expiresAt: string | null;
  status: string;
  tracked: boolean;
}

export type PlaceOrderResult =
  | { ok: true; orderNo: string; qr?: OrderQrPayload }
  | { ok: false; error: string };

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  try {
    // customer_code (session) + referral code (cookie) are resolved server-side
    // — never trusted from the client.
    const session = await getSession();
    const jar = await cookies();
    let referralCode = jar.get("om_ref")?.value ?? null;
    // Salesperson attribution from the /s/<code> sales link (validated in createOrder).
    const saleCode = jar.get("om_sale")?.value ?? null;

    // Affiliate buying ON BEHALF of a customer: the order is NOT for the
    // affiliate's own account (customerCode null), and commission is credited to
    // the affiliate (referral = their own code; no self-referral since the buyer
    // differs). Verified server-side — an inactive/non-affiliate is ignored.
    let onBehalf = false;
    if (input.onBehalf && session) {
      const aff = await getAffiliateByCustomer(session.code);
      if (aff?.status === "active") {
        onBehalf = true;
        referralCode = aff.code;
      }
    }

    // Resolve the delivery address server-side into a snapshot string.
    let address = "";
    if (input.addressId && session) {
      const saved = await getCustomerAddress(input.addressId, session.code);
      if (!saved) return { ok: false, error: "ບໍ່ພົບທີ່ຢູ່ທີ່ເລືອກ" };
      address = saved.label;
    } else {
      const province = input.province?.trim() || "";
      const district = input.district?.trim() || "";
      if (!province || !district) {
        return { ok: false, error: "ກະລຸນາເລືອກ ແຂວງ ແລະ ເມືອງ ຈັດສົ່ງ" };
      }
      address = composeAddress({
        province,
        district,
        village: input.village,
        detail: input.detail,
      });
      // Best-effort: persist to the customer's address book when asked (never in
      // on-behalf mode — that address belongs to the customer, not the affiliate).
      if (session && input.saveAddress && !onBehalf) {
        try {
          await createCustomerAddress(session.code, {
            recipient: input.name,
            phone: input.phone,
            province,
            district,
            village: input.village,
            detail: input.detail,
          });
        } catch (e) {
          console.error("save address failed:", e);
        }
      }
    }

    const { orderNo, subtotal, shippingFee, discount, memberDiscount, pointsValue } = await createOrder(
      {
        name: input.name,
        phone: input.phone,
        address,
        note: input.note,
        paymentMethod: input.paymentMethod,
        shippingMethod: input.shippingMethod,
        // On behalf: order belongs to the customer (guest), not the affiliate.
        customerCode: onBehalf ? null : session?.code ?? null,
        referralCode,
        saleCode,
        voucherCode: input.voucherCode,
        // The affiliate can't spend their own loyalty points on a customer order.
        pointsToUse: onBehalf ? undefined : input.pointsToUse,
      },
      input.items ?? [],
    );

    const paymentMethod = toPaymentMethod(input.paymentMethod);

    // COD: no online payment — record the order in SML (flag 34) right away.
    if (paymentMethod === "cod") {
      await materializeCodOrder(orderNo).catch((e) => console.error("materializeCodOrder failed:", e));
      return { ok: true, orderNo };
    }

    // Transfer: generate the BCEL QR so checkout shows it in a modal.
    if (paymentMethod === "transfer") {
      const amount = Math.max(0, subtotal + shippingFee - discount - memberDiscount - pointsValue); // net charged
      const rec = await getOrCreateOrderQr(orderNo, amount, `ອໍເດີ ${orderNo}`);
      if (rec) {
        const qrDataUrl = await QRCode.toDataURL(rec.qrc, { width: 280, margin: 1 });
        return {
          ok: true,
          orderNo,
          qr: {
            qrDataUrl,
            amount,
            qrAmount: rec.amount,
            expiresAt: rec.expiresAt,
            status: rec.status,
            tracked: onepayEnabled(),
          },
        };
      }
    }
    return { ok: true, orderNo };
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    console.error("placeOrder failed:", e);
    return { ok: false, error: "ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່" };
  }
}
