import "server-only";
import { cache } from "react";
import { query } from "./db";

// Read-only stock-by-warehouse view (ສິນຄ້າຄົງເຫຼືອ ລາຍລະອຽດຕາມສາງ). Uses the SML
// stock SRF sml_ic_function_stock_balance_warehouse_location, the same source the
// order/requisition warehouse picker uses — so figures match ອອກບິນ/ໃບເບີກ.

export interface Warehouse {
  code: string;
  name: string;
}

export const getWarehouses = cache(async (): Promise<Warehouse[]> => {
  const rows = await query<{ code: string; name_1: string }>(
    `select code, coalesce(nullif(name_1,''), code) as name_1
       from public.ic_warehouse where coalesce(status,0) = 1 order by code`,
  );
  return rows.map((r) => ({ code: r.code, name: r.name_1 }));
});

export interface StockRow {
  code: string;
  name: string;
  warehouse: string;
  whName: string;
  shelf: string;
  shelfName: string;
  qty: number;
}

/** Per (product, warehouse, shelf) on-hand quantity. Requires a product search OR
 *  a warehouse filter (so it never scans the whole catalog × warehouses). */
export async function getStockByWarehouse(opts: {
  search?: string;
  whCode?: string;
  limit?: number;
}): Promise<StockRow[]> {
  const search = (opts.search ?? "").trim();
  const whCode = (opts.whCode ?? "").trim();
  if (!search && !whCode) return [];

  // Resolve the candidate web-item codes (optionally filtered by the search).
  const params: unknown[] = [];
  let where = "i.is_eordershow = 1";
  if (search) {
    params.push(`%${search}%`);
    where += ` and (i.code ilike $${params.length} or i.name_1 ilike $${params.length} or i.name_2 ilike $${params.length})`;
  }
  const codeRows = await query<{ code: string }>(
    `select code from public.ic_inventory i where ${where} order by code limit ${search ? 400 : 1000}`,
    params,
  );
  const codes = codeRows.map((r) => r.code);
  if (codes.length === 0) return [];

  const rows = await query<{
    ic_code: string; name: string; warehouse: string; wh_name: string;
    location: string; shelf_name: string; qty: string;
  }>(
    `select f.ic_code, coalesce(nullif(i.name_1,''), nullif(i.name_2,''), f.ic_code) as name,
            f.warehouse, coalesce(w.name_1, f.warehouse) as wh_name,
            f.location, coalesce(s.name_1, f.location) as shelf_name,
            sum(f.balance_qty)::numeric as qty
       from sml_ic_function_stock_balance_warehouse_location(current_date, $1, $2, '') f
       join public.ic_inventory i on i.code = f.ic_code
       left join public.ic_warehouse w on w.code = f.warehouse
       left join public.ic_shelf s on s.whcode = f.warehouse and s.code = f.location
      where f.warehouse <> ''
      group by f.ic_code, i.name_1, i.name_2, f.warehouse, w.name_1, f.location, s.name_1
     having sum(f.balance_qty) <> 0
      order by f.ic_code, f.warehouse, f.location
      limit ${Math.min(opts.limit ?? 1000, 2000)}`,
    [codes.join(","), whCode],
  );

  return rows.map((r) => ({
    code: r.ic_code,
    name: r.name,
    warehouse: r.warehouse,
    whName: r.wh_name,
    shelf: r.location,
    shelfName: r.shelf_name,
    qty: Math.round(Number(r.qty) * 100) / 100,
  }));
}

// ── Goods-receipt history (read-only, from the serial ledger sn_trans_detail) ──
// calc_flag = 1 means a serial was RECEIVED into a warehouse (ໃບຮັບສິນຄ້າເຂົ້າສາງ).

export interface ReceiptDoc {
  docNo: string;
  docDate: string | null;
  warehouse: string;
  whName: string;
  itemCount: number;
  totalQty: number;
  items: Array<{ code: string; name: string; qty: number; snCount: number }>;
}

export async function getReceiptHistory(opts: {
  search?: string;
  whCode?: string;
  limit?: number;
}): Promise<ReceiptDoc[]> {
  const limit = Math.min(opts.limit ?? 40, 100);
  const where: string[] = ["d.calc_flag = 1"];
  const params: unknown[] = [];
  if (opts.whCode?.trim()) {
    params.push(opts.whCode.trim());
    where.push(`d.warehouse = $${params.length}`);
  }
  if (opts.search?.trim()) {
    params.push(`%${opts.search.trim()}%`);
    where.push(`(d.doc_no ilike $${params.length} or d.item_code ilike $${params.length} or d.item_name ilike $${params.length})`);
  }
  const whereSql = where.join(" and ");

  // Recent receipt documents (one row per doc + warehouse).
  const docs = await query<{
    doc_no: string; doc_date: Date | null; warehouse: string; wh_name: string | null;
    item_count: number; total_qty: string;
  }>(
    `select d.doc_no, max(d.doc_date) as doc_date, d.warehouse,
            (select w.name_1 from public.ic_warehouse w where w.code = d.warehouse) as wh_name,
            count(distinct d.item_code)::int as item_count,
            sum(d.qty)::numeric as total_qty
       from public.sn_trans_detail d
      where ${whereSql}
      group by d.doc_no, d.warehouse
      order by max(d.doc_date) desc nulls last, d.doc_no desc
      limit ${limit}`,
    params,
  );
  if (docs.length === 0) return [];

  // Items for those documents.
  const docNos = docs.map((d) => d.doc_no);
  const items = await query<{
    doc_no: string; warehouse: string; item_code: string; item_name: string | null;
    qty: string; sn_count: number;
  }>(
    `select d.doc_no, d.warehouse, d.item_code,
            coalesce(nullif(d.item_name,''), d.item_code) as item_name,
            sum(d.qty)::numeric as qty, count(*)::int as sn_count
       from public.sn_trans_detail d
      where d.calc_flag = 1 and d.doc_no = any($1)
      group by d.doc_no, d.warehouse, d.item_code, d.item_name
      order by d.item_code`,
    [docNos],
  );
  const itemsByDoc = new Map<string, ReceiptDoc["items"]>();
  for (const it of items) {
    const key = `${it.doc_no}|${it.warehouse}`;
    const arr = itemsByDoc.get(key) ?? [];
    arr.push({ code: it.item_code, name: it.item_name ?? it.item_code, qty: Math.round(Number(it.qty) * 100) / 100, snCount: it.sn_count });
    itemsByDoc.set(key, arr);
  }

  return docs.map((d) => ({
    docNo: d.doc_no,
    docDate: d.doc_date ? d.doc_date.toISOString() : null,
    warehouse: d.warehouse,
    whName: d.wh_name ?? d.warehouse,
    itemCount: d.item_count,
    totalQty: Math.round(Number(d.total_qty) * 100) / 100,
    items: itemsByDoc.get(`${d.doc_no}|${d.warehouse}`) ?? [],
  }));
}
