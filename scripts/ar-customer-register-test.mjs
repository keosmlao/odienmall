// ===========================================================================
// LINE NEW-MEMBER REGISTRATION (INSERT public.ar_customer) VALIDATION HARNESS
// ===========================================================================
// Exercises the exact INSERT used by registerLineCustomer (src/lib/auth.ts)
// against the live ar_customer schema + check_ar_type trigger, then ALWAYS
// ROLLS BACK — nothing persists:
//
//   node --env-file=.env scripts/ar-customer-register-test.mjs
//
// ⚠️ Point DATABASE_URL at a TEST / copy database first. The app sandbox blocks
// public.* writes, so run this in an environment that permits them.
//
// What it does, in ONE rolled-back transaction:
//   1. Pick a phone-style code that does NOT already exist.
//   2. INSERT ar_customer (code = phone, ar_type '01', password '0000',
//      line_id = a fake LINE id) — fires the check_ar_type BEFORE INSERT trigger.
//   3. SELECT it back, print it, then ROLLBACK.
//
// check_ar_type raises "ແຮ ເລືອກປະເພດລູກຄ້າກ່ອນ" if ar_type IS NULL, and inserts
// into erp_project_list only when ar_type='03'. We use ar_type='01' (retail), so
// the trigger is a no-op pass.
// ===========================================================================
import pg from "pg";

const env = (k, d) => process.env[k]?.trim() || d;
const arType = env("REGISTER_AR_TYPE", "01");
const testName = env("REGISTER_TEST_NAME", "ທົດສອບ LINE");
const fakeLineId = "Utest" + "0".repeat(27); // U + 32 chars, like a real LINE userId

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL (point at a TEST database).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("begin");

  // Find a phone-style code that doesn't exist yet (so the INSERT is a true insert).
  let code = null;
  for (let i = 0; i < 50; i++) {
    const cand = "209" + String(1000000 + Math.floor(i * 13337)).slice(-7);
    const exists = await client.query(`select 1 from public.ar_customer where code = $1`, [cand]);
    if (exists.rowCount === 0) { code = cand; break; }
  }
  if (!code) throw new Error("could not find a free test code");
  console.log(`test code = ${code}  ar_type = ${arType}`);

  await client.query(
    `insert into public.ar_customer
       (code, name_1, telephone, sms_phonenumber, email, line_id, password,
        ar_type, status, ar_status, price_level, point_balance, create_code, create_date_time_now)
     values ($1,$2,$3,$3,$4,$5,'0000',$6,1,1,0,0,'web', now())`,
    [code, testName, code, "", fakeLineId, arType],
  );

  console.log("\n-- after INSERT (check_ar_type trigger fired) --");
  console.table(
    (await client.query(
      `select code, name_1, telephone, line_id, password, ar_type, status, point_balance
         from public.ar_customer where code = $1`,
      [code],
    )).rows,
  );

  // Confirm the app would authenticate it with the default password.
  const auth = await client.query(
    `select code from public.ar_customer where code = $1 and password = '0000'`,
    [code],
  );
  console.log(`auth-by-0000 works: ${auth.rowCount === 1}`);

  await client.query("rollback");
  console.log("\n✓ registration INSERT ran against the real schema/trigger — ROLLED BACK (nothing persisted).");
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error("\n✗ failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
