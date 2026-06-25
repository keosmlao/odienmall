import { query, queryOne } from "@/lib/db";
import { createRewardRequisition } from "@/lib/reward-requisition";

export type PointReward = {
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

export type RewardsByType = {
  all: PointReward[];
  member: PointReward[];
  vip: PointReward[];
  pinned: PointReward[];
};

export async function getActiveRewards(): Promise<RewardsByType> {
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

  const rewards: PointReward[] = rows.map((r) => ({
    code: r.code ?? r.ic_code,
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
    all: rewards.filter((p) => p.cardType === "0"),
    member: rewards.filter((p) => p.cardType === "1"),
    vip: rewards.filter((p) => p.cardType === "2"),
    pinned: rewards.filter((p) => p.pinned),
  };
}

/** Raw ERP point balance — the customer's accumulated points live in
 *  public.ar_customer.point_balance (authoritative). Does NOT subtract pending
 *  redemptions (see getAvailablePoints for the spendable figure). */
export async function getCustomerPointBalance(customerCode: string): Promise<number> {
  if (!customerCode) return 0;
  const row = await queryOne<{ point_balance: string | null }>(
    `select point_balance from public.ar_customer where code = $1`,
    [customerCode],
  );
  return row?.point_balance != null ? Math.max(0, Number(row.point_balance)) : 0;
}

/** Points already reserved by the customer's active (non-rejected) redemptions. */
export async function getReservedPoints(customerCode: string): Promise<number> {
  if (!customerCode) return 0;
  const row = await queryOne<{ used: string }>(
    `select coalesce(sum(points_spent),0)::text as used
       from odg_ecom.reward_redemptions
      where customer_code = $1 and status <> 'rejected'`,
    [customerCode],
  );
  return Math.max(0, Number(row?.used ?? 0));
}

/** Spendable balance = ERP balance − points reserved by active redemptions. */
export async function getAvailablePoints(customerCode: string): Promise<number> {
  if (!customerCode) return 0;
  const [bal, reserved] = await Promise.all([
    getCustomerPointBalance(customerCode),
    getReservedPoints(customerCode),
  ]);
  return Math.max(0, bal - reserved);
}

export interface RewardRedemption {
  id: number;
  promoCode: string;
  icCode: string | null;
  rewardName: string;
  pointsSpent: number;
  freeQty: number | null;
  unitCode: string | null;
  status: "pending" | "approved" | "fulfilled" | "rejected";
  note: string | null;
  createdAt: string;
}

export const REDEMPTION_STATUS_LABEL: Record<RewardRedemption["status"], string> = {
  pending: "ລໍຖ້າອະນຸມັດ",
  approved: "ອະນຸມັດແລ້ວ",
  fulfilled: "ຮັບຂອງແລ້ວ",
  rejected: "ປະຕິເສດ",
};

export type RedeemResult = { ok: true; id: number } | { ok: false; error: string };

/** Redeem one active reward for the logged-in customer (creates a pending request).
 *  Validates the reward is live and the customer has enough spendable points. */
export async function redeemReward(customerCode: string, promoCode: string): Promise<RedeemResult> {
  if (!customerCode) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ" };

  const reward = await queryOne<{
    code: string;
    ic_code: string;
    name_1: string;
    point_promotion: string;
    free_qty: string | null;
    unit_code: string | null;
  }>(
    `select code, ic_code, trim(name_1) as name_1, point_promotion, free_qty, unit_code
       from public.odg_pomotion_point
      where code = $1 and now() between from_date and to_date
      limit 1`,
    [promoCode],
  );
  if (!reward) return { ok: false, error: "ຂອງລາງວັນນີ້ໝົດອາຍຸ ຫຼື ບໍ່ມີ" };

  const cost = parseInt(reward.point_promotion, 10) || 0;
  if (cost <= 0) return { ok: false, error: "ຂອງລາງວັນນີ້ບໍ່ສາມາດແລກໄດ້" };

  const available = await getAvailablePoints(customerCode);
  if (available < cost) {
    return { ok: false, error: `ແຕ້ມບໍ່ພໍ (ມີ ${available.toLocaleString()} ຕ້ອງການ ${cost.toLocaleString()})` };
  }

  const freeQty = reward.free_qty ? Number(reward.free_qty) : null;
  const row = await queryOne<{ id: string }>(
    `insert into odg_ecom.reward_redemptions
       (customer_code, promo_code, ic_code, reward_name, points_spent, free_qty, unit_code, status)
     values ($1,$2,$3,$4,$5,$6,$7,'pending')
     returning id`,
    [customerCode, reward.code, reward.ic_code, reward.name_1, cost, freeQty, reward.unit_code],
  );
  const id = Number(row!.id);

  // Write the ໃບຂໍເບີກ (requisition) into public.ic_trans (best-effort; needs
  // SML_DIRECT_WRITE). The redemption still stands app-side if this is off/fails;
  // admin can retry. The reward item is issued with the configured free_qty.
  if (reward.ic_code && freeQty && freeQty > 0) {
    try {
      const prof = await queryOne<{ name: string; phone: string | null }>(
        `select coalesce(nullif(name_1,''), code) as name, nullif(telephone,'') as phone
           from public.ar_customer where code = $1`,
        [customerCode],
      );
      const docNo = await createRewardRequisition({
        customerCode,
        name: prof?.name || customerCode,
        phone: prof?.phone || "",
        address: null,
        promoCode: reward.code,
        rewardName: reward.name_1,
        itemCode: reward.ic_code,
        qty: freeQty,
        unitCode: reward.unit_code,
        pointsSpent: cost,
      });
      if (docNo) {
        await query(`update odg_ecom.reward_redemptions set sml_doc_no = $2 where id = $1`, [id, docNo]);
      }
    } catch (e) {
      console.error("createRewardRequisition failed:", e);
    }
  }

  return { ok: true, id };
}

/** A customer's own redemption history (newest first). */
export async function getMyRedemptions(customerCode: string): Promise<RewardRedemption[]> {
  if (!customerCode) return [];
  const rows = await query<{
    id: string;
    promo_code: string;
    ic_code: string | null;
    reward_name: string;
    points_spent: number;
    free_qty: string | null;
    unit_code: string | null;
    status: RewardRedemption["status"];
    note: string | null;
    created_at: Date;
  }>(
    `select id, promo_code, ic_code, reward_name, points_spent, free_qty, unit_code, status, note, created_at
       from odg_ecom.reward_redemptions
      where customer_code = $1
      order by id desc
      limit 50`,
    [customerCode],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    promoCode: r.promo_code,
    icCode: r.ic_code,
    rewardName: r.reward_name,
    pointsSpent: r.points_spent,
    freeQty: r.free_qty != null ? Number(r.free_qty) : null,
    unitCode: r.unit_code,
    status: r.status,
    note: r.note,
    createdAt: r.created_at.toISOString(),
  }));
}
