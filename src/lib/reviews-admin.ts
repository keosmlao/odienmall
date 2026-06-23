import "server-only";
import { query, queryOne } from "./db";

// ---------------------------------------------------------------------------
// Admin review moderation. Reviews are app-owned (ecom.reviews); staff can hide
// (reversible) or delete them. Hidden reviews drop out of the storefront rating
// aggregate and the product review list (see catalog.ts / reviews.ts).
// The product NAME is resolved from the READ-ONLY ERP for display only.
// ---------------------------------------------------------------------------

export interface AdminReviewRow {
  id: string;
  productCode: string;
  productName: string;
  customerName: string;
  customerCode: string;
  rating: number;
  comment: string | null;
  isHidden: boolean;
  createdAt: string;
}

export interface AdminReviewPage {
  items: AdminReviewRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Paginated, filterable review list with the ERP product name joined in. */
export async function getAdminReviews(opts: {
  search?: string;
  rating?: number;
  /** "hidden" → only hidden, "visible" → only visible, else all. */
  visibility?: "hidden" | "visible";
  page?: number;
  pageSize?: number;
} = {}): Promise<AdminReviewPage> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 30));
  const conds: string[] = [];
  const params: unknown[] = [];

  const s = opts.search?.trim();
  if (s) {
    params.push(`%${s}%`);
    const p = `$${params.length}`;
    conds.push(`(r.product_code ilike ${p} or r.customer_name ilike ${p} or r.comment ilike ${p})`);
  }
  if (opts.rating && opts.rating >= 1 && opts.rating <= 5) {
    params.push(opts.rating);
    conds.push(`r.rating = $${params.length}`);
  }
  if (opts.visibility === "hidden") conds.push("r.is_hidden");
  else if (opts.visibility === "visible") conds.push("not r.is_hidden");

  const where = conds.length ? `where ${conds.join(" and ")}` : "";

  const totalRow = await queryOne<{ n: number }>(
    `select count(*)::int as n from ecom.reviews r ${where}`,
    params,
  );
  const total = totalRow?.n ?? 0;

  params.push(pageSize, (page - 1) * pageSize);
  const items = await query<AdminReviewRow>(
    `select r.id,
            r.product_code as "productCode",
            coalesce(nullif(i.name_1,''), nullif(i.name_2,''), nullif(i.name_eng_1,''), r.product_code) as "productName",
            r.customer_name as "customerName",
            r.customer_code as "customerCode",
            r.rating,
            nullif(r.comment,'') as comment,
            r.is_hidden as "isHidden",
            r.created_at as "createdAt"
       from ecom.reviews r
       left join public.ic_inventory i on i.code = r.product_code
       ${where}
      order by r.created_at desc
      limit $${params.length - 1} offset $${params.length}`,
    params,
  );

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export interface AdminReviewStats {
  total: number;
  hidden: number;
  avg: number;
}

/** Counts for the dashboard cards (avg over visible reviews). */
export async function getAdminReviewStats(): Promise<AdminReviewStats> {
  const row = await queryOne<{ total: number; hidden: number; avg: string }>(
    `select count(*)::int as total,
            count(*) filter (where is_hidden)::int as hidden,
            coalesce(round(avg(rating) filter (where not is_hidden), 2), 0)::text as avg
       from ecom.reviews`,
  );
  return { total: row?.total ?? 0, hidden: row?.hidden ?? 0, avg: Number(row?.avg ?? 0) };
}

/** Hide or show a review. Returns the affected product_code (for revalidation). */
export async function setReviewHidden(id: string, hidden: boolean): Promise<string | null> {
  const row = await queryOne<{ product_code: string }>(
    `update ecom.reviews set is_hidden = $2 where id = $1 returning product_code`,
    [id, hidden],
  );
  return row?.product_code ?? null;
}

/** Permanently delete a review. Returns the affected product_code, or null. */
export async function deleteReview(id: string): Promise<string | null> {
  const row = await queryOne<{ product_code: string }>(
    `delete from ecom.reviews where id = $1 returning product_code`,
    [id],
  );
  return row?.product_code ?? null;
}
