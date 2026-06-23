// ===========================================================================
// SML ONLINE CASH-SALE (CAE) — flag 34 → 44 VALIDATION HARNESS
// ===========================================================================
// Exercises the REAL flow used by src/lib/sml-sale-order.ts against the live SML
// schema + triggers, then ALWAYS ROLLS BACK — nothing persists:
//
//   node --env-file=.env scripts/sml-cae-test.mjs
//
// ⚠️ Point DATABASE_URL at a TEST / copy SML database first. The app sandbox
// blocks public.* writes, so the SML team must run this in their own environment.
//
// What it does, in ONE rolled-back transaction:
//   1. INSERT ic_trans + ic_trans_detail  trans_flag 34 (ໃບສັ່ງຊື້, CAE@YY######),
//      branch 99, wh 0000, currency 02 + live exchange_rate, NO VAT.
//   2. UPDATE those rows  flag 34 → 44 (ບິນສົດ) + set a real wh_code/shelf_code.
//   3. INSERT cb_trans + cb_trans_detail  (money in, BCEL transfer).
//   4. SELECT everything back, print it, then ROLLBACK.
//
// The vatpassthai trigger does NOT apply here: it fires only WHEN vat_type=0 AND
// branch_code='05' AND trans_flag IN (2,4,6,8,12). These rows use vat_type=2,
// branch 99, flag 34/44 — so no VAT is force-added. Likewise the flag-44 INSERT
// triggers (check_side_isnull / line-noti / pp_send) don't fire, because we INSERT
// flag 34 then UPDATE 34→44 (those triggers are BEFORE/AFTER INSERT only).
// ===========================================================================
import pg from "pg";

const env = (k, d) => process.env[k]?.trim() || d;
const cfg = {
  branch: env("SML_CAE_BRANCH", "99"),
  fmt: env("SML_CAE_DOC_FORMAT", "CAE"),
  currency: env("SML_CAE_CURRENCY", "02"),
  walkin: env("SML_WALKIN_CUST", ""),
  cashier: env("SML_CASHIER_CODE", ""),
  cbAccount: env("SML_CB_TRANSFER_ACCOUNT", ""),
  cbBank: env("SML_CB_TRANSFER_BANK", ""),
  // a real item code + a real warehouse/shelf in that branch for the smoke test
  itemCode: env("SML_TEST_ITEM_CODE", ""),
  whCode: env("SML_TEST_WH_CODE", ""),
  shelfCode: env("SML_TEST_SHELF_CODE", ""),
  qty: Number(env("SML_TEST_QTY", "1")),
  priceLak: Number(env("SML_TEST_PRICE_LAK", "100000")),
};

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL (point at a TEST SML database).");
  process.exit(1);
}
for (const [k, v] of Object.entries({ itemCode: cfg.itemCode, whCode: cfg.whCode, shelfCode: cfg.shelfCode })) {
  if (!v) { console.error(`Missing SML_TEST_${k.replace(/[A-Z]/g, (c) => "_" + c).toUpperCase()} — set a real ${k}.`); process.exit(1); }
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const round6 = (n) => Math.round(n * 1e6) / 1e6;

try {
  await client.query("begin");

  // live exchange rate
  const er = await client.query(`select exchange_rate_present from public.erp_currency where code = $1`, [cfg.currency]);
  const rate = Number(er.rows[0]?.exchange_rate_present);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`bad exchange rate for currency ${cfg.currency}`);

  // average cost for the test item
  const ic = await client.query(`select coalesce(average_cost,0) as a from public.ic_inventory where code = $1`, [cfg.itemCode]);
  if (ic.rowCount === 0) throw new Error(`item ${cfg.itemCode} not found`);
  const avg = Number(ic.rows[0].a);

  // next CAE doc_no
  const yy = (await client.query(`select to_char(now(),'YY') as yy`)).rows[0].yy;
  const prefix = `${cfg.fmt}${yy}`;
  const seq = await client.query(
    `select coalesce(max(substring(doc_no from $1::int)::bigint),0) as last
       from public.ic_trans
      where doc_no like $2 and char_length(doc_no) = $3
        and substring(doc_no from $1::int) ~ '^[0-9]+$'`,
    [prefix.length + 1, `${prefix}%`, prefix.length + 6],
  );
  const docNo = `${prefix}${String(Number(seq.rows[0].last) + 1).padStart(6, "0")}`;
  console.log(`doc_no=${docNo}  rate=${rate}  avg_cost=${avg}`);

  const lineLak = cfg.priceLak * cfg.qty;
  const totalLak = lineLak;
  const cur = (lak) => round6(lak * rate);

  // 1) header flag 34
  await client.query(
    `insert into public.ic_trans (
       roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no,
       vat_type, vat_rate, cust_code, branch_code, currency_code, exchange_rate,
       total_value, total_amount, total_value_2, total_amount_2,
       doc_time, creator_code, doc_format_code, remark_5, create_datetime, create_date_time_now
     ) values (
       nextval('public.ic_trans_roworder_seq'), 2, 34, 1, now()::date, $1,
       2, 0, $2, $3, $4, $5,
       $6, $6, $7, $7,
       to_char(now(),'HH24:MI'), $2, $8, 'web', now(), now())`,
    [docNo, cfg.walkin, cfg.branch, cfg.currency, rate, cur(totalLak), totalLak, cfg.fmt],
  );

  // 1) detail flag 34, wh 0000
  await client.query(
    `insert into public.ic_trans_detail (
       roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no, cust_code,
       item_code, item_name, unit_code, qty, price, sum_amount,
       branch_code, wh_code, shelf_code, vat_type, calc_flag, stand_value, divide_value,
       average_cost, average_cost_1, sum_of_cost, sum_of_cost_1,
       price_exclude_vat, sum_amount_exclude_vat, price_2, sum_amount_2, create_date_time_now
     ) values (
       nextval('public.ic_trans_detail_roworder_seq'), 2, 34, 1, now()::date, $1, $2,
       $3, $4, '', $5, $6, $6,
       $7, '0000', '000000', 1, -1, 1, 1,
       $8, $8, $9, $9,
       $10, $10, $10, $10, now())`,
    [docNo, cfg.walkin, cfg.itemCode, cfg.itemCode, cfg.qty, cur(lineLak), cfg.branch, avg, avg * cfg.qty, lineLak],
  );

  console.log("\n-- after flag-34 insert (triggers fired) --");
  console.table((await client.query(
    `select trans_flag, vat_rate, total_value, total_amount, total_value_2 from public.ic_trans where doc_no=$1`, [docNo])).rows);
  console.table((await client.query(
    `select trans_flag, wh_code, shelf_code, qty, sum_amount_2 from public.ic_trans_detail where doc_no=$1`, [docNo])).rows);

  // 2) promote 34 → 44 + real warehouse
  await client.query(`update public.ic_trans set trans_flag = 44 where doc_no=$1 and trans_flag=34`, [docNo]);
  await client.query(`update public.ic_trans_detail set trans_flag = 44 where doc_no=$1 and trans_flag=34`, [docNo]);
  await client.query(
    `update public.ic_trans_detail set wh_code=$2, shelf_code=$3 where doc_no=$1 and item_code=$4`,
    [docNo, cfg.whCode, cfg.shelfCode, cfg.itemCode]);

  // 3) cash-book receipt (transfer)
  const totalCur = cur(totalLak);
  await client.query(
    `insert into public.cb_trans (
       roworder, trans_type, trans_flag, doc_date, doc_no, currency_code, exchange_rate,
       total_amount, total_net_amount, total_amount_pay, cash_amount, tranfer_amount, sum_amount_2,
       doc_time, ap_ar_code, pay_type, doc_format_code, branch_code, cashier_code, create_date_time_now
     ) values (
       nextval('public.cb_trans_roworder_seq'), 2, 44, now()::date, $1, $2, $3,
       $4, $4, $4, 0, $4, $5,
       to_char(now(),'HH24:MI'), $6, 1, $7, $8, $9, now())`,
    [docNo, cfg.currency, rate, totalCur, totalLak, cfg.walkin, cfg.fmt, cfg.branch, cfg.cashier]);
  await client.query(
    `insert into public.cb_trans_detail (
       roworder, trans_type, trans_flag, doc_date, doc_no, trans_number, bank_code, bank_branch,
       exchange_rate, amount, currency_code, sum_amount_2, doc_type, doc_time, create_date_time_now
     ) values (
       nextval('public.cb_trans_detail_roworder_seq'), 2, 44, now()::date, $1, $2, $3, $3,
       $4, $5, $6, $7, 1, to_char(now(),'HH24:MI'), now())`,
    [docNo, cfg.cbAccount, cfg.cbBank, rate, totalCur, cfg.currency, totalLak]);

  console.log("\n-- after 34→44 + cb_trans --");
  console.table((await client.query(
    `select trans_flag, wh_code, shelf_code from public.ic_trans_detail where doc_no=$1`, [docNo])).rows);
  console.table((await client.query(
    `select trans_flag, tranfer_amount, cash_amount, sum_amount_2 from public.cb_trans where doc_no=$1`, [docNo])).rows);

  await client.query("rollback");
  console.log("\n✓ all 6 statements ran against the real schema/triggers — ROLLED BACK (nothing persisted).");
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error("\n✗ failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
