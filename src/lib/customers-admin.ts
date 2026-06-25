import "server-only";
import { query, queryOne } from "./db";

// Admin customer list. Source: public.ar_customer where reg_group='member'
// (all web members). Order stats left-joined from ic_trans (CAE web orders).
// Tier from ar_customer_detail.group_sub_1 → ar_group_sub (READ-ONLY).

const WEB_ORDER_COND = `ict.doc_format_code = 'CAE' and ict.remark_5 in ('web','odienmall') and ict.trans_flag in (34, 44)`;

export interface AdminCustomerRow {
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  tierCode: string | null;
  tierName: string | null;
  tierDiscount: string | null;
}

export interface AdminCustomerPage {
  items: AdminCustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Paginated, searchable list of web members (reg_group='member') with spend totals. */
export async function getAdminCustomers(opts: {
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<AdminCustomerPage> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 30));

  const conds: string[] = ["ac.reg_group = 'member'"];
  const params: unknown[] = [];

  const s = opts.search?.trim();
  if (s) {
    params.push(`%${s}%`);
    const p = `$${params.length}`;
    conds.push(`(ac.code ilike ${p} or ac.name_1 ilike ${p} or coalesce(ac.telephone,'') ilike ${p} or coalesce(ac.sms_phonenumber,'') ilike ${p})`);
  }
  const where = `where ${conds.join(" and ")}`;

  const totalRow = await queryOne<{ n: number }>(
    `select count(*)::int as n from public.ar_customer ac ${where}`,
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
    tierCode: string | null;
    tierName: string | null;
    tierDiscount: string | null;
  }>(
    `select ac.code,
            coalesce(nullif(ac.name_1,''), ac.code) as name,
            coalesce(nullif(ac.telephone,''), nullif(ac.sms_phonenumber,'')) as phone,
            nullif(ac.email,'') as email,
            count(ict.doc_no)::int as "orderCount",
            coalesce(sum(ict.total_amount_2) filter (where coalesce(ict.is_cancel,0)=0), 0)::float8 as "totalSpent",
            max(ict.create_date_time_now) as "lastOrderAt",
            nullif(cd.group_sub_1,'') as "tierCode",
            nullif(g.name_1,'') as "tierName",
            nullif(g.discount,'') as "tierDiscount"
       from public.ar_customer ac
       left join public.ar_customer_detail cd on cd.ar_code = ac.code
       left join public.ar_group_sub g on g.code = cd.group_sub_1
       left join public.ic_trans ict on ict.cust_code = ac.code and ${WEB_ORDER_COND}
       ${where}
      group by ac.code, ac.name_1, ac.telephone, ac.sms_phonenumber, ac.email, cd.group_sub_1, g.name_1, g.discount
      order by max(ict.create_date_time_now) desc nulls last, ac.code
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
      tierCode: r.tierCode,
      tierName: r.tierName,
      tierDiscount: r.tierDiscount,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
