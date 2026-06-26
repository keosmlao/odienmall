// ===========================================================================
// STOCK TRANSFER REQUISITION (FR — ໃບຂໍໂອນສິນຄ້າ) VALIDATION HARNESS
// ===========================================================================
// Runs the exact INSERTs used by createTransferRequisition (src/lib/stock-transfer.ts)
// against the live ic_trans schema + triggers, then ALWAYS ROLLS BACK.
//
//   node --env-file=.env scripts/stock-transfer-test.mjs
//
// ⚠️ Point DATABASE_URL at a TEST / copy database first.
//
// FR convention (verified): trans_type 3, trans_flag 124, branch '00', currency '',
// amounts 0, wh_from/location_from → wh_to/location_to, doc_no FR+YYMM+4digit.
// ===========================================================================
import pg from "pg";

const env = (k, d) => process.env[k]?.trim() || d;
const cfg = {
  fmt: env("TRANSFER_DOC_FORMAT", "FR"),
  flag: Number(env("TRANSFER_FLAG", "124")),
  transType: Number(env("TRANSFER_TRANS_TYPE", "3")),
  branch: env("TRANSFER_BRANCH", "00"),
  itemCode: env("SML_TEST_ITEM_CODE", ""),
  whFrom: env("SML_TEST_WH_CODE", ""),
  shelfFrom: env("SML_TEST_SHELF_CODE", ""),
  whTo: env("SML_TEST_WH_TO", ""),
  qty: Number(env("SML_TEST_QTY", "1")),
};

if (!process.env.DATABASE_URL) { console.error("Set DATABASE_URL (TEST db)."); process.exit(1); }
for (const [k, v] of Object.entries({ itemCode: cfg.itemCode, whFrom: cfg.whFrom, whTo: cfg.whTo })) {
  if (!v) { console.error(`Missing test value for ${k} (set SML_TEST_* envs).`); process.exit(1); }
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("begin");
  const ym = (await client.query(`select to_char(now(),'YYMM') as ym`)).rows[0].ym;
  const prefix = `${cfg.fmt}${ym}`;
  const seq = await client.query(
    `select coalesce(max(substring(doc_no from $1::int)::bigint),0) as last from public.ic_trans
      where doc_no like $2 and char_length(doc_no)=$3 and substring(doc_no from $1::int) ~ '^[0-9]+$'`,
    [prefix.length + 1, `${prefix}%`, prefix.length + 4],
  );
  const docNo = `${prefix}${String(Number(seq.rows[0].last) + 1).padStart(4, "0")}`;
  const remark = `ຂໍໂອນມາສາງ ${cfg.whTo} (test)`;
  console.log(`doc_no=${docNo}  ${cfg.whFrom} → ${cfg.whTo}`);

  await client.query(
    `insert into public.ic_trans (
       roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no, doc_ref, doc_ref_date,
       vat_type, vat_rate, cust_code, branch_code, currency_code, exchange_rate,
       total_value, total_amount, total_value_2, total_amount_2, total_cost,
       doc_time, creator_code, doc_format_code, wh_from, location_from, wh_to, location_to,
       remark, remark_5, create_datetime, create_date_time_now
     ) values (
       nextval('public.ic_trans_roworder_seq'), $2, $3, 0, now()::date, $1, $4, now()::date,
       0,0,'',$5,'',0, 0,0,0,0,0,
       to_char(now(),'HH24:MI'), 'web', $6, $7, $8, '', $9, '', $4, 'odienmall', now(), now())`,
    [docNo, cfg.transType, cfg.flag, remark, cfg.branch, cfg.fmt, cfg.whFrom, cfg.shelfFrom, cfg.whTo],
  );
  await client.query(
    `insert into public.ic_trans_detail (
       roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no, cust_code,
       item_code, item_name, unit_code, qty, price, sum_amount,
       branch_code, wh_code, shelf_code, vat_type, calc_flag, stand_value, divide_value,
       average_cost, sum_of_cost, price_2, sum_amount_2, create_date_time_now
     ) values (
       nextval('public.ic_trans_detail_roworder_seq'), $2, $3, 0, now()::date, $1, '',
       $4, $4, '', $5, 0, 0, $6, $7, $8, 0, 0, 1, 1, 0, 0, 0, 0, now())`,
    [docNo, cfg.transType, cfg.flag, cfg.itemCode, cfg.qty, cfg.branch, cfg.whFrom, cfg.shelfFrom],
  );

  console.log("\n-- header --");
  console.table((await client.query(`select trans_type, trans_flag, wh_from, wh_to, remark from public.ic_trans where doc_no=$1`, [docNo])).rows);
  console.log("-- detail --");
  console.table((await client.query(`select trans_flag, item_code, qty, wh_code from public.ic_trans_detail where doc_no=$1`, [docNo])).rows);

  await client.query("rollback");
  console.log("\n✓ FR transfer ran against the real schema/triggers — ROLLED BACK (nothing persisted).");
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error("\n✗ failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
