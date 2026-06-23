"use server";

import { getOrderByNo, STATUS_LABEL, type OrderStatus } from "@/lib/orders";

export interface TrackedOrder {
  orderNo: string;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  createdAt: string;
  total: number;
  items: { name: string; qty: number }[];
}

export type TrackResult = { ok: true; order: TrackedOrder } | { ok: false; error: string };

// Last digits of a phone (tolerates spaces / leading 0 / country code).
function phoneTail(p: string): string {
  return (p ?? "").replace(/\D/g, "").slice(-8);
}

/** Look up an order by number + phone — no login required. */
export async function trackOrder(orderNo: string, phone: string): Promise<TrackResult> {
  const no = (orderNo ?? "").trim();
  const ph = phoneTail(phone);
  if (!no || ph.length < 6) return { ok: false, error: "ກະລຸນາໃສ່ເລກອໍເດີ ແລະ ເບີໂທ" };
  try {
    const order = await getOrderByNo(no);
    if (!order || phoneTail(order.phone) !== ph) {
      return { ok: false, error: "ບໍ່ພົບອໍເດີ — ກວດເລກອໍເດີ ແລະ ເບີໂທ" };
    }
    return {
      ok: true,
      order: {
        orderNo: order.orderNo,
        status: order.status,
        statusLabel: STATUS_LABEL[order.status as OrderStatus] ?? order.status,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        total: order.subtotal + order.shippingFee,
        items: order.items.map((i) => ({ name: i.productName, qty: i.qty })),
      },
    };
  } catch {
    return { ok: false, error: "ເກີດຂໍ້ຜິດພາດ ລອງໃໝ່" };
  }
}
