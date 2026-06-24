import "server-only";
import { query, queryOne } from "./db";

// ---------------------------------------------------------------------------
// Admin customer view. The "customers" here are storefront shoppers who placed
// at least one CAE web order (public.ic_trans). Profile fields are read from the
// READ-ONLY ERP ar_customer; order aggregates from ic_trans. Guest orders (the
// walk-in cust_code) are excluded.
// ---------------------------------------------------------------------------

const WALKIN = process.env.SML_WALKIN_CUST?.trim() || "";
const WEB_ORDER = `ic.doc_format_code = 'CAE' and ic.remark_5 in ('web','odienmall') and ic.trans_flag in (34, 44)`;

export interface AdminCustomerRow {
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

export interface AdminCustomerPage {
  items: AdminCustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Paginated, searchable list of customers who have ordered, with spend totals. */
export async function getAdminCustomers(opts: {
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<AdminCustomerPage> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 30));
  const conds = [WEB_ORDER, "ic.cust_code is not null"];
  const params: unknown[] = [];
  if (WALKIN) {
    params.push(WALKIN);
    conds.push(`ic.cust_code <> $${params.length}`);
  }

  const s = opts.search?.trim();
  if (s) {
    params.push(`%${s}%`);
    const p = `$${params.length}`;
    conds.push(`(ic.cust_code ilike ${p} or coalesce(ic.remark_3,'') ilike ${p} or coalesce(ic.point_telephone,'') ilike ${p} or ac.name_1 ilike ${p})`);
  }
  const where = `where ${conds.join(" and ")}`;

  const totalRow = await queryOne<{ n: number }>(
    `select count(distinct ic.cust_code)::int as n
       from public.ic_trans ic
       left join public.ar_customer ac on ac.code = ic.cust_code ${where}`,
    params,
  );
  const total = totalRow?.n ?? 0;

  params.push(pageSize, (page - 1) * pageSize);
  const rows = await query<{
    code: string;
    name: string;
    phone: string | null;
    email: string | null;
    orderCount: number;
    totalSpent: number;
    lastOrderAt: Date | null;
  }>(
    `select ic.cust_code as code,
            coalesce(nullif(max(ac.name_1),''), nullif(max(ic.remark_3),''), ic.cust_code) as name,
            coalesce(nullif(max(ac.telephone),''), nullif(max(ic.point_telephone),'')) as phone,
            nullif(max(ac.email),'') as email,
            count(*)::int as "orderCount",
            coalesce(sum(ic.total_amount_2) filter (where coalesce(ic.is_cancel,0)=0), 0)::float8 as "totalSpent",
            max(ic.create_date_time_now) as "lastOrderAt"
       from public.ic_trans ic
       left join public.ar_customer ac on ac.code = ic.cust_code
       ${where}
      group by ic.cust_code
      order by max(ic.create_date_time_now) desc
      limit $${params.length - 1} offset $${params.length}`,
    params,
  );

  return {
    items: rows.map((r) => ({
      code: r.code,
      name: r.name,
      phone: r.phone,
      email: r.email,
      orderCount: r.orderCount,
      totalSpent: r.totalSpent,
      lastOrderAt: r.lastOrderAt ? r.lastOrderAt.toISOString() : null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// ---------------------------------------------------------------------------
// SML-sourced customer insights (READ-ONLY): loyalty point balance + the full
// purchase history from the ERP (all cash-sale bills, ic_trans flag 44), not
// just web orders. See src/lib/sml-history.ts (shared with the customer-facing
// /account page).
// ---------------------------------------------------------------------------
