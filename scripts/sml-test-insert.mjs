// ===========================================================================
// SML cash-sale insert — VALIDATION HARNESS (always ROLLBACK, nothing persists)
// ===========================================================================
// Run this in YOUR controlled environment to verify the five-table LAK transfer
// against the real SML schema + triggers, WITHOUT committing anything:
//
//   node --env-file=.env scripts/sml-test-insert.mjs
//
// ⚠️ Point DATABASE_URL at a TEST / copy SML database first. The transaction is
// always rolled back, so no bill persists — but the insert does briefly exercise
// production triggers (which are DB-only / rollback-safe: they write to the
// odg_chatbot_line_noti / pp_send queue tables, and vatpassthai rewrites the
// row's VAT). Sequences (roworder) advance by a few — harmless (gaps are fine).
//
// It mirrors src/lib/sml-cash-sale.ts. SML constants come from the SML_* env vars
// (same as the app); template-derived fallbacks are only for a quick smoke test —
// replace them with your real codes.
//
// ⚠️ FINDING: the `vatpassthai` trigger force-sets vat_rate=7 and recomputes
// total_amount = total_value * 1.07 on every ic_trans insert (looks like leftover
// Thai 7% VAT config — Lao VAT is 10%). Check the printed "after triggers" total
// and decide whether that trigger should apply to these sales.
// ===========================================================================
import pg from "pg";

const env = (k, d) => process.env[k]?.trim() || d;
const cfg = {
  branch: env("SML_BRANCH_CODE", "00"),
  side: env("SML_SIDE_CODE", "200"),
  dept: env("SML_DEPARTMENT_CODE", "2031"),
  sale: env("SML_SALE_CODE", "23053"),
  cashier: env("SML_CASHIER_CODE", "15001"),
  fmt: env("SML_DOC_FORMAT", "CAK"),
  vatType: Number(env("SML_VAT_TYPE", "2")),
  vatRate: Number(env("SML_VAT_RATE", "0")),
  payType: Number(env("SML_PAY_TYPE", "1")),
  walkin: env("SML_WALKIN_CUST", "01-0753"),
  transferAcct: env("SML_CB_TRANSFER_ACCOUNT", "1010201"),
  transferBank: env("SML_CB_TRANSFER_BANK", "BCEL001"),
  shipOdien: env("SML_SHIP_CODE_ODIEN", ""),
  shipThanjai: env("SML_SHIP_CODE_THANJAI", ""),
  shipArea: env("SML_SHIP_LOGISTIC_AREA", ""),
};
const docNo = "ZZTEST0001";

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: false });
await c.connect();
const step = async (label, sql, params) => {
  try { await c.query(sql, params); console.log(`  ✅ ${label}`); }
  catch (e) { console.log(`  ❌ ${label}: ${e.message}`); throw e; }
};

await c.query("begin");
try {
  const oh = (await c.query(
    `select id, order_no, coalesce(customer_code,$1) as cust, subtotal,
            coalesce(shipping_fee,0) as shipping_fee,
            customer_name, phone, address, note,
            coalesce(shipping_method,'odien') as ship,
            coalesce(payment_method,'cod') as pm
       from ecom.orders
      where coalesce(payment_method,'cod')='transfer'
      order by created_at desc limit 1`, [cfg.walkin])).rows[0];
  if (!oh) throw new Error("no bank-transfer ecom.orders to test with");
  const items = (await c.query(
    `select oi.product_code, oi.product_name, coalesce(oi.unit,'') as unit,
            coalesce(oi.unit_price,0) as price, oi.qty, oi.line_total,
            a.wh_code, a.shelf_code
       from ecom.order_items oi
       left join ecom.order_item_allocations a on a.order_item_id=oi.id
      where oi.order_id=$1 order by oi.id`, [oh.id])).rows;
  if (items.some((it) => !it.wh_code || !it.shelf_code)) {
    throw new Error("latest order has incomplete warehouse allocation");
  }
  const rate = Number((await c.query(
    `select exchange_rate_present from public.erp_currency where code='02'`,
  )).rows[0]?.exchange_rate_present);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("invalid LAK currency 02 exchange rate");
  const base = (lak) => Math.round(lak * rate * 100) / 100;
  const subLak = Number(oh.subtotal);
  const shippingLak = Number(oh.shipping_fee);
  const totalLak = subLak + shippingLak;
  const subBase = base(subLak);
  const shippingBase = base(shippingLak);
  const totalBase = base(totalLak);
  console.log(`testing order ${oh.order_no} | cust ${oh.cust} | ${totalLak} LAK | rate ${rate} | ${items.length} items\n`);

  await step("ic_trans header",
    `insert into public.ic_trans (roworder,trans_type,trans_flag,doc_date,doc_no,doc_ref,tax_doc_no,tax_doc_date,vat_type,cust_code,branch_code,side_code,department_code,sale_code,vat_rate,currency_code,exchange_rate,transport_value,total_value,total_value_2,total_amount,total_amount_2,doc_time,cashier_code,creator_code,doc_format_code,create_datetime,create_date_time_now)
     values (nextval('public.ic_trans_roworder_seq'),2,44,now()::date,$1,$1,$1,now()::date,$2,$3,$4,$5,$6,$7,$8,'02',$9,$10,$11,$12,$13,$14,to_char(now(),'HH24:MI'),$15,$15,$16,now(),now())`,
    [docNo, cfg.vatType, oh.cust, cfg.branch, cfg.side, cfg.dept, cfg.sale, cfg.vatRate, rate, shippingBase, subBase, subLak, totalBase, totalLak, cfg.cashier, cfg.fmt]);

  for (const it of items) {
    const avg = Number((await c.query(`select coalesce(average_cost,0) as a from public.ic_inventory where code=$1`, [it.product_code])).rows[0]?.a ?? 0);
    const priceLak = Number(it.price);
    const lineLak = Number(it.line_total);
    await step(`ic_trans_detail ${it.product_code}`,
      `insert into public.ic_trans_detail (roworder,trans_type,trans_flag,doc_date,doc_no,cust_code,item_code,item_name,unit_code,qty,price,sum_amount,branch_code,wh_code,shelf_code,vat_type,price_type,calc_flag,is_get_price,stand_value,divide_value,ref_row,average_cost,average_cost_1,sum_of_cost,sum_of_cost_1,price_2,sum_amount_2,sale_code,create_date_time_now)
       values (nextval('public.ic_trans_detail_roworder_seq'),2,44,now()::date,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,2,-1,1,1,1,-1,$13,$13,$14,$14,$15,$16,$17,now())`,
      [docNo, oh.cust, it.product_code, it.product_name, it.unit, it.qty, base(priceLak), base(lineLak), cfg.branch, it.wh_code, it.shelf_code, cfg.vatType, avg, avg * it.qty, priceLak, lineLak, cfg.sale]);
  }

  await step("cb_trans header",
    `insert into public.cb_trans (roworder,trans_type,trans_flag,doc_date,doc_no,currency_code,exchange_rate,total_amount,total_net_amount,total_amount_pay,cash_amount,tranfer_amount,sum_amount_2,doc_time,ap_ar_code,pay_type,doc_format_code,branch_code,cashier_code,create_date_time_now)
     values (nextval('public.cb_trans_roworder_seq'),2,44,now()::date,$1,$2,$3,$4,$4,$4,$5,$6,$4,to_char(now(),'HH24:MI'),$7,$8,$9,$10,$11,now())`,
    [docNo, "", 0, totalBase, 0, totalBase, oh.cust, cfg.payType, cfg.fmt, cfg.branch, cfg.cashier]);
  await step("cb_trans_detail",
    `insert into public.cb_trans_detail (roworder,trans_type,trans_flag,doc_date,doc_no,trans_number,bank_code,bank_branch,exchange_rate,amount,currency_code,sum_amount_2,doc_type,doc_time,create_date_time_now)
     values (nextval('public.cb_trans_detail_roworder_seq'),2,44,now()::date,$1,$2,$3,$3,$4,$5,$6,$7,1,to_char(now(),'HH24:MI'),now())`,
    [docNo, cfg.transferAcct, cfg.transferBank, rate, totalLak, "02", totalBase]);

  const tc = oh.ship === "thanjai" ? cfg.shipThanjai : cfg.shipOdien;
  await step("ic_trans_shipment",
    `insert into public.ic_trans_shipment (roworder,doc_no,doc_date,trans_flag,cust_code,transport_name,transport_address,transport_telephone,transport_code,logistic_area,remark,create_date_time_now)
     values (nextval('public.ic_trans_shipment_roworder_seq'),$1,now()::date,44,$2,$3,$4,$5,$6,$7,$8,now())`,
    [docNo, oh.cust, oh.customer_name, oh.address ?? "", oh.phone, tc, cfg.shipArea, oh.note ?? ""]);

  const back = (await c.query(`select vat_rate,total_value,total_vat_value,total_amount from public.ic_trans where doc_no=$1`, [docNo])).rows[0];
  console.log("\nafter triggers, ic_trans totals:", JSON.stringify(back));
  console.log("✅✅ ALL SML INSERTS ACCEPTED BY SML TRIGGERS");
} catch (e) {
  console.log("\n⛔ stopped at:", e.message);
} finally {
  await c.query("rollback");
  console.log("(rolled back — nothing persisted)");
}
await c.end();
