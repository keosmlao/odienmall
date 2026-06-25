import "server-only";
import { pool, query } from "./db";
import { lineNotifyAdmin } from "./line-notify";
import { adminTransportLabel, toAdminTransportCode } from "./admin-shipping-constants";

// ===========================================================================
// REWARD REQUISITION — ໃບຂໍເບີກສິນຄ້າແລກລາງວັນ (writes to PRODUCTION public.*)
// ===========================================================================
// Mirrors the ERP's existing customer-reward requisition doc (erp_doc_format
// 'RWRT' = "ຂໍເບີກສິນຄ້າ/ວັດຖຸດິບ ຂອງລາງວັນສຳລັບລູກຄ້າ"). Verified against live
// RWRT rows: trans_type 3, single trans_flag 122 (NO 34→44 step), branch '01',
// currency empty, all totals 0 (free — paid with points), customer embedded in
// `remark` (cust_code stays empty), warehouse/shelf stamped on each detail line.
//
// Flow:
//   • on redeem  → ic_trans + ic_trans_detail flag 122, wh '0000'/'000000'
//                  placeholder (awaiting admin allocation).
//   • admin issue → stamp the chosen warehouse/shelf onto each line + post
//                  ic_trans_shipment for delivery. Flag stays 122.
//
// ⚠️ Gated by SML_DIRECT_WRITE. NOT verified from the app sandbox (public.* writes
// are blocked) — the SML team must confirm RWRT triggers on a TEST DB. Codes are
// env-overridable (REWARD_DOC_FORMAT / REWARD_REQ_FLAG / REWARD_TRANS_TYPE /
// REWARD_BRANCH) in case a branch uses a different requisition format.
// ===========================================================================

function enabled(): boolean {
  return process.env.SML_DIRECT_WRITE === "1";
}

const DOC_FORMAT = process.env.REWARD_DOC_FORMAT?.trim() || "RWRT";
const FLAG = Number(process.env.REWARD_REQ_FLAG || 122);
const TRANS_TYPE = Number(process.env.REWARD_TRANS_TYPE || 3);
const BRANCH = process.env.REWARD_BRANCH?.trim() || "01";
const PLACEHOLDER_WH = "0000";
const PLACEHOLDER_SHELF = "000000";

type Client = {
  query: (q: string, p?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }>;
};

async function nextDocNo(client: Client): Promise<string> {
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

export interface RewardRequisitionInput {
  customerCode: string | null;
  name: string;
  phone: string;
  address: string | null;
  promoCode: string;
  rewardName: string;
  itemCode: string;
  qty: number;
  unitCode: string | null;
  pointsSpent: number;
  saleCode?: string | null;
}

/**
 * Write the RWRT ໃບຂໍເບີກ for a redemption into public.ic_trans (+detail), flag
 * 122, warehouse placeholder (admin allocates later). Returns doc_no, or null
 * when SML_DIRECT_WRITE is off. Throws on a real ERP error (caller is best-effort).
 */
export async function createRewardRequisition(input: RewardRequisitionInput): Promise<string | null> {
  if (!enabled()) return null;
  if (!input.itemCode || !(input.qty > 0)) throw new Error("reward requisition has no item");

  const client = await pool.connect();
  try {
    await client.query("begin");
    const docNo = await nextDocNo(client);
    const memberLabel = `${input.customerCode ?? ""}-${input.name}`.trim();
    const remark = `ຂໍເບີກແລກລາງວັນ ລູກຄ້າສະມາຊິກ: ${memberLabel} (ປະເພດການຮັບ : ລູກຄ້າຮັບເອງ)`.slice(0, 255);
    const remark2 = `${input.promoCode} · ${input.pointsSpent} ແຕ້ມ`.slice(0, 255);
    const saleCode = (input.saleCode ?? "").trim() || null;

    // RWRT header — cust_code empty (customer in remark), currency empty, totals 0.
    await client.query(
      `insert into public.ic_trans (
         roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no,
         vat_type, vat_rate, cust_code, branch_code, currency_code, exchange_rate,
         total_value, total_amount, total_value_2, total_amount_2, total_discount, total_discount_2,
         doc_time, creator_code, doc_format_code, sale_code,
         point_telephone, remark_3, remark_4, remark_2, remark, remark_5,
         create_datetime, create_date_time_now
       ) values (
         nextval('public.ic_trans_roworder_seq'), $2, $3, 0, now()::date, $1,
         0, 0, '', $4, '', 0,
         0, 0, 0, 0, 0, 0,
         to_char(now(),'HH24:MI'), $5, $6, $7,
         $8, $9, $10, $11, $12, 'odienmall',
         now(), now()
       )`,
      [
        docNo, TRANS_TYPE, FLAG, BRANCH, input.customerCode ?? "", DOC_FORMAT, saleCode,
        input.phone || "", input.name || "", input.address || "", remark2, remark,
      ],
    );

    await client.query(
      `insert into public.ic_trans_detail (
         roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no, cust_code,
         item_code, item_name, unit_code, qty, price, sum_amount,
         branch_code, wh_code, shelf_code, vat_type, calc_flag, stand_value, divide_value,
         average_cost, average_cost_1, sum_of_cost, sum_of_cost_1,
         price_exclude_vat, sum_amount_exclude_vat, price_2, sum_amount_2, sale_code,
         create_date_time_now
       ) values (
         nextval('public.ic_trans_detail_roworder_seq'), $2, $3, 0, now()::date, $1, '',
         $4, $5, $6, $7, 0, 0,
         $8, $9, $10, 0, 0, 1, 1,
         0, 0, 0, 0,
         0, 0, 0, 0, $11,
         now()
       )`,
      [
        docNo, TRANS_TYPE, FLAG,
        input.itemCode, input.rewardName.slice(0, 255), input.unitCode ?? "", input.qty,
        BRANCH, PLACEHOLDER_WH, PLACEHOLDER_SHELF, saleCode,
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

// ── Warehouse picking for a requisition (reward-specific; RWRT is single-flag) ──

export interface ReqStockLine {
  roworder: number;
  itemCode: string;
  itemName: string;
  qty: number;
  unit: string | null;
  available: number;
  shelfCode: string | null;
  shelfName: string | null;
  ok: boolean;
}
export interface ReqWarehouseOption {
  whCode: string;
  whName: string;
  canFulfill: boolean;
  lines: ReqStockLine[];
}
export interface ReqWarehouseOptions {
  docNo: string;
  allocated: boolean; // true once a real warehouse is stamped (not placeholder)
  warehouses: ReqWarehouseOption[];
  lines: Array<{ roworder: number; itemCode: string; itemName: string; qty: number; unit: string | null }>;
}

type StockRow = {
  ic_code: string;
  warehouse: string;
  wh_name: string;
  location: string;
  location_name: string;
  available: string;
};

/** Live per-warehouse availability for a RWRT requisition's items. */
export async function getRewardWarehouseOptions(docNo: string): Promise<ReqWarehouseOptions | null> {
  if (!docNo) return null;
  const items = await query<{
    roworder: string;
    item_code: string;
    item_name: string;
    qty: number;
    unit: string | null;
    wh_code: string | null;
  }>(
    `select roworder, item_code, item_name, qty::int as qty, unit_code as unit, wh_code
       from public.ic_trans_detail where doc_no = $1 order by roworder`,
    [docNo],
  );
  if (items.length === 0) return null;

  const allocated = items.every((it) => it.wh_code && it.wh_code !== PLACEHOLDER_WH);
  const lines = items.map((it) => ({
    roworder: Number(it.roworder),
    itemCode: it.item_code,
    itemName: it.item_name,
    qty: it.qty,
    unit: it.unit,
  }));

  const codes = [...new Set(items.map((i) => i.item_code))];
  const stock = await query<StockRow>(
    `select f.ic_code, f.warehouse, w.name_1 as wh_name, f.location, s.name_1 as location_name,
            sum(f.balance_qty)::text as available
       from sml_ic_function_stock_balance_warehouse_location(current_date, $1, '', '') f
       join public.ic_warehouse w on w.code = f.warehouse and coalesce(w.status,0) = 1
       join public.ic_shelf s on s.whcode = f.warehouse and s.code = f.location
        and coalesce(s.is_active,0)=1 and coalesce(s.is_stock,0)=1
        and coalesce(s.is_damage,0)=0 and coalesce(s.is_defect,0)=0
      group by f.ic_code, f.warehouse, w.name_1, f.location, s.name_1
     having sum(f.balance_qty) > 0
      order by f.warehouse, f.ic_code, sum(f.balance_qty) desc`,
    [codes.join(",")],
  );

  const whMap = new Map<string, { whName: string; best: Map<string, { available: number; shelfCode: string; shelfName: string }> }>();
  for (const r of stock) {
    let w = whMap.get(r.warehouse);
    if (!w) {
      w = { whName: r.wh_name, best: new Map() };
      whMap.set(r.warehouse, w);
    }
    const avail = Number(r.available);
    const cur = w.best.get(r.ic_code);
    if (!cur || avail > cur.available) {
      w.best.set(r.ic_code, { available: avail, shelfCode: r.location, shelfName: r.location_name });
    }
  }

  const warehouses: ReqWarehouseOption[] = [...whMap.entries()].map(([whCode, w]) => {
    const wl: ReqStockLine[] = lines.map((it) => {
      const b = w.best.get(it.itemCode);
      const available = b?.available ?? 0;
      return {
        roworder: it.roworder,
        itemCode: it.itemCode,
        itemName: it.itemName,
        qty: it.qty,
        unit: it.unit,
        available,
        shelfCode: b?.shelfCode ?? null,
        shelfName: b?.shelfName ?? null,
        ok: available >= it.qty,
      };
    });
    return { whCode, whName: w.whName, lines: wl, canFulfill: wl.every((l) => l.ok) };
  });
  warehouses.sort((a, b) => Number(b.canFulfill) - Number(a.canFulfill) || a.whName.localeCompare(b.whName));

  return { docNo, allocated, warehouses, lines };
}

/**
 * Issue the requisition: stamp the chosen warehouse/shelf (best shelf per item)
 * onto every RWRT detail line + post the delivery hand-off (ic_trans_shipment).
 * Flag stays 122 (RWRT is single-flag). Atomic. Returns the doc_no.
 */
export async function issueRewardRequisition(docNo: string, whCode: string, requestedTransportCode: string): Promise<string> {
  if (!enabled()) throw new Error("SML direct write is disabled (SML_DIRECT_WRITE=1)");
  if (!whCode) throw new Error("ກະລຸນາເລືອກສາງ");
  const transportCode = toAdminTransportCode(requestedTransportCode);
  if (!transportCode) throw new Error("ກະລຸນາເລືອກຂົນສົ່ງທີ່ຖືກຕ້ອງ");

  const client = await pool.connect();
  try {
    await client.query("begin");
    const oh = (
      await client.query(
        `select doc_date, branch_code,
                coalesce(nullif(remark_3,''),'') as customer_name,
                coalesce(remark_4,'') as customer_address,
                coalesce(point_telephone,'') as customer_phone,
                coalesce(remark,'') as remark
           from public.ic_trans
          where doc_no = $1 and doc_format_code = $2 and remark_5 = 'odienmall'
          for update`,
        [docNo, DOC_FORMAT],
      )
    ).rows[0] as
      | { doc_date: Date; branch_code: string; customer_name: string; customer_address: string; customer_phone: string; remark: string }
      | undefined;
    if (!oh) throw new Error(`requisition ${docNo} not found`);

    const items = (
      await client.query<{ roworder: string; item_code: string; item_name: string; qty: number }>(
        `select roworder, item_code, item_name, qty::int as qty
           from public.ic_trans_detail where doc_no = $1 order by roworder`,
        [docNo],
      )
    ).rows;
    if (items.length === 0) throw new Error("ໃບເບີກບໍ່ມີລາຍການ");

    const codes = [...new Set(items.map((i) => i.item_code))];
    const stock = (
      await client.query<StockRow>(
        `select f.ic_code, f.warehouse, f.location, s.name_1 as location_name,
                sum(f.balance_qty)::text as available
           from sml_ic_function_stock_balance_warehouse_location(current_date, $1, $2, '') f
           join public.ic_warehouse w on w.code = f.warehouse and coalesce(w.status,0) = 1
           join public.ic_shelf s on s.whcode = f.warehouse and s.code = f.location
            and coalesce(s.is_active,0)=1 and coalesce(s.is_stock,0)=1
            and coalesce(s.is_damage,0)=0 and coalesce(s.is_defect,0)=0
          group by f.ic_code, f.warehouse, f.location, s.name_1
         having sum(f.balance_qty) > 0`,
        [codes.join(","), whCode],
      )
    ).rows as Array<StockRow>;
    const best = new Map<string, { available: number; shelfCode: string }>();
    for (const r of stock) {
      const avail = Number(r.available);
      const cur = best.get(r.ic_code);
      if (!cur || avail > cur.available) best.set(r.ic_code, { available: avail, shelfCode: r.location });
    }

    for (const it of items) {
      const b = best.get(it.item_code);
      if (!b || b.available < it.qty) {
        throw new Error(`ສິນຄ້າ ${it.item_name} ໃນສາງນີ້ມີ ${b?.available ?? 0} ແຕ່ຕ້ອງການ ${it.qty}`);
      }
      await client.query(
        `update public.ic_trans_detail set wh_code = $2, shelf_code = $3 where roworder = $1`,
        [it.roworder, whCode, b.shelfCode],
      );
    }

    await client.query(
      `insert into public.ic_trans_shipment (
         roworder, doc_no, doc_date, trans_flag, cust_code,
         transport_name, transport_address, transport_telephone,
         transport_code, logistic_area, remark, create_date_time_now
       ) values (
         nextval('public.ic_trans_shipment_roworder_seq'), $1, $2, $9, '',
         $3, $4, $5, $6, null, $7, now()
       )`,
      [
        docNo, oh.doc_date,
        oh.customer_name, oh.customer_address, oh.customer_phone, transportCode,
        [adminTransportLabel(transportCode), "ໃບຂໍເບີກລາງວັນ"].filter(Boolean).join(" — "),
        FLAG,
      ],
    );

    await client.query("commit");

    // Low-stock LINE alert (best-effort).
    query<{ item_code: string; item_name: string; balance_qty: number }>(
      `select d.item_code, coalesce(nullif(i.name_1,''), d.item_code) as item_name, coalesce(i.balance_qty,0) as balance_qty
         from public.ic_trans_detail d join public.ic_inventory i on i.code = d.item_code
        where d.doc_no = $1 and coalesce(i.balance_qty,0) <= 3`,
      [docNo],
    ).then((rows) => {
      if (rows.length === 0) return;
      const lines = rows.map((r) => `  • ${r.item_name}: ເຄົງ ${r.balance_qty}`).join("\n");
      lineNotifyAdmin(`\n[OdienMall] ⚠️ ສ້ອຍໃກ້ໝົດ (ໃບເບີກລາງວັນ ${docNo})\n${lines}`).catch(() => {});
    }).catch(() => {});

    return docNo;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
