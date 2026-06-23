import { isAdmin } from "@/lib/auth";
import { getAllOrders } from "@/lib/orders";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-constants";
import { PAYMENT_LABEL, type PaymentMethod } from "@/lib/payment-constants";
import { SHIPPING_LABEL, type ShippingMethod } from "@/lib/shipping-constants";

export const dynamic = "force-dynamic";

// CSV export of the (filtered) order list. Same filters as the dashboard, read
// from the query string. Admin-only — reads ecom.orders, never the ERP write.
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const orders = await getAllOrders({
    status: url.searchParams.get("status") || undefined,
    search: url.searchParams.get("q") || undefined,
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
  });

  const header = ["ເລກທີ່", "ລູກຄ້າ", "ເບີໂທ", "ຈຳນວນລາຍການ", "ລາຄາສິນຄ້າ", "ຄ່າຂົນສົ່ງ", "ລວມ (LAK)", "ຈັດສົ່ງ", "ການຊຳລະ", "ສະຖານະ", "ວັນທີ"];
  const rows = orders.map((o) => [
    o.orderNo,
    o.customerName,
    o.phone,
    String(o.itemCount),
    String(o.subtotal),
    String(o.shippingFee),
    String(o.subtotal + o.shippingFee),
    SHIPPING_LABEL[o.shippingMethod as ShippingMethod] ?? o.shippingMethod,
    PAYMENT_LABEL[o.paymentMethod as PaymentMethod] ?? o.paymentMethod,
    STATUS_LABEL[o.status as OrderStatus] ?? o.status,
    new Date(o.createdAt).toISOString().slice(0, 10),
  ]);

  // ﻿ BOM so Excel reads the UTF-8 Lao text correctly.
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="orders.csv"',
    },
  });
}

function cell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
