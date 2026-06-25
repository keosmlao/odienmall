import { query } from "@/lib/db";

export type PointPromotion = {
  code: string;
  icCode: string;
  name: string;
  points: number;
  cardType: "0" | "1" | "2";
  freeQty: number | null;
  unitCode: string | null;
  fromDate: string;
  toDate: string;
  imageUrl: string | null;
  pinned: boolean;
};

export type PromotionsByType = {
  all: PointPromotion[];
  member: PointPromotion[];
  vip: PointPromotion[];
  pinned: PointPromotion[];
};

export async function getActivePointPromotions(): Promise<PromotionsByType> {
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
    image_url: string | null;
    pinned: boolean;
  }>(
    `select p.code, p.ic_code, trim(p.name_1) as name_1,
       p.point_promotion, p.card_type, p.free_qty, p.unit_code,
       p.from_date, p.to_date,
       coalesce(
         po.image_url,
         (select pi.url from odg_ecom.product_images pi where pi.product_code = p.ic_code order by pi.sort_order, pi.id limit 1),
         ov.image_url
       ) as image_url,
       coalesce(po.pinned, false) as pinned
     from public.odg_pomotion_point p
     left join odg_ecom.promotion_overlays po on po.promo_code = p.code
     left join odg_ecom.product_overlays ov on ov.product_code = p.ic_code
     where now() between p.from_date and p.to_date
     order by coalesce(po.pinned, false) desc, p.card_type, p.point_promotion::int`,
  );

  const promos: PointPromotion[] = rows.map((r) => ({
    code: r.code,
    icCode: r.ic_code,
    name: r.name_1,
    points: parseInt(r.point_promotion, 10),
    cardType: (r.card_type ?? "0") as "0" | "1" | "2",
    freeQty: r.free_qty ? parseInt(r.free_qty, 10) : null,
    unitCode: r.unit_code,
    fromDate: r.from_date.toISOString().slice(0, 10),
    toDate: r.to_date.toISOString().slice(0, 10),
    imageUrl: r.image_url,
    pinned: Boolean(r.pinned),
  }));

  return {
    all: promos.filter((p) => p.cardType === "0"),
    member: promos.filter((p) => p.cardType === "1"),
    vip: promos.filter((p) => p.cardType === "2"),
    pinned: promos.filter((p) => p.pinned),
  };
}
