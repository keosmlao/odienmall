"use server";

import { getOrderByNo, getOrderNosByPhone, STATUS_LABEL, type OrderStatus, type OrderRecord } from "@/lib/orders";

export interface TrackedOrder {
  orderNo: string;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  createdAt: string;
  total: number;
  items: { name: string; qty: number }[];
}

export type TrackResult = { ok: true; orders: TrackedOrder[] } | { ok: false; error: string };

function toTracked(o: OrderRecord): TrackedOrder {
  return {
    orderNo: o.orderNo,
    status: o.status,
    statusLabel: STATUS_LABEL[o.status as OrderStatus] ?? o.status,
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt,
    total: o.subtotal + o.shippingFee,
    items: o.items.map((i) => ({ name: i.productName, qty: i.qty })),
  };
}

/**
 * Public guest tracking — search by EITHER an order number OR a phone number
 * (one field). An order number returns that order; a phone returns all recent
 * orders for it. No login required.
 */
export async function trackOrder(queryStr: string): Promise<TrackResult> {
  const q = (queryStr ?? "").trim();
  if (!q) return { ok: false, error: "ກະລຸນາໃສ່ເລກອໍເດີ ຫຼື ເບີໂທ" };
  try {
    // Try as an order number first.
    const byNo = await getOrderByNo(q);
    if (byNo) return { ok: true, orders: [toTracked(byNo)] };

    // Else treat as a phone number.
    const digits = q.replace(/\D/g, "");
    if (digits.length < 6) return { ok: false, error: "ບໍ່ພົບ — ກວດເລກອໍເດີ ຫຼື ໃສ່ເບີໂທໃຫ້ຄົບ" };
    const nos = await getOrderNosByPhone(digits);
    if (nos.length === 0) return { ok: false, error: "ບໍ່ພົບອໍເດີສຳລັບເບີນີ້" };
    const orders = (await Promise.all(nos.map((n) => getOrderByNo(n))))
      .filter((o): o is OrderRecord => o != null)
      .map(toTracked);
    if (orders.length === 0) return { ok: false, error: "ບໍ່ພົບອໍເດີ" };
    return { ok: true, orders };
  } catch {
    return { ok: false, error: "ເກີດຂໍ້ຜິດພາດ ລອງໃໝ່" };
  }
}
