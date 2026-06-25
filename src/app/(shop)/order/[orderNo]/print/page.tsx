import { notFound, redirect } from "next/navigation";
import { getOrderByNo } from "@/lib/orders";
import { getSession } from "@/lib/auth";
import { formatKip } from "@/lib/format";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-constants";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function CustomerOrderPrintPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  const [session, order] = await Promise.all([
    getSession(),
    getOrderByNo(decodeURIComponent(orderNo)),
  ]);

  if (!order) notFound();

  // Must be the order owner (or guest with matching phone checked via query param).
  const isOwner = session && order.customerCode && session.code === order.customerCode;
  const isGuest = !order.customerCode;
  if (!isOwner && !isGuest) redirect(`/order/${encodeURIComponent(orderNo)}`);

  const grandTotal = Math.max(0, order.subtotal + order.shippingFee - order.discount);
  const docDate = new Date(order.createdAt).toLocaleDateString("lo-LA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <html lang="lo">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>ໃບບິນ {order.orderNo}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Noto Sans Lao', Arial, sans-serif; font-size: 14px; color: #111; padding: 32px; max-width: 680px; margin: auto; }
          h1 { font-size: 22px; font-weight: 900; color: #f97316; }
          .meta { font-size: 12px; color: #666; margin-top: 4px; }
          hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #888; padding: 6px 8px; border-bottom: 2px solid #e5e7eb; }
          td { padding: 8px 8px; border-bottom: 1px solid #f3f4f6; font-size: 13px; vertical-align: top; }
          .right { text-align: right; }
          .total-row td { font-weight: 700; border-top: 2px solid #e5e7eb; border-bottom: none; }
          .grand-total td { font-size: 16px; font-weight: 900; color: #f97316; border-top: 3px solid #f97316; }
          footer { margin-top: 48px; font-size: 11px; color: #aaa; text-align: center; }
          .no-print { position: fixed; bottom: 24px; right: 24px; }
          @media print {
            .no-print { display: none; }
            body { padding: 20px; }
          }
        `}</style>
      </head>
      <body>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1>OdienMall</h1>
            <div className="meta">ໃບຮັບເງິນ / Invoice</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#666" }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{order.smlDocNo || order.orderNo}</div>
            <div>{docDate}</div>
            <div>ສະຖານະ: {STATUS_LABEL[order.status as OrderStatus] ?? order.status}</div>
          </div>
        </div>

        <hr />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>ລູກຄ້າ</div>
            <div>{order.customerName}</div>
            <div>{order.phone}</div>
            {order.address && <div style={{ marginTop: 4, color: "#555" }}>{order.address}</div>}
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>ທີ່ຢູ່ຮ້ານ</div>
            <div>OdienMall — ODG</div>
            <div>+856 20 5992 9992</div>
            <div style={{ color: "#555" }}>ບ້ານຂົວຫຼວງ, ຈັນທະບູລີ, ວຽງຈັນ</div>
          </div>
        </div>

        <hr />

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>ສິນຄ້າ</th>
              <th className="right" style={{ textAlign: "right" }}>ລາຄາ</th>
              <th className="right" style={{ textAlign: "right" }}>ຈຳນວນ</th>
              <th className="right" style={{ textAlign: "right" }}>ລວມ</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={item.productCode}>
                <td style={{ color: "#aaa" }}>{i + 1}</td>
                <td>{item.productName}</td>
                <td style={{ textAlign: "right" }}>{formatKip(item.unitPrice)}</td>
                <td style={{ textAlign: "right" }}>{item.qty}</td>
                <td style={{ textAlign: "right" }}>{formatKip(item.lineTotal)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} style={{ textAlign: "right", fontWeight: 600 }}>ຍອດລວມສິນຄ້າ</td>
              <td style={{ textAlign: "right" }}>{formatKip(order.subtotal)}</td>
            </tr>
            {order.shippingFee > 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "right" }}>ຄ່າຂົນສົ່ງ</td>
                <td style={{ textAlign: "right" }}>{formatKip(order.shippingFee)}</td>
              </tr>
            )}
            {order.discount > 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "right", color: "#16a34a" }}>ສ່ວນຫຼຸດ</td>
                <td style={{ textAlign: "right", color: "#16a34a" }}>−{formatKip(order.discount)}</td>
              </tr>
            )}
            <tr className="grand-total">
              <td colSpan={4} style={{ textAlign: "right", fontWeight: 900, fontSize: 15 }}>ທັງໝົດ</td>
              <td style={{ textAlign: "right", fontWeight: 900, fontSize: 15, color: "#f97316" }}>{formatKip(grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        <hr />
        <div style={{ fontSize: 12, color: "#555" }}>
          <span style={{ fontWeight: 600 }}>ວິທີຊຳລະ:</span>{" "}
          {order.paymentMethod === "cod" ? "ເກັບເງິນປາຍທາງ (COD)" : "ໂອນຜ່ານທະນາຄານ / QR BCEL"}
        </div>

        <footer>
          <div>OdienMall · odienmall.com · +856 20 5992 9992</div>
          <div style={{ marginTop: 4 }}>ຂອບໃຈທີ່ໃຊ້ບໍລິການ — ຫາກມີຄຳຖາມ ຕິດຕໍ່ທີ່ LINE/WhatsApp</div>
        </footer>

        <div className="no-print">
          <PrintButton />
        </div>
      </body>
    </html>
  );
}
