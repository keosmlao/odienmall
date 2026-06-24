import "server-only";
import { pool, query } from "./db";
import {
  adminTransportLabel,
  toAdminTransportCode,
} from "./admin-shipping-constants";

// ===========================================================================
// SML ONLINE CASH-SALE (CAE) — writes to the PRODUCTION ERP (public.*)
// ===========================================================================
// Models the existing CAE flow (doc "ໃບຂາຍສິນຄ້າ-ເງິນສົດ-ອອນລາຍ"):
//   • customer orders  → ic_trans + ic_trans_detail, trans_flag 34 (ໃບສັ່ງຊື້),
//                         doc_no CAE@YY######, branch 99, wh 0000, no VAT,
//                         currency 02 (LAK) with the ERP "present" exchange rate.
//   • admin issues bill → UPDATE those rows trans_flag 34 → 44 (ບິນສົດ), stamp the
//                         real warehouse/shelf onto each line, and post cb_trans.
//
// GATED OFF by default (throws unless SML_DIRECT_WRITE=1). ⚠️ NOT testable from
// the app sandbox (public.* writes are blocked) — the SML team must validate this
// on a TEST/copy DB (scripts/sml-cae-test.mjs) before enabling in production.
// ===========================================================================

export function smlDirectWriteEnabled(): boolean {
  return process.env.SML_DIRECT_WRITE === "1";
}

const BRANCH = process.env.SML_CAE_BRANCH?.trim() || "99";
const DOC_FORMAT = process.env.SML_CAE_DOC_FORMAT?.trim() || "CAE";
const CURRENCY = process.env.SML_CAE_CURRENCY?.trim() || "02";
const WALKIN = process.env.SML_WALKIN_CUST?.trim() || "";
// Cash-book (money received) — BCEL transfer account.
const CB_ACCOUNT = process.env.SML_CB_TRANSFER_ACCOUNT?.trim() || "";
const CB_BANK = process.env.SML_CB_TRANSFER_BANK?.trim() || "";
const CB_CASHIER = process.env.SML_CASHIER_CODE?.trim() || "";

type Client = {
  query: (q: string, p?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

/** Live ERP "present" exchange rate for the currency (LAK amounts × rate). */
async function exchangeRate(client: Client): Promise<number> {
  const r = await client.query(
    `select exchange_rate_present from public.erp_currency where code = $1`,
    [CURRENCY],
  );
  const rate = Number((r.rows[0] as { exchange_rate_present?: string })?.exchange_rate_present);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`SML: bad exchange rate for currency ${CURRENCY}`);
  return rate;
}

/** Next CAE doc number — prefix + YY + 6-digit running (CAE@YY######). */
async function nextCaeDocNo(client: Client): Promise<string> {
  const meta = await client.query(`select to_char(now(),'YY') as yy`);
  const yy = String((meta.rows[0] as { yy: string }).yy);
  const prefix = `${DOC_FORMAT}${yy}`;
  const seq = await client.query(
    `select coalesce(max(substring(doc_no from $1::int)::bigint), 0) as last
       from public.ic_trans
      where doc_no like $2 and char_length(doc_no) = $3
        and substring(doc_no from $1::int) ~ '^[0-9]+$'`,
    [prefix.length + 1, `${prefix}%`, prefix.length + 6],
  );
  const next = Number((seq.rows[0] as { last: string }).last) + 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}

interface OrderHead {
  id: string;
  order_no: string;
  customer_code: string | null;
  subtotal: string;
  shipping_fee: string;
  sml_doc_no: string | null;
  created_at: Date;
}
interface OrderItem {
  product_code: string;
  product_name: string;
  unit: string | null;
  qty: number;
  line_total: string;
  wh_code: string | null;
  shelf_code: string | null;
}

export interface CaeOrderInput {
  customerCode: string | null;
  name: string;
  phone: string;
  address: string | null;
  note: string | null;
  referralCode: string | null;
  lines: Array<{
    productCode: string;
    productName: string;
    unit: string | null;
    unitPrice: number;
    qty: number;
    lineTotal: number;
  }>;
  subtotal: number;
  shippingFee: number;
  /** Voucher discount in LAK (0 if none). Reduces the bill total. */
  discount?: number;
  /** Salesperson (ພະນັກງານຂາຍ) — an odg_employee code → ic_trans.sale_code. */
  saleCode?: string | null;
}

/**
 * Create a web order DIRECTLY as the SML ໃບສັ່ງຊື້ (ic_trans flag 34, CAE) — the
 * order IS the SML record (no ecom.orders). Returns the CAE doc_no (= order no).
 * Web-only fields live in ic_trans columns (no schema change):
 *   point_telephone=phone, remark_3=name, remark_4=address, remark_2=note,
 *   remark=referral code, remark_5='odienmall'. Throws unless SML_DIRECT_WRITE=1.
 */
export async function createCaeOrder(input: CaeOrderInput): Promise<string> {
  if (!smlDirectWriteEnabled()) {
    throw new Error("SML direct write is disabled (SML_DIRECT_WRITE=1)");
  }
  if (input.lines.length === 0) throw new Error("order has no items");
  const client = await pool.connect();
  try {
    await client.query("begin");
    const rate = await exchangeRate(client);
    const cust = input.customerCode || WALKIN;
    const gross = input.subtotal + input.shippingFee;
    const discount = Math.max(0, Math.round(input.discount ?? 0));
    const net = Math.max(0, gross - discount);
    const cur = (lak: number) => Math.round(lak * rate * 1e6) / 1e6;
    const docNo = await nextCaeDocNo(client);

    const saleCode = (input.saleCode ?? "").trim();
    await client.query(
      `insert into public.ic_trans (
         roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no,
         vat_type, vat_rate, cust_code, branch_code, currency_code, exchange_rate,
         total_value, total_amount, total_value_2, total_amount_2,
         total_discount, total_discount_2,
         doc_time, creator_code, doc_format_code, sale_code,
         point_telephone, remark_3, remark_4, remark_2, remark, remark_5,
         create_datetime, create_date_time_now
       ) values (
         nextval('public.ic_trans_roworder_seq'), 2, 34, 1, now()::date, $1,
         2, 10, $2, $3, $4, $5,
         $6, $7, $8, $9,
         $14, $15,
         to_char(now(),'HH24:MI'), $2, $10, $18,
         $11, $12, $13, $16, $17, 'odienmall',
         now(), now()
       )`,
      [
        docNo, cust, BRANCH, CURRENCY, rate,
        cur(gross), cur(net), gross, net, DOC_FORMAT,
        input.phone || "", input.name || "", input.address || "",
        cur(discount), discount,
        input.note || "", input.referralCode || "",
        saleCode || null,
      ],
    );

    for (const it of input.lines) {
      const cost = (
        await client.query(`select coalesce(average_cost,0) as a from public.ic_inventory where code = $1`, [it.productCode])
      ).rows[0] as { a: string } | undefined;
      const avg = Number(cost?.a ?? 0);
      await client.query(
        `insert into public.ic_trans_detail (
           roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no, cust_code,
           item_code, item_name, unit_code, qty, price, sum_amount,
           branch_code, wh_code, shelf_code, vat_type, calc_flag, stand_value, divide_value,
           average_cost, average_cost_1, sum_of_cost, sum_of_cost_1,
           price_exclude_vat, sum_amount_exclude_vat, price_2, sum_amount_2, sale_code,
           create_date_time_now
         ) values (
           nextval('public.ic_trans_detail_roworder_seq'), 2, 34, 1, now()::date, $1, $2,
           $3, $4, $5, $6, $7, $8,
           $9, '0000', '000000', 1, -1, 1, 1,
           $10, $10, $11, $11,
           $12, $13, $14, $15, $16,
           now()
         )`,
        [
          docNo, cust,
          it.productCode, it.productName, it.unit ?? "", it.qty, cur(it.lineTotal), cur(it.lineTotal),
          BRANCH, avg, avg * it.qty,
          it.lineTotal, it.lineTotal, it.lineTotal, it.lineTotal, saleCode || null,
        ],
      );
    }

    await client.query("commit");
    return docNo;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Re-stamp the salesperson (sale_code) on an already-written CAE bill — header
 * + all detail lines. Gated by SML_DIRECT_WRITE (a public.* write); a no-op when
 * the gate is off (the snapshot still carries the value). Returns true on write.
 */
export async function setSmlSaleCode(docNo: string, saleCode: string | null): Promise<boolean> {
  if (!smlDirectWriteEnabled()) return false;
  const code = (saleCode ?? "").trim() || null;
  await query(`update public.ic_trans set sale_code = $2 where doc_no = $1`, [docNo, code]);
  await query(`update public.ic_trans_detail set sale_code = $2 where doc_no = $1`, [docNo, code]);
  return true;
}

/**
 * Create the SML ໃບສັ່ງຊື້ (ic_trans flag 34, CAE) for an order. Idempotent
 * (skips if the order already has sml_doc_no). Best-effort caller — must NOT
 * block checkout. Returns the CAE doc_no, or null when disabled/skipped.
 */
export async function createSmlSaleOrder(orderNo: string): Promise<string | null> {
  if (!smlDirectWriteEnabled()) return null;
  const client = await pool.connect();
  try {
    await client.query("begin");
    const oh = (
      await client.query(
        `select id, order_no, customer_code, subtotal,
                coalesce(shipping_fee,0) as shipping_fee, sml_doc_no, created_at
           from ecom.orders where order_no = $1 for update`,
        [orderNo],
      )
    ).rows[0] as OrderHead | undefined;
    if (!oh) throw new Error(`order ${orderNo} not found`);
    if (oh.sml_doc_no) {
      await client.query("commit");
      return oh.sml_doc_no; // already created
    }

    const items = (
      await client.query(
        `select oi.product_code, oi.product_name, oi.unit, oi.qty, oi.line_total
           from ecom.order_items oi where oi.order_id = $1 order by oi.id`,
        [oh.id],
      )
    ).rows as unknown as OrderItem[];
    if (items.length === 0) throw new Error(`order ${orderNo} has no items`);

    const rate = await exchangeRate(client);
    const cust = oh.customer_code || WALKIN;
    const totalLak = Number(oh.subtotal) + Number(oh.shipping_fee);
    const cur = (lak: number) => Math.round(lak * rate * 1e6) / 1e6; // currency amount
    const docNo = await nextCaeDocNo(client);

    // header — flag 34, branch 99, currency 02. Matches CAE template: vat_type 2,
    // vat_rate 10 BUT total_value == total_amount (no VAT added to the price — the
    // _exclude_vat / _2 amounts equal the full amount), i.e. customer pays no VAT.
    await client.query(
      `insert into public.ic_trans (
         roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no,
         vat_type, vat_rate, cust_code, branch_code, currency_code, exchange_rate,
         total_value, total_amount, total_value_2, total_amount_2,
         doc_time, creator_code, doc_format_code, remark_5,
         create_datetime, create_date_time_now
       ) values (
         nextval('public.ic_trans_roworder_seq'), 2, 34, 1, $1, $2,
         2, 10, $3, $4, $5, $6,
         $7, $7, $8, $8,
         to_char(now(),'HH24:MI'), $9, $10, 'web',
         now(), now()
       )`,
      [oh.created_at, docNo, cust, BRANCH, CURRENCY, rate, cur(totalLak), totalLak, cust, DOC_FORMAT],
    );

    // lines — wh 0000 (no warehouse yet), no VAT, dual LAK/currency amounts
    for (const it of items) {
      const cost = (
        await client.query(`select coalesce(average_cost,0) as a from public.ic_inventory where code = $1`, [it.product_code])
      ).rows[0] as { a: string } | undefined;
      const avg = Number(cost?.a ?? 0);
      const lineLak = Number(it.line_total);
      await client.query(
        `insert into public.ic_trans_detail (
           roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no, cust_code,
           item_code, item_name, unit_code, qty, price, sum_amount,
           branch_code, wh_code, shelf_code, vat_type, calc_flag, stand_value, divide_value,
           average_cost, average_cost_1, sum_of_cost, sum_of_cost_1,
           price_exclude_vat, sum_amount_exclude_vat, price_2, sum_amount_2,
           create_date_time_now
         ) values (
           nextval('public.ic_trans_detail_roworder_seq'), 2, 34, 1, $1, $2, $3,
           $4, $5, $6, $7, $8, $9,
           $10, '0000', '000000', 1, -1, 1, 1,
           $11, $11, $12, $12,
           $13, $14, $15, $16,
           now()
         )`,
        [
          oh.created_at, docNo, cust,
          it.product_code, it.product_name, it.unit ?? "", it.qty, cur(lineLak), cur(lineLak),
          BRANCH, avg, avg * it.qty,
          lineLak, lineLak, lineLak, lineLak,
        ],
      );
    }

    await client.query(`update ecom.orders set sml_doc_no = $2 where order_no = $1`, [orderNo, docNo]);
    await client.query("commit");
    return docNo;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Issue the bill: UPDATE the order's CAE ic_trans rows trans_flag 34 → 44, stamp
 * the chosen warehouse/shelf onto each line, and post the cash-book receipt
 * (cb_trans + cb_trans_detail, BCEL transfer). Atomic. Returns the doc_no.
 */
export async function confirmSmlSaleOrder(
  orderNo: string,
  requestedTransportCode: string,
): Promise<string> {
  if (!smlDirectWriteEnabled()) {
    throw new Error("SML direct write is disabled (SML_DIRECT_WRITE=1)");
  }
  const transportCode = toAdminTransportCode(requestedTransportCode);
  if (!transportCode) throw new Error("ກະລຸນາເລືອກຂົນສົ່ງທີ່ຖືກຕ້ອງ");
  const docNo = orderNo; // order_no IS the CAE doc_no
  const client = await pool.connect();
  try {
    await client.query("begin");
    const oh = (
      await client.query(
        `select cust_code, coalesce(total_amount_2,0) as total_lak, trans_flag,
                doc_date, coalesce(nullif(remark_3,''),cust_code,'') as customer_name,
                coalesce(remark_4,'') as customer_address,
                coalesce(point_telephone,'') as customer_phone,
                coalesce(remark_2,'') as customer_note
           from public.ic_trans
          where doc_no = $1 and doc_format_code = 'CAE'
            and remark_5 in ('web','odienmall') for update`,
        [docNo],
      )
    ).rows[0] as {
      cust_code: string | null;
      total_lak: string;
      trans_flag: number;
      doc_date: Date;
      customer_name: string;
      customer_address: string;
      customer_phone: string;
      customer_note: string;
    } | undefined;
    if (!oh) throw new Error(`order ${docNo} not found`);
    if (Number(oh.trans_flag) !== 34) throw new Error(`order ${docNo} is not a ໃບສັ່ງຊື້ (flag 34)`);

    // Validate every detail allocation before changing the SML document.
    const allocs = (
      await client.query(
        `select d.roworder, a.wh_code, a.shelf_code
           from public.ic_trans_detail d
           join ecom.order_item_allocations a on a.order_item_id = d.roworder
          where d.doc_no = $1`,
        [docNo],
      )
    ).rows as Array<{ roworder: string; wh_code: string; shelf_code: string }>;
    const detailCount = await client.query(
      `select count(*)::int as count
         from public.ic_trans_detail where doc_no=$1`,
      [docNo],
    );
    if (
      allocs.length === 0 ||
      allocs.length !== Number((detailCount.rows[0] as { count?: number })?.count ?? 0)
    ) {
      throw new Error("ການເລືອກສາງບໍ່ຄົບທຸກລາຍການ");
    }

    // Confirm the header and stamp flag + selected warehouse/shelf on every
    // detail row in the same transaction.
    const headerUpdated = await client.query(
      `update public.ic_trans
          set trans_flag=44
        where doc_no=$1 and trans_flag=34
        returning doc_no`,
      [docNo],
    );
    if (headerUpdated.rows.length !== 1) {
      throw new Error("ປ່ຽນ ic_trans.trans_flag ເປັນ 44 ບໍ່ສຳເລັດ");
    }
    const detailsUpdated = await client.query(
      `update public.ic_trans_detail d
          set trans_flag=44,
              wh_code=a.wh_code,
              shelf_code=a.shelf_code
         from ecom.order_item_allocations a
        where d.doc_no=$1
          and d.trans_flag=34
          and a.order_item_id=d.roworder
        returning d.roworder`,
      [docNo],
    );
    if (detailsUpdated.rows.length !== allocs.length) {
      throw new Error("ປ່ຽນ ic_trans_detail ເປັນ 44 ແລະບັນທຶກສາງບໍ່ຄົບ");
    }

    // cash-book receipt (money in via BCEL transfer)
    const rate = await exchangeRate(client);
    const cust = oh.cust_code || WALKIN;
    const totalLak = Number(oh.total_lak);
    const totalCur = Math.round(totalLak * rate * 1e6) / 1e6;
    const payment = (
      await client.query(
        `select coalesce(nullif(fcc_ref,''),nullif(ticket,'')) as transfer_ref,
                coalesce(payer_name,'') as payer_name
           from ecom.onepay_payments
          where sml_doc_no=$1 or order_no=$1
          order by paid_at desc nulls last, created_at desc
          limit 1`,
        [docNo],
      )
    ).rows[0] as { transfer_ref: string | null; payer_name: string } | undefined;
    const transferRef = payment?.transfer_ref?.trim();
    if (!transferRef) {
      throw new Error("ບໍ່ພົບເລກອ້າງອີງການໂອນຈາກ BCEL");
    }
    const payerName = payment?.payer_name?.trim() ?? "";
    await client.query(
      `insert into public.cb_trans (
         roworder, trans_type, trans_flag, doc_date, doc_no, doc_ref, remark,
         currency_code, exchange_rate,
         total_amount, total_net_amount, total_amount_pay, cash_amount, tranfer_amount, sum_amount_2,
         doc_time, ap_ar_code, pay_type, doc_format_code, branch_code, cashier_code, create_date_time_now
       ) values (
         nextval('public.cb_trans_roworder_seq'), 2, 44, now()::date, $1, $2, $3,
         $4, $5,
         $6, $6, $6, 0, $6, $7,
         to_char(now(),'HH24:MI'), $8, 1, $9, $10, $11, now()
       )`,
      [
        docNo,
        transferRef.slice(0, 25),
        payerName ? `BCEL: ${payerName}`.slice(0, 255) : "BCEL OnePay",
        CURRENCY,
        rate,
        totalCur,
        totalLak,
        cust,
        DOC_FORMAT,
        BRANCH,
        CB_CASHIER,
      ],
    );
    await client.query(
      `insert into public.cb_trans_detail (
         roworder, trans_type, trans_flag, doc_date, doc_no, trans_number, bank_code, bank_branch,
         exchange_rate, amount, currency_code, sum_amount_2,
         doc_ref, chq_ref, ref1, ref2, remark,
         doc_type, doc_time, create_date_time_now
       ) values (
         nextval('public.cb_trans_detail_roworder_seq'), 2, 44, now()::date, $1, $2, $3, $3,
         $4, $5, $6, $7,
         $8, $8, $8, $9, $10,
         1, to_char(now(),'HH24:MI'), now()
       )`,
      // Existing LAK transfer bills store the transaction amount in LAK and
      // sum_amount_2 in the SML base currency.
      [
        docNo,
        CB_ACCOUNT,
        CB_BANK,
        rate,
        totalLak,
        CURRENCY,
        totalCur,
        transferRef.slice(0, 25),
        payerName.slice(0, 50),
        `BCEL transfer ${transferRef}`.slice(0, 255),
      ],
    );

    // Delivery hand-off for the selected transport branch. This is committed
    // together with flag 34→44 and the cash-book receipt.
    await client.query(
      `insert into public.ic_trans_shipment (
         roworder, doc_no, doc_date, trans_flag, cust_code,
         transport_name, transport_address, transport_telephone,
         transport_code, logistic_area, remark, create_date_time_now
       ) values (
         nextval('public.ic_trans_shipment_roworder_seq'), $1, $2, 44, $3,
         $4, $5, $6, $7, null, $8, now()
       )`,
      [
        docNo,
        oh.doc_date,
        cust,
        oh.customer_name,
        oh.customer_address,
        oh.customer_phone,
        transportCode,
        [adminTransportLabel(transportCode), oh.customer_note].filter(Boolean).join(" — "),
      ],
    );

    await client.query("commit");
    return docNo;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export interface SmlSaleDoc {
  docNo: string;
  transFlag: number; // 34 = ໃບສັ່ງຊື້, 44 = ບິນສົດ
  docDate: string | null;
  totalLak: number; // total_amount_2 (raw LAK)
  custCode: string | null;
  lines: Array<{ itemCode: string; itemName: string; qty: number; whCode: string; shelfCode: string }>;
}

export interface SmlSaleListItem {
  docNo: string;
  transFlag: number;
  docDate: string | null;
  totalLak: number;
  custCode: string | null;
  itemCount: number;
  orderNo: string | null; // linked ecom order, if any
}

export interface SmlSaleListResult {
  items: SmlSaleListItem[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * List THIS web app's SML orders (READ-ONLY) for the admin — CAE web orders in
 * public.ic_trans (doc_format_code 'CAE', remark_5 'web'). `flag` filters 34/44.
 */
export async function getSmlSaleDocs(opts: {
  flag?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<SmlSaleListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 30;
  const offset = (page - 1) * pageSize;

  const where: string[] = [
    `t.doc_format_code = 'CAE'`,
    `t.remark_5 in ('web','odienmall')`,
    `t.trans_flag in (34, 44)`,
  ];
  const params: unknown[] = [];
  if (opts.flag === 34 || opts.flag === 44) {
    params.push(opts.flag);
    where.push(`t.trans_flag = $${params.length}`);
  }
  if (opts.search?.trim()) {
    params.push(`%${opts.search.trim()}%`);
    where.push(`(t.doc_no ilike $${params.length} or t.cust_code ilike $${params.length})`);
  }
  const whereSql = where.join(" and ");

  const totalRow = await query<{ n: string }>(
    `select count(*)::text as n from public.ic_trans t where ${whereSql}`,
    params,
  );
  const total = Number(totalRow[0]?.n ?? 0);

  const rows = await query<{
    doc_no: string;
    trans_flag: number;
    doc_date: Date | null;
    total_amount_2: string | null;
    cust_code: string | null;
    item_count: string;
  }>(
    `select t.doc_no, t.trans_flag, t.doc_date, t.total_amount_2, t.cust_code,
            (select count(*) from public.ic_trans_detail d where d.doc_no = t.doc_no)::text as item_count
       from public.ic_trans t
      where ${whereSql}
      order by t.doc_date desc nulls last, t.doc_no desc
      limit ${pageSize} offset ${offset}`,
    params,
  );

  return {
    items: rows.map((r) => ({
      docNo: r.doc_no,
      transFlag: Number(r.trans_flag),
      docDate: r.doc_date ? r.doc_date.toISOString() : null,
      totalLak: Number(r.total_amount_2 ?? 0),
      custCode: r.cust_code,
      itemCount: Number(r.item_count),
      orderNo: r.doc_no,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Read the live SML document straight from public.ic_trans by doc_no (READ-ONLY).
 * Returns null when the doc doesn't exist (e.g. direct write was off at order
 * time). Used by the admin order page to show the real trans_flag (34 vs 44).
 */
export async function getSmlSaleDoc(docNo: string): Promise<SmlSaleDoc | null> {
  if (!docNo) return null;
  const head = (
    await query<{
      doc_no: string;
      trans_flag: number;
      doc_date: Date | null;
      total_amount_2: string | null;
      cust_code: string | null;
    }>(
      `select doc_no, trans_flag, doc_date, total_amount_2, cust_code
         from public.ic_trans where doc_no = $1 limit 1`,
      [docNo],
    )
  )[0];
  if (!head) return null;

  const lines = await query<{
    item_code: string;
    item_name: string | null;
    qty: string;
    wh_code: string | null;
    shelf_code: string | null;
  }>(
    `select item_code, item_name, qty, wh_code, shelf_code
       from public.ic_trans_detail where doc_no = $1 order by roworder`,
    [docNo],
  );

  return {
    docNo: head.doc_no,
    transFlag: Number(head.trans_flag),
    docDate: head.doc_date ? head.doc_date.toISOString() : null,
    totalLak: Number(head.total_amount_2 ?? 0),
    custCode: head.cust_code,
    lines: lines.map((l) => ({
      itemCode: l.item_code,
      itemName: l.item_name ?? l.item_code,
      qty: Number(l.qty),
      whCode: l.wh_code ?? "",
      shelfCode: l.shelf_code ?? "",
    })),
  };
}
