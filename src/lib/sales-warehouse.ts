import "server-only";
import { cache } from "react";
import { query } from "./db";
import type { Warehouse } from "./inventory-stock";

// Which ERP warehouses the web store sells / fulfils from. EMPTY = all allowed
// (non-breaking default). When configured, the admin warehouse picker for orders
// and requisitions is restricted to this set.

/** Selected sales-warehouse codes (empty array = no restriction). Cached/request. */
export const getSalesWarehouseCodes = cache(async (): Promise<string[]> => {
  try {
    const rows = await query<{ wh_code: string }>(
      `select wh_code from odg_ecom.sales_warehouses order by sort_order, wh_code`,
    );
    return rows.map((r) => r.wh_code);
  } catch {
    return []; // table missing → no restriction
  }
});

/** Selected sales warehouses with names (for the admin UI). */
export async function getSalesWarehouses(): Promise<Warehouse[]> {
  const rows = await query<{ code: string; name_1: string }>(
    `select s.wh_code as code, coalesce(nullif(w.name_1,''), s.wh_code) as name_1
       from odg_ecom.sales_warehouses s
       left join public.ic_warehouse w on w.code = s.wh_code
      order by s.sort_order, s.wh_code`,
  );
  return rows.map((r) => ({ code: r.code, name: r.name_1 }));
}

/** Replace the sales-warehouse set with the given codes (order preserved). */
export async function setSalesWarehouses(codes: string[], updatedBy?: string): Promise<void> {
  const clean = [...new Set(codes.map((c) => String(c).trim()).filter(Boolean))];
  await query(`delete from odg_ecom.sales_warehouses`);
  for (let i = 0; i < clean.length; i++) {
    await query(
      `insert into odg_ecom.sales_warehouses (wh_code, sort_order, updated_by, updated_at)
       values ($1,$2,$3, now()) on conflict (wh_code) do nothing`,
      [clean[i], i, updatedBy ?? null],
    );
  }
}

/** True if a warehouse is allowed for web sales (allowed when the set is empty). */
export function isSalesWarehouse(code: string, salesCodes: string[]): boolean {
  return salesCodes.length === 0 || salesCodes.includes(code);
}
