import "server-only";
import { query } from "./db";

// Reviews live in the isolated `ecom` schema (writable app data, not the ERP).

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  mine?: boolean;
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** count of each star 1..5 */
  distribution: Record<number, number>;
  reviews: Review[];
}

export async function getProductReviews(
  productCode: string,
  viewerCode?: string | null,
): Promise<ReviewSummary> {
  const rows = await query<{
    id: string;
    customer_code: string;
    customer_name: string;
    rating: number;
    comment: string | null;
    created_at: Date;
  }>(
    `select id, customer_code, customer_name, rating, comment, created_at
       from ecom.reviews where product_code = $1 and not is_hidden
      order by created_at desc
      limit 100`,
    [productCode],
  );

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of rows) {
    distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
    sum += r.rating;
  }
  const count = rows.length;

  return {
    average: count ? sum / count : 0,
    count,
    distribution,
    reviews: rows.map((r) => ({
      id: r.id,
      customerName: r.customer_name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at.toISOString(),
      mine: viewerCode != null && r.customer_code === viewerCode,
    })),
  };
}

/** Upsert a review (one per customer per product). */
export async function createReview(input: {
  productCode: string;
  customerCode: string;
  customerName: string;
  rating: number;
  comment?: string | null;
}): Promise<void> {
  await query(
    `insert into ecom.reviews (product_code, customer_code, customer_name, rating, comment)
       values ($1,$2,$3,$4,$5)
     on conflict (product_code, customer_code)
       do update set rating = excluded.rating,
                     comment = excluded.comment,
                     customer_name = excluded.customer_name,
                     created_at = now()`,
    [
      input.productCode,
      input.customerCode,
      input.customerName,
      input.rating,
      input.comment?.trim() || null,
    ],
  );
}

/**
 * Of the given product codes, which has this customer already reviewed? Used by
 * the post-delivery "rate your purchase" prompt to show ✓ on done items.
 */
export async function getReviewedCodes(
  customerCode: string,
  productCodes: string[],
): Promise<Set<string>> {
  const codes = productCodes.filter(Boolean);
  if (!customerCode || codes.length === 0) return new Set();
  const rows = await query<{ product_code: string }>(
    `select product_code from ecom.reviews
      where customer_code = $1 and product_code = any($2)`,
    [customerCode, codes],
  );
  return new Set(rows.map((r) => r.product_code));
}
