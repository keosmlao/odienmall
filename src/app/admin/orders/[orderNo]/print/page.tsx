import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getOrderByNo } from "@/lib/orders";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-constants";
import { PAYMENT_LABEL, type PaymentMethod } from "@/lib/payment-constants";
import { SHIPPING_LABEL, type ShippingMethod } from "@/lib/shipping-constants";
import { formatKip } from "@/lib/format";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function OrderPrintPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { orderNo } = await params;
  const order = await getOrderByNo(decodeURIComponent(orderNo));
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/admin/orders/${encodeURIComponent(order.orderNo)}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-brand-dark"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          ກັບຄືນ
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm shadow-gray-200/40 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Letterhead */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <Image src="/odm.png" alt="OdienMall" width={120} height={40} className="h-10 w-auto" />
            <div className="text-xs leading-relaxed text-gray-500">
              <div className="text-base font-bold text-gray-800">OdienMall</div>
              ບ້ານ ຂົວຫຼວງ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ
              <br />
              ໂທ: +856 20 5992 9992
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-gray-800">ໃບສັ່ງຊື້</div>
            <div className="text-xs text-gray-500">{order.orderNo}</div>
            <div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString("lo-LA")}</div>
          </div>
        </div>

        {/* Customer */}
        <div className="mt-4 grid gap-1 text-sm text-gray-600 sm:grid-cols-2">
          <div><span className="text-gray-400">ລູກຄ້າ: </span>{order.customerName}</div>
          <div><span className="text-gray-400">ເບີໂທ: </span>{order.phone}</div>
          {order.address && (
            <div className="sm:col-span-2"><span className="text-gray-400">ທີ່ຢູ່: </span>{order.address}</div>
          )}
          <div>
            <span className="text-gray-400">ສະຖານະ: </span>
            {STATUS_LABEL[order.status as OrderStatus] ?? order.status}
          </div>
          <div>
            <span className="text-gray-400">ການຊຳລະ: </span>
            {PAYMENT_LABEL[order.paymentMethod as PaymentMethod] ?? order.paymentMethod}
          </div>
          {order.saleName && (
            <div><span className="text-gray-400">ພະນັກງານຂາຍ: </span>{order.saleName}</div>
          )}
          <div>
            <span className="text-gray-400">ຈັດສົ່ງ: </span>
            {SHIPPING_LABEL[order.shippingMethod as ShippingMethod] ?? order.shippingMethod}
          </div>
        </div>

        {/* Items */}
        <table className="mt-5 w-full text-sm">
          <thead className="border-y border-gray-200 text-left text-gray-500">
            <tr>
              <th className="py-2 font-medium">ສິນຄ້າ</th>
              <th className="py-2 text-center font-medium">ຈຳນວນ</th>
              <th className="py-2 text-right font-medium">ລາຄາ/ໜ່ວຍ</th>
              <th className="py-2 text-right font-medium">ລວມ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((it) => (
              <tr key={it.productCode}>
                <td className="py-2 text-gray-700">
                  {it.productName}
                  <div className="text-xs text-gray-400">{it.productCode}</div>
                </td>
                <td className="py-2 text-center text-gray-600">
                  {it.qty}{it.unit ? ` ${it.unit}` : ""}
                </td>
                <td className="py-2 text-right text-gray-600">
                  {it.unitPrice != null ? formatKip(it.unitPrice) : "—"}
                </td>
                <td className="py-2 text-right font-medium text-gray-700">{formatKip(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-sm">
          <div className="flex items-baseline justify-between text-gray-600">
            <span>ລາຄາສິນຄ້າ</span><span>{formatKip(order.subtotal)}</span>
          </div>
          <div className="flex items-baseline justify-between text-gray-600">
            <span>ຄ່າຂົນສົ່ງ</span><span>{formatKip(order.shippingFee)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex items-baseline justify-between text-gray-600">
              <span>ສ່ວນຫຼຸດ</span><span>−{formatKip(order.discount)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-semibold text-gray-800">ລວມທັງໝົດ</span>
            <span className="text-xl font-extrabold text-gray-900">{formatKip(Math.max(0, order.subtotal + order.shippingFee - order.discount))}</span>
          </div>
        </div>

        {order.note && (
          <div className="mt-4 text-sm text-gray-500">
            <span className="text-gray-400">ໝາຍເຫດ: </span>{order.note}
          </div>
        )}

        <div className="mt-8 text-center text-xs text-gray-400">ຂອບໃຈທີ່ໃຊ້ບໍລິການ OdienMall</div>
      </div>
    </div>
  );
}
