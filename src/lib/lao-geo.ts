import "server-only";
import { cache } from "react";
import { query } from "./db";

// Lao administrative hierarchy from the READ-ONLY ERP reference tables:
//   erp_province (ແຂວງ)  → erp_amper (ເມືອງ, .province FK) → erp_tambon (ບ້ານ, .amper FK)
// ar_customer stores the CODES: province='01', amper='0104', tambon='0104007'.

export interface GeoItem {
  code: string;
  name: string;
}

/** Provinces that actually have districts (excludes the foreign-country rows in
 *  erp_province). Cached per request. */
export const getProvinces = cache(async (): Promise<GeoItem[]> => {
  const rows = await query<{ code: string; name_1: string }>(
    `select p.code, coalesce(nullif(p.name_1,''), p.code) as name_1
       from public.erp_province p
      where exists (select 1 from public.erp_amper a where a.province = p.code)
      order by p.code`,
  );
  return rows.map((r) => ({ code: r.code, name: r.name_1 }));
});

/** Districts (ເມືອງ) of a province. */
export async function getDistricts(provinceCode: string): Promise<GeoItem[]> {
  if (!provinceCode) return [];
  const rows = await query<{ code: string; name_1: string }>(
    `select code, coalesce(nullif(name_1,''), code) as name_1
       from public.erp_amper where province = $1 order by code`,
    [provinceCode],
  );
  return rows.map((r) => ({ code: r.code, name: r.name_1 }));
}

/** Villages (ບ້ານ) of a district. */
export async function getVillages(amperCode: string): Promise<GeoItem[]> {
  if (!amperCode) return [];
  const rows = await query<{ code: string; name_1: string }>(
    `select code, coalesce(nullif(name_1,''), code) as name_1
       from public.erp_tambon where amper = $1 order by code`,
    [amperCode],
  );
  return rows.map((r) => ({ code: r.code, name: r.name_1 }));
}
