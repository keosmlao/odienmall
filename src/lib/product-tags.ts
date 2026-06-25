import "server-only";
import { query, queryOne } from "./db";

export interface Tag {
  id: number;
  slug: string;
  name: string;
}

export async function getAllTags(): Promise<Tag[]> {
  return query<Tag>(`select id, slug, name from odg_ecom.tags order by name`);
}

export async function createTag(slug: string, name: string): Promise<Tag> {
  const row = await queryOne<Tag>(
    `insert into odg_ecom.tags (slug, name) values ($1, $2)
       on conflict (slug) do update set name = excluded.name
       returning id, slug, name`,
    [slug.trim().toLowerCase().replace(/\s+/g, "-"), name.trim()],
  );
  if (!row) throw new Error("Insert failed");
  return row;
}

export async function deleteTag(id: number): Promise<void> {
  await query(`delete from odg_ecom.tags where id = $1`, [id]);
}

export async function getProductTags(productCode: string): Promise<Tag[]> {
  return query<Tag>(
    `select t.id, t.slug, t.name
       from odg_ecom.tags t
       join odg_ecom.product_tags pt on pt.tag_id = t.id
      where pt.product_code = $1
      order by t.name`,
    [productCode],
  );
}

export async function setProductTags(productCode: string, tagIds: number[]): Promise<void> {
  await query(`delete from odg_ecom.product_tags where product_code = $1`, [productCode]);
  if (tagIds.length === 0) return;
  const values = tagIds.map((id, i) => `($1, $${i + 2})`).join(", ");
  await query(
    `insert into odg_ecom.product_tags (product_code, tag_id) values ${values}
       on conflict do nothing`,
    [productCode, ...tagIds],
  );
}

/** Get all products with a given tag slug. */
export async function getProductsByTag(slug: string): Promise<string[]> {
  const rows = await query<{ product_code: string }>(
    `select pt.product_code from odg_ecom.product_tags pt
       join odg_ecom.tags t on t.id = pt.tag_id
      where t.slug = $1`,
    [slug],
  );
  return rows.map((r) => r.product_code);
}
