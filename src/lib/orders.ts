import "server-only";
import { pool, query, queryOne } from "./db";
import { resolveActiveAffiliate, getAffiliateByCode } from "./affiliates";
import { resolveSalespersonCode, getEmployeeName } from "./auth";
import { getCodEnabled } from "./settings";

export interface OrderInputItem {
  code: string;
  qty: number;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  address?: string;
  note?: string;
  customerCode?: string | null;
  /** Referral code from the `om_ref` cookie — resolved & validated server-side. */
  referralCode?: string | null;
  /** 'transfer' | 'cod' — validated server-side (defaults to BCEL transfer). */
  paymentMethod?: string;
  /** 'odien' | 'thanjai' — validated server-side (defaults to Odien). */
  shippingMethod?: string;
  /** Voucher/discount code — re-validated server-side (client value not trusted). */
  voucherCode?: string | null;
  /** Loyalty points to redeem — re-validated server-side against balance + cart. */
  pointsToUse?: number;
  /** Staff/admin code when an order is created on behalf of a customer. */
  createdBy?: string | null;
  /** SML transport branch code chosen at creation (admin assisted orders). */
  transportCode?: string | null;
  /** Salesperson (ພະນັກງານຂາຍ) — employee code; resolved & validated server-side.
   *  From the /s/<code> sales link, or chosen/defaulted by an admin who saves it. */
  saleCode?: string | null;
}

export interface PlacedOrder {
  orderNo: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  /** Member-tier discount (LAK). */
  memberDiscount: number;
  /** LAK value of redeemed loyalty points. */
  pointsValue: number;
}

export interface OrderLine {
  productCode: string;
  productName: string;
  unit: string | null;
  unitPrice: number | null;
  qty: number;
  lineTotal: number;
}

export interface OrderRecord {
  orderNo: string;
  customerName: string;
  customerCode: string | null;
  phone: string;
  address: string | null;
  note: string | null;
  subtotal: number;
  shippingFee: number;
  /** Total discount applied (voucher + member + loyalty points), in LAK. */
  discount: number;
  status: string;
  paymentMethod: string;
  shippingMethod: string;
  smlDocNo: string | null;
  /** Salesperson (ພະນັກງານຂາຍ) attributed to the order — employee code + name. */
  saleCode: string | null;
  saleName: string | null;
  /** Affiliate (ນາຍໜ້າ) attribution — referral code + affiliate name (if any). */
  referralCode: string | null;
  affiliateName: string | null;
  createdAt: string;
  items: OrderLine[];
}

import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "./order-constants";
import { toShippingMethod, computeShippingFee } from "./shipping-constants";
import { storePendingOrder, getPendingOrder } from "./onepay-store";
import { setSmlSaleCode } from "./sml-sale-order";
import { validateVoucher } from "./vouchers";
import { previewRedeem, POINT_VALUE } from "./loyalty";
import { getMemberDiscountPct } from "./member-tier";
import { activeFlashMap } from "./flash";
import { clearSavedCart } from "./cart-recovery";
import { notify } from "./notifications";
export { ORDER_STATUSES, STATUS_LABEL, type OrderStatus };

export class OrderError extends Error {}

// ── Orders live in public.ic_trans (CAE flow) ───────────────────────────────
// Legacy web orders used remark_5='web'; current orders use 'odienmall'.
// Keep both visible/manageable while still excluding unrelated CAE documents.
const WEB_ORDER = `ic.doc_format_code = 'CAE' and ic.remark_5 in ('web','odienmall') and ic.trans_flag in (34, 44)`;

// Payment method of an order (from its QR-holder snapshot): 'cod' or 'transfer'.
const PAY_METHOD_SQL = `(select op.payment_method from ecom.onepay_payments op where op.sml_doc_no = ic.doc_no limit 1)`;

// Flag 34 = COD order awaiting delivery, or a paid transfer awaiting confirmation;
// flag 44 = issued bill. Delivery states come from odg_tms_detail.
const STATUS_EXPR = `
  case
    when coalesce(ic.is_cancel,0) = 1 then 'cancelled'
    when exists (select 1 from public.odg_tms_detail t where t.bill_no = ic.doc_no and t.sent_end is not null) then 'completed'
    when exists (select 1 from public.odg_tms_detail t where t.bill_no = ic.doc_no) then 'shipping'
    when ic.trans_flag = 34 and ${PAY_METHOD_SQL} = 'cod' then 'cod'
    when ic.trans_flag = 34 then 'awaiting_confirmation'
    else 'paid'
  end`;

// Common head columns (joined to ar_customer for registered-customer name/phone).
const ORDER_HEAD = `
  ic.doc_no as order_no,
  coalesce(nullif(ic.remark_3,''), ar.name_1, ic.cust_code, '') as customer_name,
  ic.cust_code as customer_code,
  coalesce(nullif(ic.point_telephone,''), ar.telephone, '') as phone,
  nullif(ic.remark_4,'') as address,
  nullif(ic.remark_2,'') as note,
  coalesce(ic.total_amount_2,0) as subtotal,
  ic.trans_flag,
  coalesce(${PAY_METHOD_SQL}, 'transfer') as payment_method,
  ${STATUS_EXPR} as status,
  ic.create_date_time_now as created_at`;

interface PricedRow {
  code: string;
  name: string;
  price: string | null;
  unit: string | null;
}

/**
 * Re-price a cart from the ERP (server-side; client prices never trusted).
 * Returns priced lines + subtotal. Throws OrderError on an empty cart or any
 * item without a price.
 */
export async function priceCart(items: OrderInputItem[]): Promise<{ lines: OrderLine[]; subtotal: number }> {
  const wanted = new Map<string, number>();
  for (const it of items) {
    const code = String(it.code || "").trim();
    const qty = Math.floor(Number(it.qty));
    if (!code || !Number.isFinite(qty) || qty <= 0) continue;
    wanted.set(code, (wanted.get(code) ?? 0) + qty);
  }
  if (wanted.size === 0) throw new OrderError("ກະຕ່າວ່າງເປົ່າ");

  const codes = [...wanted.keys()];
  const priced = await query<PricedRow>(
    `select i.code,
            coalesce(nullif(i.name_1,''), nullif(i.name_2,''), nullif(i.name_eng_1,''), i.code) as name,
            (select min(b.price) from public.ic_inventory_barcode b
               where b.ic_code = i.code and b.price > 0) as price,
            (select b.unit_code from public.ic_inventory_barcode b
               where b.ic_code = i.code and b.price > 0 order by b.price asc limit 1) as unit
       from public.ic_inventory i
      where i.is_eordershow = 1 and i.code = any($1)`,
    [codes],
  );
  const byCode = new Map(priced.map((r) => [r.code, r]));
  // Active flash deals override the retail price at checkout (authoritative).
  const flash = await activeFlashMap();

  const lines: OrderLine[] = [];
  const unpriced: string[] = [];
  for (const [code, qty] of wanted) {
    const row = byCode.get(code);
    if (!row || row.price == null) {
      unpriced.push(code);
      continue;
    }
    const retail = Number(row.price);
    const deal = flash.get(code);
    const unitPrice = deal != null && deal < retail ? deal : retail;
    lines.push({ productCode: code, productName: row.name, unit: row.unit, unitPrice, qty, lineTotal: unitPrice * qty });
  }
  if (unpriced.length > 0) {
    throw new OrderError(`ບາງລາຍການບໍ່ມີລາຄາ ກະລຸນາລຶບອອກກ່ອນສັ່ງຊື້: ${unpriced.join(", ")}`);
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  return { lines, subtotal };
}

/**
 * Create an order. The order is held as a pending snapshot (with QR) and only
 * written to SML (ic_trans CAE flag 34) once the customer pays. Prices, shipping
 * fee, affiliate and voucher discount are all re-resolved server-side.
 */
export async function createOrder(
  customer: OrderCustomer,
  items: OrderInputItem[],
): Promise<PlacedOrder> {
  const name = customer.name?.trim();
  const phone = customer.phone?.trim();
  if (!name) throw new OrderError("ກະລຸນາໃສ່ຊື່");
  if (!phone) throw new OrderError("ກະລຸນາໃສ່ເບີໂທ");

  // COD is a manager toggle — re-validate server-side, never trust the client.
  if (customer.paymentMethod === "cod" && !(await getCodEnabled())) {
    throw new OrderError("ການເກັບເງິນປາຍທາງ (COD) ປິດໃຊ້ງານຊົ່ວຄາວ");
  }

  const { lines, subtotal } = await priceCart(items);
  const shippingMethod = toShippingMethod(customer.shippingMethod);
  // Re-compute the delivery fee server-side — never trust a client-sent fee.
  const shippingFee = computeShippingFee(shippingMethod, subtotal);

  // Affiliate attribution (last-click). Resolved & validated server-side from
  // the referral cookie; never trusted from the client. No self-referral.
  let referralCode: string | null = null;
  const aff = await resolveActiveAffiliate(customer.referralCode);
  if (aff && aff.customerCode !== customer.customerCode) {
    referralCode = (customer.referralCode ?? "").trim() || null;
  }

  // Voucher: re-validate server-side against the freshly-priced subtotal.
  let voucherCode: string | null = null;
  let discount = 0;
  if (customer.voucherCode?.trim()) {
    const v = await validateVoucher(customer.voucherCode, subtotal, customer.customerCode ?? null);
    if (v.ok) {
      voucherCode = v.voucher.code;
      discount = v.discount;
    }
    // An invalid code is silently ignored here (the checkout UI validates first).
  }

  // Member-tier discount (general customers): % from ar_group_sub on items only.
  let memberDiscount = 0;
  if (customer.customerCode) {
    const pct = await getMemberDiscountPct(customer.customerCode);
    if (pct > 0) memberDiscount = Math.round((subtotal * pct) / 100);
  }

  // Loyalty redemption: re-validate against balance + remaining cart total.
  let pointsUsed = 0;
  let pointsValue = 0;
  if (customer.customerCode && (customer.pointsToUse ?? 0) > 0) {
    const r = await previewRedeem(customer.customerCode, customer.pointsToUse!, subtotal - discount - memberDiscount);
    if (r.ok) {
      pointsUsed = r.points;
      pointsValue = r.discount;
    }
  }

  // Salesperson (ພະນັກງານຂາຍ): the explicit sale code (sales link / admin choice)
  // wins; otherwise an admin-built order falls back to its creator. Validated
  // server-side against the salesperson pool — never trusted from the client.
  const saleCode =
    (await resolveSalespersonCode(customer.saleCode)) ??
    (await resolveSalespersonCode(customer.createdBy));

  // Do NOT write SML yet. Hold the order as a pending snapshot attached to the
  // QR row (keyed by a temp order_no). It becomes a real ic_trans CAE (flag 34)
  // only when the customer pays (see materializePaidOrder in onepay-store).
  const orderNo = genOrderNo();
  await storePendingOrder({
    orderNo,
    customerCode: customer.customerCode ?? null,
    name,
    phone,
    address: customer.address?.trim() || null,
    note: customer.note?.trim() || null,
    referralCode,
    voucherCode,
    discount,
    memberDiscount,
    pointsUsed,
    saleCode,
    paymentMethod: customer.paymentMethod === "cod" ? "cod" : "transfer",
    shippingMethod,
    createdBy: customer.createdBy ?? null,
    transportCode: customer.transportCode ?? null,
    lines: lines.map((l) => ({ ...l, unitPrice: l.unitPrice ?? 0 })),
    subtotal,
    shippingFee,
  });

  // The customer just ordered — drop their abandoned-cart snapshot (best-effort).
  if (customer.customerCode) clearSavedCart(customer.customerCode).catch(() => {});

  return { orderNo, subtotal, shippingFee, discount, memberDiscount, pointsValue };
}

// Temp storefront order number (the SML CAE doc_no is assigned only on payment).
function genOrderNo(): string {
  const d = new Date();
  const ymd =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `OM${ymd}${rand}`;
}

export interface OrderSummary {
  orderNo: string;
  subtotal: number;
  shippingFee: number;
  status: string;
  createdAt: string;
  itemCount: number;
}

export async function getOrdersByCustomer(code: string): Promise<OrderSummary[]> {
  const rows = await query<{
    order_no: string;
    subtotal: string;
    status: string;
    created_at: Date;
    item_count: number;
  }>(
    `select ic.doc_no as order_no, coalesce(ic.total_amount_2,0) as subtotal,
            ${STATUS_EXPR} as status, ic.create_date_time_now as created_at,
            (select count(*) from public.ic_trans_detail d where d.doc_no = ic.doc_no)::int as item_count
       from public.ic_trans ic
      where ${WEB_ORDER} and ic.cust_code = $1
      order by ic.create_date_time_now desc
      limit 50`,
    [code],
  );
  return rows.map((r) => ({
    orderNo: r.order_no,
    subtotal: Number(r.subtotal),
    shippingFee: 0,
    status: r.status,
    createdAt: r.created_at.toISOString(),
    itemCount: r.item_count,
  }));
}

// ---- admin views (orders = public.ic_trans CAE) ---------------------------

export interface AdminOrderRow {
  orderNo: string;
  customerName: string;
  customerCode: string | null;
  phone: string;
  subtotal: number;
  shippingFee: number;
  status: string;
  paymentMethod: string;
  shippingMethod: string;
  createdAt: string;
  itemCount: number;
  smlDocNo: string; // CAE doc — the admin list is sourced from public.ic_trans
  smlFlag: number; // 34 = ໃບສັ່ງຊື້, 44 = ບິນສົດ
  createdBy?: string | null; // staff/admin code if created on behalf; null = customer
  saleCode?: string | null; // salesperson (ພະນັກງານຂາຍ) employee code
  saleName?: string | null; // salesperson display name
  items: AdminOrderListItem[];
}

export interface AdminOrderListItem {
  productCode: string;
  productName: string;
  unit: string | null;
  unitPrice: number | null;
  qty: number;
  lineTotal: number;
  imageUrl: string | null;
}

// The admin order list reads straight from public.ic_trans (CAE web orders).
export async function getAllOrders(opts: {
  status?: string;
  /** Matches order_no(=CAE doc) / customer_name / phone (ILIKE). */
  search?: string;
  /** Inclusive date bounds, 'YYYY-MM-DD' (local ERP date). */
  from?: string;
  to?: string;
  /** Filter to one salesperson (ພະນັກງານຂາຍ) employee code. */
  saleCode?: string;
} = {}): Promise<AdminOrderRow[]> {
  const conds: string[] = [WEB_ORDER];
  const params: unknown[] = [];

  if (opts.status && (ORDER_STATUSES as readonly string[]).includes(opts.status)) {
    params.push(opts.status);
    conds.push(`(${STATUS_EXPR}) = $${params.length}`);
  }
  const saleFilter = opts.saleCode?.trim();
  if (saleFilter) {
    params.push(saleFilter);
    conds.push(`ic.sale_code = $${params.length}`);
  }
  const s = opts.search?.trim();
  if (s) {
    params.push(`%${s}%`);
    const p = `$${params.length}`;
    conds.push(
      `(ic.doc_no ilike ${p} or coalesce(ic.remark_3,'') ilike ${p} or coalesce(ic.point_telephone,'') ilike ${p} or ic.cust_code ilike ${p}
        or exists (
          select 1 from public.ic_trans_detail sd
           where sd.doc_no = ic.doc_no
             and (sd.item_code ilike ${p} or sd.item_name ilike ${p})
        ))`,
    );
  }
  if (opts.from) {
    params.push(opts.from);
    conds.push(`ic.create_date_time_now >= $${params.length}::date`);
  }
  if (opts.to) {
    params.push(opts.to);
    conds.push(`ic.create_date_time_now < ($${params.length}::date + interval '1 day')`);
  }
  const where = `where ${conds.join(" and ")}`;

  const rows = await query<{
    order_no: string;
    customer_name: string;
    customer_code: string | null;
    phone: string;
    subtotal: string;
    status: string;
    trans_flag: number;
    payment_method: string;
    created_at: Date;
    item_count: number;
    sale_code: string | null;
    sale_name: string | null;
  }>(
    `select ${ORDER_HEAD},
            (select count(*) from public.ic_trans_detail d where d.doc_no = ic.doc_no)::int as item_count,
            nullif(ic.sale_code,'') as sale_code,
            coalesce(nullif(emp.fullname_lo,''), nullif(emp.fullname_en,''), nullif(ic.sale_code,'')) as sale_name
       from public.ic_trans ic
       left join public.ar_customer ar on ar.code = ic.cust_code
       left join public.odg_employee emp on emp.employee_code = ic.sale_code
      ${where}
      order by ic.create_date_time_now desc
      limit 200`,
    params,
  );
  const detailRows = rows.length
    ? await query<{
        doc_no: string;
        product_code: string;
        product_name: string;
        unit: string | null;
        unit_price: string | null;
        qty: string | number | null;
        line_total: string | null;
        image_url: string | null;
      }>(
        `with ranked as (
           select d.doc_no,
                  d.item_code as product_code,
                  d.item_name as product_name,
                  d.unit_code as unit,
                  d.price_2 as unit_price,
                  d.qty,
                  d.sum_amount_2 as line_total,
                  (select pi.url from ecom.product_images pi
                     where pi.product_code = d.item_code
                     order by pi.sort_order, pi.id limit 1) as image_url,
                  row_number() over (partition by d.doc_no order by d.roworder) as rn
             from public.ic_trans_detail d
            where d.doc_no = any($1)
         )
         select doc_no, product_code, product_name, unit, unit_price, qty, line_total, image_url
           from ranked
          where rn <= 3
          order by doc_no, rn`,
        [rows.map((r) => r.order_no)],
      )
    : [];
  const itemsByDoc = new Map<string, AdminOrderListItem[]>();
  for (const row of detailRows) {
    const list = itemsByDoc.get(row.doc_no) ?? [];
    list.push({
      productCode: row.product_code,
      productName: row.product_name,
      unit: row.unit,
      unitPrice: row.unit_price == null ? null : Number(row.unit_price),
      qty: Number(row.qty ?? 0),
      lineTotal: Number(row.line_total ?? 0),
      imageUrl: row.image_url,
    });
    itemsByDoc.set(row.doc_no, list);
  }
  const icRows: AdminOrderRow[] = rows.map((r) => ({
    orderNo: r.order_no,
    customerName: r.customer_name,
    customerCode: r.customer_code,
    phone: r.phone,
    subtotal: Number(r.subtotal),
    shippingFee: 0,
    status: r.status,
    paymentMethod: r.payment_method ?? "transfer",
    shippingMethod: "odien",
    createdAt: r.created_at.toISOString(),
    itemCount: r.item_count,
    smlDocNo: r.order_no,
    smlFlag: Number(r.trans_flag),
    saleCode: r.sale_code,
    saleName: r.sale_name,
    items: itemsByDoc.get(r.order_no) ?? [],
  }));

  // Pending snapshots: orders created (incl. staff-assisted) but not yet written
  // to SML (ic_trans). They must still appear in the list — as ລໍຖ້າຊຳລະ / COD.
  const pConds: string[] = ["op.sml_doc_no is null"];
  const pParams: unknown[] = [];
  if (s) {
    pParams.push(`%${s}%`);
    const p = `$${pParams.length}`;
    pConds.push(`(op.order_no ilike ${p} or coalesce(op.cust_name,'') ilike ${p} or coalesce(op.phone,'') ilike ${p} or coalesce(op.cust_code,'') ilike ${p} or op.items::text ilike ${p})`);
  }
  if (saleFilter) {
    pParams.push(saleFilter);
    pConds.push(`op.sale_code = $${pParams.length}`);
  }
  if (opts.from) {
    pParams.push(opts.from);
    pConds.push(`op.created_at >= $${pParams.length}::date`);
  }
  if (opts.to) {
    pParams.push(opts.to);
    pConds.push(`op.created_at < ($${pParams.length}::date + interval '1 day')`);
  }
  const pendRows = await query<{
    order_no: string;
    cust_name: string | null;
    cust_code: string | null;
    phone: string | null;
    subtotal: string | null;
    shipping_fee: string | null;
    payment_method: string | null;
    pay_status: string | null;
    created_at: Date;
    item_count: number;
    items: unknown;
    created_by: string | null;
    sale_code: string | null;
    sale_name: string | null;
  }>(
    `select op.order_no, op.cust_name, op.cust_code, op.phone,
            coalesce(op.subtotal,0)::text as subtotal,
            coalesce(op.shipping_fee,0)::text as shipping_fee,
            op.payment_method, op.status as pay_status, op.created_at,
            coalesce(jsonb_array_length(op.items),0)::int as item_count,
            op.items,
            op.created_by,
            nullif(op.sale_code,'') as sale_code,
            coalesce(nullif(emp.fullname_lo,''), nullif(emp.fullname_en,''), nullif(op.sale_code,'')) as sale_name
       from ecom.onepay_payments op
       left join public.odg_employee emp on emp.employee_code = op.sale_code
      where ${pConds.join(" and ")}
      order by op.created_at desc
      limit 200`,
    pParams,
  );
  const pendingMapped: AdminOrderRow[] = pendRows.map((r) => {
    const status =
      r.pay_status === "paid" ? "paid" : r.payment_method === "cod" ? "cod" : "pending";
    return {
      orderNo: r.order_no,
      customerName: r.cust_name || r.cust_code || "—",
      customerCode: r.cust_code,
      phone: r.phone || "",
      subtotal: Number(r.subtotal),
      shippingFee: Number(r.shipping_fee),
      status,
      paymentMethod: r.payment_method ?? "transfer",
      shippingMethod: "odien",
      createdAt: r.created_at.toISOString(),
      itemCount: r.item_count,
      smlDocNo: "",
      smlFlag: 0,
      createdBy: r.created_by,
      saleCode: r.sale_code,
      saleName: r.sale_name,
      items: pendingItemsPreview(r.items),
    };
  });

  const merged = [...icRows, ...pendingMapped].filter(
    (o) => !opts.status || !(ORDER_STATUSES as readonly string[]).includes(opts.status) || o.status === opts.status,
  );
  merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return merged.slice(0, 200);
}

function pendingItemsPreview(items: unknown): AdminOrderListItem[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 3).map((it) => {
    const row = it as Partial<OrderLine>;
    return {
      productCode: String(row.productCode ?? ""),
      productName: String(row.productName ?? row.productCode ?? "—"),
      unit: row.unit ?? null,
      unitPrice: row.unitPrice == null ? null : Number(row.unitPrice),
      qty: Number(row.qty ?? 0),
      lineTotal: Number(row.lineTotal ?? 0),
      imageUrl: null,
    };
  });
}

// Stats over the CAE web orders (public.ic_trans). Optionally scoped to one
// salesperson (ພະນັກງານຂາຍ) — used to limit staff to their own numbers.
export async function getOrderStats(saleCode?: string): Promise<{
  byStatus: Record<string, number>;
  total: number;
  revenue: number;
}> {
  const scope = saleCode?.trim();
  const icScope = scope ? `and ic.sale_code = $1` : "";
  const opScope = scope ? `and op.sale_code = $1` : "";
  const params = scope ? [scope] : [];
  const rows = await query<{ status: string; n: number; sum: string }>(
    `select (${STATUS_EXPR}) as status, count(*)::int as n,
            coalesce(sum(ic.total_amount_2),0)::text as sum
       from public.ic_trans ic
      where ${WEB_ORDER} ${icScope}
      group by (${STATUS_EXPR})`,
    params,
  );
  const byStatus: Record<string, number> = {};
  let total = 0;
  let revenue = 0;
  for (const r of rows) {
    byStatus[r.status] = r.n;
    total += r.n;
    // revenue counts everything except cancelled
    if (r.status !== "cancelled") revenue += Number(r.sum);
  }

  // Include pending snapshots (orders not yet written to ic_trans).
  const pend = await query<{ status: string; n: number }>(
    `select (case when op.status = 'paid' then 'paid'
                  when op.payment_method = 'cod' then 'cod'
                  else 'pending' end) as status,
            count(*)::int as n
       from ecom.onepay_payments op
      where op.sml_doc_no is null ${opScope}
      group by 1`,
    params,
  );
  for (const r of pend) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + r.n;
    total += r.n;
  }
  return { byStatus, total, revenue };
}

/**
 * Find recent order numbers for a phone (last 8 digits) — public guest tracking.
 * Covers materialised CAE orders + pending snapshots; newest first, capped at 10.
 */
export async function getOrderNosByPhone(phone: string): Promise<string[]> {
  const tail = (phone || "").replace(/\D/g, "").slice(-8);
  if (tail.length < 6) return [];
  const [cae, pend] = await Promise.all([
    query<{ order_no: string; created_at: Date }>(
      `select ic.doc_no as order_no, ic.create_date_time_now as created_at
         from public.ic_trans ic
         left join public.ar_customer ar on ar.code = ic.cust_code
        where ${WEB_ORDER}
          and right(regexp_replace(coalesce(nullif(ic.point_telephone,''), ar.telephone, ''), '[^0-9]', '', 'g'), 8) = $1
        order by ic.create_date_time_now desc
        limit 10`,
      [tail],
    ),
    query<{ order_no: string; created_at: Date }>(
      `select order_no, created_at from ecom.onepay_payments
        where sml_doc_no is null
          and right(regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g'), 8) = $1
        order by created_at desc
        limit 10`,
      [tail],
    ),
  ]);
  const all = [...cae, ...pend].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return [...new Set(all.map((r) => r.order_no))].slice(0, 10);
}

/** Legacy backfill hook — orders are now created directly in ic_trans, so there
 * is nothing to backfill. Kept for the (now no-op) admin banner/action. */
export async function getOrdersMissingSmlDoc(): Promise<string[]> {
  return [];
}

/**
 * Re-assign the salesperson (ພະນັກງານຂາຍ) on an existing order. Validates the
 * code against the salesperson pool, updates the order snapshot, and — for a
 * materialised CAE bill (with SML direct-write on) — re-stamps ic_trans.sale_code.
 * Returns the resolved code + display name.
 */
export async function setOrderSaleCode(
  orderNo: string,
  saleCode: string | null,
): Promise<{ code: string | null; name: string | null }> {
  const resolved = await resolveSalespersonCode(saleCode);
  if (/^CAE/i.test(orderNo)) {
    // Materialised CAE doc — update the snapshot keyed by sml_doc_no, then ic_trans.
    await query(`update ecom.onepay_payments set sale_code = $2 where sml_doc_no = $1`, [orderNo, resolved]);
    await setSmlSaleCode(orderNo, resolved);
  } else {
    await query(`update ecom.onepay_payments set sale_code = $2 where order_no = $1`, [orderNo, resolved]);
    const pend = await getPendingOrder(orderNo);
    if (pend?.smlDocNo) await setSmlSaleCode(pend.smlDocNo, resolved);
  }
  return { code: resolved, name: await getEmployeeName(resolved) };
}

/**
 * Notify customers when their paid order moves to shipping / completed (the
 * delivery status is TMS-derived, so there's no app event — we diff against the
 * last-notified status stored on the QR row). Run from a cron/route. Returns the
 * number of notifications sent.
 */
export async function syncDeliveryNotifications(): Promise<number> {
  const rows = await query<{
    order_no: string;
    sml_doc_no: string;
    cust_code: string | null;
    status: string;
    notified_status: string | null;
  }>(
    `select p.order_no, p.sml_doc_no, ic.cust_code,
            (${STATUS_EXPR}) as status, p.notified_status
       from ecom.onepay_payments p
       join public.ic_trans ic on ic.doc_no = p.sml_doc_no
      where p.sml_doc_no is not null and ${WEB_ORDER}`,
  );
  let sent = 0;
  for (const r of rows) {
    if (r.status === r.notified_status) continue;
    if (r.status === "shipping" || r.status === "completed") {
      if (r.cust_code) {
        await notify(r.cust_code, {
          type: "order",
          title: r.status === "shipping" ? "ກຳລັງຈັດສົ່ງ 🚚" : "ຈັດສົ່ງສຳເລັດ 🎉",
          body:
            r.status === "shipping"
              ? `ອໍເດີ ${r.sml_doc_no} ກຳລັງຖືກຈັດສົ່ງ`
              : `ອໍເດີ ${r.sml_doc_no} ສົ່ງເຖິງແລ້ວ — ຂອບໃຈທີ່ໃຊ້ບໍລິການ`,
          link: `/order/${r.order_no}`,
        }).catch(() => {});
        sent++;
      }
    }
    await query(`update ecom.onepay_payments set notified_status = $2 where order_no = $1`, [
      r.order_no,
      r.status,
    ]).catch(() => {});
  }
  return sent;
}

export interface SalesReport {
  totalOrders: number;
  revenue: number;
  avgOrderValue: number;
  byStatus: Record<string, number>;
  daily: { label: string; day: string; orders: number; revenue: number }[];
  topProducts: {
    productCode: string;
    productName: string;
    qty: number;
    revenue: number;
  }[];
  /** Revenue per salesperson (ພະນັກງານຂາຍ), best first. Excludes cancelled. */
  bySalesperson: {
    saleCode: string;
    saleName: string;
    orders: number;
    revenue: number;
  }[];
}

export async function getSalesReport(saleCode?: string): Promise<SalesReport> {
  const scope = saleCode?.trim();
  const icScope = scope ? `and ic.sale_code = $1` : "";
  const params = scope ? [scope] : [];
  const totalsRows = await query<{ orders: number; revenue: string; aov: string }>(
    `select count(*)::int as orders,
            coalesce(sum(ic.total_amount_2) filter (where coalesce(ic.is_cancel,0)=0),0)::text as revenue,
            coalesce(round(avg(ic.total_amount_2) filter (where coalesce(ic.is_cancel,0)=0)),0)::text as aov
       from public.ic_trans ic where ${WEB_ORDER} ${icScope}`,
    params,
  );
  const t = totalsRows[0] ?? { orders: 0, revenue: "0", aov: "0" };

  const statusRows = await query<{ status: string; n: number }>(
    `select (${STATUS_EXPR}) as status, count(*)::int as n
       from public.ic_trans ic where ${WEB_ORDER} ${icScope} group by (${STATUS_EXPR})`,
    params,
  );
  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = r.n;

  const dailyRows = await query<{
    label: string;
    day: string;
    orders: number;
    revenue: string;
  }>(
    `select to_char(d::date,'DD/MM') as label,
            to_char(d::date,'YYYY-MM-DD') as day,
            coalesce(o.orders,0)::int as orders,
            coalesce(o.revenue,0)::text as revenue
       from generate_series(current_date - interval '13 days', current_date, interval '1 day') d
       left join (
         select ic.create_date_time_now::date as dd, count(*) as orders,
                sum(ic.total_amount_2) filter (where coalesce(ic.is_cancel,0)=0) as revenue
           from public.ic_trans ic
          where ${WEB_ORDER} ${icScope} and ic.create_date_time_now >= current_date - interval '13 days'
          group by 1
       ) o on o.dd = d::date
      order by d`,
    params,
  );

  const topRows = await query<{
    product_code: string;
    product_name: string;
    qty: number;
    revenue: string;
  }>(
    `select d.item_code as product_code, max(d.item_name) as product_name,
            sum(d.qty)::int as qty,
            coalesce(sum(d.sum_amount_2),0)::text as revenue
       from public.ic_trans_detail d
       join public.ic_trans ic on ic.doc_no = d.doc_no and ${WEB_ORDER} ${icScope} and coalesce(ic.is_cancel,0)=0
      group by d.item_code
      order by sum(d.sum_amount_2) desc
      limit 10`,
    params,
  );

  const saleRows = await query<{
    sale_code: string;
    sale_name: string;
    orders: number;
    revenue: string;
  }>(
    `select ic.sale_code as sale_code,
            coalesce(nullif(emp.fullname_lo,''), nullif(emp.fullname_en,''), ic.sale_code) as sale_name,
            count(*)::int as orders,
            coalesce(sum(ic.total_amount_2),0)::text as revenue
       from public.ic_trans ic
       left join public.odg_employee emp on emp.employee_code = ic.sale_code
      where ${WEB_ORDER} and coalesce(ic.is_cancel,0)=0 and coalesce(ic.sale_code,'') <> '' ${icScope}
      group by ic.sale_code, sale_name
      order by sum(ic.total_amount_2) desc
      limit 20`,
    params,
  );

  return {
    totalOrders: t.orders,
    revenue: Number(t.revenue),
    avgOrderValue: Number(t.aov),
    byStatus,
    bySalesperson: saleRows.map((r) => ({
      saleCode: r.sale_code,
      saleName: r.sale_name,
      orders: r.orders,
      revenue: Number(r.revenue),
    })),
    daily: dailyRows.map((r) => ({
      label: r.label,
      day: r.day,
      orders: r.orders,
      revenue: Number(r.revenue),
    })),
    topProducts: topRows.map((r) => ({
      productCode: r.product_code,
      productName: r.product_name,
      qty: r.qty,
      revenue: Number(r.revenue),
    })),
  };
}

/**
 * Admin status change. In the ic_trans model most statuses are NOT directly
 * settable: `paid` is the result of ອອກບິນ (flag 34→44, see confirmSmlSaleOrder),
 * and `shipping`/`completed` are driven by the logistics system (odg_tms_detail).
 * The only direct transition is `cancelled` (ic_trans.is_cancel = 1).
 */
export async function updateOrderStatus(
  orderNo: string,
  status: string,
): Promise<boolean> {
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
    throw new OrderError("ສະຖານະບໍ່ຖືກຕ້ອງ");
  }
  const cur = await deriveStatusForDoc(orderNo);
  if (cur == null) return false;
  if (status === cur) return true;

  if (status === "cancelled") {
    if (cur === "completed") throw new OrderError("ອໍເດີສົ່ງສຳເລັດແລ້ວ ຍົກເລີກບໍ່ໄດ້");
    const rows = await query<{ doc_no: string }>(
      `update public.ic_trans as ic set is_cancel = 1, cancel_datetime = now()
        where doc_no = $1 and ${WEB_ORDER} returning doc_no`,
      [orderNo],
    );
    return rows.length > 0;
  }
  if (status === "paid") {
    throw new OrderError("ກົດ “ອອກບິນ” ເພື່ອປ່ຽນເປັນ ຊຳລະແລ້ວ (ບິນ SML 44)");
  }
  if (status === "awaiting_confirmation") {
    throw new OrderError("ສະຖານະນີ້ມາຈາກ SML trans_flag 34");
  }
  if (status === "shipping" || status === "completed") {
    throw new OrderError("ສະຖານະຈັດສົ່ງ ອັບເດດອັດຕະໂນມັດຈາກລະບົບຂົນສົ່ງ (TMS)");
  }
  throw new OrderError("ປ່ຽນກັບໄປ ລໍຖ້າຊຳລະ ບໍ່ໄດ້");
}

// ── TMS delivery tracking for one order ──────────────────────────────────────
export interface OrderTms {
  car: string | null; // vehicle / fleet code
  driverPhone: string | null;
  dateLogistic: string | null; // scheduled delivery date
  sentStart: string | null;
  sentEnd: string | null;
  codAmount: number | null;
  collectedAmount: number | null;
  collectedAt: string | null;
  paymentMethod: string | null;
  deliveryCondition: string | null;
  lat: string | null;
  lng: string | null;
}

/**
 * Pull the latest TMS tracking record for an order's CAE bill (READ-ONLY,
 * public.odg_tms_detail, keyed by bill_no = doc_no). Returns null if the order
 * isn't in the logistics system yet. Selects only light columns — never the
 * base64 image fields (url_img/recipt_img/…).
 */
export async function getOrderTms(orderNo: string): Promise<OrderTms | null> {
  // Resolve the CAE doc: a CAE order_no is the bill itself; a temp order_no maps
  // through the QR snapshot's sml_doc_no.
  let docNo = orderNo;
  if (!/^CAE/i.test(orderNo)) {
    const snap = await queryOne<{ sml_doc_no: string | null }>(
      `select sml_doc_no from ecom.onepay_payments where order_no = $1`,
      [orderNo],
    );
    if (!snap?.sml_doc_no) return null;
    docNo = snap.sml_doc_no;
  }
  const row = await queryOne<{
    car: string | null;
    telephone: string | null;
    date_logistic: Date | null;
    sent_start: Date | null;
    sent_end: Date | null;
    cod_amount: string | null;
    collected_amount: string | null;
    collected_at: Date | null;
    payment_method: string | null;
    delivery_condition: string | null;
    lat: string | null;
    lng: string | null;
  }>(
    `select car, telephone, date_logistic, sent_start, sent_end,
            cod_amount::text as cod_amount, collected_amount::text as collected_amount,
            collected_at, payment_method, delivery_condition, lat, lng
       from public.odg_tms_detail
      where bill_no = $1
      order by create_date_time_now desc nulls last, roworder desc
      limit 1`,
    [docNo],
  );
  if (!row) return null;
  const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);
  return {
    car: row.car || null,
    driverPhone: row.telephone || null,
    dateLogistic: iso(row.date_logistic),
    sentStart: iso(row.sent_start),
    sentEnd: iso(row.sent_end),
    codAmount: row.cod_amount == null ? null : Number(row.cod_amount),
    collectedAmount: row.collected_amount == null ? null : Number(row.collected_amount),
    collectedAt: iso(row.collected_at),
    paymentMethod: row.payment_method || null,
    deliveryCondition: row.delivery_condition || null,
    lat: row.lat || null,
    lng: row.lng || null,
  };
}

// Helper: derive the current web status for a CAE doc (or null if not found).
async function deriveStatusForDoc(orderNo: string): Promise<OrderStatus | null> {
  const rows = await query<{ status: string }>(
    `select (${STATUS_EXPR}) as status from public.ic_trans ic
      where ic.doc_no = $1 and ${WEB_ORDER}`,
    [orderNo],
  );
  return (rows[0]?.status as OrderStatus) ?? null;
}

/**
 * Customer self-cancel. Only an UNPAID COD order (ic_trans flag 34, no cash yet)
 * can be cancelled by the buyer — a paid transfer order needs a manual refund /
 * credit note, and a shipped/issued order can't be undone here. Verifies the
 * order belongs to the signed-in customer, then sets ic_trans.is_cancel = 1.
 */
export async function cancelMyOrder(
  orderNo: string,
  customerCode: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!customerCode) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບ" };
  const owns = await query<{ doc_no: string }>(
    `select ic.doc_no from public.ic_trans as ic
      where ic.doc_no = $1 and ic.cust_code = $2 and ${WEB_ORDER}`,
    [orderNo, customerCode],
  );
  if (owns.length === 0) return { ok: false, error: "ບໍ່ພົບອໍເດີຂອງທ່ານ" };

  const status = await deriveStatusForDoc(orderNo);
  if (status === "cancelled") return { ok: true };
  if (status !== "cod") {
    return { ok: false, error: "ຍົກເລີກເອງໄດ້ສະເພາະອໍເດີ COD ທີ່ຍັງບໍ່ໄດ້ຈັດສົ່ງ — ກະລຸນາຕິດຕໍ່ຮ້ານ" };
  }
  const rows = await query<{ doc_no: string }>(
    `update public.ic_trans as ic set is_cancel = 1, cancel_datetime = now()
      where doc_no = $1 and ${WEB_ORDER} returning doc_no`,
    [orderNo],
  );
  return rows.length > 0 ? { ok: true } : { ok: false, error: "ຍົກເລີກບໍ່ສຳເລັດ" };
}

/**
 * Admin: permanently delete a CAE web order (for clearing test data). Removes
 * the ic_trans header + detail and the app-side onepay/allocation rows.
 */
export async function adminDeleteOrder(orderNo: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("begin");

    // Validate + lock first. WEB_ORDER references the `ic` alias, so every
    // statement using it must explicitly declare that alias.
    const found = await client.query<{ doc_no: string }>(
      `select ic.doc_no from public.ic_trans as ic
        where ic.doc_no=$1 and ${WEB_ORDER}
        for update`,
      [orderNo],
    );
    if (found.rowCount !== 1) {
      // No CAE order — this is a pending snapshot (un-materialised order). Delete
      // its app-side rows only (nothing in public.* to remove).
      const delPend = await client.query(
        `delete from ecom.onepay_payments where order_no=$1 and sml_doc_no is null`,
        [orderNo],
      );
      await client.query(`delete from ecom.erp_cash_bill_queue where order_no=$1`, [orderNo]);
      await client.query("commit");
      return (delPend.rowCount ?? 0) > 0;
    }

    // App-owned rows. Legacy orders may be referenced by either their temporary
    // OnePay order number or the materialised CAE SML number.
    await client.query(
      `delete from ecom.onepay_payments
        where order_no=$1 or sml_doc_no=$1`,
      [orderNo],
    );
    await client.query(
      `delete from ecom.erp_cash_bill_queue
        where order_no=$1 or sml_doc_no=$1`,
      [orderNo],
    );
    await client.query(
      `delete from ecom.order_item_allocations a
        using public.ic_trans_detail d
        where d.doc_no=$1 and a.order_item_id=d.roworder`,
      [orderNo],
    );

    // Remove dependent SML rows before the header. cb_* rows normally exist
    // only after issue (flag 44), but cleaning them prevents orphaned test data.
    await client.query(`delete from public.cb_trans_detail where doc_no=$1`, [orderNo]);
    await client.query(`delete from public.cb_trans where doc_no=$1`, [orderNo]);
    await client.query(`delete from public.ic_trans_shipment where doc_no=$1`, [orderNo]);
    await client.query(`delete from public.ic_trans_detail where doc_no=$1`, [orderNo]);
    const deleted = await client.query<{ doc_no: string }>(
      `delete from public.ic_trans as ic
        where ic.doc_no=$1 and ${WEB_ORDER}
        returning ic.doc_no`,
      [orderNo],
    );
    if (deleted.rowCount !== 1) throw new Error("ລົບຫົວບິນ SML ບໍ່ສຳເລັດ");

    await client.query("commit");
    return true;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Let a customer delete their OWN order — only while still pending (flag 34, not
 * cancelled and not in delivery). Owner enforced by cust_code.
 */
export async function deleteOrder(
  orderNo: string,
  customerCode: string,
): Promise<boolean> {
  if (!customerCode) return false;
  const status = await deriveStatusForDoc(orderNo);
  if (status !== "pending" && status !== "cancelled") return false;
  const owns = await query<{ doc_no: string }>(
    `select ic.doc_no from public.ic_trans as ic
      where ic.doc_no = $1 and ic.cust_code = $2 and ${WEB_ORDER}`,
    [orderNo, customerCode],
  );
  if (owns.length === 0) return false;
  return adminDeleteOrder(orderNo);
}

export async function getOrderByNo(orderNo: string): Promise<OrderRecord | null> {
  // A temp order_no (storefront) → resolve via the QR holder. If it has been
  // materialised (paid), read the real CAE order; otherwise show the pending snapshot.
  if (!/^CAE/i.test(orderNo)) {
    const pend = await getPendingOrder(orderNo);
    if (pend) {
      if (pend.smlDocNo) return getOrderByNo(pend.smlDocNo);
      return {
        orderNo,
        customerName: pend.name,
        customerCode: pend.customerCode,
        phone: pend.phone,
        address: pend.address,
        note: pend.note,
        subtotal: pend.subtotal,
        shippingFee: pend.shippingFee,
        discount: pend.discount + pend.memberDiscount + pend.pointsUsed * POINT_VALUE,
        // COD orders are placed (awaiting fulfilment) the moment they're created,
        // even if the SML write is gated off and no ic_trans row exists yet.
        status:
          pend.status === "paid"
            ? "paid"
            : pend.paymentMethod === "cod"
              ? "cod"
              : "pending",
        paymentMethod: pend.paymentMethod,
        shippingMethod: pend.shippingMethod,
        smlDocNo: null,
        saleCode: pend.saleCode,
        saleName: await getEmployeeName(pend.saleCode),
        referralCode: pend.referralCode,
        affiliateName: pend.referralCode ? (await getAffiliateByCode(pend.referralCode))?.name ?? null : null,
        createdAt: new Date().toISOString(),
        items: pend.lines.map((l) => ({
          productCode: l.productCode,
          productName: l.productName,
          unit: l.unit,
          unitPrice: l.unitPrice,
          qty: l.qty,
          lineTotal: l.lineTotal,
        })),
      };
    }
  }
  const rows = await query<{
    order_no: string;
    customer_name: string;
    customer_code: string | null;
    phone: string;
    address: string | null;
    note: string | null;
    subtotal: string;
    gross: string;
    discount: string;
    sale_code: string | null;
    sale_name: string | null;
    referral_code: string | null;
    trans_flag: number;
    payment_method: string;
    status: string;
    created_at: Date;
  }>(
    `select ${ORDER_HEAD},
            coalesce(ic.total_value_2,0) as gross,
            coalesce(ic.total_discount_2,0) as discount,
            nullif(ic.sale_code,'') as sale_code,
            coalesce(nullif(emp.fullname_lo,''), nullif(emp.fullname_en,''), nullif(ic.sale_code,'')) as sale_name,
            nullif(ic.remark,'') as referral_code
       from public.ic_trans ic
       left join public.ar_customer ar on ar.code = ic.cust_code
       left join public.odg_employee emp on emp.employee_code = ic.sale_code
      where ic.doc_no = $1 and ${WEB_ORDER}`,
    [orderNo],
  );
  const o = rows[0];
  if (!o) return null;

  const items = await query<{
    product_code: string;
    product_name: string;
    unit: string | null;
    unit_price: string | null;
    qty: number;
    line_total: string;
  }>(
    `select item_code as product_code, item_name as product_name, unit_code as unit,
            price_2 as unit_price, qty, sum_amount_2 as line_total
       from public.ic_trans_detail
      where doc_no = $1
      order by roworder`,
    [orderNo],
  );

  return {
    orderNo: o.order_no,
    customerName: o.customer_name,
    customerCode: o.customer_code,
    phone: o.phone,
    address: o.address,
    note: o.note,
    // total_value_2 = gross (items + shipping, before discount); shipping is 0
    // by the current business rule, so this is the full items subtotal.
    subtotal: Number(o.gross),
    shippingFee: 0,
    discount: Number(o.discount),
    status: o.status,
    paymentMethod: o.payment_method ?? "transfer",
    shippingMethod: "odien",
    smlDocNo: o.order_no,
    saleCode: o.sale_code,
    saleName: o.sale_name,
    referralCode: o.referral_code,
    affiliateName: o.referral_code ? (await getAffiliateByCode(o.referral_code))?.name ?? null : null,
    createdAt: (o.created_at instanceof Date ? o.created_at : new Date(o.created_at)).toISOString(),
    items: items.map((i) => ({
      productCode: i.product_code,
      productName: i.product_name,
      unit: i.unit,
      unitPrice: i.unit_price == null ? null : Number(i.unit_price),
      qty: i.qty,
      lineTotal: Number(i.line_total),
    })),
  };
}
