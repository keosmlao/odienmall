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

export async function getAllRewards(): Promise<AdminPromotion[]> {
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

export async function togglePinReward(promoCode: string, pinned: boolean): Promise<void> {
  await query(
    `insert into odg_ecom.promotion_overlays (promo_code, pinned, updated_at)
     values ($1, $2, now())
     on conflict (promo_code) do update
       set pinned = excluded.pinned, updated_at = now()`,
    [promoCode, pinned],
  );
}

export async function setRewardImage(promoCode: string, imageUrl: string, updatedBy: string): Promise<void> {
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

export async function deleteRewardImage(promoCode: string): Promise<void> {
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

// ── Reward redemptions (admin) ───────────────────────────────────────────────

export interface AdminRedemption {
  id: number;
  customerCode: string;
  customerName: string | null;
  promoCode: string;
  icCode: string | null;
  rewardName: string;
  pointsSpent: number;
  freeQty: number | null;
  unitCode: string | null;
  status: "pending" | "approved" | "fulfilled" | "rejected";
  smlDocNo: string | null;
  transportCode: string | null;
  note: string | null;
  createdAt: string;
}

export async function getRedemptions(opts: {
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ items: AdminRedemption[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 30;
  const offset = (page - 1) * pageSize;
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.status && opts.status !== "all") {
    params.push(opts.status);
    where.push(`r.status = $${params.length}`);
  }
  const whereSql = where.length ? `where ${where.join(" and ")}` : "";

  const totalRow = await query<{ n: string }>(
    `select count(*)::text as n from odg_ecom.reward_redemptions r ${whereSql}`,
    params,
  );
  const total = Number(totalRow[0]?.n ?? 0);

  const rows = await query<{
    id: string;
    customer_code: string;
    customer_name: string | null;
    promo_code: string;
    ic_code: string | null;
    reward_name: string;
    points_spent: number;
    free_qty: string | null;
    unit_code: string | null;
    status: AdminRedemption["status"];
    sml_doc_no: string | null;
    transport_code: string | null;
    note: string | null;
    created_at: Date;
  }>(
    `select r.id, r.customer_code,
            (select coalesce(nullif(name_1,''), code) from public.ar_customer where code = r.customer_code) as customer_name,
            r.promo_code, r.ic_code, r.reward_name, r.points_spent, r.free_qty, r.unit_code,
            r.status, r.sml_doc_no, r.transport_code, r.note, r.created_at
       from odg_ecom.reward_redemptions r
       ${whereSql}
      order by r.id desc
      limit ${pageSize} offset ${offset}`,
    params,
  );

  return {
    items: rows.map((r) => ({
      id: Number(r.id),
      customerCode: r.customer_code,
      customerName: r.customer_name,
      promoCode: r.promo_code,
      icCode: r.ic_code,
      rewardName: r.reward_name,
      pointsSpent: r.points_spent,
      freeQty: r.free_qty != null ? Number(r.free_qty) : null,
      unitCode: r.unit_code,
      status: r.status,
      smlDocNo: r.sml_doc_no,
      transportCode: r.transport_code,
      note: r.note,
      createdAt: r.created_at.toISOString(),
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getRedemptionById(id: number): Promise<AdminRedemption | null> {
  const { items } = await getRedemptions({ status: "all", page: 1, pageSize: 1000 });
  return items.find((r) => r.id === id) ?? null;
}

export async function countPendingRedemptions(): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `select count(*)::text as n from odg_ecom.reward_redemptions where status = 'pending'`,
  );
  return Number(r?.n ?? 0);
}

/** Update a redemption's status (+ optional note / transport). 'rejected' frees
 *  the reserved points automatically (reserved sum excludes rejected rows). */
export async function setRedemptionStatus(
  id: number,
  status: AdminRedemption["status"],
  opts: { note?: string | null; transportCode?: string | null } = {},
): Promise<void> {
  await query(
    `update odg_ecom.reward_redemptions
        set status = $2,
            note = coalesce($3, note),
            transport_code = coalesce($4, transport_code),
            updated_at = now()
      where id = $1`,
    [id, status, opts.note ?? null, opts.transportCode ?? null],
  );
}
