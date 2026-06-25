import "server-only";
import { query, queryOne } from "./db";

export type CustomerFlag = "vip" | "blocked" | "wholesale" | null;

export interface CustomerNote {
  id: number;
  customerCode: string;
  content: string;
  flag: CustomerFlag;
  createdBy: string | null;
  createdAt: string;
}

export async function getCustomerNotes(customerCode: string): Promise<CustomerNote[]> {
  const rows = await query<{
    id: number;
    customer_code: string;
    content: string;
    flag: string | null;
    created_by: string | null;
    created_at: Date;
  }>(
    `select id, customer_code, content, flag, created_by, created_at
       from odg_ecom.customer_notes
      where customer_code = $1
      order by created_at desc`,
    [customerCode],
  );
  return rows.map((r) => ({
    id: r.id,
    customerCode: r.customer_code,
    content: r.content,
    flag: (r.flag as CustomerFlag) ?? null,
    createdBy: r.created_by,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function addCustomerNote(
  customerCode: string,
  content: string,
  flag: CustomerFlag = null,
  createdBy?: string | null,
): Promise<CustomerNote> {
  const row = await queryOne<{
    id: number;
    customer_code: string;
    content: string;
    flag: string | null;
    created_by: string | null;
    created_at: Date;
  }>(
    `insert into odg_ecom.customer_notes (customer_code, content, flag, created_by, created_at)
       values ($1, $2, $3, $4, now())
       returning *`,
    [customerCode, content.trim().slice(0, 500), flag ?? null, createdBy ?? null],
  );
  if (!row) throw new Error("Insert failed");
  return {
    id: row.id,
    customerCode: row.customer_code,
    content: row.content,
    flag: (row.flag as CustomerFlag) ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  };
}

export async function deleteCustomerNote(id: number): Promise<void> {
  await query(`delete from odg_ecom.customer_notes where id = $1`, [id]);
}

/** Most recent customer flag (VIP/blocked/wholesale), or null if none. */
export async function getCustomerFlag(customerCode: string): Promise<CustomerFlag> {
  const row = await queryOne<{ flag: string | null }>(
    `select flag from odg_ecom.customer_notes
      where customer_code = $1 and flag is not null
      order by created_at desc limit 1`,
    [customerCode],
  );
  return (row?.flag as CustomerFlag) ?? null;
}
