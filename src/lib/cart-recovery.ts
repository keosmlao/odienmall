import "server-only";
import { query } from "./db";
import { notify } from "./notifications";

// Abandoned-cart recovery. Logged-in customers sync a cart snapshot; a cron job
// reminds those who haven't checked out after a quiet period.

export interface SavedCartItem {
  code: string;
  name: string;
  qty: number;
}

/** Upsert a customer's cart snapshot (resets the reminder when it changes). */
export async function saveCart(customerCode: string, items: SavedCartItem[]): Promise<void> {
  if (!customerCode) return;
  const clean = items
    .filter((i) => i && i.code && i.qty > 0)
    .slice(0, 50)
    .map((i) => ({ code: String(i.code), name: String(i.name ?? "").slice(0, 120), qty: Math.floor(i.qty) }));
  if (clean.length === 0) {
    await clearSavedCart(customerCode);
    return;
  }
  await query(
    `insert into ecom.saved_cart (customer_code, items, item_count, updated_at, notified_at)
     values ($1, $2::jsonb, $3, now(), null)
     on conflict (customer_code) do update
       set items = excluded.items, item_count = excluded.item_count,
           updated_at = now(), notified_at = null`,
    [customerCode, JSON.stringify(clean), clean.reduce((s, i) => s + i.qty, 0)],
  );
}

export async function clearSavedCart(customerCode: string): Promise<void> {
  if (!customerCode) return;
  await query(`delete from ecom.saved_cart where customer_code = $1`, [customerCode]).catch(() => {});
}

/**
 * Remind customers whose cart has been idle for `idleMinutes` and not yet
 * reminded. Run from the cron route. Returns how many reminders were sent.
 */
export async function checkAbandonedCarts(idleMinutes = 60): Promise<number> {
  const rows = await query<{ customer_code: string; item_count: number; items: SavedCartItem[] }>(
    `select customer_code, item_count, items from ecom.saved_cart
      where notified_at is null
        and updated_at < now() - ($1 || ' minutes')::interval
        and item_count > 0`,
    [String(idleMinutes)],
  );
  let sent = 0;
  for (const r of rows) {
    const first = Array.isArray(r.items) && r.items[0] ? r.items[0].name : "";
    await notify(r.customer_code, {
      type: "cart",
      title: "ທ່ານລືມສິນຄ້າໃນກະຕ່າ 🛒",
      body: `ມີ ${r.item_count} ຊິ້ນ${first ? ` (${first}...)` : ""} ລໍຖ້າຢູ່ — ກັບມາສັ່ງຊື້ໃຫ້ສຳເລັດ`,
      link: "/cart",
    }).catch(() => {});
    await query(`update ecom.saved_cart set notified_at = now() where customer_code = $1`, [r.customer_code]).catch(() => {});
    sent++;
  }
  return sent;
}
