import "server-only";
import { pool, query } from "./db";

// ===========================================================================
// STOCK TRANSFER REQUISITION — ໃບຂໍໂອນສິນຄ້າ (writes to PRODUCTION public.*)
// ===========================================================================
// Mirrors the ERP's "ໃບຂໍໂອນສີນຄ້າ" (erp_doc_format 'FR'). Verified from live FR rows:
//   ic_trans:        trans_type 3, trans_flag 124, branch_code '00', currency '',
//                    all amounts 0, wh_from/location_from (source) → wh_to/location_to
//                    (destination), remark/doc_ref = "ຂໍໂອນມາສາງ <to>".
//   ic_trans_detail: trans_type 3, flag 124, wh_code/shelf_code = SOURCE, calc_flag 0,
//                    qty, no price/cost.
//   doc_no:          FR + YY + MM + 4-digit running (per month).
//
// "Transfer-in" (ໂອນມາສາງ) and "return" (ໂອນຄືນ) are the SAME FR document — only the
// remark + the from/to direction differ. Gated by SML_DIRECT_WRITE. NOT verified in
// the sandbox; validate on a TEST DB with scripts/stock-transfer-test.mjs first.
// ===========================================================================

function enabled(): boolean {
  return process.env.SML_DIRECT_WRITE === "1";
}

const DOC_FORMAT = process.env.TRANSFER_DOC_FORMAT?.trim() || "FR";
const FLAG = Number(process.env.TRANSFER_FLAG || 124);
const TRANS_TYPE = Number(process.env.TRANSFER_TRANS_TYPE || 3);
const BRANCH = process.env.TRANSFER_BRANCH?.trim() || "00";

type Client = {
  query: (q: string, p?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }>;
};

async function nextDocNo(client: Client): Promise<string> {
  const meta = await client.query(`select to_char(now(),'YYMM') as ym`);
  const ym = String((meta.rows[0] as { ym: string }).ym);
  const prefix = `${DOC_FORMAT}${ym}`; // e.g. FR2606
  const seq = await client.query(
    `select coalesce(max(substring(doc_no from $1::int)::bigint), 0) as last
       from public.ic_trans
      where doc_no like $2 and char_length(doc_no) = $3
        and substring(doc_no from $1::int) ~ '^[0-9]+$'`,
    [prefix.length + 1, `${prefix}%`, prefix.length + 4],
  );
  const next = Number((seq.rows[0] as { last: string }).last) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export interface TransferLine {
  itemCode: string;
  itemName: string;
  unitCode: string | null;
  qty: number;
}

export interface TransferInput {
  /** "in" = ໂອນມາສາງ (request stock into whTo); "return" = ໂອນຄືນ. Only labels the remark. */
  kind: "in" | "return";
  whFrom: string;
  shelfFrom: string;
  whTo: string;
  shelfTo: string;
  lines: TransferLine[];
  note?: string | null;
  saleCode?: string | null;
  createdBy?: string | null;
}

/** Write the FR ໃບຂໍໂອນສິນຄ້າ into public.ic_trans (+detail). Returns doc_no, or null
 *  when SML_DIRECT_WRITE is off. Throws on a real ERP error. */
export async function createTransferRequisition(input: TransferInput): Promise<string | null> {
  if (!enabled()) return null;
  if (!input.whFrom || !input.whTo) throw new Error("ກະລຸນາເລືອກສາງຕົ້ນທາງ ແລະ ປາຍທາງ");
  if (input.whFrom === input.whTo) throw new Error("ສາງຕົ້ນທາງ ແລະ ປາຍທາງ ຕ້ອງບໍ່ຊ້ຳກັນ");
  const lines = (input.lines ?? []).filter((l) => l.itemCode && l.qty > 0);
  if (lines.length === 0) throw new Error("ກະລຸນາໃສ່ລາຍການສິນຄ້າ");

  const client = await pool.connect();
  try {
    await client.query("begin");
    const docNo = await nextDocNo(client);
    const label = input.kind === "return" ? "ຂໍໂອນຄືນສິນຄ້າ" : "ຂໍໂອນມາສາງ";
    const remark = `${label} ${input.whTo}${input.note ? ` — ${input.note}` : ""}`.slice(0, 255);
    const saleCode = (input.saleCode ?? "").trim() || null;
    const creator = (input.createdBy ?? "").trim() || null;

    await client.query(
      `insert into public.ic_trans (
         roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no, doc_ref, doc_ref_date,
         vat_type, vat_rate, cust_code, branch_code, currency_code, exchange_rate,
         total_value, total_amount, total_value_2, total_amount_2, total_cost,
         doc_time, creator_code, sale_code, doc_format_code,
         wh_from, location_from, wh_to, location_to, remark, remark_5,
         create_datetime, create_date_time_now
       ) values (
         nextval('public.ic_trans_roworder_seq'), $2, $3, 0, now()::date, $1, $4, now()::date,
         0, 0, '', $5, '', 0,
         0, 0, 0, 0, 0,
         to_char(now(),'HH24:MI'), $6, $7, $8,
         $9, $10, $11, $12, $4, 'odienmall',
         now(), now()
       )`,
      [
        docNo, TRANS_TYPE, FLAG, remark, BRANCH, creator, saleCode, DOC_FORMAT,
        input.whFrom, input.shelfFrom || "", input.whTo, input.shelfTo || "",
      ],
    );

    for (const it of lines) {
      await client.query(
        `insert into public.ic_trans_detail (
           roworder, trans_type, trans_flag, inquiry_type, doc_date, doc_no, cust_code,
           item_code, item_name, unit_code, qty, price, sum_amount,
           branch_code, wh_code, shelf_code, vat_type, calc_flag, stand_value, divide_value,
           average_cost, sum_of_cost, price_2, sum_amount_2, create_date_time_now
         ) values (
           nextval('public.ic_trans_detail_roworder_seq'), $2, $3, 0, now()::date, $1, '',
           $4, $5, $6, $7, 0, 0,
           $8, $9, $10, 0, 0, 1, 1,
           0, 0, 0, 0, now()
         )`,
        [
          docNo, TRANS_TYPE, FLAG, it.itemCode, it.itemName.slice(0, 255), it.unitCode ?? "", it.qty,
          BRANCH, input.whFrom, input.shelfFrom || "",
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

export interface TransferDoc {
  docNo: string;
  kind: string;
  docDate: string | null;
  whFrom: string;
  whTo: string;
  remark: string;
  lines: Array<{ itemCode: string; itemName: string; unit: string; qty: number }>;
}

/** List FR transfer docs created by the web app (READ-ONLY). */
export async function getTransferDocs(opts: { search?: string; limit?: number } = {}): Promise<TransferDoc[]> {
  const where: string[] = [`t.doc_format_code = $1`, `t.remark_5 = 'odienmall'`];
  const params: unknown[] = [DOC_FORMAT];
  if (opts.search?.trim()) {
    params.push(`%${opts.search.trim()}%`);
    where.push(`(t.doc_no ilike $${params.length} or t.remark ilike $${params.length})`);
  }
  const rows = await query<{
    doc_no: string; doc_date: Date | null; wh_from: string | null; wh_to: string | null; remark: string | null;
  }>(
    `select doc_no, doc_date, wh_from, wh_to, remark
       from public.ic_trans t where ${where.join(" and ")}
      order by t.roworder desc limit ${Math.min(opts.limit ?? 50, 200)}`,
    params,
  );
  return rows.map((r) => ({
    docNo: r.doc_no,
    kind: (r.remark ?? "").includes("ຄືນ") ? "return" : "in",
    docDate: r.doc_date ? r.doc_date.toISOString() : null,
    whFrom: r.wh_from ?? "",
    whTo: r.wh_to ?? "",
    remark: r.remark ?? "",
    lines: [],
  }));
}
