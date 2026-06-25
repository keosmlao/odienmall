"use server";

import {
  getTrackOrderByNo,
  getOrderNosByPhone,
  getOrderTms,
  STATUS_LABEL,
  type OrderStatus,
  type OrderRecord,
  type OrderTms,
} from "@/lib/orders";

export interface TrackedShipment {
  car: string | null;
  dateLogistic: string | null;
  sentStart: string | null;
  sentEnd: string | null;
  deliveryCondition: string | null;
}

export interface TrackedOrder {
  orderNo: string;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  shippingMethod: string;
  createdAt: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  items: {
    code: string;
    name: string;
    unit: string | null;
    qty: number;
    unitPrice: number | null;
    lineTotal: number;
  }[];
  shipment: TrackedShipment | null;
}

export type TrackResult = { ok: true; orders: TrackedOrder[] } | { ok: false; error: string };

function safeShipment(tms: OrderTms | null): TrackedShipment | null {
  if (!tms) return null;
  return {
    car: tms.car,
    dateLogistic: tms.dateLogistic,
    sentStart: tms.sentStart,
    sentEnd: tms.sentEnd,
    deliveryCondition: tms.deliveryCondition,
  };
}

async function toTracked(o: OrderRecord): Promise<TrackedOrder> {
  const shipment = ["shipping", "completed"].includes(o.status)
    ? await getOrderTms(o.orderNo).catch(() => null)
    : null;

  return {
    orderNo: o.orderNo,
    status: o.status,
    statusLabel: STATUS_LABEL[o.status as OrderStatus] ?? o.status,
    paymentMethod: o.paymentMethod,
    shippingMethod: o.shippingMethod,
    createdAt: o.createdAt,
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    total: o.subtotal + o.shippingFee,
    items: o.items.map((i) => ({
      code: i.productCode,
      name: i.productName,
      unit: i.unit,
      qty: i.qty,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
    shipment: safeShipment(shipment),
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
    const byNo = await getTrackOrderByNo(q);
    if (byNo) return { ok: true, orders: [await toTracked(byNo)] };

    // Else treat as a phone number.
    const digits = q.replace(/\D/g, "");
    if (digits.length < 6) return { ok: false, error: "ບໍ່ພົບ — ກວດເລກອໍເດີ ຫຼື ໃສ່ເບີໂທໃຫ້ຄົບ" };
    const nos = await getOrderNosByPhone(digits);
    if (nos.length === 0) return { ok: false, error: "ບໍ່ພົບອໍເດີສຳລັບເບີນີ້" };
    const records = (await Promise.all(nos.map((n) => getTrackOrderByNo(n))))
      .filter((o): o is OrderRecord => o != null);
    const orders = await Promise.all(records.map(toTracked));
    if (orders.length === 0) return { ok: false, error: "ບໍ່ພົບອໍເດີ" };
    return { ok: true, orders };
  } catch {
    return { ok: false, error: "ເກີດຂໍ້ຜິດພາດ ລອງໃໝ່" };
  }
}
