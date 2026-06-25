// ===========================================================================
// REWARD REQUISITION (RWRT — ໃບຂໍເບີກສິນຄ້າແລກລາງວັນ) VALIDATION HARNESS
// ===========================================================================
// Exercises the REAL flow used by src/lib/reward-requisition.ts against the live
// SML schema + triggers, then ALWAYS ROLLS BACK — nothing persists:
//
//   node --env-file=.env scripts/reward-requisition-test.mjs
//
// ⚠️ Point DATABASE_URL at a TEST / copy SML database first. The app sandbox
// blocks public.* writes, so the SML team must run this in their own environment.
//
// What it does, in ONE rolled-back transaction (matches the live RWRT convention:
// trans_type 3, single trans_flag 122, branch 01, price 0, cust_code empty,
// customer in remark, warehouse/shelf stamped on the detail):
//   1. INSERT ic_trans + ic_trans_detail  trans_flag 122 (RWRT@YY######),
//      wh 0000/000000 placeholder, all totals 0.
//   2. UPDATE the detail line  wh_code/shelf_code → a real warehouse/shelf
//      (the admin "ກຳນົດສາງຈ່າຍ" step). Flag stays 122.
//   3. INSERT ic_trans_shipment  (the delivery hand-off). NO cash-book (free).
//   4. SELECT everything back, print it, then ROLLBACK.
//
// Reuses the SML_TEST_* item/warehouse/shelf env from sml-cae-test.mjs.
// ===========================================================================
import pg from "pg";

const env = (k, d) => process.env[k]?.trim() || d;
const cfg = {
  fmt: env("REWARD_DOC_FORMAT", "RWRT"),
  flag: Number(env("REWARD_REQ_FLAG", "122")),
  transType: Number(env("REWARD_TRANS_TYPE", "3")),
  branch: env("REWARD_BRANCH", "01"),
  // a real item code + a real warehouse/shelf for the smoke test
  itemCode: env("SML_TEST_ITEM_CODE", ""),
  whCode: env("SML_TEST_WH_CODE", ""),
  shelfCode: env("SML_TEST_SHELF_CODE", ""),
  qty: Number(env("SML_TEST_QTY", "1")),
  // a real member code + name to embed in the requisition remark
  custCode: env("SML_TEST_CUST_CODE", env("SML_WALKIN_CUST", "")),
  custName: env("SML_TEST_CUST_NAME", "ລູກຄ້າທົດສອບ"),
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

try {
  await client.query("begin");

  // average cost for the test item (RWRT lines carry cost 0, but confirm the item exists)
  const ic = await client.query(`select coalesce(average_cost,0) as a from public.ic_inventory where code = $1`, [cfg.itemCode]);
  if (ic.rowCount === 0) throw new Error(`item ${cfg.itemCode} not found`);

  // next RWRT doc_no
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
  const remark = `ຂໍເບີກແລກລາງວັນ ລູກຄ້າສະມາຊິກ: ${cfg.custCode}-${cfg.custName} (ປະເພດການຮັບ : ລູກຄ້າຮັບເອງ)`;
  console.log(`doc_no=${docNo}  flag=${cfg.flag}  trans_type=${cfg.transType}  branch=${cfg.branch}`);

  // 1) header flag 122 — cust_code empty, currency empty, totals 0
  await client.query(
    `insert into public.ic_trans (
       roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no,
       vat_type, vat_rate, cust_code, branch_code, currency_code, exchange_rate,
       total_value, total_amount, total_value_2, total_amount_2, total_discount, total_discount_2,
       doc_time, creator_code, doc_format_code,
       point_telephone, remark_3, remark_4, remark_2, remark, remark_5,
       create_datetime, create_date_time_now
     ) values (
       nextval('public.ic_trans_roworder_seq'), $2, $3, 0, now()::date, $1,
       0, 0, '', $4, '', 0,
       0, 0, 0, 0, 0, 0,
       to_char(now(),'HH24:MI'), $5, $6,
       '', $7, '', $8, $9, 'odienmall',
       now(), now())`,
    [docNo, cfg.transType, cfg.flag, cfg.branch, cfg.custCode, cfg.fmt, cfg.custName, `${cfg.itemCode} test`, remark],
  );

  // 1) detail flag 122, wh 0000 placeholder, price 0, calc_flag 0
  await client.query(
    `insert into public.ic_trans_detail (
       roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no, cust_code,
       item_code, item_name, unit_code, qty, price, sum_amount,
       branch_code, wh_code, shelf_code, vat_type, calc_flag, stand_value, divide_value,
       average_cost, average_cost_1, sum_of_cost, sum_of_cost_1,
       price_exclude_vat, sum_amount_exclude_vat, price_2, sum_amount_2, create_date_time_now
     ) values (
       nextval('public.ic_trans_detail_roworder_seq'), $2, $3, 0, now()::date, $1, '',
       $4, $4, '', $5, 0, 0,
       $6, '0000', '000000', 0, 0, 1, 1,
       0, 0, 0, 0,
       0, 0, 0, 0, now())`,
    [docNo, cfg.transType, cfg.flag, cfg.itemCode, cfg.qty, cfg.branch],
  );

  console.log("\n-- after RWRT insert (triggers fired) --");
  console.table((await client.query(
    `select trans_type, trans_flag, branch_code, cust_code, total_amount_2 from public.ic_trans where doc_no=$1`, [docNo])).rows);
  console.table((await client.query(
    `select trans_flag, wh_code, shelf_code, qty, price from public.ic_trans_detail where doc_no=$1`, [docNo])).rows);

  // 2) admin allocation — stamp the real warehouse/shelf (flag stays 122)
  await client.query(
    `update public.ic_trans_detail set wh_code=$2, shelf_code=$3 where doc_no=$1 and item_code=$4`,
    [docNo, cfg.whCode, cfg.shelfCode, cfg.itemCode]);

  // 3) delivery hand-off (no cash-book — paid with points)
  await client.query(
    `insert into public.ic_trans_shipment (
       roworder, doc_no, doc_date, trans_flag, cust_code,
       transport_name, transport_address, transport_telephone,
       transport_code, logistic_area, remark, create_date_time_now
     ) values (
       nextval('public.ic_trans_shipment_roworder_seq'), $1, now()::date, $2, '',
       $3, '', '', '01', null, 'ໃບຂໍເບີກລາງວັນ (test)', now())`,
    [docNo, cfg.flag, cfg.custName]);

  console.log("\n-- after warehouse stamp + shipment --");
  console.table((await client.query(
    `select trans_flag, wh_code, shelf_code from public.ic_trans_detail where doc_no=$1`, [docNo])).rows);
  console.table((await client.query(
    `select trans_flag, transport_code, transport_name from public.ic_trans_shipment where doc_no=$1`, [docNo])).rows);

  await client.query("rollback");
  console.log("\n✓ full RWRT flow ran against the real schema/triggers — ROLLED BACK (nothing persisted).");
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error("\n✗ failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
