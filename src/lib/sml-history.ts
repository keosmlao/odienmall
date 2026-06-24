import "server-only";
import { query, queryOne } from "./db";

// ---------------------------------------------------------------------------
// SML customer insights — loyalty points + full purchase history pulled from
// the READ-ONLY ERP. "Purchases" = every cash-sale bill (public.ic_trans flag
// 44), not just OdienMall web orders, so a shopper sees their whole history
// with ODG. Shown to the customer themselves on /account.
// ---------------------------------------------------------------------------
export interface SmlPurchase {
  docNo: string;
  date: string;
  total: number;
  itemCount: number;
}
export interface SmlCustomerInsights {
  pointBalance: number;
  purchaseCount: number;
  purchaseTotal: number;
  purchases: SmlPurchase[];
}

export async function getSmlCustomerInsights(code: string): Promise<SmlCustomerInsights> {
  const c = (code || "").trim();
  if (!c) return { pointBalance: 0, purchaseCount: 0, purchaseTotal: 0, purchases: [] };

  const [pt, agg, rows] = await Promise.all([
    queryOne<{ point_balance: string | null }>(
      `select point_balance from public.ar_customer where code = $1`,
      [c],
    ),
    queryOne<{ n: number; total: string }>(
      `select count(*)::int as n, coalesce(sum(total_amount_2),0)::text as total
         from public.ic_trans
        where cust_code = $1 and trans_flag = 44 and coalesce(is_cancel,0) = 0`,
      [c],
    ),
    query<{ doc_no: string; doc_date: Date; total: string; item_count: number }>(
      `select ic.doc_no, ic.doc_date,
              coalesce(ic.total_amount_2,0)::text as total,
              (select count(*) from public.ic_trans_detail d where d.doc_no = ic.doc_no)::int as item_count
         from public.ic_trans ic
        where ic.cust_code = $1 and ic.trans_flag = 44 and coalesce(ic.is_cancel,0) = 0
        order by ic.doc_date desc nulls last, ic.doc_no desc
        limit 30`,
      [c],
    ),
  ]);

  return {
    pointBalance: Math.round(Number(pt?.point_balance ?? 0)),
    purchaseCount: agg?.n ?? 0,
    purchaseTotal: Number(agg?.total ?? 0),
    purchases: rows.map((r) => ({
      docNo: r.doc_no,
      date: (r.doc_date instanceof Date ? r.doc_date : new Date(r.doc_date)).toISOString(),
      total: Number(r.total),
      itemCount: r.item_count,
    })),
  };
}
