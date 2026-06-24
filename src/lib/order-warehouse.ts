import "server-only";
import { pool, query, queryOne } from "./db";

// One order ships from ONE warehouse. The admin picks a single warehouse for the
// whole order; each line is auto-allocated to the best shelf of that warehouse.

export interface StockLine {
  orderItemId: string;
  productCode: string;
  productName: string;
  qty: number;
  unit: string | null;
  available: number; // best single-shelf balance for this product in the warehouse
  shelfCode: string | null;
  shelfName: string | null;
  ok: boolean; // available >= qty
}

export interface WarehouseOption {
  whCode: string;
  whName: string;
  canFulfill: boolean; // every line ok → this warehouse can ship the whole order
  lines: StockLine[];
}

export interface OrderItemRow {
  orderItemId: string;
  productCode: string;
  productName: string;
  qty: number;
  unit: string | null;
}

export interface OrderWarehouseOptions {
  items: OrderItemRow[];
  warehouses: WarehouseOption[];
  selectedWhCode: string | null; // current allocation (one warehouse for the order)
  selectedTransport: string | null; // transport branch chosen at order creation
  ready: boolean;
}

type StockRow = {
  ic_code: string;
  warehouse: string;
  wh_name: string;
  location: string;
  location_name: string;
  available: string;
};

// Real-time per-warehouse availability for an order. Calls the SML stock function
// filtered by the order's item codes (fast — see the doc on `stock_balance`).
export async function getOrderWarehouseOptions(orderNo: string): Promise<OrderWarehouseOptions> {
  const items = await query<{
    id: string;
    product_code: string;
    product_name: string;
    qty: number;
    unit: string | null;
    wh_code: string | null;
  }>(
    `select d.roworder::text as id, d.item_code as product_code, d.item_name as product_name,
            d.qty::int as qty, d.unit_code as unit, a.wh_code
       from public.ic_trans_detail d
       join public.ic_trans ic on ic.doc_no = d.doc_no
       left join odg_ecom.order_item_allocations a on a.order_item_id = d.roworder
      where ic.doc_no = $1 and ic.doc_format_code = 'CAE'
        and ic.remark_5 in ('web','odienmall')
      order by d.roworder`,
    [orderNo],
  );
  const orderItems: OrderItemRow[] = items.map((it) => ({
    orderItemId: it.id,
    productCode: it.product_code,
    productName: it.product_name,
    qty: it.qty,
    unit: it.unit,
  }));
  // Transport branch the staff picked when creating the order (pre-fill ອອກບິນ).
  const tRow = await queryOne<{ transport_code: string | null }>(
    `select transport_code from odg_ecom.onepay_payments where sml_doc_no = $1 or order_no = $1 limit 1`,
    [orderNo],
  );
  const selectedTransport = tRow?.transport_code || null;

  if (orderItems.length === 0) {
    return { items: [], warehouses: [], selectedWhCode: null, selectedTransport, ready: false };
  }

  // Current allocation = one warehouse only if every line shares the same wh_code.
  const allocWh = items.map((it) => it.wh_code);
  const selectedWhCode =
    allocWh.every((w) => w && w === allocWh[0]) ? (allocWh[0] as string) : null;

  const codes = [...new Set(orderItems.map((i) => i.productCode))];
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

  // best shelf per (warehouse, product)
  const whMap = new Map<
    string,
    { whName: string; best: Map<string, { available: number; shelfCode: string; shelfName: string }> }
  >();
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

  const warehouses: WarehouseOption[] = [...whMap.entries()].map(([whCode, w]) => {
    const lines: StockLine[] = orderItems.map((it) => {
      const b = w.best.get(it.productCode);
      const available = b?.available ?? 0;
      return {
        orderItemId: it.orderItemId,
        productCode: it.productCode,
        productName: it.productName,
        qty: it.qty,
        unit: it.unit,
        available,
        shelfCode: b?.shelfCode ?? null,
        shelfName: b?.shelfName ?? null,
        ok: available >= it.qty,
      };
    });
    return { whCode, whName: w.whName, lines, canFulfill: lines.every((l) => l.ok) };
  });
  warehouses.sort(
    (a, b) => Number(b.canFulfill) - Number(a.canFulfill) || a.whName.localeCompare(b.whName),
  );

  return { items: orderItems, warehouses, selectedWhCode, selectedTransport, ready: selectedWhCode != null };
}

// Allocate the WHOLE order to one warehouse (auto best shelf per item), validating
// live stock. Atomic — all lines get the same wh_code or nothing is saved.
export async function allocateOrderToWarehouse(
  orderNo: string,
  whCode: string,
  selectedBy?: string,
): Promise<void> {
  if (!whCode) throw new Error("ກະລຸນາເລືອກສາງ");
  const client = await pool.connect();
  try {
    await client.query("begin");
    const order = await client.query<{ doc_no: string; trans_flag: number; is_cancel: number }>(
      `select doc_no, trans_flag, coalesce(is_cancel,0) as is_cancel
         from public.ic_trans
        where doc_no = $1 and doc_format_code = 'CAE'
          and remark_5 in ('web','odienmall') for update`,
      [orderNo],
    );
    const head = order.rows[0];
    if (!head) throw new Error("ບໍ່ພົບຄຳສັ່ງຊື້");
    if (head.is_cancel === 1) throw new Error("ອໍເດີຖືກຍົກເລີກແລ້ວ");
    if (Number(head.trans_flag) !== 34) {
      throw new Error("ອອກບິນແລ້ວ — ເລືອກສາງໄດ້ສະເພາະອໍເດີທີ່ຍັງເປັນ ໃບສັ່ງຊື້ (34)");
    }
    const items = (
      await client.query<{ id: string; product_code: string; product_name: string; qty: number }>(
        `select roworder as id, item_code as product_code, item_name as product_name, qty::int as qty
           from public.ic_trans_detail where doc_no = $1 order by roworder`,
        [orderNo],
      )
    ).rows;
    if (items.length === 0) throw new Error("ອໍເດີບໍ່ມີລາຍການສິນຄ້າ");

    const codes = [...new Set(items.map((i) => i.product_code))];
    const stock = (
      await client.query<StockRow>(
        `select f.ic_code, f.warehouse, w.name_1 as wh_name, f.location, s.name_1 as location_name,
                sum(f.balance_qty)::text as available
           from sml_ic_function_stock_balance_warehouse_location(current_date, $1, $2, '') f
           join public.ic_warehouse w on w.code = f.warehouse and coalesce(w.status,0) = 1
           join public.ic_shelf s on s.whcode = f.warehouse and s.code = f.location
            and coalesce(s.is_active,0)=1 and coalesce(s.is_stock,0)=1
            and coalesce(s.is_damage,0)=0 and coalesce(s.is_defect,0)=0
          group by f.ic_code, f.warehouse, w.name_1, f.location, s.name_1
         having sum(f.balance_qty) > 0`,
        [codes.join(","), whCode],
      )
    ).rows;
    const best = new Map<
      string,
      { available: number; shelfCode: string; shelfName: string; whName: string }
    >();
    for (const r of stock) {
      const avail = Number(r.available);
      const cur = best.get(r.ic_code);
      if (!cur || avail > cur.available) {
        best.set(r.ic_code, {
          available: avail,
          shelfCode: r.location,
          shelfName: r.location_name,
          whName: r.wh_name,
        });
      }
    }

    for (const item of items) {
      const b = best.get(item.product_code);
      const available = b?.available ?? 0;
      if (!b || available < item.qty) {
        throw new Error(
          `ສິນຄ້າ ${item.product_name} (${item.product_code}) ໃນສາງນີ້ມີ ${available} ແຕ່ຕ້ອງການ ${item.qty}`,
        );
      }
      await client.query(
        `insert into odg_ecom.order_item_allocations
           (order_item_id, wh_code, wh_name, shelf_code, shelf_name, qty, selected_by, selected_at)
         values ($1,$2,$3,$4,$5,$6,$7,now())
         on conflict (order_item_id) do update
           set wh_code=excluded.wh_code, wh_name=excluded.wh_name,
               shelf_code=excluded.shelf_code, shelf_name=excluded.shelf_name,
               qty=excluded.qty, selected_by=excluded.selected_by, selected_at=now()`,
        [item.id, whCode, b.whName, b.shelfCode, b.shelfName, item.qty, selectedBy ?? null],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// Used before issuing the bill: order allocated to ONE warehouse with live stock.
export async function assertOrderWarehouseReady(orderNo: string): Promise<void> {
  const opts = await getOrderWarehouseOptions(orderNo);
  if (opts.items.length === 0) throw new Error("ອໍເດີບໍ່ມີລາຍການສິນຄ້າ");
  if (!opts.selectedWhCode) throw new Error("ກະລຸນາເລືອກສາງຈ່າຍກ່ອນອອກບິນ");
  const wh = opts.warehouses.find((w) => w.whCode === opts.selectedWhCode);
  if (!wh || !wh.canFulfill) {
    throw new Error("stock ໃນສາງທີ່ເລືອກບໍ່ພໍ ກະລຸນາເລືອກສາງໃໝ່");
  }
}
