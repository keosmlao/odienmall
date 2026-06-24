import "server-only";
import { pool, query, queryOne } from "./db";

// Loyalty points (logged-in customers only). Ledger-based: balance = sum(delta).
// Earn on payment, redeem at checkout (points → LAK discount). Config via env.

export const EARN_PER = Number(process.env.LOYALTY_EARN_PER || 1000); // 1 pt per N LAK spent
export const POINT_VALUE = Number(process.env.LOYALTY_POINT_VALUE || 10); // 1 pt = X LAK on redeem
export const MIN_REDEEM = Number(process.env.LOYALTY_MIN_REDEEM || 100); // min points to redeem

export interface LoyaltyEntry {
  id: number;
  delta: number;
  reason: string;
  orderNo: string | null;
  createdAt: string;
}

/** Points earned for a paid amount (LAK). */
export function pointsEarnedFor(amountLak: number): number {
  if (!(EARN_PER > 0)) return 0;
  return Math.max(0, Math.floor(amountLak / EARN_PER));
}

/** Current balance for a customer (sum of ledger). */
export async function getBalance(customerCode: string): Promise<number> {
  if (!customerCode) return 0;
  const r = await queryOne<{ bal: string }>(
    `select coalesce(sum(delta),0)::text as bal from odg_ecom.loyalty_ledger where customer_code = $1`,
    [customerCode],
  );
  return Number(r?.bal ?? 0);
}

export async function getHistory(customerCode: string, limit = 50): Promise<LoyaltyEntry[]> {
  const rows = await query<{ id: string; delta: number; reason: string; order_no: string | null; created_at: Date }>(
    `select id, delta, reason, order_no, created_at
       from odg_ecom.loyalty_ledger where customer_code = $1 order by id desc limit $2`,
    [customerCode, limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    delta: r.delta,
    reason: r.reason,
    orderNo: r.order_no,
    createdAt: r.created_at.toISOString(),
  }));
}

/** Earn points for a paid order — idempotent per (order, reason). Returns points. */
export async function earnPoints(customerCode: string, orderNo: string, amountLak: number): Promise<number> {
  if (!customerCode) return 0;
  const pts = pointsEarnedFor(amountLak);
  if (pts <= 0) return 0;
  const client = await pool.connect();
  try {
    await client.query("begin");
    const dup = await client.query(
      `select 1 from odg_ecom.loyalty_ledger where order_no = $1 and reason = 'earn' limit 1`,
      [orderNo],
    );
    if ((dup.rowCount ?? 0) > 0) {
      await client.query("rollback");
      return 0;
    }
    await client.query(
      `insert into odg_ecom.loyalty_ledger (customer_code, delta, reason, order_no) values ($1,$2,'earn',$3)`,
      [customerCode, pts, orderNo],
    );
    await client.query("commit");
    return pts;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    console.error("earnPoints failed:", e);
    return 0;
  } finally {
    client.release();
  }
}

/** Deduct redeemed points for an order — idempotent per (order, reason). */
export async function redeemPoints(customerCode: string, orderNo: string, points: number): Promise<void> {
  if (!customerCode || points <= 0) return;
  const client = await pool.connect();
  try {
    await client.query("begin");
    const dup = await client.query(
      `select 1 from odg_ecom.loyalty_ledger where order_no = $1 and reason = 'redeem' limit 1`,
      [orderNo],
    );
    if ((dup.rowCount ?? 0) > 0) {
      await client.query("rollback");
      return;
    }
    await client.query(
      `insert into odg_ecom.loyalty_ledger (customer_code, delta, reason, order_no) values ($1,$2,'redeem',$3)`,
      [customerCode, -Math.abs(points), orderNo],
    );
    await client.query("commit");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    console.error("redeemPoints failed:", e);
  } finally {
    client.release();
  }
}

export type RedeemPreview =
  | { ok: true; points: number; discount: number }
  | { ok: false; error: string };

/**
 * Validate a points-redemption request against balance + the cart subtotal.
 * Returns the (possibly capped) points used and the LAK discount.
 */
export async function previewRedeem(
  customerCode: string,
  requestedPoints: number,
  subtotal: number,
): Promise<RedeemPreview> {
  if (!customerCode) return { ok: false, error: "ຕ້ອງເຂົ້າສູ່ລະບົບກ່ອນ" };
  let pts = Math.floor(Number(requestedPoints) || 0);
  if (pts < MIN_REDEEM) return { ok: false, error: `ໃຊ້ຂັ້ນຕ່ຳ ${MIN_REDEEM} ແຕ້ມ` };
  const balance = await getBalance(customerCode);
  if (pts > balance) return { ok: false, error: `ມີພຽງ ${balance} ແຕ້ມ` };
  // Cap so discount never exceeds the subtotal.
  const maxByCart = Math.floor(subtotal / POINT_VALUE);
  pts = Math.min(pts, maxByCart);
  if (pts < MIN_REDEEM) return { ok: false, error: "ຍອດນ້ອຍເກີນໄປສຳລັບການແລກແຕ້ມ" };
  return { ok: true, points: pts, discount: pts * POINT_VALUE };
}
