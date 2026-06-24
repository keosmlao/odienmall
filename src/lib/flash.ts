import "server-only";
import { cache } from "react";
import { query, queryOne } from "./db";
import type { Product } from "./types";

// Flash sale / time-limited deals. The deal price overrides retail on the
// storefront and at checkout (re-priced server-side). App-owned (odg_ecom.flash_deals).

export interface FlashDeal {
  productCode: string;
  salePrice: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

/** Map of product_code → sale_price for deals active RIGHT NOW (request-cached). */
export const activeFlashMap = cache(async (): Promise<Map<string, number>> => {
  const rows = await query<{ product_code: string; sale_price: string }>(
    `select product_code, sale_price from odg_ecom.flash_deals
      where active and starts_at <= now() and ends_at > now()`,
  );
  return new Map(rows.map((r) => [r.product_code, Number(r.sale_price)]));
});

/** Set flashPrice on products that are currently on a flash deal. */
export async function applyFlashPrice<T extends Product>(items: T[]): Promise<T[]> {
  if (items.length === 0) return items;
  const map = await activeFlashMap();
  if (map.size === 0) return items;
  for (const it of items) {
    const sp = map.get(it.code);
    if (sp != null && (it.price == null || sp < it.price)) it.flashPrice = sp;
  }
  return items;
}

/** The active flash sale price for a single product, or null. */
export async function flashPriceFor(code: string): Promise<number | null> {
  const map = await activeFlashMap();
  return map.get(code) ?? null;
}

/** Active flash deals joined to product info, for the home rail. */
export async function getActiveFlashDeals(limit = 12): Promise<{ products: Product[]; endsAt: string | null }> {
  const rows = await query<{ ends_at: Date }>(
    `select min(ends_at) as ends_at from odg_ecom.flash_deals where active and starts_at <= now() and ends_at > now()`,
  );
  const endsAt = rows[0]?.ends_at ? new Date(rows[0].ends_at).toISOString() : null;
  if (!endsAt) return { products: [], endsAt: null };

  const codes = await query<{ product_code: string }>(
    `select product_code from odg_ecom.flash_deals
      where active and starts_at <= now() and ends_at > now()
      order by ends_at asc limit $1`,
    [limit],
  );
  if (codes.length === 0) return { products: [], endsAt };
  // Reuse catalog to fetch product cards for these codes (in flash order).
  const { getProductByCode } = await import("./catalog");
  const products = (await Promise.all(codes.map((c) => getProductByCode(c.product_code)))).filter(
    (p): p is Product => p != null,
  );
  return { products, endsAt };
}

// ── Admin ───────────────────────────────────────────────────────────────────

export async function listFlashDeals(): Promise<FlashDeal[]> {
  const rows = await query<{
    product_code: string;
    sale_price: string;
    starts_at: Date;
    ends_at: Date;
    active: boolean;
  }>(`select product_code, sale_price, starts_at, ends_at, active from odg_ecom.flash_deals order by ends_at desc`);
  return rows.map((r) => ({
    productCode: r.product_code,
    salePrice: Number(r.sale_price),
    startsAt: r.starts_at.toISOString(),
    endsAt: r.ends_at.toISOString(),
    active: r.active,
  }));
}

export async function upsertFlashDeal(input: {
  productCode: string;
  salePrice: number;
  startsAt: string;
  endsAt: string;
  active?: boolean;
  by?: string;
}): Promise<void> {
  if (!input.productCode || !(input.salePrice > 0)) throw new Error("ຂໍ້ມູນບໍ່ຄົບ");
  await query(
    `insert into odg_ecom.flash_deals (product_code, sale_price, starts_at, ends_at, active, created_by)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (product_code) do update set
        sale_price = excluded.sale_price, starts_at = excluded.starts_at,
        ends_at = excluded.ends_at, active = excluded.active`,
    [input.productCode, input.salePrice, input.startsAt, input.endsAt, input.active ?? true, input.by ?? null],
  );
}

export async function deleteFlashDeal(productCode: string): Promise<void> {
  await query(`delete from odg_ecom.flash_deals where product_code = $1`, [productCode]);
}

export async function getFlashDeal(productCode: string): Promise<FlashDeal | null> {
  const r = await queryOne<{
    product_code: string;
    sale_price: string;
    starts_at: Date;
    ends_at: Date;
    active: boolean;
  }>(`select product_code, sale_price, starts_at, ends_at, active from odg_ecom.flash_deals where product_code = $1`, [
    productCode,
  ]);
  return r
    ? {
        productCode: r.product_code,
        salePrice: Number(r.sale_price),
        startsAt: r.starts_at.toISOString(),
        endsAt: r.ends_at.toISOString(),
        active: r.active,
      }
    : null;
}
