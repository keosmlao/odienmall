"use server";

import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getOrderByNo } from "@/lib/orders";
import { createReturnRequest, getReturnForOrder, type ReturnRequest } from "@/lib/returns";

async function ownsOrder(orderNo: string, custCode: string): Promise<boolean> {
  const rows = await query<{ x: number }>(
    `select 1 as x from public.ic_trans
       where (doc_no = $1 or doc_ref = $1) and cust_code = $2
         and remark_5 in ('web','odienmall')
     union
     select 1 as x from odg_ecom.onepay_payments where order_no = $1 and cust_code = $2
     limit 1`,
    [orderNo, custCode],
  );
  return rows.length > 0;
}

export type ReturnActionResult = { ok: true } | { ok: false; error: string };

/** Customer requests a return on their own paid/shipping/completed order. */
export async function requestReturn(
  orderNo: string,
  reason: string,
  detail?: string,
): Promise<ReturnActionResult> {
  const session = await getSession();
  if (!session?.code) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ" };
  if (!(await ownsOrder(orderNo, session.code))) return { ok: false, error: "ບໍ່ພົບອໍເດີຂອງທ່ານ" };
  const order = await getOrderByNo(orderNo);
  if (!order) return { ok: false, error: "ບໍ່ພົບອໍເດີ" };
  if (!["paid", "shipping", "completed"].includes(order.status)) {
    return { ok: false, error: "ອໍເດີນີ້ຍັງຄືນບໍ່ໄດ້ (ຕ້ອງຊຳລະແລ້ວ)" };
  }
  return createReturnRequest({ orderNo, customerCode: session.code, reason, detail });
}

export async function myReturn(orderNo: string): Promise<ReturnRequest | null> {
  const session = await getSession();
  if (!session?.code) return null;
  const r = await getReturnForOrder(orderNo);
  return r && r.customerCode === session.code ? r : null;
}
