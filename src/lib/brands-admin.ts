import "server-only";
import { query, queryOne } from "./db";

export interface AdminBrand {
  code: string;
  name: string;
  erpLogo: string | null;
  logoUrl: string | null;
  productCount: number;
}

export async function getAdminBrandList(search = ""): Promise<AdminBrand[]> {
  const params: unknown[] = [];
  let filter = "";
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    filter = `and (b.code ilike $1 or b.name_1 ilike $1)`;
  }
  return query<AdminBrand>(
    `select b.code, coalesce(nullif(b.name_1,''),b.code) as name,
            nullif(b.url_logo,'') as "erpLogo",
            nullif(bo.logo_url,'') as "logoUrl",
            count(i.code) filter (where i.is_eordershow=1)::int as "productCount"
       from public.ic_brand b
       left join public.ic_inventory i on i.item_brand=b.code
       left join odg_ecom.brand_overlays bo on bo.brand_code=b.code
      where b.onweb=1 ${filter}
      group by b.code,b.name_1,b.url_logo,bo.logo_url
      order by count(i.code) filter (where i.is_eordershow=1) desc,b.name_1`,
    params,
  );
}

export async function getBrandOverlay(code: string): Promise<string | null> {
  const row = await queryOne<{ logoUrl: string | null }>(
    `select nullif(logo_url,'') as "logoUrl"
       from odg_ecom.brand_overlays where brand_code=$1`,
    [code],
  );
  return row?.logoUrl ?? null;
}

export async function setBrandOverlay(
  code: string,
  logoUrl: string | null,
  by?: string,
): Promise<void> {
  await query(
    `insert into odg_ecom.brand_overlays(brand_code,logo_url,updated_by,updated_at)
     values($1,$2,$3,now())
     on conflict(brand_code) do update
       set logo_url=excluded.logo_url,updated_by=excluded.updated_by,updated_at=now()`,
    [code, logoUrl, by ?? null],
  );
}
