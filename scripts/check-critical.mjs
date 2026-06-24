import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), "utf8");

test("ERP public.* destructive writes are guarded by SML_DIRECT_WRITE", async () => {
  const orders = await read("src/lib/orders.ts");
  const destructive = [
    "update public.ic_trans as ic set is_cancel",
    "delete from public.cb_trans_detail",
    "delete from public.cb_trans",
    "delete from public.ic_trans_shipment",
    "delete from public.ic_trans_detail",
    "delete from public.ic_trans as ic",
  ];

  for (const sql of destructive) {
    assert.match(orders, new RegExp(sql.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(orders, /smlDirectWriteEnabled\(\)/);
  assert.match(orders, /SML_DIRECT_WRITE ຍັງປິດ/);
});

test("upload storage is centralized and Turbopack-scoped", async () => {
  const storage = await read("src/lib/storage.ts");
  assert.match(storage, /export async function saveUpload/);
  assert.match(storage, /export async function deleteUpload/);
  assert.match(storage, /getUploadStoreInfo/);
  assert.match(storage, /odg_ecom\.upload_blobs/);
  assert.match(storage, /DB_BASE = "\/api\/uploads"/);
});

test("upload blobs are migrated as odg_ecom bytea storage", async () => {
  const migration = await read("scripts/migrate-ecom.mjs");
  assert.match(migration, /create table if not exists odg_ecom\.upload_blobs/);
  assert.match(migration, /data\s+bytea\s+not null/);
});

test("admin status page reports deployment readiness gates", async () => {
  const status = await read("src/lib/system-status.ts");
  for (const label of [
    "SESSION_SECRET",
    "SML_DIRECT_WRITE",
    "CRON_TOKEN",
    "NEXT_PUBLIC_SITE_URL",
    "Upload storage",
    "NODE_ENV",
  ]) {
    assert.match(status, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Server Action upload body limit matches product image UI", async () => {
  const config = await read("next.config.ts");
  assert.match(config, /serverActions/);
  assert.match(config, /bodySizeLimit:\s*["']50mb["']/);
});

test("odg_ecom migration contains current app-owned feature tables", async () => {
  const migration = await read("scripts/migrate-ecom.mjs");
  for (const table of [
    "odg_ecom.onepay_payments",
    "odg_ecom.return_requests",
    "odg_ecom.chat_threads",
    "odg_ecom.sales_targets",
    "odg_ecom.sales_commission_rates",
    "odg_ecom.audit_log",
  ]) {
    assert.match(migration, new RegExp(table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("high-risk admin mutations write audit events", async () => {
  const files = [
    "src/app/admin/actions.ts",
    "src/app/admin/sales-commission/actions.ts",
    "src/app/admin/sales-targets/actions.ts",
    "src/app/admin/returns/actions.ts",
    "src/app/admin/settings/actions.ts",
  ];
  const source = (await Promise.all(files.map(read))).join("\n");
  for (const action of [
    "order.delete",
    "order.confirmPaid",
    "order.status",
    "sales.commission.payout",
    "sales.target",
    "return.status",
    "settings.bankTransfer",
  ]) {
    assert.match(source, new RegExp(action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
