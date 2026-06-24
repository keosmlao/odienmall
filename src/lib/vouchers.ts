import "server-only";
import { pool, query, queryOne } from "./db";

// Vouchers / discount codes (app-owned, ecom schema). Validated at checkout;
// the discount reduces the QR/charged amount and the SML bill total. Redemption
// is recorded on PAYMENT (not checkout) so abandoned carts don't consume usage.

export interface Voucher {
  id: number;
  code: string;
  kind: "percent" | "amount";
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  perCustomerLimit: number;
  active: boolean;
  note: string | null;
  createdAt: string;
}

type Row = {
  id: string;
  code: string;
  kind: string;
  value: string;
  min_subtotal: string;
  max_discount: string | null;
  starts_at: Date | null;
  expires_at: Date | null;
  usage_limit: number | null;
  used_count: number;
  per_customer_limit: number;
  active: boolean;
  note: string | null;
  created_at: Date;
};

function toVoucher(r: Row): Voucher {
  return {
    id: Number(r.id),
    code: r.code,
    kind: r.kind as "percent" | "amount",
    value: Number(r.value),
    minSubtotal: Number(r.min_subtotal),
    maxDiscount: r.max_discount == null ? null : Number(r.max_discount),
    startsAt: r.starts_at ? r.starts_at.toISOString() : null,
    expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
    usageLimit: r.usage_limit,
    usedCount: r.used_count,
    perCustomerLimit: r.per_customer_limit,
    active: r.active,
    note: r.note,
    createdAt: r.created_at.toISOString(),
  };
}

const COLS = `id, code, kind, value, min_subtotal, max_discount, starts_at, expires_at,
              usage_limit, used_count, per_customer_limit, active, note, created_at`;

/** Round to whole LAK (no decimals in kip). */
function lak(n: number): number {
  return Math.round(n);
}

/** Discount for a voucher against a subtotal (already-validated voucher). */
export function computeDiscount(v: Voucher, subtotal: number): number {
  let d = v.kind === "percent" ? (subtotal * v.value) / 100 : v.value;
  if (v.kind === "percent" && v.maxDiscount != null) d = Math.min(d, v.maxDiscount);
  d = Math.min(d, subtotal); // never exceed the subtotal
  return lak(Math.max(0, d));
}

export type VoucherCheck =
  | { ok: true; voucher: Voucher; discount: number }
  | { ok: false; error: string };

/**
 * Validate a code for a given subtotal + customer. Checks active, date window,
 * minimum, total usage, and per-customer usage. Returns the computed discount.
 */
export async function validateVoucher(
  code: string,
  subtotal: number,
  customerCode: string | null,
): Promise<VoucherCheck> {
  const c = (code ?? "").trim().toUpperCase();
  if (!c) return { ok: false, error: "ກະລຸນາໃສ່ໂຄ້ດ" };
  const row = await queryOne<Row>(
    `select ${COLS} from odg_ecom.vouchers where upper(code) = $1`,
    [c],
  );
  if (!row) return { ok: false, error: "ໂຄ້ດບໍ່ຖືກຕ້ອງ" };
  const v = toVoucher(row);

  if (!v.active) return { ok: false, error: "ໂຄ້ດນີ້ຖືກປິດໃຊ້ງານ" };
  const now = Date.now();
  if (v.startsAt && Date.parse(v.startsAt) > now) return { ok: false, error: "ໂຄ້ດຍັງບໍ່ທັນເລີ່ມ" };
  if (v.expiresAt && Date.parse(v.expiresAt) < now) return { ok: false, error: "ໂຄ້ດໝົດອາຍຸແລ້ວ" };
  if (subtotal < v.minSubtotal) {
    return { ok: false, error: `ຍອດຂັ້ນຕ່ຳ ${v.minSubtotal.toLocaleString("lo-LA")} ₭` };
  }
  if (v.usageLimit != null && v.usedCount >= v.usageLimit) {
    return { ok: false, error: "ໂຄ້ດຖືກໃຊ້ຄົບແລ້ວ" };
  }
  if (v.perCustomerLimit > 0 && customerCode) {
    const used = await queryOne<{ n: string }>(
      `select count(*)::text as n from odg_ecom.voucher_redemptions
        where voucher_id = $1 and customer_code = $2`,
      [v.id, customerCode],
    );
    if (Number(used?.n ?? 0) >= v.perCustomerLimit) {
      return { ok: false, error: "ທ່ານໃຊ້ໂຄ້ດນີ້ຄົບແລ້ວ" };
    }
  }

  const discount = computeDiscount(v, subtotal);
  if (discount <= 0) return { ok: false, error: "ໂຄ້ດນີ້ບໍ່ໄດ້ສ່ວນຫຼຸດ" };
  return { ok: true, voucher: v, discount };
}

/**
 * Record a redemption when an order is PAID. Idempotent per order_no (unique
 * index) and bumps used_count atomically. Safe to call best-effort.
 */
export async function redeemVoucher(input: {
  code: string;
  orderNo: string;
  customerCode: string | null;
  discount: number;
}): Promise<void> {
  const code = (input.code ?? "").trim().toUpperCase();
  if (!code || input.discount <= 0) return;
  const client = await pool.connect();
  try {
    await client.query("begin");
    const v = (
      await client.query<{ id: string }>(`select id from odg_ecom.vouchers where upper(code) = $1`, [code])
    ).rows[0];
    if (!v) {
      await client.query("rollback");
      return;
    }
    const ins = await client.query(
      `insert into odg_ecom.voucher_redemptions (voucher_id, code, order_no, customer_code, discount)
       values ($1, $2, $3, $4, $5)
       on conflict (order_no) do nothing`,
      [v.id, code, input.orderNo, input.customerCode, input.discount],
    );
    if (ins.rowCount && ins.rowCount > 0) {
      await client.query(`update odg_ecom.vouchers set used_count = used_count + 1 where id = $1`, [v.id]);
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    console.error("redeemVoucher failed:", e);
  } finally {
    client.release();
  }
}

// ── Admin CRUD ──────────────────────────────────────────────────────────────

export async function listVouchers(): Promise<Voucher[]> {
  const rows = await query<Row>(`select ${COLS} from odg_ecom.vouchers order by created_at desc`);
  return rows.map(toVoucher);
}

/** Active vouchers safe to advertise on the storefront. */
export async function listPublicVouchers(limit = 6): Promise<Voucher[]> {
  try {
    const rows = await query<Row>(
      `select ${COLS}
         from odg_ecom.vouchers
        where active
          and (starts_at is null or starts_at <= now())
          and (expires_at is null or expires_at >= now())
          and (usage_limit is null or used_count < usage_limit)
        order by expires_at asc nulls last, created_at desc
        limit $1`,
      [Math.max(1, Math.min(12, Math.floor(limit)))],
    );
    return rows.map(toVoucher);
  } catch {
    return [];
  }
}

export async function getVoucher(id: number): Promise<Voucher | null> {
  const r = await queryOne<Row>(`select ${COLS} from odg_ecom.vouchers where id = $1`, [id]);
  return r ? toVoucher(r) : null;
}

export interface VoucherInput {
  code: string;
  kind: "percent" | "amount";
  value: number;
  minSubtotal?: number;
  maxDiscount?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
  perCustomerLimit?: number;
  active?: boolean;
  note?: string | null;
}

export async function createVoucher(input: VoucherInput, createdBy?: string): Promise<Voucher> {
  const code = input.code.trim().toUpperCase();
  if (!code) throw new Error("ກະລຸນາໃສ່ໂຄ້ດ");
  if (!(input.value > 0)) throw new Error("ມູນຄ່າຕ້ອງ > 0");
  if (input.kind === "percent" && input.value > 100) throw new Error("ເປີເຊັນຕ້ອງ ≤ 100");
  const r = await queryOne<Row>(
    `insert into odg_ecom.vouchers
       (code, kind, value, min_subtotal, max_discount, starts_at, expires_at,
        usage_limit, per_customer_limit, active, note, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     returning ${COLS}`,
    [
      code, input.kind, input.value, input.minSubtotal ?? 0, input.maxDiscount ?? null,
      input.startsAt || null, input.expiresAt || null, input.usageLimit ?? null,
      input.perCustomerLimit ?? 1, input.active ?? true, input.note?.trim() || null, createdBy ?? null,
    ],
  );
  return toVoucher(r!);
}

export async function updateVoucher(id: number, input: VoucherInput): Promise<void> {
  const code = input.code.trim().toUpperCase();
  await query(
    `update odg_ecom.vouchers set
        code=$2, kind=$3, value=$4, min_subtotal=$5, max_discount=$6,
        starts_at=$7, expires_at=$8, usage_limit=$9, per_customer_limit=$10,
        active=$11, note=$12
      where id=$1`,
    [
      id, code, input.kind, input.value, input.minSubtotal ?? 0, input.maxDiscount ?? null,
      input.startsAt || null, input.expiresAt || null, input.usageLimit ?? null,
      input.perCustomerLimit ?? 1, input.active ?? true, input.note?.trim() || null,
    ],
  );
}

export async function setVoucherActive(id: number, active: boolean): Promise<void> {
  await query(`update odg_ecom.vouchers set active = $2 where id = $1`, [id, active]);
}

export async function deleteVoucher(id: number): Promise<void> {
  await query(`delete from odg_ecom.vouchers where id = $1`, [id]);
}
