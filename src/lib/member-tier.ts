import "server-only";
import { cache } from "react";
import { query, queryOne } from "./db";
import { getSession } from "./auth";

// Membership-tier discount. Tier definitions + discount % come from the READ-ONLY
// ERP public.ar_group_sub (main_group '101' = members; discount stored as text
// like "3%"). The customer→tier assignment is app-owned (ecom.customer_tier).

export interface MemberTier {
  code: string; // ar_group_sub.code
  name: string;
  discountPct: number;
}

/** Parse a "3%" / "3" discount string into a number (percent). */
function parsePct(s: string | null): number {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Active member tiers from the ERP (those with a real discount). */
export async function listMemberTiers(): Promise<MemberTier[]> {
  const rows = await query<{ code: string; name_1: string; discount: string | null }>(
    `select code, name_1, discount
       from public.ar_group_sub
      where main_group = '101' and coalesce(status,0) = 1 and discount is not null and discount <> ''
      order by sub_no`,
  );
  return rows
    .map((r) => ({ code: r.code, name: r.name_1, discountPct: parsePct(r.discount) }))
    .filter((t) => t.discountPct > 0);
}

/** A customer's assigned tier (or null). */
export async function getCustomerTier(customerCode: string): Promise<MemberTier | null> {
  if (!customerCode) return null;
  const r = await queryOne<{ code: string; name_1: string; discount: string | null }>(
    `select g.code, g.name_1, g.discount
       from ecom.customer_tier t
       join public.ar_group_sub g on g.code = t.group_sub_code
      where t.customer_code = $1`,
    [customerCode],
  );
  if (!r) return null;
  const pct = parsePct(r.discount);
  return pct > 0 ? { code: r.code, name: r.name_1, discountPct: pct } : null;
}

// Baseline discount every registered member gets (env-overridable). A higher
// assigned tier wins. Guests (not logged in) get 0.
export const MEMBER_DEFAULT_PCT = (() => {
  const n = parseFloat(process.env.MEMBER_DEFAULT_PCT ?? "3");
  return Number.isFinite(n) && n >= 0 ? n : 3;
})();

/** Member discount % for a customer (baseline for any member; tier may raise it). */
export async function getMemberDiscountPct(customerCode: string | null | undefined): Promise<number> {
  if (!customerCode) return 0;
  const tier = await getCustomerTier(customerCode);
  return Math.max(tier?.discountPct ?? 0, MEMBER_DEFAULT_PCT);
}

/** Member discount % for the CURRENT logged-in customer (request-cached, 0 for guests). */
export const currentMemberPct = cache(async (): Promise<number> => {
  const s = await getSession();
  return s?.code ? getMemberDiscountPct(s.code) : 0;
});

/** Apply the current member's discount to a product list (sets memberPrice). */
export async function applyMemberPrice<T extends { price: number | null; memberPrice?: number | null }>(
  items: T[],
): Promise<T[]> {
  const pct = await currentMemberPct();
  if (pct <= 0) return items;
  const f = 1 - pct / 100;
  for (const it of items) {
    it.memberPrice = it.price != null ? Math.round(it.price * f) : null;
  }
  return items;
}

/** Admin: assign / clear a customer's tier. */
export async function setCustomerTier(customerCode: string, groupSubCode: string | null, by?: string): Promise<void> {
  if (!customerCode) return;
  if (!groupSubCode) {
    await query(`delete from ecom.customer_tier where customer_code = $1`, [customerCode]);
    return;
  }
  await query(
    `insert into ecom.customer_tier (customer_code, group_sub_code, updated_by, updated_at)
     values ($1, $2, $3, now())
     on conflict (customer_code) do update set group_sub_code = excluded.group_sub_code,
        updated_by = excluded.updated_by, updated_at = now()`,
    [customerCode, groupSubCode, by ?? null],
  );
}
