import "server-only";
import { cache } from "react";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { pool, query, queryOne } from "./db";
import { getSession } from "./auth";
import { getAffiliateBank } from "./affiliate-banks";
import { sendAffiliateOtp } from "./email";
import {
  AFFILIATE_STATUSES,
  RATE_SCOPES,
  type AffiliateStatus,
  type CommissionStatus,
  type RateScope,
} from "./affiliate-constants";

// All affiliate-program data access lives here. Writes touch the app-owned
// `ecom` schema ONLY; the ERP (`public.*`) is read for category/product names
// and the per-line category when computing commissions. (db.ts is server-only.)

export class AffiliateError extends Error {}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

function genCode(): string {
  return "AF" + randomBytes(4).toString("hex").toUpperCase(); // e.g. AF1A2B3C4D
}

// ── shared shapes ───────────────────────────────────────────────────────────

export interface Affiliate {
  id: number;
  code: string;
  customerCode: string;
  name: string;
  phone: string | null;
  status: AffiliateStatus;
  createdAt: string;
  approvedAt: string | null;
  email: string | null;
  emailVerifiedAt: string | null;
  bankCode: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNo: string | null;
}

interface AffiliateRow {
  id: string;
  code: string;
  customer_code: string;
  name: string;
  phone: string | null;
  status: string;
  created_at: Date;
  approved_at: Date | null;
  email: string | null;
  email_verified_at: Date | null;
  bank_code: string | null;
  bank_name: string | null;
  account_name: string | null;
  account_no: string | null;
}

function mapAffiliate(r: AffiliateRow): Affiliate {
  return {
    id: Number(r.id),
    code: r.code,
    customerCode: r.customer_code,
    name: r.name,
    phone: r.phone,
    status: r.status as AffiliateStatus,
    createdAt: r.created_at.toISOString(),
    approvedAt: r.approved_at ? r.approved_at.toISOString() : null,
    email: r.email,
    emailVerifiedAt: r.email_verified_at ? r.email_verified_at.toISOString() : null,
    bankCode: r.bank_code,
    bankName: r.bank_name,
    accountName: r.account_name,
    accountNo: r.account_no,
  };
}

const AFFILIATE_COLS =
  `id, code, customer_code, name, phone, status, created_at, approved_at,
   email, email_verified_at, bank_code, bank_name, account_name, account_no`;

const SNAPSHOT_STATUS_SQL = `
  case
    when p.sml_doc_no is null then
      case when p.status = 'paid' then 'paid' else 'pending' end
    when coalesce(ic.is_cancel,0) = 1 then 'cancelled'
    when exists (
      select 1 from public.odg_tms_detail t
       where t.bill_no = p.sml_doc_no and t.sent_end is not null
    ) then 'completed'
    when exists (
      select 1 from public.odg_tms_detail t where t.bill_no = p.sml_doc_no
    ) then 'shipping'
    when ic.trans_flag = 34 and coalesce(p.payment_method,'transfer') = 'cod' then 'cod'
    when ic.trans_flag = 34 then 'awaiting_confirmation'
    else 'paid'
  end`;

// ── lookup / attribution ────────────────────────────────────────────────────

/** Active affiliate for a referral code — used at checkout for attribution. */
export async function resolveActiveAffiliate(
  code: string | null | undefined,
): Promise<{ id: number; customerCode: string } | null> {
  const c = (code ?? "").trim();
  if (!c) return null;
  const row = await queryOne<{ id: string; customer_code: string }>(
    `select id, customer_code from ecom.affiliates where code = $1 and status = 'active'`,
    [c],
  );
  return row ? { id: Number(row.id), customerCode: row.customer_code } : null;
}

/** Log a referral-link click (no-op if the code is not an active affiliate). */
export async function recordClick(code: string, path: string): Promise<void> {
  const aff = await resolveActiveAffiliate(code);
  if (!aff) return;
  await query(
    `insert into ecom.affiliate_clicks (affiliate_id, path) values ($1, $2)`,
    [aff.id, path.slice(0, 500)],
  );
}

export async function getAffiliateByCustomer(customerCode: string): Promise<Affiliate | null> {
  const row = await queryOne<AffiliateRow>(
    `select ${AFFILIATE_COLS} from ecom.affiliates where customer_code = $1`,
    [customerCode],
  );
  return row ? mapAffiliate(row) : null;
}

export async function getAffiliateByCode(code: string): Promise<Affiliate | null> {
  const row = await queryOne<AffiliateRow>(
    `select ${AFFILIATE_COLS} from ecom.affiliates where code = $1`,
    [code],
  );
  return row ? mapAffiliate(row) : null;
}

/** Self-service application — idempotent on customer_code; returns the row. */
export async function applyAsAffiliate(input: {
  customerCode: string;
  name: string;
  phone?: string | null;
  email: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  accountNo: string;
}): Promise<Affiliate> {
  const existing = await getAffiliateByCustomer(input.customerCode);
  if (existing) {
    const updated = await queryOne<AffiliateRow>(
      `update ecom.affiliates
          set name = $2,
              phone = coalesce($3, phone),
              email = $4,
              email_verified_at = now(),
              bank_code = $5,
              bank_name = $6,
              account_name = $7,
              account_no = $8
        where customer_code = $1
        returning ${AFFILIATE_COLS}`,
      [
        input.customerCode, input.name, input.phone ?? null, input.email,
        input.bankCode, input.bankName, input.accountName, input.accountNo,
      ],
    );
    return mapAffiliate(updated!);
  }

  for (let i = 0; i < 5; i++) {
    try {
      const rows = await query<AffiliateRow>(
        `insert into ecom.affiliates
           (code, customer_code, name, phone, status, email, email_verified_at,
            bank_code, bank_name, account_name, account_no)
         values ($1, $2, $3, $4, 'pending', $5, now(), $6, $7, $8, $9)
         on conflict (customer_code) do nothing
         returning ${AFFILIATE_COLS}`,
        [
          genCode(), input.customerCode, input.name, input.phone ?? null,
          input.email, input.bankCode, input.bankName, input.accountName, input.accountNo,
        ],
      );
      if (rows[0]) return mapAffiliate(rows[0]);
      // customer_code conflict → created concurrently; return the existing one.
      const ex = await getAffiliateByCustomer(input.customerCode);
      if (ex) return ex;
    } catch (e) {
      if (isUniqueViolation(e)) continue; // referral-code clash → retry
      throw e;
    }
  }
  throw new AffiliateError("ບໍ່ສາມາດສ້າງລະຫັດນາຍໜ້າໄດ້ ກະລຸນາລອງໃໝ່");
}

// ── email-verified application ──────────────────────────────────────────────

const OTP_TTL_MS = 10 * 60_000;
const OTP_RESEND_MS = 60_000;
const OTP_MAX_ATTEMPTS = 5;

function otpHash(customerCode: string, email: string, code: string): string {
  const secret = process.env.SESSION_SECRET || "odienmall-affiliate-dev";
  return createHmac("sha256", secret)
    .update(`${customerCode}:${email.toLowerCase()}:${code}`)
    .digest("hex");
}

function normalizeApplication(input: {
  email: string;
  bankCode: string;
  accountName: string;
  accountNo: string;
}) {
  const email = input.email.trim().toLowerCase();
  const bank = getAffiliateBank(input.bankCode);
  const accountName = input.accountName.trim().replace(/\s+/g, " ");
  const accountNo = input.accountNo.replace(/[\s-]+/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AffiliateError("ອີເມວບໍ່ຖືກຕ້ອງ");
  }
  if (!bank) throw new AffiliateError("ກະລຸນາເລືອກທະນາຄານ");
  if (accountName.length < 2 || accountName.length > 120) {
    throw new AffiliateError("ຊື່ບັນຊີບໍ່ຖືກຕ້ອງ");
  }
  if (!/^[0-9]{6,30}$/.test(accountNo)) {
    throw new AffiliateError("ເລກບັນຊີຕ້ອງເປັນຕົວເລກ 6–30 ຫຼັກ");
  }
  return { email, bank, accountName, accountNo };
}

export async function requestAffiliateEmailVerification(input: {
  customerCode: string;
  profileEmail: string;
  bankCode: string;
  accountName: string;
  accountNo: string;
}): Promise<void> {
  const existing = await getAffiliateByCustomer(input.customerCode);
  if (
    existing?.emailVerifiedAt &&
    existing.bankCode &&
    existing.accountName &&
    existing.accountNo
  ) {
    throw new AffiliateError("ຂໍ້ມູນ Affiliate ຂອງທ່ານຄົບແລ້ວ");
  }
  const normalized = normalizeApplication({
    email: input.profileEmail,
    bankCode: input.bankCode,
    accountName: input.accountName,
    accountNo: input.accountNo,
  });
  const emailOwner = await queryOne<{ customer_code: string }>(
    `select customer_code from ecom.affiliates
      where lower(email) = lower($1)
        and email_verified_at is not null
        and customer_code <> $2`,
    [normalized.email, input.customerCode],
  );
  if (emailOwner) {
    throw new AffiliateError("Email ນີ້ຖືກໃຊ້ກັບບັນຊີ Affiliate ອື່ນແລ້ວ");
  }
  const previous = await queryOne<{ sent_at: Date }>(
    `select sent_at from ecom.affiliate_email_verifications where customer_code = $1`,
    [input.customerCode],
  );
  if (previous && Date.now() - previous.sent_at.getTime() < OTP_RESEND_MS) {
    throw new AffiliateError("ກະລຸນາລໍຖ້າ 1 ນາທີກ່ອນສົ່ງລະຫັດໃໝ່");
  }

  const code = String(randomInt(100000, 1_000_000));
  await sendAffiliateOtp(normalized.email, code);
  await query(
    `insert into ecom.affiliate_email_verifications
       (customer_code, email, code_hash, bank_code, bank_name,
        account_name, account_no, attempts, sent_at, expires_at)
     values ($1,$2,$3,$4,$5,$6,$7,0,now(),$8)
     on conflict (customer_code) do update set
       email=excluded.email, code_hash=excluded.code_hash,
       bank_code=excluded.bank_code, bank_name=excluded.bank_name,
       account_name=excluded.account_name, account_no=excluded.account_no,
       attempts=0, sent_at=now(), expires_at=excluded.expires_at`,
    [
      input.customerCode,
      normalized.email,
      otpHash(input.customerCode, normalized.email, code),
      normalized.bank.code,
      normalized.bank.name,
      normalized.accountName,
      normalized.accountNo,
      new Date(Date.now() + OTP_TTL_MS),
    ],
  );
}

export async function verifyAffiliateEmailAndApply(input: {
  customerCode: string;
  name: string;
  phone?: string | null;
  code: string;
}): Promise<Affiliate> {
  const row = await queryOne<{
    email: string;
    code_hash: string;
    bank_code: string;
    bank_name: string;
    account_name: string;
    account_no: string;
    attempts: number;
    expires_at: Date;
  }>(
    `select email, code_hash, bank_code, bank_name, account_name, account_no,
            attempts, expires_at
       from ecom.affiliate_email_verifications
      where customer_code = $1`,
    [input.customerCode],
  );
  if (!row) throw new AffiliateError("ກະລຸນາຂໍລະຫັດຢືນຢັນກ່ອນ");
  if (row.expires_at.getTime() < Date.now()) {
    throw new AffiliateError("ລະຫັດໝົດອາຍຸແລ້ວ ກະລຸນາຂໍລະຫັດໃໝ່");
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AffiliateError("ຢືນຢັນຜິດເກີນກຳນົດ ກະລຸນາຂໍລະຫັດໃໝ່");
  }

  const expected = Buffer.from(row.code_hash, "hex");
  const actual = Buffer.from(otpHash(input.customerCode, row.email, input.code.trim()), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await query(
      `update ecom.affiliate_email_verifications
          set attempts = attempts + 1 where customer_code = $1`,
      [input.customerCode],
    );
    throw new AffiliateError("ລະຫັດຢືນຢັນບໍ່ຖືກຕ້ອງ");
  }

  const affiliate = await applyAsAffiliate({
    customerCode: input.customerCode,
    name: input.name,
    phone: input.phone,
    email: row.email,
    bankCode: row.bank_code,
    bankName: row.bank_name,
    accountName: row.account_name,
    accountNo: row.account_no,
  });
  await query(
    `delete from ecom.affiliate_email_verifications where customer_code = $1`,
    [input.customerCode],
  );
  return affiliate;
}

// ── customer dashboard ──────────────────────────────────────────────────────

export interface AffiliateOrderRow {
  orderNo: string;
  subtotal: number;
  status: string;
  createdAt: string;
  commissionAmount: number | null;
  commissionStatus: CommissionStatus | null;
}

export interface AffiliateDashboard {
  affiliate: Affiliate | null;
  clicks: number;
  referredOrders: number;
  earned: number;
  paid: number;
  recentOrders: AffiliateOrderRow[];
}

export async function getAffiliateDashboard(customerCode: string): Promise<AffiliateDashboard> {
  const affiliate = await getAffiliateByCustomer(customerCode);
  if (!affiliate) {
    return { affiliate: null, clicks: 0, referredOrders: 0, earned: 0, paid: 0, recentOrders: [] };
  }
  const id = affiliate.id;

  const [clickRow, orderRow, totals, recent] = await Promise.all([
    queryOne<{ n: number }>(
      `select count(*)::int as n from ecom.affiliate_clicks where affiliate_id = $1`,
      [id],
    ),
    queryOne<{ n: number }>(
      `select count(*)::int as n
         from ecom.onepay_payments p
        where p.referral_code = $1`,
      [affiliate.code],
    ),
    query<{ status: string; sum: string }>(
      `select status, coalesce(sum(amount),0)::text as sum
         from ecom.commissions where affiliate_id = $1 group by status`,
      [id],
    ),
    query<{
      order_no: string;
      subtotal: string;
      status: string;
      created_at: Date;
      commission_amount: string | null;
      commission_status: string | null;
    }>(
      `select p.order_no, coalesce(p.subtotal,0)::text as subtotal,
              (${SNAPSHOT_STATUS_SQL}) as status, p.created_at,
              c.amount as commission_amount, c.status as commission_status
         from ecom.onepay_payments p
         left join public.ic_trans ic on ic.doc_no = p.sml_doc_no
         left join ecom.commissions c on c.order_no = p.order_no
        where p.referral_code = $1
        order by p.created_at desc
        limit 20`,
      [affiliate.code],
    ),
  ]);

  let earned = 0;
  let paid = 0;
  for (const t of totals) {
    if (t.status === "paid") paid = Number(t.sum);
    else if (t.status === "earned") earned = Number(t.sum);
  }

  return {
    affiliate,
    clicks: clickRow?.n ?? 0,
    referredOrders: orderRow?.n ?? 0,
    earned,
    paid,
    recentOrders: recent.map((r) => ({
      orderNo: r.order_no,
      subtotal: Number(r.subtotal),
      status: r.status,
      createdAt: r.created_at.toISOString(),
      commissionAmount: r.commission_amount == null ? null : Number(r.commission_amount),
      commissionStatus: (r.commission_status as CommissionStatus | null) ?? null,
    })),
  };
}

// ── commission rates ────────────────────────────────────────────────────────

export interface RateRow {
  id: number;
  scope: RateScope;
  refKey: string | null;
  refName: string | null;
  ratePct: number;
}

export async function getCommissionRates(): Promise<RateRow[]> {
  const rows = await query<{
    id: string;
    scope: string;
    ref_key: string | null;
    ref_name: string | null;
    rate_pct: string;
  }>(
    `select r.id, r.scope, r.ref_key, r.rate_pct,
            case r.scope
              when 'category' then (select coalesce(nullif(c.name_1,''), r.ref_key)
                                      from public.ic_category c where c.code = r.ref_key)
              when 'product'  then (select coalesce(nullif(i.name_1,''), nullif(i.name_eng_1,''), r.ref_key)
                                      from public.ic_inventory i where i.code = r.ref_key)
              else null
            end as ref_name
       from ecom.commission_rates r
      order by case r.scope when 'default' then 0 when 'category' then 1 else 2 end, r.ref_key`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    scope: r.scope as RateScope,
    refKey: r.ref_key,
    refName: r.ref_name,
    ratePct: Number(r.rate_pct),
  }));
}

interface RateMap {
  default: number;
  category: Map<string, number>;
  brand: Map<string, number>;
  product: Map<string, number>;
}

async function resolveRateMap(): Promise<RateMap> {
  const rows = await query<{ scope: string; ref_key: string | null; rate_pct: string }>(
    `select scope, ref_key, rate_pct from ecom.commission_rates`,
  );
  const map: RateMap = { default: 0, category: new Map(), brand: new Map(), product: new Map() };
  for (const r of rows) {
    const rate = Number(r.rate_pct);
    if (r.scope === "default") map.default = rate;
    else if (r.scope === "category" && r.ref_key) map.category.set(r.ref_key, rate);
    else if (r.scope === "brand" && r.ref_key) map.brand.set(r.ref_key, rate);
    else if (r.scope === "product" && r.ref_key) map.product.set(r.ref_key, rate);
  }
  return map;
}

// Resolve one product's commission % with priority product → category → brand →
// default (stepwise from the most specific). Used by the affiliate-facing display.
function rateFor(
  map: RateMap,
  productCode: string,
  categoryCode: string | null | undefined,
  brandCode: string | null | undefined,
): number {
  return (
    map.product.get(productCode) ??
    (categoryCode ? map.category.get(categoryCode) : undefined) ??
    (brandCode ? map.brand.get(brandCode) : undefined) ??
    map.default
  );
}

/** Is the current logged-in customer an ACTIVE affiliate? (request-cached) */
export const currentAffiliateActive = cache(async (): Promise<boolean> => {
  const s = await getSession();
  if (!s?.code) return false;
  const aff = await getAffiliateByCustomer(s.code);
  return aff?.status === "active";
});

/**
 * Build a commission-rate resolver for the storefront display layer. Returns a
 * function (productCode, categoryCode, brandCode) → percent. Request-cached so a
 * whole product grid shares one rates query.
 */
export const getCommissionResolver = cache(async () => {
  const map = await resolveRateMap();
  return (productCode: string, categoryCode?: string | null, brandCode?: string | null) =>
    rateFor(map, productCode, categoryCode, brandCode);
});

/** Upsert a rate. `default` ignores refKey; category/product require one. */
export async function setRate(input: {
  scope: RateScope;
  refKey?: string | null;
  ratePct: number;
}): Promise<void> {
  if (!(RATE_SCOPES as readonly string[]).includes(input.scope)) {
    throw new AffiliateError("ປະເພດອັດຕາບໍ່ຖືກຕ້ອງ");
  }
  const rate = Number(input.ratePct);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new AffiliateError("ອັດຕາຕ້ອງຢູ່ລະຫວ່າງ 0–100");
  }
  if (input.scope === "default") {
    const upd = await query<{ id: string }>(
      `update ecom.commission_rates set rate_pct = $1, updated_at = now()
        where scope = 'default' returning id`,
      [rate],
    );
    if (upd.length === 0) {
      await query(
        `insert into ecom.commission_rates (scope, ref_key, rate_pct) values ('default', null, $1)`,
        [rate],
      );
    }
    return;
  }
  const refKey = (input.refKey ?? "").trim();
  if (!refKey) throw new AffiliateError("ກະລຸນາໃສ່ລະຫັດໝວດ ຫຼື ສິນຄ້າ");
  const updated = await query<{ id: string }>(
    `update ecom.commission_rates set rate_pct = $1, updated_at = now()
      where scope = $2 and ref_key = $3 returning id`,
    [rate, input.scope, refKey],
  );
  if (updated.length === 0) {
    await query(
      `insert into ecom.commission_rates (scope, ref_key, rate_pct) values ($1, $2, $3)`,
      [input.scope, refKey, rate],
    );
  }
}

export async function deleteRate(id: number): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `delete from ecom.commission_rates where id = $1 and scope <> 'default' returning id`,
    [id],
  );
  return rows.length > 0;
}

// ── commission lifecycle (synced from OnePay/SML/TMS) ────────────────────────

/**
 * Compute + record commission for a completed OnePay/SML order. Idempotent:
 * a no-op if a commission already exists. Per line rate priority is
 * product → category → default.
 */
export async function recordCommission(orderNo: string): Promise<boolean> {
  const order = await queryOne<{
    affiliate_id: string;
    subtotal: string;
    items: unknown;
  }>(
    `select a.id as affiliate_id, coalesce(p.subtotal,0)::text as subtotal, p.items
       from ecom.onepay_payments p
       join ecom.affiliates a on a.code = p.referral_code
      where p.order_no = $1 and p.referral_code is not null`,
    [orderNo],
  );
  if (!order || !Array.isArray(order.items)) return false;

  const exists = await queryOne<{ id: string }>(
    `select id from ecom.commissions where order_no = $1`,
    [orderNo],
  );
  if (exists) return false;

  const lines = order.items as Array<{
    productCode?: unknown;
    lineTotal?: unknown;
  }>;
  const productCodes = [
    ...new Set(lines.map((line) => String(line.productCode ?? "").trim()).filter(Boolean)),
  ];
  const meta = productCodes.length
    ? await query<{ code: string; item_category: string | null; item_brand: string | null }>(
        `select code, item_category, item_brand from public.ic_inventory where code = any($1::text[])`,
        [productCodes],
      )
    : [];
  const categoryByProduct = new Map(meta.map((row) => [row.code, row.item_category]));
  const brandByProduct = new Map(meta.map((row) => [row.code, row.item_brand]));

  const rates = await resolveRateMap();
  let amount = 0;
  for (const line of lines) {
    const productCode = String(line.productCode ?? "").trim();
    const lineTotal = Number(line.lineTotal ?? 0);
    if (!productCode || !Number.isFinite(lineTotal) || lineTotal <= 0) continue;
    const rate = rateFor(rates, productCode, categoryByProduct.get(productCode), brandByProduct.get(productCode));
    amount += (lineTotal * rate) / 100;
  }
  amount = Math.round(amount * 100) / 100;

  const inserted = await query<{ id: string }>(
    `insert into ecom.commissions
       (order_id, order_no, affiliate_id, base_amount, amount, status)
     values (null, $1, $2, $3, $4, 'earned')
     on conflict (order_no) where order_no is not null do nothing
     returning id`,
    [orderNo, Number(order.affiliate_id), Number(order.subtotal), amount],
  );
  return inserted.length > 0;
}

/** Remove an unpaid commission if a previously completed order is reversed. */
export async function voidUnpaidCommission(orderNo: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `delete from ecom.commissions
      where order_no = $1 and status = 'earned'
      returning id`,
    [orderNo],
  );
  return rows.length > 0;
}

/**
 * Reconcile affiliate commission against the authoritative SML/TMS state.
 * Called by /api/cron; safe to run repeatedly.
 */
export async function syncAffiliateCommissions(): Promise<{
  scanned: number;
  created: number;
  voided: number;
}> {
  const orders = await query<{ order_no: string; completed: boolean }>(
    `select p.order_no,
            (
              coalesce(ic.is_cancel,0) = 0
              and exists (
                select 1 from public.odg_tms_detail t
                 where t.bill_no = p.sml_doc_no and t.sent_end is not null
              )
            ) as completed
       from ecom.onepay_payments p
       join ecom.affiliates a on a.code = p.referral_code
       left join public.ic_trans ic on ic.doc_no = p.sml_doc_no
      where p.referral_code is not null
        and p.referral_code <> ''
        and p.sml_doc_no is not null`,
  );

  let created = 0;
  let voided = 0;
  for (const order of orders) {
    if (order.completed) {
      if (await recordCommission(order.order_no)) created++;
    } else if (await voidUnpaidCommission(order.order_no)) {
      voided++;
    }
  }
  return { scanned: orders.length, created, voided };
}

// ── admin views / actions ───────────────────────────────────────────────────

export interface AffiliateListRow extends Affiliate {
  clicks: number;
  referred: number;
  earned: number;
  paid: number;
}

export async function listAffiliates(statusFilter?: string): Promise<AffiliateListRow[]> {
  const useStatus =
    statusFilter && (AFFILIATE_STATUSES as readonly string[]).includes(statusFilter);
  const rows = await query<
    AffiliateRow & { clicks: number; referred: number; earned: string; paid: string }
  >(
    `select a.id, a.code, a.customer_code, a.name, a.phone, a.status, a.created_at, a.approved_at,
            a.email, a.email_verified_at, a.bank_code, a.bank_name, a.account_name, a.account_no,
            (select count(*) from ecom.affiliate_clicks ac
              where ac.affiliate_id = a.id)::int as clicks,
            (select count(*) from ecom.onepay_payments p
              where p.referral_code = a.code)::int as referred,
            coalesce((select sum(amount) from ecom.commissions c
                       where c.affiliate_id = a.id and c.status = 'earned'),0)::text as earned,
            coalesce((select sum(amount) from ecom.commissions c
                       where c.affiliate_id = a.id and c.status = 'paid'),0)::text as paid
       from ecom.affiliates a
      ${useStatus ? "where a.status = $1" : ""}
      order by (a.status = 'pending') desc, a.created_at desc`,
    useStatus ? [statusFilter] : [],
  );
  return rows.map((r) => ({
    ...mapAffiliate(r),
    clicks: r.clicks,
    referred: r.referred,
    earned: Number(r.earned),
    paid: Number(r.paid),
  }));
}

/** Set an affiliate's status; stamps approved_at the first time it goes active. */
export async function setAffiliateStatus(
  code: string,
  status: AffiliateStatus,
): Promise<boolean> {
  if (!(AFFILIATE_STATUSES as readonly string[]).includes(status)) {
    throw new AffiliateError("ສະຖານະບໍ່ຖືກຕ້ອງ");
  }
  if (status === "active") {
    const ready = await queryOne<{ ok: boolean }>(
      `select (
          email_verified_at is not null
          and coalesce(bank_code,'') <> ''
          and coalesce(account_name,'') <> ''
          and coalesce(account_no,'') <> ''
        ) as ok
         from ecom.affiliates where code = $1`,
      [code],
    );
    if (!ready?.ok) {
      throw new AffiliateError("ຕ້ອງຢືນຢັນ email ແລະໃສ່ຂໍ້ມູນທະນາຄານໃຫ້ຄົບກ່ອນ");
    }
  }
  const rows = await query<{ id: string }>(
    `update ecom.affiliates
        set status = $2,
            approved_at = case when $2 = 'active' then coalesce(approved_at, now()) else approved_at end
      where code = $1 returning id`,
    [code, status],
  );
  return rows.length > 0;
}

export interface CommissionLedgerRow {
  id: number;
  orderNo: string;
  baseAmount: number;
  amount: number;
  status: CommissionStatus;
  createdAt: string;
  paidAt: string | null;
}

export interface PayoutRow {
  id: number;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface AffiliateDetail {
  affiliate: Affiliate;
  clicks: number;
  referred: number;
  earned: number;
  paid: number;
  commissions: CommissionLedgerRow[];
  payouts: PayoutRow[];
}

export async function getAffiliateDetail(code: string): Promise<AffiliateDetail | null> {
  const affiliate = await getAffiliateByCode(code);
  if (!affiliate) return null;
  const id = affiliate.id;

  const [clickRow, refRow, totals, commissions, payouts] = await Promise.all([
    queryOne<{ n: number }>(
      `select count(*)::int as n from ecom.affiliate_clicks where affiliate_id = $1`,
      [id],
    ),
    queryOne<{ n: number }>(
      `select count(*)::int as n from ecom.onepay_payments where referral_code = $1`,
      [affiliate.code],
    ),
    query<{ status: string; sum: string }>(
      `select status, coalesce(sum(amount),0)::text as sum
         from ecom.commissions where affiliate_id = $1 group by status`,
      [id],
    ),
    query<{
      id: string;
      order_no: string;
      base_amount: string;
      amount: string;
      status: string;
      created_at: Date;
      paid_at: Date | null;
    }>(
      `select c.id, coalesce(c.order_no, o.order_no) as order_no,
              c.base_amount, c.amount, c.status, c.created_at, c.paid_at
         from ecom.commissions c
         left join ecom.orders o on o.id = c.order_id
        where c.affiliate_id = $1
        order by c.created_at desc`,
      [id],
    ),
    query<{ id: string; amount: string; note: string | null; created_at: Date }>(
      `select id, amount, note, created_at from ecom.payouts
        where affiliate_id = $1 order by created_at desc`,
      [id],
    ),
  ]);

  let earned = 0;
  let paid = 0;
  for (const t of totals) {
    if (t.status === "paid") paid = Number(t.sum);
    else if (t.status === "earned") earned = Number(t.sum);
  }

  return {
    affiliate,
    clicks: clickRow?.n ?? 0,
    referred: refRow?.n ?? 0,
    earned,
    paid,
    commissions: commissions.map((c) => ({
      id: Number(c.id),
      orderNo: c.order_no,
      baseAmount: Number(c.base_amount),
      amount: Number(c.amount),
      status: c.status as CommissionStatus,
      createdAt: c.created_at.toISOString(),
      paidAt: c.paid_at ? c.paid_at.toISOString() : null,
    })),
    payouts: payouts.map((p) => ({
      id: Number(p.id),
      amount: Number(p.amount),
      note: p.note,
      createdAt: p.created_at.toISOString(),
    })),
  };
}

/** Pay out all earned commission for an affiliate; returns the amount paid. */
export async function payAffiliate(code: string, note?: string): Promise<number> {
  const affiliate = await getAffiliateByCode(code);
  if (!affiliate) throw new AffiliateError("ບໍ່ພົບນາຍໜ້າ");
  if (
    !affiliate.emailVerifiedAt ||
    !affiliate.bankCode ||
    !affiliate.accountName ||
    !affiliate.accountNo
  ) {
    throw new AffiliateError("Affiliate ຍັງບໍ່ໄດ້ຢືນຢັນ email ຫຼືຂໍ້ມູນທະນາຄານບໍ່ຄົບ");
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    // Serialize payouts for this affiliate, then lock the exact earned rows.
    await client.query(`select id from ecom.affiliates where id = $1 for update`, [affiliate.id]);
    const earnedRes = await client.query<{ id: string; amount: string }>(
      `select id, amount::text as amount
         from ecom.commissions
        where affiliate_id = $1 and status = 'earned'
        order by id
        for update`,
      [affiliate.id],
    );
    const amount = earnedRes.rows.reduce((sum, row) => sum + Number(row.amount), 0);
    if (amount <= 0) {
      await client.query("rollback");
      return 0;
    }
    const payoutRes = await client.query<{ id: string }>(
      `insert into ecom.payouts (affiliate_id, amount, note) values ($1, $2, $3) returning id`,
      [affiliate.id, amount, note?.trim() || null],
    );
    const payoutId = payoutRes.rows[0].id;
    const commissionIds = earnedRes.rows.map((row) => row.id);
    await client.query(
      `update ecom.commissions
          set status = 'paid', paid_at = now(), payout_id = $2
        where id = any($1::bigint[]) and status = 'earned'`,
      [commissionIds, payoutId],
    );
    await client.query("commit");
    return amount;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
