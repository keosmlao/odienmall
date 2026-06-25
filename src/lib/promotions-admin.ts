import "server-only";
import { query, queryOne } from "@/lib/db";
import { deleteUpload } from "@/lib/storage";

export type AdminPromotion = {
  code: string;
  icCode: string;
  name: string;
  points: number;
  cardType: "0" | "1" | "2";
  freeQty: number | null;
  unitCode: string | null;
  fromDate: string;
  toDate: string;
  isActive: boolean;
  imageUrl: string | null;
  pinned: boolean;
};

export async function getAllPromotions(): Promise<AdminPromotion[]> {
  const rows = await query<{
    code: string;
    ic_code: string;
    name_1: string;
    point_promotion: string;
    card_type: string;
    free_qty: string | null;
    unit_code: string | null;
    from_date: Date;
    to_date: Date;
    is_active: boolean;
    image_url: string | null;
    pinned: boolean;
  }>(
    `select p.code, p.ic_code, trim(p.name_1) as name_1,
       p.point_promotion, p.card_type, p.free_qty, p.unit_code,
       p.from_date, p.to_date,
       (now() between p.from_date and p.to_date) as is_active,
       po.image_url,
       coalesce(po.pinned, false) as pinned
     from public.odg_pomotion_point p
     left join odg_ecom.promotion_overlays po on po.promo_code = p.code
     order by is_active desc, coalesce(po.pinned, false) desc, p.card_type, p.point_promotion::int`,
  );

  return rows.map((r) => ({
    code: r.code,
    icCode: r.ic_code,
    name: r.name_1,
    points: parseInt(r.point_promotion, 10),
    cardType: (r.card_type ?? "0") as "0" | "1" | "2",
    freeQty: r.free_qty ? parseInt(r.free_qty, 10) : null,
    unitCode: r.unit_code,
    fromDate: r.from_date.toISOString().slice(0, 10),
    toDate: r.to_date.toISOString().slice(0, 10),
    isActive: Boolean(r.is_active),
    imageUrl: r.image_url,
    pinned: Boolean(r.pinned),
  }));
}

export async function togglePinPromotion(promoCode: string, pinned: boolean): Promise<void> {
  await query(
    `insert into odg_ecom.promotion_overlays (promo_code, pinned, updated_at)
     values ($1, $2, now())
     on conflict (promo_code) do update
       set pinned = excluded.pinned, updated_at = now()`,
    [promoCode, pinned],
  );
}

export async function setPromotionImage(promoCode: string, imageUrl: string, updatedBy: string): Promise<void> {
  const old = await queryOne<{ image_url: string | null }>(
    `select image_url from odg_ecom.promotion_overlays where promo_code = $1`,
    [promoCode],
  );
  if (old?.image_url) await deleteUpload(old.image_url);

  await query(
    `insert into odg_ecom.promotion_overlays (promo_code, image_url, updated_at, updated_by)
     values ($1, $2, now(), $3)
     on conflict (promo_code) do update
       set image_url = excluded.image_url,
           updated_at = now(),
           updated_by = excluded.updated_by`,
    [promoCode, imageUrl, updatedBy],
  );
}

export async function deletePromotionImage(promoCode: string): Promise<void> {
  const row = await queryOne<{ image_url: string | null }>(
    `select image_url from odg_ecom.promotion_overlays where promo_code = $1`,
    [promoCode],
  );
  if (row?.image_url) await deleteUpload(row.image_url);
  await query(
    `update odg_ecom.promotion_overlays set image_url = null, updated_at = now() where promo_code = $1`,
    [promoCode],
  );
}
