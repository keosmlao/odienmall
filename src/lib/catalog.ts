import "server-only";
import { cache } from "react";
import { query, queryOne } from "./db";
import { HIDE_NO_PRICE } from "./config";
import { htmlToText } from "./format";
import { applyMemberPrice, currentMemberPct, MEMBER_DEFAULT_PCT } from "./member-tier";
import { applyFlashPrice } from "./flash";
import { currentAffiliateActive, getCommissionResolver } from "./affiliates";
import { getLocale } from "./i18n-server";
import { localeName } from "./i18n";
import type {
  Brand,
  Category,
  GroupMain,
  Product,
  ProductPage,
  ProductQuery,
  SortKey,
} from "./types";

/**
 * Display layer applied to every product list: localized name (Thai uses the
 * ERP name_eng_1 field) + flash-deal + member pricing. Locale read is wrapped so
 * a missing request context (e.g. build) silently falls back to the Lao name.
 */
async function priceProducts<T extends Product>(items: T[]): Promise<T[]> {
  let localized = items;
  try {
    const locale = await getLocale();
    if (locale !== "lo") {
      localized = items.map((p) => ({ ...p, name: localeName(p, locale) }));
    }
  } catch {
    // no request context — keep Lao names
  }
  const priced = await applyFlashPrice(await applyMemberPrice(localized));

  // Display badges: member discount % (any logged-in member) + affiliate
  // commission % / amount (only when the viewer is an active affiliate).
  try {
    // Every product advertises the member discount (baseline for guests; the
    // logged-in member's own rate if higher). memberPrice (struck price) is only
    // set for actual members by applyMemberPrice above.
    const memberPct = (await currentMemberPct()) || MEMBER_DEFAULT_PCT;
    const isAff = await currentAffiliateActive();
    const resolve = isAff ? await getCommissionResolver() : null;
    for (const p of priced) {
      if (p.price != null) p.memberPct = memberPct;
      if (resolve && p.price != null) {
        const pct = resolve(p.code, p.categoryCode, p.brandCode);
        if (pct > 0) {
          p.commissionPct = pct;
          p.commissionKip = Math.round((p.price * pct) / 100);
        }
      }
    }
  } catch {
    // no request context — skip badges
  }

  // Sold counts (Lazada-style "ຂາຍແລ້ວ X") — one batch query for the whole list.
  try {
    const sold = await getSoldCounts(priced.map((p) => p.code));
    for (const p of priced) p.soldCount = sold.get(p.code) ?? 0;
  } catch {
    // ignore — sold badge is optional
  }
  return priced;
}

// Storefront products are web-enabled ERP items restricted to the consumer
// product groups a manager has opened for the web (odg_ecom.web_groups; defaults
// 11–14). This excludes stray items in internal groups (e.g. 96/99). Out-of-stock
// items (balance_qty <= 0) are hidden everywhere too — they must not appear in
// listings, counts, the menu, the sitemap, or as reachable product pages.
// Centralised here so the rule lives in exactly one place; assumes the `i` alias
// on public.ic_inventory. Using a subquery keeps WEB_ITEM a static string while
// the enabled set stays editable from /admin/settings.
const PRODUCT_GROUPS = "(select group_main from odg_ecom.web_groups)";
// App-owned overlay can hide an item from the shop (odg_ecom.product_overlays). The
// subquery is correlated on the `i` alias, so this hides the item everywhere
// WEB_ITEM is used (listings, counts, facets, menu) with no extra join needed.
const NOT_HIDDEN = `not exists (select 1 from odg_ecom.product_overlays ov where ov.product_code = i.code and ov.is_hidden)`;
const WEB_ITEM = `i.is_eordershow = 1 and i.group_main in ${PRODUCT_GROUPS} and coalesce(i.balance_qty, 0) > 0 and ${NOT_HIDDEN}`;

// SQL predicate: the product has a real POS price in ic_inventory_barcode.
const HAS_PRICE_SQL =
  "exists (select 1 from public.ic_inventory_barcode b where b.ic_code = i.code and b.price > 0)";

// Correlated subquery for a product's resolved retail price (used in filters,
// matches the lateral used for display).
const PRICE_SUBQUERY =
  "(select min(b.price) from public.ic_inventory_barcode b where b.ic_code = i.code and b.price > 0)";

// ---------------------------------------------------------------------------
// The storefront reads ONLY these ERP tables, all in the `public` schema:
//   ic_inventory        - product master   (web items: is_eordershow = 1)
//   ic_category         - categories        (web: onweb = 1)
//   ic_brand            - brands            (web: onweb = 1)
//   ic_inventory_price  - retail price      (sale_type=0, price_type=2, LAK '01')
// Nothing is ever written.
// ---------------------------------------------------------------------------

// Resolves ONE retail price (+ unit) per product from the POS price table
// `ic_inventory_barcode.price` — verified to hold real selling prices in LAK
// (e.g. 25,990,000 ₭ for a fridge). We take the lowest positive price, i.e. the
// smallest sellable unit (a single piece), which is what a retail shopper buys.
// Items without a POS price (~72/202) get a null price and the UI shows
// "ສອບຖາມລາຄາ" (contact for price) rather than the misleading wholesale-tier value
// in ic_inventory_price.
const PRICE_LATERAL = `
  left join lateral (
    select b.price, b.unit_code
    from public.ic_inventory_barcode b
    where b.ic_code = i.code and b.price > 0
    order by b.price asc
    limit 1
  ) pr on true`;

const PRODUCT_SELECT = `
  select
    i.code,
    coalesce(nullif(i.name_1,''), nullif(i.name_2,''), nullif(i.name_eng_1,''), i.code) as name,
    nullif(i.name_eng_1,'') as "nameThai",
    coalesce(nullif(ov.description,''), nullif(i.description,'')) as description,
    i.item_category as "categoryCode",
    nullif(c.name_1,'') as "categoryName",
    i.item_brand as "brandCode",
    nullif(b.name_1,'') as "brandName",
    coalesce(i.balance_qty, 0)::float8 as stock,
    (i.is_new_item = 1)  as "isNew",
    (i.item_promote = 1) as "isPromo",
    pr.price::float8 as price,
    nullif(pr.unit_code,'') as unit,
    rt.rating::float8 as rating,
    coalesce(rt.review_count, 0)::int as "reviewCount",
    coalesce(nullif(img.url,''), nullif(ov.image_url,'')) as "imageUrl",
    coalesce(ov.is_featured, false) as "isFeatured"
  from public.ic_inventory i
  left join public.ic_category c on c.code = i.item_category
  left join public.ic_brand b on b.code = i.item_brand
  left join odg_ecom.product_overlays ov on ov.product_code = i.code
  left join lateral (
    select pi.url from odg_ecom.product_images pi
     where pi.product_code = i.code
     order by pi.sort_order, pi.id limit 1
  ) img on true
  ${PRICE_LATERAL}
  left join lateral (
    select avg(rv.rating)::numeric(3,2) as rating, count(*)::int as review_count
    from odg_ecom.reviews rv where rv.product_code = i.code and not rv.is_hidden
  ) rt on true`;

const ORDER_BY: Record<SortKey, string> = {
  newest: "i.is_new_item desc nulls last, i.code desc",
  price_asc: "pr.price asc nulls last, i.code",
  price_desc: "pr.price desc nulls last, i.code",
  name: 'name asc',
  rating: "rt.rating desc nulls last, rt.review_count desc, i.code",
};

// ---------------------------------------------------------------------------
// Categories & brands
// ---------------------------------------------------------------------------

export async function getWebCategories(limit?: number): Promise<Category[]> {
  return query<Category>(
    `select c.code,
            coalesce(nullif(c.name_1,''), c.code) as name,
            nullif(c.name_2,'') as "nameAlt",
            count(i.code)::int as "productCount"
       from public.ic_category c
       join public.ic_inventory i on i.item_category = c.code and ${WEB_ITEM}
      where c.onweb = 1
      group by c.code, c.name_1, c.name_2
      having count(i.code) > 0
      order by count(i.code) desc, c.name_1
      ${limit ? "limit $1" : ""}`,
    limit ? [limit] : [],
  );
}

export async function getCategory(code: string): Promise<Category | null> {
  return queryOne<Category>(
    `select c.code,
            coalesce(nullif(c.name_1,''), c.code) as name,
            nullif(c.name_2,'') as "nameAlt",
            count(i.code) filter (where ${WEB_ITEM})::int as "productCount"
       from public.ic_category c
       left join public.ic_inventory i on i.item_category = c.code
      where c.code = $1
      group by c.code, c.name_1, c.name_2`,
    [code],
  );
}

export async function getWebBrands(limit?: number): Promise<Brand[]> {
  return query<Brand>(
    `select b.code,
            coalesce(nullif(b.name_1,''), b.code) as name,
            coalesce(nullif(bo.logo_url,''),nullif(b.url_logo,'')) as logo,
            count(i.code)::int as "productCount"
       from public.ic_brand b
       join public.ic_inventory i on i.item_brand = b.code and ${WEB_ITEM}
       left join odg_ecom.brand_overlays bo on bo.brand_code=b.code
      where b.onweb = 1
      group by b.code, b.name_1, b.url_logo, bo.logo_url
      having count(i.code) > 0
      order by count(i.code) desc, b.name_1
      ${limit ? "limit $1" : ""}`,
    limit ? [limit] : [],
  );
}

/** Brands present among the web products of a given category (filter facet). */
export async function getCategoryBrands(categoryCode: string): Promise<Brand[]> {
  return query<Brand>(
    `select i.item_brand as code,
            coalesce(nullif(b.name_1,''), i.item_brand) as name,
            coalesce(nullif(bo.logo_url,''),nullif(b.url_logo,'')) as logo,
            count(*)::int as "productCount"
       from public.ic_inventory i
       left join public.ic_brand b on b.code = i.item_brand
       left join odg_ecom.brand_overlays bo on bo.brand_code=i.item_brand
      where ${WEB_ITEM} and i.item_category = $1
        and coalesce(nullif(i.item_brand,''), '') <> ''
      group by i.item_brand, b.name_1, b.url_logo, bo.logo_url
      order by count(*) desc, name
      limit 30`,
    [categoryCode],
  );
}

/** Item-categories present among the web products of a group_main or group_sub
 *  (filter facet). Mirrors getGroupBrands but groups by `item_category`. */
export async function getGroupCategories(opts: {
  groupMain?: string;
  groupSub?: string;
}): Promise<Category[]> {
  const conds = [WEB_ITEM, "coalesce(nullif(i.item_category,''), '') <> ''"];
  const params: unknown[] = [];
  if (opts.groupSub) {
    params.push(opts.groupSub);
    conds.push(`i.group_sub = $${params.length}`);
  } else if (opts.groupMain) {
    params.push(opts.groupMain);
    conds.push(`i.group_main = $${params.length}`);
  }
  return query<Category>(
    `select i.item_category as code,
            coalesce(nullif(c.name_1,''), i.item_category) as name,
            nullif(c.name_2,'') as "nameAlt",
            count(*)::int as "productCount"
       from public.ic_inventory i
       left join public.ic_category c on c.code = i.item_category
      where ${conds.join(" and ")}
      group by i.item_category, c.name_1, c.name_2
      order by count(*) desc, name
      limit 30`,
    params,
  );
}

export async function getBrand(code: string): Promise<Brand | null> {
  return queryOne<Brand>(
    `select b.code,
            coalesce(nullif(b.name_1,''), b.code) as name,
            coalesce(nullif(bo.logo_url,''),nullif(b.url_logo,'')) as logo,
            count(i.code) filter (where ${WEB_ITEM})::int as "productCount"
       from public.ic_brand b
       left join public.ic_inventory i on i.item_brand = b.code
       left join odg_ecom.brand_overlays bo on bo.brand_code=b.code
      where b.code = $1
      group by b.code, b.name_1, b.url_logo, bo.logo_url`,
    [code],
  );
}

// ---------------------------------------------------------------------------
// Product groups  (group_main → group_sub — the primary storefront menu)
// ---------------------------------------------------------------------------

/**
 * The full group menu: each web product group_main (11–14) with its group_subs.
 * Only groups/subs that actually contain web products are returned, each with a
 * product count. Names come from ic_group / ic_group_sub (name_1, Lao).
 */
// Wrapped in React `cache()`: the storefront nav (GroupMenu, in the shop
// layout) and the products-page group filter both call this in the same render,
// so per-request memoisation collapses them to a single DB round-trip.
export const getGroupMenu = cache(async (): Promise<GroupMain[]> => {
  const rows = await query<{
    mainCode: string;
    mainName: string;
    subCode: string | null;
    subName: string | null;
    n: number;
  }>(
    `select i.group_main as "mainCode",
            coalesce(nullif(gm.name_1,''), i.group_main) as "mainName",
            nullif(i.group_sub,'') as "subCode",
            nullif(gs.name_1,'')   as "subName",
            count(*)::int as n
       from public.ic_inventory i
       left join public.ic_group     gm on gm.code = i.group_main
       left join public.ic_group_sub gs on gs.code = i.group_sub
      where ${WEB_ITEM}
      group by i.group_main, gm.name_1, i.group_sub, gs.name_1
      order by i.group_main, i.group_sub`,
  );

  const mains = new Map<string, GroupMain>();
  for (const r of rows) {
    let m = mains.get(r.mainCode);
    if (!m) {
      m = { code: r.mainCode, name: r.mainName, productCount: 0, subs: [] };
      mains.set(r.mainCode, m);
    }
    m.productCount += r.n;
    if (r.subCode) {
      m.subs.push({ code: r.subCode, name: r.subName ?? r.subCode, productCount: r.n });
    }
  }
  return [...mains.values()];
});

/** One group_main with its sub-groups (web products only), or null. */
export async function getGroupMain(code: string): Promise<GroupMain | null> {
  const menu = await getGroupMenu();
  return menu.find((m) => m.code === code) ?? null;
}

/** One group_sub plus its parent group_main (for breadcrumbs / titles). */
export async function getGroupSub(code: string): Promise<{
  code: string;
  name: string;
  mainCode: string;
  mainName: string;
} | null> {
  return queryOne(
    `select gs.code,
            coalesce(nullif(gs.name_1,''), gs.code) as name,
            gs.main_group as "mainCode",
            coalesce(nullif(gm.name_1,''), gs.main_group) as "mainName"
       from public.ic_group_sub gs
       left join public.ic_group gm on gm.code = gs.main_group
      where gs.code = $1
      limit 1`,
    [code],
  );
}

/** Brands present among the web products of a group_main or group_sub (facet). */
export async function getGroupBrands(opts: {
  groupMain?: string;
  groupSub?: string;
}): Promise<Brand[]> {
  const conds = [WEB_ITEM, "coalesce(nullif(i.item_brand,''), '') <> ''"];
  const params: unknown[] = [];
  if (opts.groupSub) {
    params.push(opts.groupSub);
    conds.push(`i.group_sub = $${params.length}`);
  } else if (opts.groupMain) {
    params.push(opts.groupMain);
    conds.push(`i.group_main = $${params.length}`);
  }
  return query<Brand>(
    `select i.item_brand as code,
            coalesce(nullif(b.name_1,''), i.item_brand) as name,
            coalesce(nullif(bo.logo_url,''),nullif(b.url_logo,'')) as logo,
            count(*)::int as "productCount"
       from public.ic_inventory i
       left join public.ic_brand b on b.code = i.item_brand
       left join odg_ecom.brand_overlays bo on bo.brand_code=i.item_brand
      where ${conds.join(" and ")}
      group by i.item_brand, b.name_1, b.url_logo, bo.logo_url
      order by count(*) desc, name
      limit 30`,
    params,
  );
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

function buildFilters(q: ProductQuery): { clause: string; params: unknown[] } {
  const conds: string[] = [WEB_ITEM];
  const params: unknown[] = [];
  if (HIDE_NO_PRICE) conds.push(HAS_PRICE_SQL);
  if (q.categoryCode) {
    params.push(q.categoryCode);
    conds.push(`i.item_category = $${params.length}`);
  }
  if (q.groupMain) {
    params.push(q.groupMain);
    conds.push(`i.group_main = $${params.length}`);
  }
  if (q.groupSub) {
    params.push(q.groupSub);
    conds.push(`i.group_sub = $${params.length}`);
  }
  if (q.brandCode) {
    params.push(q.brandCode);
    conds.push(`i.item_brand = $${params.length}`);
  }
  if (q.search && q.search.trim()) {
    params.push(`%${q.search.trim()}%`);
    const p = `$${params.length}`;
    conds.push(
      `(i.name_1 ilike ${p} or i.name_2 ilike ${p} or i.name_eng_1 ilike ${p} or i.code ilike ${p})`,
    );
  }
  if (q.inStock) conds.push("coalesce(i.balance_qty,0) > 0");
  if (q.priceMin != null) {
    params.push(q.priceMin);
    conds.push(`${PRICE_SUBQUERY} >= $${params.length}`);
  }
  if (q.priceMax != null) {
    params.push(q.priceMax);
    conds.push(`${PRICE_SUBQUERY} <= $${params.length}`);
  }
  return { clause: conds.join(" and "), params };
}

export async function getProducts(q: ProductQuery): Promise<ProductPage> {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, q.pageSize ?? 24));
  const sort: SortKey = q.sort ?? "newest";
  const { clause, params } = buildFilters(q);

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  // Count + page are two independent round-trips to the remote ERP — fire them
  // together so their latency overlaps instead of stacking. The count needs no
  // joins; filters only touch ic_inventory columns.
  const [countRow, items] = await Promise.all([
    queryOne<{ total: number }>(
      `select count(*)::int as total from public.ic_inventory i where ${clause}`,
      params,
    ),
    query<Product>(
      `${PRODUCT_SELECT}
        where ${clause}
        order by ${ORDER_BY[sort]}
        limit $${limitIdx} offset $${offsetIdx}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ]);
  const total = countRow?.total ?? 0;

  return {
    items: await priceProducts(items),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Lightweight list of all web product codes — for the sitemap. */
export async function getAllWebProductCodes(): Promise<string[]> {
  const rows = await query<{ code: string }>(
    `select code from public.ic_inventory i
      where is_eordershow = 1 and group_main in ${PRODUCT_GROUPS}
        and coalesce(balance_qty, 0) > 0
        and ${NOT_HIDDEN}
      order by code`,
  );
  return rows.map((r) => r.code);
}

export async function getProductByCode(code: string): Promise<Product | null> {
  const product = await queryOne<Product>(
    `${PRODUCT_SELECT} where i.code = $1 and ${WEB_ITEM} limit 1`,
    [code],
  );
  if (product) {
    product.description = htmlToText(product.description);
    await priceProducts([product]);
  }
  return product;
}

/** Ordered gallery image URLs for a product (odg_ecom.product_images), or []. */
export async function getProductImageList(code: string): Promise<string[]> {
  const rows = await query<{ url: string }>(
    `select url from odg_ecom.product_images
      where product_code = $1 order by sort_order, id`,
    [code],
  );
  return rows.map((r) => r.url);
}

export async function getNewProducts(limit = 12): Promise<Product[]> {
  return priceProducts(await query<Product>(
    `${PRODUCT_SELECT}
      where ${WEB_ITEM} and i.is_new_item = 1
      order by i.code desc
      limit $1`,
    [limit],
  ));
}

export async function getPromoProducts(limit = 12): Promise<Product[]> {
  return priceProducts(await query<Product>(
    `${PRODUCT_SELECT}
      where ${WEB_ITEM} and i.item_promote = 1
      order by i.code desc
      limit $1`,
    [limit],
  ));
}

/** Newest in-stock products, used as a homepage fallback / "all products" rail. */
export async function getFeaturedProducts(limit = 12): Promise<Product[]> {
  // Admin-picked overlay "featured" items float to the top; the rail is then
  // filled with newest items so it is never empty even before any are picked.
  return priceProducts(await query<Product>(
    `${PRODUCT_SELECT}
      where ${WEB_ITEM} and coalesce(i.balance_qty,0) > 0
        ${HIDE_NO_PRICE ? `and ${HAS_PRICE_SQL}` : ""}
      order by coalesce(ov.is_featured, false) desc, i.is_new_item desc nulls last, i.code desc
      limit $1`,
    [limit],
  ));
}

export async function getRelatedProducts(
  categoryCode: string | null,
  excludeCode: string,
  limit = 6,
): Promise<Product[]> {
  if (!categoryCode) return [];
  return priceProducts(await query<Product>(
    `${PRODUCT_SELECT}
      where ${WEB_ITEM} and i.item_category = $1 and i.code <> $2
      order by i.code desc
      limit $3`,
    [categoryCode, excludeCode, limit],
  ));
}

/**
 * "Frequently bought together" — products that appear in the SAME ERP sales
 * orders as the given item, ranked by co-occurrence. Reads the real purchase
 * history (public.ic_trans_detail, READ-ONLY); the source-order scan is capped
 * (`limit 400`) to bound latency on high-volume SKUs. Only web-eligible,
 * in-stock, non-hidden items surface, and the price/flash/member layer applies.
 */
export async function getFrequentlyBought(
  productCode: string,
  limit = 6,
): Promise<Product[]> {
  if (!productCode) return [];
  return priceProducts(await query<Product>(
    `with src as (
       select doc_no from public.ic_trans_detail
        where item_code = $1
        limit 400
     ),
     co as (
       select d.item_code as code, count(*)::int as cnt
         from public.ic_trans_detail d
         join src on src.doc_no = d.doc_no
        where d.item_code <> $1
        group by d.item_code
     )
     ${PRODUCT_SELECT}
       join co on co.code = i.code
      where ${WEB_ITEM}
      order by co.cnt desc, i.code
      limit $2`,
    [productCode, limit],
  ));
}

/**
 * Total units sold of a product, for "ຂາຍແລ້ວ X" social proof. Counts qty on
 * real cash-sale bills (ic_trans flag 44, same doc type our web orders become),
 * excluding cancelled. READ-ONLY; ~30–150ms with the item_code index.
 */
/** Batch sold-counts for a set of product codes (one query). For card badges. */
async function getSoldCounts(codes: string[]): Promise<Map<string, number>> {
  const list = codes.filter(Boolean);
  if (list.length === 0) return new Map();
  const rows = await query<{ code: string; sold: string }>(
    `select d.item_code as code, coalesce(sum(d.qty),0)::text as sold
       from public.ic_trans_detail d
       join public.ic_trans t
         on t.doc_no = d.doc_no and t.trans_flag = 44 and coalesce(t.is_cancel,0) = 0
      where d.item_code = any($1)
      group by d.item_code`,
    [list],
  );
  return new Map(rows.map((r) => [r.code, Math.max(0, Math.round(Number(r.sold)))]));
}

export async function getSoldCount(productCode: string): Promise<number> {
  if (!productCode) return 0;
  const row = await queryOne<{ sold: number }>(
    `select coalesce(sum(d.qty),0)::float8 as sold
       from public.ic_trans_detail d
       join public.ic_trans t
         on t.doc_no = d.doc_no and t.trans_flag = 44 and coalesce(t.is_cancel,0) = 0
      where d.item_code = $1`,
    [productCode],
  );
  return Math.max(0, Math.round(row?.sold ?? 0));
}

/**
 * Cross-sell for a basket: co-purchase recommendations for a set of cart item
 * codes, excluding anything already in the basket. Used on the cart page.
 */
export async function getFrequentlyBoughtForCart(
  cartCodes: string[],
  limit = 6,
): Promise<Product[]> {
  const codes = cartCodes.filter(Boolean);
  if (codes.length === 0) return [];
  return priceProducts(await query<Product>(
    `with src as (
       select doc_no from public.ic_trans_detail
        where item_code = any($1)
        limit 600
     ),
     co as (
       select d.item_code as code, count(*)::int as cnt
         from public.ic_trans_detail d
         join src on src.doc_no = d.doc_no
        where not (d.item_code = any($1))
        group by d.item_code
     )
     ${PRODUCT_SELECT}
       join co on co.code = i.code
      where ${WEB_ITEM}
      order by co.cnt desc, i.code
      limit $2`,
    [codes, limit],
  ));
}
