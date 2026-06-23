import "server-only";
import { query, queryOne } from "./db";
import { notify } from "./notifications";

// Back-in-stock / price-drop alerts. A logged-in customer subscribes to a product
// from its page; a periodic check (route/cron) compares the current ERP price +
// stock to the baseline and notifies on improvement.

interface ProductState {
  price: number | null;
  inStock: boolean;
  name: string;
}

/** Current price (min positive barcode price) + stock + name for a product. */
async function productState(productCode: string): Promise<ProductState | null> {
  const r = await queryOne<{ price: string | null; bal: string | null; name: string }>(
    `select (select min(b.price) from public.ic_inventory_barcode b
               where b.ic_code = i.code and b.price > 0) as price,
            i.balance_qty as bal,
            coalesce(nullif(i.name_1,''), nullif(i.name_2,''), i.code) as name
       from public.ic_inventory i where i.code = $1`,
    [productCode],
  );
  if (!r) return null;
  return { price: r.price == null ? null : Number(r.price), inStock: Number(r.bal ?? 0) > 0, name: r.name };
}

export async function isSubscribed(customerCode: string, productCode: string): Promise<boolean> {
  if (!customerCode) return false;
  const r = await queryOne<{ id: string }>(
    `select id from ecom.product_alerts where customer_code = $1 and product_code = $2`,
    [customerCode, productCode],
  );
  return !!r;
}

/** Subscribe (idempotent) — captures the current price/stock as the baseline. */
export async function subscribeAlert(customerCode: string, productCode: string): Promise<void> {
  if (!customerCode || !productCode) return;
  const st = await productState(productCode);
  await query(
    `insert into ecom.product_alerts (customer_code, product_code, base_price, base_in_stock)
     values ($1, $2, $3, $4)
     on conflict (customer_code, product_code) do update
       set base_price = excluded.base_price, base_in_stock = excluded.base_in_stock, notified_at = null`,
    [customerCode, productCode, st?.price ?? null, st?.inStock ?? null],
  );
}

export async function unsubscribeAlert(customerCode: string, productCode: string): Promise<void> {
  await query(`delete from ecom.product_alerts where customer_code = $1 and product_code = $2`, [
    customerCode,
    productCode,
  ]);
}

/**
 * Check all alerts and notify on back-in-stock or price-drop. Run from a cron/
 * route. Returns how many notifications were sent. After notifying, the baseline
 * is reset to the new state so the customer isn't spammed.
 */
export async function checkAlerts(): Promise<number> {
  const rows = await query<{
    id: string;
    customer_code: string;
    product_code: string;
    base_price: string | null;
    base_in_stock: boolean | null;
  }>(
    `select id, customer_code, product_code, base_price, base_in_stock
       from ecom.product_alerts`,
  );
  let sent = 0;
  for (const a of rows) {
    const st = await productState(a.product_code);
    if (!st) continue;
    const basePrice = a.base_price == null ? null : Number(a.base_price);
    const backInStock = a.base_in_stock === false && st.inStock;
    const priceDrop = basePrice != null && st.price != null && st.price < basePrice;
    if (!backInStock && !priceDrop) continue;

    const link = `/product/${encodeURIComponent(a.product_code)}`;
    if (backInStock) {
      await notify(a.customer_code, {
        type: "stock",
        title: "ສິນຄ້າເຂົ້າstockແລ້ວ 🎉",
        body: `${st.name} ມີໃນສະຕັອກແລ້ວ — ສັ່ງຊື້ໄດ້ເລີຍ`,
        link,
      });
    } else if (priceDrop) {
      await notify(a.customer_code, {
        type: "price",
        title: "ລາຄາລົງ 📉",
        body: `${st.name} ລົງເຫຼືອ ${st.price!.toLocaleString("lo-LA")} ₭`,
        link,
      });
    }
    await query(
      `update ecom.product_alerts set base_price = $2, base_in_stock = $3, notified_at = now() where id = $1`,
      [a.id, st.price, st.inStock],
    );
    sent++;
  }
  return sent;
}
