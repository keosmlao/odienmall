import "server-only";
import { query, queryOne } from "./db";
import {
  onepayEnabled,
  onepayMerchantConfigured,
  generateQr,
  buildLocalQr,
  checkPayment,
  QR_EXPIRE_MINUTES,
  type PaymentState,
  type PaymentStatus,
} from "./onepay";
import { getOnepayRuntimeConfig } from "./settings";
import { createCaeOrder, smlDirectWriteEnabled, type CaeOrderInput } from "./sml-sale-order";
import { redeemVoucher } from "./vouchers";
import { redeemPoints, earnPoints, POINT_VALUE } from "./loyalty";
import { notify } from "./notifications";
import { lineNotifyAdmin } from "./line-notify";
import { sendPushToAdminBroadcast } from "./push";
import { sendOrderConfirmationEmail, emailConfigured } from "./email";

// Persistence + orchestration for per-order OnePay QR codes (odg_ecom.onepay_payments).
// This table also holds the PENDING-ORDER snapshot until the customer pays — the
// order is written to SML (public.ic_trans, CAE flag 34) only on payment.

export interface PendingOrderInput extends CaeOrderInput {
  orderNo: string;
  voucherCode?: string | null;
  /** Loyalty points redeemed on this order (LAK value = points × POINT_VALUE). */
  pointsUsed?: number;
  /** Member-tier discount in LAK. */
  memberDiscount?: number;
  /** 'transfer' (BCEL QR) or 'cod' (cash on delivery). */
  paymentMethod?: string;
  /** 'odien' or 'thanjai' delivery service. */
  shippingMethod?: string;
  /** Staff/admin code when created on behalf; null for customer self-checkout. */
  createdBy?: string | null;
  /** SML transport branch code chosen at creation (admin assisted orders). */
  transportCode?: string | null;
}

/** Hold a not-yet-paid order as a snapshot on its QR row (keyed by temp order_no).
 *  The charged amount is NET = subtotal + shipping − voucher discount − points value. */
export async function storePendingOrder(o: PendingOrderInput): Promise<void> {
  const discount = Math.max(0, Math.round(o.discount ?? 0)); // voucher discount (LAK)
  const memberDiscount = Math.max(0, Math.round(o.memberDiscount ?? 0));
  const points = Math.max(0, Math.floor(o.pointsUsed ?? 0));
  const net = Math.max(0, o.subtotal + o.shippingFee - discount - memberDiscount - points * POINT_VALUE);
  const payMethod = o.paymentMethod === "cod" ? "cod" : "transfer";
  const shipMethod = o.shippingMethod === "thanjai" ? "thanjai" : "odien";
  await query(
    `insert into odg_ecom.onepay_payments
       (order_no, uuid, amount, qrc, status, cust_code, cust_name, phone, address, note,
        referral_code, items, subtotal, shipping_fee, voucher_code, discount, points_used,
        member_discount, payment_method, shipping_method, created_by, transport_code, sale_code)
     values ($1, $1, $2, '', 'pending', $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
     on conflict (order_no) do update set
        cust_code = excluded.cust_code, cust_name = excluded.cust_name,
        phone = excluded.phone, address = excluded.address, note = excluded.note,
        referral_code = excluded.referral_code, items = excluded.items,
        subtotal = excluded.subtotal, shipping_fee = excluded.shipping_fee,
        voucher_code = excluded.voucher_code, discount = excluded.discount,
        points_used = excluded.points_used, member_discount = excluded.member_discount,
        payment_method = excluded.payment_method,
        shipping_method = excluded.shipping_method, amount = excluded.amount,
        created_by = excluded.created_by, transport_code = excluded.transport_code,
        sale_code = excluded.sale_code`,
    [
      o.orderNo, net, o.customerCode, o.name, o.phone,
      o.address, o.note, o.referralCode, JSON.stringify(o.lines), o.subtotal, o.shippingFee,
      o.voucherCode?.trim() || null, discount, points, memberDiscount, payMethod, shipMethod,
      o.createdBy ?? null, o.transportCode?.trim() || null, o.saleCode?.trim() || null,
    ],
  );
}

type SnapshotRow = {
  cust_code: string | null;
  cust_name: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
  referral_code: string | null;
  items: CaeOrderInput["lines"] | null;
  subtotal: string | null;
  shipping_fee: string | null;
  voucher_code: string | null;
  discount: string | null;
  points_used: number | null;
  member_discount: string | null;
  payment_method: string | null;
  shipping_method: string | null;
  sale_code: string | null;
  sml_doc_no: string | null;
  status: string;
};

/** The pending-order snapshot for a temp order_no (null if none). */
export async function getPendingOrder(orderNo: string): Promise<
  | {
      orderNo: string;
      smlDocNo: string | null;
      status: string;
      customerCode: string | null;
      name: string;
      phone: string;
      address: string | null;
      note: string | null;
      referralCode: string | null;
      voucherCode: string | null;
      discount: number;
      memberDiscount: number;
      pointsUsed: number;
      paymentMethod: string;
      shippingMethod: string;
      saleCode: string | null;
      lines: CaeOrderInput["lines"];
      subtotal: number;
      shippingFee: number;
    }
  | null
> {
  const r = await queryOne<SnapshotRow>(
    `select cust_code, cust_name, phone, address, note, referral_code, items,
            subtotal, shipping_fee, voucher_code, discount, points_used, member_discount,
            payment_method, shipping_method, sale_code, sml_doc_no, status
       from odg_ecom.onepay_payments where order_no = $1`,
    [orderNo],
  );
  if (!r || r.items == null) return null;
  return {
    orderNo,
    smlDocNo: r.sml_doc_no,
    status: r.status,
    customerCode: r.cust_code,
    name: r.cust_name ?? "",
    phone: r.phone ?? "",
    address: r.address,
    note: r.note,
    referralCode: r.referral_code,
    voucherCode: r.voucher_code,
    discount: Number(r.discount ?? 0),
    memberDiscount: Number(r.member_discount ?? 0),
    pointsUsed: Number(r.points_used ?? 0),
    paymentMethod: r.payment_method ?? "transfer",
    shippingMethod: r.shipping_method ?? "odien",
    saleCode: r.sale_code,
    lines: r.items,
    subtotal: Number(r.subtotal ?? 0),
    shippingFee: Number(r.shipping_fee ?? 0),
  };
}

/**
 * Write a pending order into SML (ic_trans CAE flag 34) + apply voucher/points.
 * `paid` distinguishes a settled transfer (earn loyalty + "paid" notice) from a
 * COD order (placed, cash to collect — no earn yet). Idempotent on sml_doc_no.
 */
async function materializeOrder(orderNo: string, paid: boolean): Promise<string | null> {
  if (!smlDirectWriteEnabled()) return null;
  const snap = await getPendingOrder(orderNo);
  if (!snap || snap.smlDocNo) return snap?.smlDocNo ?? null;
  if (!snap.lines || snap.lines.length === 0) return null;
  const pointsValue = snap.pointsUsed * POINT_VALUE;
  const totalDiscount = snap.discount + snap.memberDiscount + pointsValue;
  const net = Math.max(0, snap.subtotal + snap.shippingFee - totalDiscount);
  const docNo = await createCaeOrder({
    customerCode: snap.customerCode,
    name: snap.name,
    phone: snap.phone,
    address: snap.address,
    note: snap.note,
    referralCode: snap.referralCode,
    lines: snap.lines,
    subtotal: snap.subtotal,
    shippingFee: snap.shippingFee,
    discount: totalDiscount, // voucher + member + points → SML total_discount
    saleCode: snap.saleCode, // ພະນັກງານຂາຍ → ic_trans.sale_code
  });
  await query(`update odg_ecom.onepay_payments set sml_doc_no = $2 where order_no = $1`, [orderNo, docNo]);

  // Voucher redemption + points spend happen regardless of pay timing (idempotent).
  if (snap.voucherCode && snap.discount > 0) {
    await redeemVoucher({ code: snap.voucherCode, orderNo: docNo, customerCode: snap.customerCode, discount: snap.discount })
      .catch((e) => console.error("redeemVoucher failed:", e));
  }
  if (snap.customerCode && snap.pointsUsed > 0) {
    await redeemPoints(snap.customerCode, docNo, snap.pointsUsed).catch(() => {});
  }

  if (snap.customerCode) {
    if (paid) {
      // Loyalty points are earned only on a settled (transfer) order.
      const earned = await earnPoints(snap.customerCode, docNo, net).catch(() => 0);
      await notify(snap.customerCode, {
        type: "order",
        title: "ຊຳລະເງິນສຳເລັດ ✅",
        body: earned > 0 ? `ອໍເດີ ${docNo} ໄດ້ຮັບ ${earned} ແຕ້ມ` : `ອໍເດີ ${docNo} ຊຳລະແລ້ວ`,
        link: `/order/${orderNo}`,
      }).catch(() => {});
    } else {
      await notify(snap.customerCode, {
        type: "order",
        title: "ຮັບຄຳສັ່ງຊື້ແລ້ວ (COD) 📦",
        body: `ອໍເດີ ${docNo} — ຈ່າຍເງິນສົດເມື່ອຮັບສິນຄ້າ`,
        link: `/order/${orderNo}`,
      }).catch(() => {});
    }
  }

  // Notify admin via LINE and web-push.
  const adminTitle = paid ? "ຊຳລະ QR ສຳເລັດ 💰" : "ອໍເດີ COD ໃໝ່ 📦";
  const adminBody = `${docNo} — ${snap.name} — ${snap.subtotal.toLocaleString()} ₭`;
  const lineMsg = paid
    ? `\n[OdienMall] ຊຳລະ QR ສຳເລັດ\nບິນ: ${docNo}\nລູກຄ້າ: ${snap.name} ${snap.phone ?? ""}\nຍອດ: ${snap.subtotal.toLocaleString()} ₭`
    : `\n[OdienMall] ອໍເດີໃໝ່ (COD)\nບິນ: ${docNo}\nລູກຄ້າ: ${snap.name} ${snap.phone ?? ""}\nຍອດ: ${snap.subtotal.toLocaleString()} ₭`;
  lineNotifyAdmin(lineMsg).catch(() => {});
  sendPushToAdminBroadcast({ title: adminTitle, body: adminBody, link: "/admin" }).catch(() => {});

  // Send order confirmation email to customer (best-effort; needs SMTP_HOST + EMAIL_FROM).
  if (emailConfigured() && snap.customerCode) {
    queryOne<{ email: string | null }>(
      `select email from public.ar_customer where code = $1`,
      [snap.customerCode],
    ).then((row) => {
      const email = row?.email?.trim() || "";
      if (!email) return;
      const trackUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://odienmall.com"}/order/${snap.orderNo ?? docNo}`;
      return sendOrderConfirmationEmail({
        orderNo: docNo,
        customerName: snap.name,
        customerEmail: email,
        items: snap.lines.map((l) => ({ name: l.productName, qty: l.qty, price: l.unitPrice * l.qty })),
        subtotal: snap.subtotal,
        shippingFee: snap.shippingFee,
        paymentMethod: paid ? "transfer" : "cod",
        trackUrl,
      });
    }).catch(() => {});
  }

  return docNo;
}

/** Transfer order settled — materialise + earn loyalty. */
export async function materializePaidOrder(orderNo: string): Promise<string | null> {
  return materializeOrder(orderNo, true);
}

/** COD order placed at checkout — materialise immediately (flag 34, unpaid). */
export async function materializeCodOrder(orderNo: string): Promise<string | null> {
  return materializeOrder(orderNo, false);
}

export interface OnepayPayment {
  orderNo: string;
  uuid: string;
  amount: number;
  qrc: string;
  status: PaymentState | string;
  ticket: string | null;
  fccRef: string | null;
  payerName: string | null;
  paidAt: string | null;
  /** ISO string; null for legacy rows without an expiry. */
  expiresAt: string | null;
}

type Row = {
  order_no: string;
  uuid: string;
  amount: string;
  qrc: string;
  status: string;
  ticket: string | null;
  fcc_ref: string | null;
  payer_name: string | null;
  paid_at: string | null;
  expires_at: string | null;
};

const SELECT = `order_no, uuid, amount, qrc, status, ticket, fcc_ref, payer_name, paid_at, expires_at`;

function toPayment(r: Row): OnepayPayment {
  return {
    orderNo: r.order_no,
    uuid: r.uuid,
    amount: Number(r.amount),
    qrc: r.qrc,
    status: r.status,
    ticket: r.ticket,
    fccRef: r.fcc_ref,
    payerName: r.payer_name,
    paidAt: r.paid_at,
    expiresAt: r.expires_at,
  };
}

function isExpired(p: OnepayPayment): boolean {
  return !!p.expiresAt && Date.parse(p.expiresAt) <= Date.now();
}

/** Stored OnePay record for an order, or null. */
export async function getOrderPayment(orderNo: string): Promise<OnepayPayment | null> {
  const row = await queryOne<Row>(
    `select ${SELECT} from odg_ecom.onepay_payments where order_no = $1`,
    [orderNo],
  );
  return row ? toPayment(row) : null;
}

/** Stored OnePay record by the QR's uuid (what BCEL echoes in its callback). */
export async function getOrderPaymentByUuid(uuid: string): Promise<OnepayPayment | null> {
  if (!uuid) return null;
  const row = await queryOne<Row>(
    `select ${SELECT} from odg_ecom.onepay_payments where uuid = $1`,
    [uuid],
  );
  return row ? toPayment(row) : null;
}

export type CallbackResult =
  | { ok: true; orderNo: string; alreadyPaid: boolean }
  | { ok: false; reason: "notfound" | "not-paid" | "error" };

/**
 * Confirm a payment from a BCEL One callback (webhook). Matches the order by the
 * QR `uuid` (preferred) or `invoiceId` (= order_no). When the API is enabled we
 * RE-VERIFY with checkonepayqr before trusting the callback; otherwise we trust
 * the (token-gated) callback. Marks the payment paid and advances the order
 * pending → paid. Idempotent.
 */
export async function confirmPaymentByCallback(input: {
  uuid?: string;
  invoiceId?: string;
  /** True only after the server verifies BCEL's RSA callback signature. */
  trustedCallback?: boolean;
  /** Signed callback amount, when supplied by BCEL. */
  amount?: number;
  /** Transfer reference from the realtime push (used when the API is off). */
  info?: { ticket?: string; fccRef?: string; payerName?: string };
}): Promise<CallbackResult> {
  try {
    const rec =
      (input.uuid ? await getOrderPaymentByUuid(input.uuid) : null) ??
      (input.invoiceId ? await getOrderPayment(input.invoiceId) : null);
    if (!rec) return { ok: false, reason: "notfound" };
    if (rec.status === "paid") return { ok: true, orderNo: rec.orderNo, alreadyPaid: true };
    if (
      input.amount != null &&
      (!Number.isFinite(input.amount) || Number(input.amount) !== rec.amount)
    ) {
      return { ok: false, reason: "not-paid" };
    }

    // Defence in depth: if we can talk to BCEL, confirm the payment is real
    // before trusting the callback. Without the API, only an RSA-verified BCEL
    // callback may settle the order; browser/PubNub events are notifications only.
    let extra: Partial<PaymentStatus> = {};
    if (onepayEnabled()) {
      const st = await checkPayment(rec.uuid);
      if (st.state !== "paid") return { ok: false, reason: "not-paid" };
      extra = st;
    } else if (!input.trustedCallback) {
      return { ok: false, reason: "not-paid" };
    }
    // Prefer the API-verified reference; otherwise use the realtime push info.
    const ticket = extra.ticket ?? input.info?.ticket ?? null;
    const fccRef = extra.fccRef ?? input.info?.fccRef ?? null;
    const payerName = extra.payerName ?? input.info?.payerName ?? null;

    await query(
      `update odg_ecom.onepay_payments
          set status = 'paid',
              ticket = coalesce($2, ticket),
              fcc_ref = coalesce($3, fcc_ref),
              payer_name = coalesce($4, payer_name),
              paid_at = now(),
              checked_at = now()
        where order_no = $1`,
      [rec.orderNo, ticket, fccRef, payerName],
    );
    // Now that it's paid, materialise the held order into SML (ic_trans CAE 34).
    await materializePaidOrder(rec.orderNo).catch((e) =>
      console.error(`materializePaidOrder(${rec.orderNo}) failed:`, e),
    );
    return { ok: true, orderNo: rec.orderNo, alreadyPaid: false };
  } catch (e) {
    console.error("confirmPaymentByCallback failed:", e);
    return { ok: false, reason: "error" };
  }
}

/**
 * Verify a BCEL callback by querying BCEL again with the callback UUID, then
 * atomically mark both the payment and order paid. Callback fields themselves
 * are never trusted as proof of payment.
 */
export async function verifyOnepayCallback(uuid: string): Promise<PaymentStatus> {
  const payment = await queryOne<{ orderNo: string; amount: string }>(
    `select order_no as "orderNo", amount::text as amount
       from odg_ecom.onepay_payments where uuid = $1`,
    [uuid],
  );
  if (!payment) throw new Error("OnePay callback: UUID not found");

  const status = await checkPayment(uuid);
  if (status.state !== "paid") return status;

  const expected = Number(payment.amount);
  const received = Number(status.amount);
  if (!Number.isFinite(received) || received !== expected) {
    throw new Error(
      `OnePay callback: amount mismatch (expected ${expected}, received ${status.amount ?? "missing"})`,
    );
  }

  await query(
    `update odg_ecom.onepay_payments
        set status='paid', ticket=coalesce($2,ticket),
            fcc_ref=coalesce($3,fcc_ref), payer_name=coalesce($4,payer_name),
            paid_at=coalesce(paid_at,now()), checked_at=now()
      where uuid=$1`,
    [uuid, status.ticket ?? null, status.fccRef ?? null, status.payerName ?? null],
  );
  await materializePaidOrder(payment.orderNo).catch((e) =>
    console.error(`materializePaidOrder(${payment.orderNo}) failed:`, e),
  );
  return status;
}

async function generateInto(
  orderNo: string,
  amount: number,
  desc: string,
  mode: "insert" | "update",
): Promise<OnepayPayment | null> {
  try {
    const runtime = await getOnepayRuntimeConfig();
    const qrAmount = runtime.testMode ? runtime.testAmount : amount;
    // The reference sent to BCEL IS the order number (uuid = invoiceid = order_no),
    // so the payment is tied to this order and BCEL de-dups it — a customer can't
    // pay the same order twice, and the callback always maps back to the order.
    const uuid = orderNo;
    let qrc: string;
    let expireAt: Date;
    if (onepayEnabled()) {
      try {
        const r = await generateQr({ amount: qrAmount, uuid, invoiceId: orderNo, desc });
        qrc = r.qrc;
        expireAt = r.expireAt;
      } catch (e) {
        // BCEL rejects a repeat uuid ("UUID is duplicate") — a transaction for this
        // order already exists there, so reuse the QR we already stored.
        if (String(e).toLowerCase().includes("duplicate")) {
          const existing = await getOrderPayment(orderNo);
          if (existing) return existing;
        }
        throw e;
      }
    } else {
      expireAt = new Date(Date.now() + QR_EXPIRE_MINUTES * 60_000);
      qrc = buildLocalQr({ amount: qrAmount, billNo: orderNo, expireAt });
    }
    const row =
      mode === "insert"
        ? await queryOne<Row>(
            `insert into odg_ecom.onepay_payments
               (order_no, uuid, invoice_id, amount, qrc, status, expires_at)
             values ($1,$2,$3,$4,$5,'generated',$6)
             on conflict (order_no) do nothing
             returning ${SELECT}`,
            [orderNo, uuid, orderNo, qrAmount, qrc, expireAt.toISOString()],
          )
        : await queryOne<Row>(
            `update odg_ecom.onepay_payments
                set uuid = $2, amount = $3, qrc = $4, status = 'generated',
                    expires_at = $5, ticket = null, fcc_ref = null,
                    payer_name = null, paid_at = null, checked_at = null,
                    created_at = now()
              where order_no = $1
              returning ${SELECT}`,
            [orderNo, uuid, qrAmount, qrc, expireAt.toISOString()],
          );
    return row ? toPayment(row) : await getOrderPayment(orderNo);
  } catch (e) {
    console.error("OnePay QR generation failed:", e);
    return null;
  }
}

/**
 * Return the OnePay QR for an order, generating + persisting it on first use,
 * and regenerating automatically once the previous QR has expired (unless it's
 * already paid). Best-effort: returns null if OnePay is disabled / generation
 * fails (caller then falls back to the static bank-transfer block).
 */
export async function getOrCreateOrderQr(
  orderNo: string,
  amount: number,
  desc: string,
): Promise<OnepayPayment | null> {
  const canGen = onepayEnabled() || onepayMerchantConfigured();
  const runtime = await getOnepayRuntimeConfig();
  const expectedAmount = runtime.testMode ? runtime.testAmount : amount;
  const existing = await getOrderPayment(orderNo);
  if (existing) {
    if (existing.status === "paid" || existing.status === "submitted") return existing;
    if (canGen && existing.amount !== expectedAmount) {
      return generateInto(orderNo, amount, desc, "update");
    }
    if (canGen && isExpired(existing)) return generateInto(orderNo, amount, desc, "update");
    return existing;
  }
  if (!canGen) return null;
  return generateInto(orderNo, amount, desc, "insert");
}

/** Force a fresh QR (new uuid + new 3-minute window), replacing any existing. */
export async function forceRegenerate(
  orderNo: string,
  amount: number,
  desc: string,
): Promise<OnepayPayment | null> {
  if (!onepayEnabled() && !onepayMerchantConfigured()) return null;
  const existing = await getOrderPayment(orderNo);
  if (existing?.status === "paid" || existing?.status === "submitted") return existing;
  return generateInto(orderNo, amount, desc, existing ? "update" : "insert");
}

/**
 * Re-check payment status with BCEL and persist the result. Returns the latest
 * payment record (or null if there's no QR / OnePay disabled).
 */
export async function refreshPaymentStatus(orderNo: string): Promise<OnepayPayment | null> {
  const rec = await getOrderPayment(orderNo);
  if (!rec || !onepayEnabled()) return rec;
  if (rec.status === "paid") return rec;

  try {
    const status = await checkPayment(rec.uuid);
    if (status.state === "paid") {
      const expected = rec.amount;
      const received = Number(status.amount);
      if (!Number.isFinite(received) || received !== expected) {
        throw new Error(
          `OnePay amount mismatch for ${orderNo}: expected ${expected}, received ${status.amount ?? "missing"}`,
        );
      }
    }
    await query(
      `update odg_ecom.onepay_payments
          set status = $2,
              ticket = coalesce($3, ticket),
              fcc_ref = coalesce($4, fcc_ref),
              payer_name = coalesce($5, payer_name),
              paid_at = case when $2 = 'paid' then now() else paid_at end,
              checked_at = now()
        where order_no = $1`,
      [orderNo, status.state, status.ticket ?? null, status.fccRef ?? null, status.payerName ?? null],
    );
    // On confirmed payment, materialise the held order into SML (ic_trans CAE 34).
    if (status.state === "paid") {
      await materializePaidOrder(orderNo).catch((e) =>
        console.error(`materializePaidOrder(${orderNo}) failed:`, e),
      );
    }
  } catch (e) {
    console.error("OnePay status check failed:", e);
  }
  return getOrderPayment(orderNo);
}

/**
 * Remind customers who placed a QR/transfer order but haven't paid after
 * `idleMinutes` (default 120 min = 2 hours). Sends a push notification via
 * the customer's saved subscriptions and a LINE admin note. Run from cron.
 * Returns how many reminders were sent.
 */
export async function remindUnpaidQr(idleMinutes = 120): Promise<number> {
  const rows = await query<{
    order_no: string;
    cust_code: string | null;
    cust_name: string;
    amount: string;
    reminded_at: Date | null;
  }>(
    `select order_no, cust_code, cust_name, amount::text, reminded_at
       from odg_ecom.onepay_payments
      where status = 'pending'
        and qrc is not null
        and created_at < now() - ($1 || ' minutes')::interval
        and (reminded_at is null or reminded_at < now() - interval '24 hours')
      limit 20`,
    [String(idleMinutes)],
  );

  let sent = 0;
  for (const r of rows) {
    const amt = Math.round(Number(r.amount)).toLocaleString();
    if (r.cust_code) {
      await notify(r.cust_code, {
        type: "order",
        title: "ອໍເດີຂອງທ່ານລໍຖ້າການຊຳລະ ⏰",
        body: `ອໍເດີ ${r.order_no} ຍອດ ${amt} ₭ — ກົດເພື່ອຊຳລະ QR`,
        link: `/order/${r.order_no}`,
      }).catch(() => {});
    }
    await query(
      `update odg_ecom.onepay_payments set reminded_at = now() where order_no = $1`,
      [r.order_no],
    ).catch(() => {});
    sent++;
  }
  return sent;
}

export { QR_EXPIRE_MINUTES };
