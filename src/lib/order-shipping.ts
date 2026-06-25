import "server-only";
import { query } from "./db";

export interface OrderShipping {
  orderNo: string;
  trackingNo: string | null;
  carrier: string | null;
  updatedAt: string | null;
}

export async function getOrderShipping(orderNo: string): Promise<OrderShipping | null> {
  const rows = await query<{ order_no: string; tracking_no: string | null; carrier: string | null; updated_at: Date | null }>(
    `select order_no, tracking_no, carrier, updated_at
       from odg_ecom.order_shipping where order_no = $1`,
    [orderNo],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    orderNo: r.order_no,
    trackingNo: r.tracking_no,
    carrier: r.carrier,
    updatedAt: r.updated_at?.toISOString() ?? null,
  };
}

export async function setOrderShipping(
  orderNo: string,
  trackingNo: string | null,
  carrier: string | null,
): Promise<void> {
  await query(
    `insert into odg_ecom.order_shipping (order_no, tracking_no, carrier, updated_at)
       values ($1, $2, $3, now())
     on conflict (order_no) do update
       set tracking_no = excluded.tracking_no,
           carrier     = excluded.carrier,
           updated_at  = now()`,
    [orderNo, trackingNo || null, carrier || null],
  );
}
