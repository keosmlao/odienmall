import "server-only";
import { query } from "./db";

export interface OrderNote {
  id: number;
  orderNo: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
}

export async function getOrderNotes(orderNo: string): Promise<OrderNote[]> {
  const rows = await query<{ id: number; order_no: string; content: string; created_by: string | null; created_at: Date }>(
    `select id, order_no, content, created_by, created_at
       from odg_ecom.order_notes where order_no = $1 order by created_at desc`,
    [orderNo],
  );
  return rows.map((r) => ({
    id: r.id,
    orderNo: r.order_no,
    content: r.content,
    createdBy: r.created_by,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function addOrderNote(orderNo: string, content: string, createdBy?: string): Promise<OrderNote> {
  const rows = await query<{ id: number; created_at: Date }>(
    `insert into odg_ecom.order_notes (order_no, content, created_by) values ($1, $2, $3) returning id, created_at`,
    [orderNo, content.trim(), createdBy ?? null],
  );
  return { id: rows[0].id, orderNo, content, createdBy: createdBy ?? null, createdAt: rows[0].created_at.toISOString() };
}

export async function deleteOrderNote(id: number): Promise<void> {
  await query(`delete from odg_ecom.order_notes where id = $1`, [id]);
}
