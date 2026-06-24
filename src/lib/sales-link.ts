import "server-only";
import { query, queryOne } from "./db";

// Salesperson share-link (/s/<code>) engagement + conversion. Clicks live in the
// app-owned odg_ecom.sales_link_clicks; orders/revenue come from the salesperson's
// attributed CAE bills (public.ic_trans.sale_code) plus not-yet-materialised
// pending snapshots. READ-ONLY on the ERP.
const WEB_ORDER = `ic.doc_format_code = 'CAE' and ic.remark_5 in ('web','odienmall') and ic.trans_flag in (34, 44)`;

/** Log a click on a salesperson's link (best-effort; never throws). */
export async function recordSalesClick(saleCode: string, path: string): Promise<void> {
  try {
    await query(`insert into odg_ecom.sales_link_clicks (sale_code, path) values ($1, $2)`, [saleCode, path]);
  } catch {
    // analytics only — must not block the redirect
  }
}

export interface SalespersonStats {
  clicks30d: number;
  ordersAll: number;
  revenueAll: number;
  ordersMonth: number;
  revenueMonth: number;
  /** Standing monthly sales goal (LAK); 0 = not set. */
  monthlyTarget: number;
}

/** The current month as 'YYYY-MM'. */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** A salesperson's target for a month (defaults to the current month; 0 if unset). */
export async function getSalesTarget(saleCode: string, month?: string): Promise<number> {
  const code = (saleCode || "").trim();
  if (!code) return 0;
  const m = (month || "").trim() || currentMonth();
  const r = await queryOne<{ monthly_target: string }>(
    `select monthly_target from odg_ecom.sales_targets where sale_code = $1 and month = $2`,
    [code, m],
  );
  return Number(r?.monthly_target ?? 0);
}

/** Set (upsert) a salesperson's target for a specific month ('YYYY-MM'). */
export async function setSalesTarget(saleCode: string, month: string, amount: number, by?: string): Promise<void> {
  const code = (saleCode || "").trim();
  const m = (month || "").trim() || currentMonth();
  if (!code) return;
  const target = Math.max(0, Math.round(amount || 0));
  await query(
    `insert into odg_ecom.sales_targets (sale_code, month, monthly_target, updated_by, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (sale_code, month) do update set
        monthly_target = excluded.monthly_target, updated_by = excluded.updated_by, updated_at = now()`,
    [code, m, target, by ?? null],
  );
}

export interface SalesTargetRow {
  saleCode: string;
  saleName: string;
  monthlyTarget: number;
  revenueMonth: number;
  /** 0–100+ achievement %. */
  pct: number;
}

const DEFAULT_RATE_KEY = "__default__";

/** The global default commission rate (%). */
export async function getCommissionDefault(): Promise<number> {
  const r = await queryOne<{ pct: string }>(
    `select pct from odg_ecom.sales_commission_rates where sale_code = $1`,
    [DEFAULT_RATE_KEY],
  );
  return Number(r?.pct ?? 0);
}

/** Effective commission rate for a salesperson (their override, else default). */
export async function getCommissionRate(saleCode: string): Promise<number> {
  const code = (saleCode || "").trim();
  const rows = await query<{ sale_code: string; pct: string }>(
    `select sale_code, pct from odg_ecom.sales_commission_rates where sale_code = any($1)`,
    [[code, DEFAULT_RATE_KEY]],
  );
  const override = rows.find((x) => x.sale_code === code);
  const def = rows.find((x) => x.sale_code === DEFAULT_RATE_KEY);
  return Number((override ?? def)?.pct ?? 0);
}

/** Set a commission rate. Pass null/'' or '__default__' for the global default. */
export async function setCommissionRate(saleCode: string | null, pct: number, by?: string): Promise<void> {
  const code = (saleCode || "").trim() || DEFAULT_RATE_KEY;
  const rate = Math.max(0, Math.min(100, Number(pct) || 0));
  await query(
    `insert into odg_ecom.sales_commission_rates (sale_code, pct, updated_by, updated_at)
     values ($1, $2, $3, now())
     on conflict (sale_code) do update set pct = excluded.pct, updated_by = excluded.updated_by, updated_at = now()`,
    [code, rate, by ?? null],
  );
}

/** Remove a salesperson's commission override (reverts them to the default). */
export async function deleteCommissionRate(saleCode: string): Promise<void> {
  const code = (saleCode || "").trim();
  if (!code || code === DEFAULT_RATE_KEY) return;
  await query(`delete from odg_ecom.sales_commission_rates where sale_code = $1`, [code]);
}

export interface SalesCommissionRow {
  saleCode: string;
  saleName: string;
  rate: number;
  completedMonth: number;
  earnedMonth: number;
}

// Commission is earned on COMPLETED (delivered) orders — completion is driven by
// the logistics system (odg_tms_detail.sent_end).
const COMPLETED_PRED = `exists (select 1 from public.odg_tms_detail t where t.bill_no = ic.doc_no and t.sent_end is not null)`;

/**
 * Per-person commission OVERRIDES only (not every salesperson) — each with their
 * rate + this month's completed revenue + earned commission. Managers add these
 * one at a time; everyone else uses the default rate.
 */
export async function getCommissionOverrides(): Promise<SalesCommissionRow[]> {
  const [rows, rev] = await Promise.all([
    query<{ sale_code: string; pct: string; sale_name: string }>(
      `select r.sale_code, r.pct,
              coalesce(nullif(emp.fullname_lo,''), nullif(emp.fullname_en,''), r.sale_code) as sale_name
         from odg_ecom.sales_commission_rates r
         left join public.odg_employee emp on emp.employee_code = r.sale_code
        where r.sale_code <> $1`,
      [DEFAULT_RATE_KEY],
    ),
    query<{ sale_code: string; rev_month: string }>(
      `select ic.sale_code,
              coalesce(sum(ic.total_amount_2) filter (where date_trunc('month', ic.create_date_time_now) = date_trunc('month', now())),0)::text as rev_month
         from public.ic_trans ic
        where ${WEB_ORDER} and coalesce(ic.is_cancel,0)=0 and coalesce(ic.sale_code,'') <> '' and ${COMPLETED_PRED}
        group by ic.sale_code`,
    ),
  ]);
  const revMap = new Map(rev.map((r) => [r.sale_code, Number(r.rev_month)]));
  return rows
    .map((r) => {
      const rate = Number(r.pct);
      const completedMonth = revMap.get(r.sale_code) ?? 0;
      return {
        saleCode: r.sale_code,
        saleName: r.sale_name,
        rate,
        completedMonth,
        earnedMonth: Math.round((completedMonth * rate) / 100),
      };
    })
    .sort((a, b) => b.earnedMonth - a.earnedMonth);
}

export interface CommissionEarner {
  saleCode: string;
  saleName: string;
  rate: number;
  earnedAll: number;
  paid: number;
  outstanding: number;
}

/**
 * Salespeople who have EARNED commission (all-time completed revenue × effective
 * rate) with how much has been paid + what's outstanding. A report over earners
 * (not every salesperson). Drives the payout flow.
 */
export async function getCommissionEarners(): Promise<CommissionEarner[]> {
  const [rates, rev, paid] = await Promise.all([
    query<{ sale_code: string; pct: string }>(`select sale_code, pct from odg_ecom.sales_commission_rates`),
    query<{ sale_code: string; sale_name: string; rev: string }>(
      `select ic.sale_code,
              coalesce(nullif(emp.fullname_lo,''), nullif(emp.fullname_en,''), ic.sale_code) as sale_name,
              coalesce(sum(ic.total_amount_2),0)::text as rev
         from public.ic_trans ic
         left join public.odg_employee emp on emp.employee_code = ic.sale_code
        where ${WEB_ORDER} and coalesce(ic.is_cancel,0)=0 and coalesce(ic.sale_code,'') <> '' and ${COMPLETED_PRED}
        group by ic.sale_code, sale_name`,
    ),
    query<{ sale_code: string; paid: string }>(
      `select sale_code, coalesce(sum(amount),0)::text as paid from odg_ecom.sales_commission_payouts group by sale_code`,
    ),
  ]);
  const def = Number(rates.find((r) => r.sale_code === DEFAULT_RATE_KEY)?.pct ?? 0);
  const overrideMap = new Map(rates.filter((r) => r.sale_code !== DEFAULT_RATE_KEY).map((r) => [r.sale_code, Number(r.pct)]));
  const paidMap = new Map(paid.map((p) => [p.sale_code, Number(p.paid)]));

  return rev
    .map((r) => {
      const rate = overrideMap.get(r.sale_code) ?? def;
      const earnedAll = Math.round((Number(r.rev) * rate) / 100);
      const paidAmt = paidMap.get(r.sale_code) ?? 0;
      return {
        saleCode: r.sale_code,
        saleName: r.sale_name,
        rate,
        earnedAll,
        paid: paidAmt,
        outstanding: Math.max(0, earnedAll - paidAmt),
      };
    })
    .filter((e) => e.earnedAll > 0 || e.paid > 0)
    .sort((a, b) => b.outstanding - a.outstanding);
}

/** Record a commission payment to a salesperson. */
export async function recordCommissionPayout(saleCode: string, amount: number, by?: string, note?: string): Promise<void> {
  const code = (saleCode || "").trim();
  const amt = Math.round(amount || 0);
  if (!code || amt <= 0) return;
  await query(
    `insert into odg_ecom.sales_commission_payouts (sale_code, amount, note, paid_by) values ($1, $2, $3, $4)`,
    [code, amt, note ?? null, by ?? null],
  );
}

/** Payout history for a salesperson (newest first). */
export async function getCommissionPayouts(saleCode: string): Promise<{ id: number; amount: number; note: string | null; paidBy: string | null; createdAt: string }[]> {
  const code = (saleCode || "").trim();
  if (!code) return [];
  const rows = await query<{ id: number; amount: string; note: string | null; paid_by: string | null; created_at: Date }>(
    `select id, amount, note, paid_by, created_at from odg_ecom.sales_commission_payouts where sale_code = $1 order by created_at desc`,
    [code],
  );
  return rows.map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    note: r.note,
    paidBy: r.paid_by,
    createdAt: (r.created_at instanceof Date ? r.created_at : new Date(r.created_at)).toISOString(),
  }));
}

/** A salesperson's own commission earned this month (completed orders × rate). */
export async function getCommissionEarnedMonth(saleCode: string): Promise<{ rate: number; earned: number }> {
  const code = (saleCode || "").trim();
  if (!code) return { rate: 0, earned: 0 };
  const [rate, rev] = await Promise.all([
    getCommissionRate(code),
    queryOne<{ rev: string }>(
      `select coalesce(sum(ic.total_amount_2),0)::text as rev
         from public.ic_trans ic
        where ${WEB_ORDER} and coalesce(ic.is_cancel,0)=0 and ic.sale_code = $1 and ${COMPLETED_PRED}
          and date_trunc('month', ic.create_date_time_now) = date_trunc('month', now())`,
      [code],
    ),
  ]);
  return { rate, earned: Math.round((Number(rev?.rev ?? 0) * rate) / 100) };
}

/** Remove a salesperson's target for a month. */
export async function deleteSalesTarget(saleCode: string, month: string): Promise<void> {
  const code = (saleCode || "").trim();
  const m = (month || "").trim() || currentMonth();
  if (!code) return;
  await query(`delete from odg_ecom.sales_targets where sale_code = $1 and month = $2`, [code, m]);
}

/**
 * Salespeople who HAVE a target set FOR THE GIVEN MONTH, with that month's
 * attributed revenue (materialised + pending) + achievement %. Managers add
 * targets one at a time, per month.
 */
export async function getSalesTargets(month?: string): Promise<SalesTargetRow[]> {
  const m = (month || "").trim() || currentMonth();
  const monthStart = `${m}-01`;
  const [targets, icRev, pendRev] = await Promise.all([
    query<{ sale_code: string; monthly_target: string; sale_name: string }>(
      `select t.sale_code, t.monthly_target,
              coalesce(nullif(emp.fullname_lo,''), nullif(emp.fullname_en,''), t.sale_code) as sale_name
         from odg_ecom.sales_targets t
         left join public.odg_employee emp on emp.employee_code = t.sale_code
        where t.month = $1 and t.monthly_target > 0`,
      [m],
    ),
    query<{ sale_code: string; rev: string }>(
      `select ic.sale_code, coalesce(sum(ic.total_amount_2),0)::text as rev
         from public.ic_trans ic
        where ${WEB_ORDER} and coalesce(ic.is_cancel,0)=0 and coalesce(ic.sale_code,'') <> ''
          and date_trunc('month', ic.create_date_time_now) = date_trunc('month', $1::date)
        group by ic.sale_code`,
      [monthStart],
    ),
    query<{ sale_code: string; rev: string }>(
      `select op.sale_code, coalesce(sum(op.amount),0)::text as rev
         from odg_ecom.onepay_payments op
        where op.sml_doc_no is null and coalesce(op.sale_code,'') <> ''
          and date_trunc('month', op.created_at) = date_trunc('month', $1::date)
        group by op.sale_code`,
      [monthStart],
    ),
  ]);
  const revMap = new Map<string, number>();
  for (const r of icRev) revMap.set(r.sale_code, (revMap.get(r.sale_code) ?? 0) + Number(r.rev));
  for (const r of pendRev) revMap.set(r.sale_code, (revMap.get(r.sale_code) ?? 0) + Number(r.rev));

  return targets
    .map((t) => {
      const monthlyTarget = Number(t.monthly_target);
      const revenueMonth = revMap.get(t.sale_code) ?? 0;
      const pct = monthlyTarget > 0 ? Math.round((revenueMonth / monthlyTarget) * 100) : 0;
      return { saleCode: t.sale_code, saleName: t.sale_name, monthlyTarget, revenueMonth, pct };
    })
    .sort((a, b) => b.revenueMonth - a.revenueMonth);
}

export async function getSalespersonStats(saleCode: string): Promise<SalespersonStats> {
  const code = (saleCode || "").trim();
  const empty = { clicks30d: 0, ordersAll: 0, revenueAll: 0, ordersMonth: 0, revenueMonth: 0, monthlyTarget: 0 };
  if (!code) return empty;

  const [clicks, ic, pend, target] = await Promise.all([
    queryOne<{ n: number }>(
      `select count(*)::int as n from odg_ecom.sales_link_clicks
        where sale_code = $1 and created_at >= now() - interval '30 days'`,
      [code],
    ),
    // Materialised bills (exclude cancelled). Month = current calendar month.
    queryOne<{ orders_all: number; rev_all: string; orders_m: number; rev_m: string }>(
      `select count(*)::int as orders_all,
              coalesce(sum(ic.total_amount_2),0)::text as rev_all,
              count(*) filter (where date_trunc('month', ic.create_date_time_now) = date_trunc('month', now()))::int as orders_m,
              coalesce(sum(ic.total_amount_2) filter (where date_trunc('month', ic.create_date_time_now) = date_trunc('month', now())),0)::text as rev_m
         from public.ic_trans ic
        where ${WEB_ORDER} and coalesce(ic.is_cancel,0)=0 and ic.sale_code = $1`,
      [code],
    ),
    // Pending snapshots not yet written to SML (count + amount).
    queryOne<{ orders_all: number; rev_all: string; orders_m: number; rev_m: string }>(
      `select count(*)::int as orders_all,
              coalesce(sum(op.amount),0)::text as rev_all,
              count(*) filter (where date_trunc('month', op.created_at) = date_trunc('month', now()))::int as orders_m,
              coalesce(sum(op.amount) filter (where date_trunc('month', op.created_at) = date_trunc('month', now())),0)::text as rev_m
         from odg_ecom.onepay_payments op
        where op.sml_doc_no is null and op.sale_code = $1`,
      [code],
    ),
    getSalesTarget(code),
  ]);

  return {
    clicks30d: clicks?.n ?? 0,
    ordersAll: (ic?.orders_all ?? 0) + (pend?.orders_all ?? 0),
    revenueAll: Number(ic?.rev_all ?? 0) + Number(pend?.rev_all ?? 0),
    ordersMonth: (ic?.orders_m ?? 0) + (pend?.orders_m ?? 0),
    revenueMonth: Number(ic?.rev_m ?? 0) + Number(pend?.rev_m ?? 0),
    monthlyTarget: target,
  };
}
