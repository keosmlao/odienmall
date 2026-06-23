import "server-only";
import { query, queryOne } from "./db";
import { sendPushToCustomer } from "./push";

// In-app notifications (customer bell). The reliable core — works with no external
// keys. Best-effort web push is layered on top when VAPID is configured.

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/** Create a notification for a customer (best-effort; also fires web push). */
export async function notify(
  customerCode: string | null | undefined,
  n: { type: string; title: string; body?: string; link?: string },
): Promise<void> {
  const code = (customerCode ?? "").trim();
  if (!code) return; // guests have no inbox
  try {
    await query(
      `insert into ecom.notifications (customer_code, type, title, body, link)
       values ($1, $2, $3, $4, $5)`,
      [code, n.type, n.title, n.body ?? null, n.link ?? null],
    );
  } catch (e) {
    console.error("notify failed:", e);
  }
  // Best-effort push (no-op unless VAPID configured + customer subscribed).
  sendPushToCustomer(code, { title: n.title, body: n.body ?? "", link: n.link ?? "/account" }).catch(
    () => {},
  );
}

export async function listNotifications(customerCode: string, limit = 30): Promise<Notification[]> {
  const rows = await query<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    read: boolean;
    created_at: Date;
  }>(
    `select id, type, title, body, link, read, created_at
       from ecom.notifications where customer_code = $1
      order by id desc limit $2`,
    [customerCode, limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    type: r.type,
    title: r.title,
    body: r.body,
    link: r.link,
    read: r.read,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function countUnread(customerCode: string): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `select count(*)::text as n from ecom.notifications where customer_code = $1 and read = false`,
    [customerCode],
  );
  return Number(r?.n ?? 0);
}

export async function markAllRead(customerCode: string): Promise<void> {
  await query(`update ecom.notifications set read = true where customer_code = $1 and read = false`, [
    customerCode,
  ]);
}
