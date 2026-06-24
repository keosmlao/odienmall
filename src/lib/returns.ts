import "server-only";
import { query, queryOne } from "./db";
import { notify } from "./notifications";

// Returns / refund requests (app-owned). Money refunds are handled ERP-side
// (credit note); this tracks the customer request + admin decision.

export const RETURN_STATUSES = ["pending", "approved", "rejected", "refunded"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  pending: "ລໍຖ້າກວດສອບ",
  approved: "ອະນຸມັດແລ້ວ",
  rejected: "ປະຕິເສດ",
  refunded: "ຄືນເງິນແລ້ວ",
};

export interface ReturnRequest {
  id: number;
  orderNo: string;
  customerCode: string | null;
  reason: string;
  detail: string | null;
  status: ReturnStatus;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

type Row = {
  id: string;
  order_no: string;
  customer_code: string | null;
  reason: string;
  detail: string | null;
  status: string;
  admin_note: string | null;
  created_at: Date;
  resolved_at: Date | null;
};

function toReq(r: Row): ReturnRequest {
  return {
    id: Number(r.id),
    orderNo: r.order_no,
    customerCode: r.customer_code,
    reason: r.reason,
    detail: r.detail,
    status: r.status as ReturnStatus,
    adminNote: r.admin_note,
    createdAt: r.created_at.toISOString(),
    resolvedAt: r.resolved_at ? r.resolved_at.toISOString() : null,
  };
}

const COLS = `id, order_no, customer_code, reason, detail, status, admin_note, created_at, resolved_at`;

/** Latest return request for an order (a customer can have one open at a time). */
export async function getReturnForOrder(orderNo: string): Promise<ReturnRequest | null> {
  const r = await queryOne<Row>(
    `select ${COLS} from odg_ecom.return_requests where order_no = $1 order by id desc limit 1`,
    [orderNo],
  );
  return r ? toReq(r) : null;
}

/** Create a return request (one active request per order). */
export async function createReturnRequest(input: {
  orderNo: string;
  customerCode: string | null;
  reason: string;
  detail?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const reason = input.reason?.trim();
  if (!reason) return { ok: false, error: "ກະລຸນາເລືອກເຫດຜົນ" };
  const existing = await getReturnForOrder(input.orderNo);
  if (existing && (existing.status === "pending" || existing.status === "approved")) {
    return { ok: false, error: "ມີຄຳຮ້ອງຄືນສິນຄ້າຄ້າງຢູ່ແລ້ວ" };
  }
  await query(
    `insert into odg_ecom.return_requests (order_no, customer_code, reason, detail) values ($1,$2,$3,$4)`,
    [input.orderNo, input.customerCode, reason, input.detail?.trim() || null],
  );
  return { ok: true };
}

export async function listReturnsByCustomer(customerCode: string): Promise<ReturnRequest[]> {
  const rows = await query<Row>(
    `select ${COLS} from odg_ecom.return_requests where customer_code = $1 order by id desc limit 50`,
    [customerCode],
  );
  return rows.map(toReq);
}

export async function listReturns(status?: string): Promise<ReturnRequest[]> {
  const ok = status && (RETURN_STATUSES as readonly string[]).includes(status);
  const rows = await query<Row>(
    `select ${COLS} from odg_ecom.return_requests
      ${ok ? "where status = $1" : ""}
      order by id desc limit 200`,
    ok ? [status] : [],
  );
  return rows.map(toReq);
}

export async function countPendingReturns(): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `select count(*)::text as n from odg_ecom.return_requests where status = 'pending'`,
  );
  return Number(r?.n ?? 0);
}

/** Admin sets the outcome and notifies the customer. */
export async function setReturnStatus(
  id: number,
  status: ReturnStatus,
  by: string | undefined,
  adminNote?: string,
): Promise<boolean> {
  const rows = await query<{ order_no: string; customer_code: string | null }>(
    `update odg_ecom.return_requests
        set status = $2, admin_note = coalesce($3, admin_note),
            resolved_at = case when $2 = 'pending' then null else now() end,
            resolved_by = $4
      where id = $1
      returning order_no, customer_code`,
    [id, status, adminNote?.trim() || null, by ?? null],
  );
  const row = rows[0];
  if (!row) return false;
  if (row.customer_code) {
    await notify(row.customer_code, {
      type: "return",
      title: `ຄຳຮ້ອງຄືນສິນຄ້າ: ${RETURN_STATUS_LABEL[status]}`,
      body: `ອໍເດີ ${row.order_no}${adminNote ? ` — ${adminNote}` : ""}`,
      link: `/order/${row.order_no}`,
    }).catch(() => {});
  }
  return true;
}
