// ===========================================================================
// SML write — SAFE schema verification (READ-ONLY, no inserts, no triggers)
// ===========================================================================
// Confirms that every column src/lib/sml-cash-sale.ts inserts actually exists in
// the SML schema, and that every NOT-NULL column without a default is covered by
// our insert (so a real insert wouldn't fail on a missing required column).
//
//   node --env-file=.env scripts/sml-verify-schema.mjs
//
// This does NOT insert anything and does NOT fire triggers — safe on production.
// It validates STRUCTURE only; the definitive value/trigger test is
// sml-test-insert.mjs (run that on a TEST/copy DB).
// ===========================================================================
import pg from "pg";

// Columns our writer inserts, per table (keep in sync with sml-cash-sale.ts).
const INSERTS = {
  ic_trans: ["roworder","trans_type","trans_flag","doc_date","doc_no","doc_ref","tax_doc_no","tax_doc_date","vat_type","cust_code","branch_code","side_code","department_code","sale_code","vat_rate","currency_code","exchange_rate","transport_value","total_value","total_value_2","total_amount","total_amount_2","doc_time","cashier_code","creator_code","doc_format_code","create_datetime","create_date_time_now"],
  ic_trans_detail: ["roworder","trans_type","trans_flag","doc_date","doc_no","cust_code","item_code","item_name","unit_code","qty","price","sum_amount","branch_code","wh_code","shelf_code","vat_type","price_type","calc_flag","is_get_price","stand_value","divide_value","ref_row","average_cost","average_cost_1","sum_of_cost","sum_of_cost_1","price_2","sum_amount_2","sale_code","create_date_time_now"],
  cb_trans: ["roworder","trans_type","trans_flag","doc_date","doc_no","currency_code","exchange_rate","total_amount","total_net_amount","total_amount_pay","cash_amount","tranfer_amount","sum_amount_2","doc_time","ap_ar_code","pay_type","doc_format_code","branch_code","cashier_code","create_date_time_now"],
  cb_trans_detail: ["roworder","trans_type","trans_flag","doc_date","doc_no","trans_number","bank_code","bank_branch","exchange_rate","amount","currency_code","sum_amount_2","doc_type","doc_time","create_date_time_now"],
  ic_trans_shipment: ["roworder","doc_no","doc_date","trans_flag","cust_code","transport_name","transport_address","transport_telephone","transport_code","logistic_area","remark","create_date_time_now"],
};

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: false });
await c.connect();
let problems = 0;

for (const [table, cols] of Object.entries(INSERTS)) {
  const { rows } = await c.query(
    `select column_name, is_nullable, column_default
       from information_schema.columns
      where table_schema='public' and table_name=$1`,
    [table],
  );
  if (rows.length === 0) {
    console.log(`❌ ${table}: TABLE NOT FOUND`);
    problems++;
    continue;
  }
  const actual = new Map(rows.map((r) => [r.column_name, r]));

  // 1) every column we insert must exist
  const unknown = cols.filter((col) => !actual.has(col));
  // 2) every NOT-NULL column without a default must be provided
  const requiredMissing = rows
    .filter((r) => r.is_nullable === "NO" && r.column_default === null)
    .map((r) => r.column_name)
    .filter((col) => !cols.includes(col));

  if (unknown.length === 0 && requiredMissing.length === 0) {
    console.log(`✅ ${table}: ${cols.length} cols OK (exist + all required covered)`);
  } else {
    if (unknown.length) console.log(`❌ ${table}: columns we insert that DON'T EXIST → ${unknown.join(", ")}`);
    if (requiredMissing.length) console.log(`❌ ${table}: required (NOT NULL, no default) NOT provided → ${requiredMissing.join(", ")}`);
    problems++;
  }

  // Informational: NOT-NULL-with-default columns we omit (DB fills them).
  const omittedWithDefault = rows
    .filter((r) => r.is_nullable === "NO" && r.column_default !== null)
    .map((r) => r.column_name)
    .filter((col) => !cols.includes(col));
  if (omittedWithDefault.length) {
    console.log(`   ℹ️  ${table}: NOT NULL but has default, relying on DB → ${omittedWithDefault.join(", ")}`);
  }
}

console.log(problems === 0 ? "\n✅ SCHEMA OK — all insert columns valid & required columns covered." : `\n⚠️  ${problems} table(s) have issues — fix before enabling SML_DIRECT_WRITE.`);
await c.end();
