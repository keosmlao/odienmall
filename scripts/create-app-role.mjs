// Create a least-privilege PostgreSQL role for the app: READ-ONLY on the ERP
// (schema public.*) and read/write ONLY on the app-owned odg_ecom.* schema. This
// enforces the "public.* is READ-ONLY" rule at the DATABASE level instead of by
// code discipline — so an app bug can never write/alter/drop ERP tables.
//
// Run as a superuser / db owner connection (the current DATABASE_URL):
//   APP_DB_ROLE=odienmall_app APP_DB_PASSWORD='strong-secret' \
//     node --env-file=.env scripts/create-app-role.mjs
//
// Then point the app's DATABASE_URL at this role. Idempotent.
import pg from "pg";

const ROLE = (process.env.APP_DB_ROLE || "odienmall_app").trim();
const PASSWORD = process.env.APP_DB_PASSWORD || "";

if (!/^[a-z_][a-z0-9_]*$/.test(ROLE)) {
  console.error(`Invalid APP_DB_ROLE "${ROLE}" (use lowercase letters, digits, underscore).`);
  process.exit(1);
}
if (!PASSWORD) {
  console.error("APP_DB_PASSWORD is required (the new role's login password).");
  process.exit(1);
}

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const { rows } = await c.query("select current_database() as db");
const db = rows[0].db;
// Safe identifier quoting for the role/db; password goes through a bound param.
const R = `"${ROLE.replace(/"/g, '""')}"`;
const DB = `"${db.replace(/"/g, '""')}"`;

try {
  // 1. Role (login). Create if missing; always (re)set the password.
  const exists = await c.query("select 1 from pg_roles where rolname = $1", [ROLE]);
  if (exists.rowCount === 0) {
    await c.query(`create role ${R} login password ${literal(PASSWORD)}`);
    console.log(`✓ created role ${ROLE}`);
  } else {
    await c.query(`alter role ${R} with login password ${literal(PASSWORD)}`);
    console.log(`✓ role ${ROLE} exists — password updated`);
  }

  await c.query(`grant connect on database ${DB} to ${R}`);

  // 2. public.* — READ-ONLY (the ERP). Select only; never write.
  await c.query(`grant usage on schema public to ${R}`);
  await c.query(`grant select on all tables in schema public to ${R}`);
  await c.query(`alter default privileges in schema public grant select on tables to ${R}`);
  // Belt-and-braces: strip any write that might have been inherited.
  await c.query(`revoke insert, update, delete, truncate on all tables in schema public from ${R}`);

  // 3. odg_ecom.* — app-owned, full read/write (incl. creating new objects via migrate).
  await c.query(`grant usage, create on schema ecom to ${R}`);
  await c.query(`grant select, insert, update, delete on all tables in schema ecom to ${R}`);
  await c.query(`grant usage, select, update on all sequences in schema ecom to ${R}`);
  await c.query(`alter default privileges in schema ecom grant select, insert, update, delete on tables to ${R}`);
  await c.query(`alter default privileges in schema ecom grant usage, select, update on sequences to ${R}`);

  console.log(`✓ ${ROLE}: READ-ONLY on public.* · read/write on odg_ecom.*`);
  console.log("\nNow set the app's DATABASE_URL to connect as this role, e.g.:");
  console.log(`  postgresql://${ROLE}:<password>@<host>:5432/${db}`);
} finally {
  await c.end();
}

// Single-quote a SQL string literal (password). Not user-facing SQL injection
// surface, but quoted correctly regardless.
function literal(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}
