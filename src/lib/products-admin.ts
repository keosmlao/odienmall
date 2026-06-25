import "server-only";
import { query, queryOne } from "./db";

// ---------------------------------------------------------------------------
// Admin product management.
//
// The ERP product master (public.ic_inventory) is READ-ONLY — we never write to
// it. Staff manage an app-owned overlay (odg_ecom.product_overlays) layered on top:
// an image, a hide flag, and a featured flag. The read path in catalog.ts joins
// this overlay so the storefront reflects the edits.
//
// The admin LIST deliberately does NOT use catalog.ts/WEB_ITEM: it must show
// every web-eligible item — including out-of-stock and currently-hidden ones —
// so staff can manage them. Same base universe as the shop minus those filters.
// ---------------------------------------------------------------------------

// Admin sees all inventory items (no is_eordershow restriction).
const ADMIN_WEB = `1=1`;

/** A web item is "low stock" when it still has stock but ≤ this many units. */
export const LOW_STOCK_MAX = 5;

const PRICE_SUBQUERY =
  "(select min(b.price) from public.ic_inventory_barcode b where b.ic_code = i.code and b.price > 0)";

export interface AdminProductRow {
  code: string;
  name: string;
  brandName: string | null;
  categoryName: string | null;
  price: number | null;
  stock: number;
  isNew: boolean;
  isPromo: boolean;
  imageUrl: string | null;
  isHidden: boolean;
  isFeatured: boolean;
  description: string | null;
  shortDescription: string | null;
  erpDescription: string | null;
  updatedAt: string | null;
}

const ROW_SELECT = `
  select
    i.code,
    coalesce(nullif(i.name_1,''), nullif(i.name_2,''), nullif(i.name_eng_1,''), i.code) as name,
    nullif(b.name_1,'') as "brandName",
    nullif(c.name_1,'') as "categoryName",
    ${PRICE_SUBQUERY}::float8 as price,
    coalesce(i.balance_qty, 0)::float8 as stock,
    (i.is_new_item = 1)  as "isNew",
    (i.item_promote = 1) as "isPromo",
    coalesce(
      (select pi.url from odg_ecom.product_images pi where pi.product_code = i.code
        order by pi.sort_order, pi.id limit 1),
      nullif(ov.image_url,'')
    )                                as "imageUrl",
    coalesce(ov.is_hidden, false)    as "isHidden",
    coalesce(ov.is_featured, false)  as "isFeatured",
    nullif(ov.description,'')         as description,
    nullif(ov.short_description,'')   as "shortDescription",
    nullif(i.description,'')          as "erpDescription",
    ov.updated_at as "updatedAt"
  from public.ic_inventory i
  left join public.ic_brand    b on b.code = i.item_brand
  left join public.ic_category c on c.code = i.item_category
  left join odg_ecom.product_overlays ov on ov.product_code = i.code`;

export interface AdminProductPage {
  items: AdminProductRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Paginated, searchable, filterable list of web-eligible products + overlay. */
export async function getAdminProducts(opts: {
  search?: string;
  groupMain?: string;
  categoryCode?: string;
  brandCode?: string;
  /** Include out-of-stock items (default: hidden — matches the storefront). */
  includeOutOfStock?: boolean;
  /** Only items running low (1..LOW_STOCK_MAX units). Overrides includeOutOfStock. */
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
} = {}): Promise<AdminProductPage> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 30));
  const conds = [ADMIN_WEB];
  const params: unknown[] = [];

  if (opts.lowStock) conds.push(`coalesce(i.balance_qty, 0) between 1 and ${LOW_STOCK_MAX}`);
  else if (!opts.includeOutOfStock) conds.push("coalesce(i.balance_qty, 0) > 0");

  const s = opts.search?.trim();
  if (s) {
    params.push(`%${s}%`);
    const p = `$${params.length}`;
    conds.push(
      `(i.code ilike ${p} or i.name_1 ilike ${p} or i.name_2 ilike ${p} or i.name_eng_1 ilike ${p})`,
    );
  }
  if (opts.groupMain) {
    params.push(opts.groupMain);
    conds.push(`i.group_main = $${params.length}`);
  }
  if (opts.categoryCode) {
    params.push(opts.categoryCode);
    conds.push(`i.item_category = $${params.length}`);
  }
  if (opts.brandCode) {
    params.push(opts.brandCode);
    conds.push(`i.item_brand = $${params.length}`);
  }
  const where = conds.join(" and ");

  const totalRow = await queryOne<{ n: number }>(
    `select count(*)::int as n from public.ic_inventory i where ${where}`,
    params,
  );
  const total = totalRow?.n ?? 0;

  params.push(pageSize, (page - 1) * pageSize);
  const items = await query<AdminProductRow>(
    `${ROW_SELECT}
      where ${where}
      order by i.code
      limit $${params.length - 1} offset $${params.length}`,
    params,
  );

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** One web-eligible product with its overlay (for the edit page), or null. */
export async function getAdminProduct(code: string): Promise<AdminProductRow | null> {
  return queryOne<AdminProductRow>(
    `${ROW_SELECT} where ${ADMIN_WEB} and i.code = $1 limit 1`,
    [code],
  );
}

export interface AdminProductStats {
  total: number;
  withImage: number;
  hidden: number;
  featured: number;
  lowStock: number;
}

/** Counts for the dashboard cards. */
export async function getAdminProductStats(): Promise<AdminProductStats> {
  const row = await queryOne<AdminProductStats>(
    `select
        count(*)::int as total,
        count(*) filter (where nullif(ov.image_url,'') is not null
          or exists (select 1 from odg_ecom.product_images pi where pi.product_code = i.code))::int as "withImage",
        count(*) filter (where coalesce(ov.is_hidden,false))::int   as hidden,
        count(*) filter (where coalesce(ov.is_featured,false))::int as featured,
        count(*) filter (where coalesce(i.balance_qty,0) between 1 and ${LOW_STOCK_MAX})::int as "lowStock"
       from public.ic_inventory i
       left join odg_ecom.product_overlays ov on ov.product_code = i.code
      where ${ADMIN_WEB}`,
  );
  return row ?? { total: 0, withImage: 0, hidden: 0, featured: 0, lowStock: 0 };
}

export interface Facet {
  code: string;
  name: string;
}

/** Product-groups (group_main) present among web-eligible products (dropdown). */
export async function getAdminGroups(): Promise<Facet[]> {
  return query<Facet>(
    `select i.group_main as code,
            coalesce(nullif(g.name_1,''), i.group_main) as name
       from public.ic_inventory i
       left join public.ic_group g on g.code = i.group_main
      where ${ADMIN_WEB}
      group by i.group_main, g.name_1
      order by i.group_main`,
  );
}

/** Item-categories present among web-eligible products (filter dropdown).
 *  Optionally narrowed to a single group_main so the category list tracks the
 *  selected group. */
export async function getAdminCategories(groupMain?: string): Promise<Facet[]> {
  const conds = [ADMIN_WEB, "coalesce(nullif(i.item_category,''),'') <> ''"];
  const params: unknown[] = [];
  if (groupMain) {
    params.push(groupMain);
    conds.push(`i.group_main = $${params.length}`);
  }
  return query<Facet>(
    `select c.code, coalesce(nullif(c.name_1,''), c.code) as name
       from public.ic_inventory i
       join public.ic_category c on c.code = i.item_category
      where ${conds.join(" and ")}
      group by c.code, c.name_1
      order by name`,
    params,
  );
}

/** Brands present among web-eligible products (filter dropdown). */
export async function getAdminBrands(): Promise<Facet[]> {
  return query<Facet>(
    `select b.code, coalesce(nullif(b.name_1,''), b.code) as name
       from public.ic_inventory i
       join public.ic_brand b on b.code = i.item_brand
      where ${ADMIN_WEB} and coalesce(nullif(i.item_brand,''),'') <> ''
      group by b.code, b.name_1
      order by name`,
  );
}

// --- writes (ecom only) -----------------------------------------------------

// Upsert a single overlay flag. The product_code is the ERP code; we never
// validate against ERP here (the caller passes a code from getAdminProduct).
async function upsert(
  code: string,
  column: "is_hidden" | "is_featured",
  value: boolean,
  by?: string,
): Promise<void> {
  await query(
    `insert into odg_ecom.product_overlays (product_code, ${column}, updated_by, updated_at)
       values ($1, $2, $3, now())
     on conflict (product_code) do update
       set ${column} = excluded.${column},
           updated_by = excluded.updated_by,
           updated_at = now()`,
    [code, value, by ?? null],
  );
}

// --- image gallery (odg_ecom.product_images) ------------------------------------

export interface ProductImageRow {
  id: number;
  url: string;
  sortOrder: number;
}

/** Ordered gallery images for a product. */
export async function getProductImages(code: string): Promise<ProductImageRow[]> {
  return query<ProductImageRow>(
    `select id, url, sort_order as "sortOrder"
       from odg_ecom.product_images
      where product_code = $1
      order by sort_order, id`,
    [code],
  );
}

/** Append an image URL to the gallery (after the current last). */
export async function addProductImage(code: string, url: string): Promise<void> {
  await query(
    `insert into odg_ecom.product_images (product_code, url, sort_order)
       values ($1, $2, coalesce(
         (select max(sort_order) + 1 from odg_ecom.product_images where product_code = $1), 0))`,
    [code, url],
  );
}

/** Delete one gallery image (scoped to its product); returns its URL if found. */
export async function deleteProductImage(id: number, code: string): Promise<string | null> {
  const row = await queryOne<{ url: string }>(
    `delete from odg_ecom.product_images where id = $1 and product_code = $2 returning url`,
    [id, code],
  );
  return row?.url ?? null;
}

/** Make an image the primary one (sorts before all the product's others). */
export async function setPrimaryImage(id: number, code: string): Promise<void> {
  await query(
    `update odg_ecom.product_images
        set sort_order = coalesce(
          (select min(sort_order) - 1 from odg_ecom.product_images where product_code = $2), 0)
      where id = $1 and product_code = $2`,
    [id, code],
  );
}

/** Hide or show the product in the storefront. */
export async function setProductHidden(
  code: string,
  hidden: boolean,
  by?: string,
): Promise<void> {
  await upsert(code, "is_hidden", hidden, by);
}

/** Mark/unmark the product as featured (floats up the "ສິນຄ້າແນະນຳ" rail). */
export async function setProductFeatured(
  code: string,
  featured: boolean,
  by?: string,
): Promise<void> {
  await upsert(code, "is_featured", featured, by);
}

/** Set one overlay flag on MANY products at once (bulk upsert). Returns count. */
export async function bulkSetFlag(
  codes: string[],
  column: "is_hidden" | "is_featured",
  value: boolean,
  by?: string,
): Promise<number> {
  if (codes.length === 0) return 0;
  await query(
    `insert into odg_ecom.product_overlays (product_code, ${column}, updated_by, updated_at)
       select c, $2, $3, now() from unnest($1::text[]) as c
     on conflict (product_code) do update
       set ${column} = excluded.${column},
           updated_by = excluded.updated_by,
           updated_at = now()`,
    [codes, value, by ?? null],
  );
  return codes.length;
}

/** Override the product description (null clears it → falls back to the ERP text). */
export async function setProductDescription(
  code: string,
  description: string | null,
  by?: string,
): Promise<void> {
  await query(
    `insert into odg_ecom.product_overlays (product_code, description, updated_by, updated_at)
       values ($1, $2, $3, now())
     on conflict (product_code) do update
       set description = excluded.description,
           updated_by = excluded.updated_by,
           updated_at = now()`,
    [code, description, by ?? null],
  );
}

/** Set the short description override (null clears it). */
export async function setProductShortDescription(
  code: string,
  shortDescription: string | null,
  by?: string,
): Promise<void> {
  await query(
    `insert into odg_ecom.product_overlays (product_code, short_description, updated_by, updated_at)
       values ($1, $2, $3, now())
     on conflict (product_code) do update
       set short_description = excluded.short_description,
           updated_by = excluded.updated_by,
           updated_at = now()`,
    [code, shortDescription, by ?? null],
  );
}

// --- product specifications (odg_ecom.product_specs) -------------------------

export interface ProductSpec {
  id: number;
  productCode: string;
  label: string;
  value: string;
  sortOrder: number;
}

export async function getProductSpecs(productCode: string): Promise<ProductSpec[]> {
  const rows = await query<{ id: string; product_code: string; label: string; value: string; sort_order: number }>(
    `select id, product_code, label, value, sort_order
       from odg_ecom.product_specs
      where product_code = $1
      order by sort_order, id`,
    [productCode],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    productCode: r.product_code,
    label: r.label,
    value: r.value,
    sortOrder: r.sort_order,
  }));
}

export async function upsertProductSpec(
  productCode: string,
  spec: { id?: number; label: string; value: string; sortOrder?: number },
): Promise<void> {
  if (spec.id) {
    await query(
      `update odg_ecom.product_specs set label=$1, value=$2, sort_order=$3 where id=$4 and product_code=$5`,
      [spec.label.trim(), spec.value.trim(), spec.sortOrder ?? 0, spec.id, productCode],
    );
  } else {
    await query(
      `insert into odg_ecom.product_specs (product_code, label, value, sort_order) values ($1,$2,$3,$4)`,
      [productCode, spec.label.trim(), spec.value.trim(), spec.sortOrder ?? 0],
    );
  }
}

export async function deleteProductSpec(id: number, productCode: string): Promise<void> {
  await query(`delete from odg_ecom.product_specs where id=$1 and product_code=$2`, [id, productCode]);
}

// --- AC sets (odg_ecom.ac_sets) ----------------------------------------------

export interface AcSetRow {
  id: number;
  codeC: string;
  nameC: string;
  priceC: number | null;
  stockC: number;
  codeH: string;
  nameH: string;
  priceH: number | null;
  stockH: number;
}

export async function getAcSets(): Promise<AcSetRow[]> {
  return query<AcSetRow>(
    `select s.id,
            s.code_c as "codeC",
            coalesce(nullif(ic.name_1,''), s.code_c) as "nameC",
            (select min(b.price) from public.ic_inventory_barcode b where b.ic_code=s.code_c and b.price>0) as "priceC",
            coalesce(ic.balance_qty,0)::float8 as "stockC",
            s.code_h as "codeH",
            coalesce(nullif(ih.name_1,''), s.code_h) as "nameH",
            (select min(b.price) from public.ic_inventory_barcode b where b.ic_code=s.code_h and b.price>0) as "priceH",
            coalesce(ih.balance_qty,0)::float8 as "stockH"
       from odg_ecom.ac_sets s
       join public.ic_inventory ic on ic.code = s.code_c
       join public.ic_inventory ih on ih.code = s.code_h
      order by s.code_c`,
  );
}

export interface AcCandidate {
  code: string;
  name: string;
  stock: number;
  price: number | null;
}

/** Search group-12 [C] or [H] items for the pairing UI. */
export async function searchAcCandidates(suffix: "[C]" | "[H]", q?: string): Promise<AcCandidate[]> {
  const params: unknown[] = [`%[${suffix === "[C]" ? "C" : "H"}]%`];
  let cond = `i.group_main='12' and i.name_1 like $1`;
  if (q?.trim()) {
    params.push(`%${q.trim()}%`);
    cond += ` and (i.code ilike $${params.length} or i.name_1 ilike $${params.length})`;
  }
  return query<AcCandidate>(
    `select i.code,
            coalesce(nullif(i.name_1,''), i.code) as name,
            coalesce(i.balance_qty,0)::float8 as stock,
            (select min(b.price) from public.ic_inventory_barcode b where b.ic_code=i.code and b.price>0) as price
       from public.ic_inventory i
      where ${cond}
        and not exists (
          select 1 from odg_ecom.ac_sets s
          where s.code_c = i.code or s.code_h = i.code
        )
      order by i.code limit 50`,
    params,
  );
}

export async function createAcSet(codeC: string, codeH: string): Promise<void> {
  await query(
    `insert into odg_ecom.ac_sets (code_c, code_h) values ($1, $2)`,
    [codeC, codeH],
  );
}

export async function deleteAcSet(id: number): Promise<void> {
  await query(`delete from odg_ecom.ac_sets where id=$1`, [id]);
}
