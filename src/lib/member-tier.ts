import "server-only";
import { cache } from "react";
import { query, queryOne } from "./db";
import { getSession } from "./auth";
import type { TierCookieData } from "./tier-constants";

// Membership-tier system — single source of truth: public.ar_group_sub (READ-ONLY ERP)
//   code       — tier code
//   name_1     — display name (Lao)
//   discount   — discount % string (e.g. "3%")
//   amount     — minimum LAK spend for auto-upgrade (null = 0, always qualifies)
//   sub_no     — rank order (lower = base tier)
//
// Customer assignment: public.ar_customer_detail.group_sub_1 → ar_group_sub
// When spend crosses a tier's amount, group_sub_1 is updated in ERP automatically.

export interface MemberTier {
  code: string;
  name: string;
  discountPct: number;
}

function parsePct(s: string | null): number {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export interface TierConfig {
  code: string;
  name: string;
  discountPct: number;
  rank: number;     // 0-based index by sub_no
  minSpend: number; // LAK, from ar_group_sub.amount (0 = base tier)
}

/** All active tiers from ar_group_sub ordered by sub_no. Cached per request. */
export const getTierConfig = cache(async (): Promise<TierConfig[]> => {
  const rows = await query<{
    code: string;
    name_1: string;
    discount: string | null;
    amount: string | null;
    discount_pct: string | null;
    min_spend: string | null;
  }>(
    `select g.code, g.name_1, g.discount, g.amount,
            o.discount_pct, o.min_spend
       from public.ar_group_sub g
       left join odg_ecom.tier_overrides o on o.tier_code = g.code
      where coalesce(g.status, 0) = 1
      order by g.sub_no`,
  );
  return rows.map((r, i) => ({
    code: r.code,
    name: r.name_1,
    discountPct: r.discount_pct != null ? Number(r.discount_pct) : parsePct(r.discount),
    rank: i,
    minSpend: r.min_spend != null ? Number(r.min_spend) : (r.amount ? Number(r.amount) : 0),
  }));
});

// ── Customer tier ─────────────────────────────────────────────────────────────

/** Customer's current tier from ar_customer_detail.group_sub_1 → ar_group_sub. */
export async function getCustomerTier(customerCode: string): Promise<MemberTier | null> {
  if (!customerCode) return null;
  const r = await queryOne<{
    code: string;
    name_1: string;
    discount: string | null;
    discount_pct: string | null;
  }>(
    `select g.code, g.name_1, g.discount, o.discount_pct
       from public.ar_customer_detail cd
       join public.ar_group_sub g on g.code = cd.group_sub_1
       left join odg_ecom.tier_overrides o on o.tier_code = g.code
      where cd.ar_code = $1
        and cd.group_sub_1 is not null and cd.group_sub_1 <> ''`,
    [customerCode],
  );
  if (!r) return null;
  return {
    code: r.code,
    name: r.name_1,
    discountPct: r.discount_pct != null ? Number(r.discount_pct) : parsePct(r.discount),
  };
}

export const MEMBER_DEFAULT_PCT = (() => {
  const n = parseFloat(process.env.MEMBER_DEFAULT_PCT ?? "3");
  return Number.isFinite(n) && n >= 0 ? n : 3;
})();

/** Discount % for a customer — tier discount or MEMBER_DEFAULT_PCT, whichever is higher. */
export async function getMemberDiscountPct(customerCode: string | null | undefined): Promise<number> {
  if (!customerCode) return 0;
  const tier = await getCustomerTier(customerCode);
  return Math.max(tier?.discountPct ?? 0, MEMBER_DEFAULT_PCT);
}

/** Discount % for the current logged-in customer (request-cached). */
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

// ── Auto-upgrade (spend-based, writes ERP) ────────────────────────────────────

async function writeErpTierUpgrade(customerCode: string, groupSubCode: string): Promise<void> {
  await query(
    `update public.ar_customer_detail set group_sub_1 = $1 where ar_code = $2`,
    [groupSubCode, customerCode],
  );
}

/** Compute effective tier by spend vs ar_group_sub.amount thresholds.
 *  Base tier (rank 0) = any login. Higher tiers earned by cumulative web spend.
 *  Never downgrades an ERP-assigned tier. Writes ERP on upgrade (fire-and-forget). */
export async function autoUpgradeTier(customerCode: string): Promise<TierCookieData | null> {
  if (!customerCode) return null;

  const tiers = await getTierConfig();
  if (tiers.length === 0) return null;

  const spendRow = await queryOne<{ total: string }>(
    `select coalesce(sum(total_amount_2) filter (where coalesce(is_cancel,0)=0),0)::text as total
       from public.ic_trans
      where doc_format_code = 'CAE'
        and remark_5 in ('web','odienmall')
        and trans_flag in (34,44)
        and cust_code = $1`,
    [customerCode],
  ).catch(() => null);
  const totalSpend = Number(spendRow?.total ?? "0");

  // Highest tier qualified by spend (base tier = everyone)
  let targetTier = tiers[0];
  for (const t of tiers) {
    if (totalSpend >= t.minSpend) targetTier = t;
  }

  // Never downgrade from ERP-assigned tier
  const currentErpTier = await getCustomerTier(customerCode);
  const currentErpRank = currentErpTier
    ? (tiers.find((t) => t.code === currentErpTier.code)?.rank ?? -1)
    : -1;

  if (currentErpRank > targetTier.rank) {
    targetTier = tiers.find((t) => t.code === currentErpTier!.code)!;
  } else if (targetTier.rank > currentErpRank) {
    writeErpTierUpgrade(customerCode, targetTier.code).catch(() => {});
  }

  const nextTier = tiers.find((t) => t.rank === targetTier.rank + 1) ?? null;
  const RANK_KEYS = ["gold", "platinum", "black"] as const;

  return {
    code: targetTier.code,
    key: RANK_KEYS[Math.min(targetTier.rank, 2)],
    name: targetTier.name,
    rank: targetTier.rank,
    discountPct: targetTier.discountPct,
    spend: totalSpend,
    nextSpend: nextTier?.minSpend ?? null,
    nextName: nextTier?.name ?? null,
    nextDiscountPct: nextTier?.discountPct ?? null,
  };
}
