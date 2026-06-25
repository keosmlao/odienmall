import Link from "next/link";
import { getOrderNosByPhone, getOrderByNo } from "@/lib/orders";
import StatusBadge from "@/components/StatusBadge";
import { formatKip } from "@/lib/format";

export default async function LookupResults({ phone }: { phone: string }) {
  const orderNos = await getOrderNosByPhone(phone);

  if (orderNos.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-2xl">🔍</div>
        <p className="font-semibold text-gray-700">ບໍ່ພົບຄຳສັ່ງຊື້</p>
        <p className="mt-1 text-sm text-gray-400">ກວດສອບເບີໂທ ຫຼື ຕິດຕໍ່ຮ້ານ +856 20 5992 9992</p>
      </div>
    );
  }

  const orders = (await Promise.all(orderNos.map((no) => getOrderByNo(no).catch(() => null)))).filter(Boolean);

  return (
    <div className="mt-6 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        ພົບ {orders.length} ຄຳສັ່ງຊື້
      </p>
      {orders.map((o) => {
        if (!o) return null;
        const grandTotal = Math.max(0, o.subtotal + o.shippingFee - o.discount);
        return (
          <Link
            key={o.orderNo}
            href={`/order/${encodeURIComponent(o.orderNo)}`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow"
          >
            <div className="min-w-0">
              <p className="font-bold text-gray-900">{o.smlDocNo || o.orderNo}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {new Date(o.createdAt).toLocaleDateString("lo-LA", { dateStyle: "medium" })}
                {" · "}
                {o.items.length} ລາຍການ
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <StatusBadge status={o.status} />
              <span className="text-sm font-bold text-orange-600">{formatKip(grandTotal)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
