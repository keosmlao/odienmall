import "server-only";
import { query, queryOne } from "./db";

export interface HomeBanner {
  id: number;
  enabled: boolean;
  eyebrow: string;
  title: string;
  description: string;
  buttonText: string;
  link: string;
  imageUrl: string | null;
  backgroundFrom: string;
  backgroundTo: string;
  sortOrder: number;
}

export interface HomeBannerInput {
  enabled: boolean;
  eyebrow: string;
  title: string;
  description: string;
  buttonText: string;
  link: string;
  backgroundFrom: string;
  backgroundTo: string;
  sortOrder: number;
}

const SELECT = `
  select id::int, enabled, eyebrow, title, description,
         button_text as "buttonText", link, image_url as "imageUrl",
         background_from as "backgroundFrom",
         background_to as "backgroundTo", sort_order as "sortOrder"
    from ecom.home_banners`;

export async function getHomeBanners(): Promise<HomeBanner[]> {
  try {
    return await query<HomeBanner>(
      `${SELECT} where enabled order by sort_order, id`,
    );
  } catch {
    // Migration may not have run yet. The client slider keeps built-in defaults.
    return [];
  }
}

export async function getAdminBanners(): Promise<HomeBanner[]> {
  try {
    return await query<HomeBanner>(`${SELECT} order by sort_order, id`);
  } catch {
    return [];
  }
}

export async function getBannerImage(id: number): Promise<string | null> {
  const row = await queryOne<{ imageUrl: string | null }>(
    `select image_url as "imageUrl" from ecom.home_banners where id=$1`,
    [id],
  );
  return row?.imageUrl ?? null;
}

export async function createBanner(
  input: HomeBannerInput,
  by?: string,
): Promise<number> {
  const row = await queryOne<{ id: number }>(
    `insert into ecom.home_banners
       (enabled,eyebrow,title,description,button_text,link,
        background_from,background_to,sort_order,updated_by)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     returning id::int`,
    [
      input.enabled,
      input.eyebrow,
      input.title,
      input.description,
      input.buttonText,
      input.link,
      input.backgroundFrom,
      input.backgroundTo,
      input.sortOrder,
      by ?? null,
    ],
  );
  if (!row) throw new Error("ບໍ່ສາມາດສ້າງ banner");
  return row.id;
}

export async function updateBanner(
  id: number,
  input: HomeBannerInput,
  by?: string,
): Promise<void> {
  await query(
    `update ecom.home_banners
        set enabled=$2,eyebrow=$3,title=$4,description=$5,
            button_text=$6,link=$7,background_from=$8,background_to=$9,
            sort_order=$10,updated_by=$11,updated_at=now()
      where id=$1`,
    [
      id,
      input.enabled,
      input.eyebrow,
      input.title,
      input.description,
      input.buttonText,
      input.link,
      input.backgroundFrom,
      input.backgroundTo,
      input.sortOrder,
      by ?? null,
    ],
  );
}

export async function setBannerImage(
  id: number,
  imageUrl: string | null,
  by?: string,
): Promise<void> {
  await query(
    `update ecom.home_banners
        set image_url=$2,updated_by=$3,updated_at=now()
      where id=$1`,
    [id, imageUrl, by ?? null],
  );
}

export async function deleteBannerById(id: number): Promise<void> {
  await query(`delete from ecom.home_banners where id=$1`, [id]);
}
