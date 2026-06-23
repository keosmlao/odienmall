"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatKip } from "@/lib/format";
import OrderTimeline from "@/components/OrderTimeline";
import { trackOrder, type TrackedOrder } from "./actions";

export default function TrackForm({ initialOrderNo = "" }: { initialOrderNo?: string }) {
  const [orderNo, setOrderNo] = useState(initialOrderNo);
  const [phone, setPhone] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await trackOrder(orderNo, phone);
      if (res.ok) setOrder(res.order);
      else {
        setOrder(null);
        setError(res.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-black text-slate-900">ຕິດຕາມຄຳສັ່ງຊື້</h1>
      <p className="mt-1 text-sm text-slate-500">ໃສ່ເລກອໍເດີ ແລະ ເບີໂທ ເພື່ອກວດສະຖານະ (ບໍ່ຕ້ອງເຂົ້າສູ່ລະບົບ)</p>

      <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <input
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          placeholder="ເລກອໍເດີ (ເຊັ່ນ OM... ຫຼື CAE...)"
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="ເບີໂທທີ່ສັ່ງຊື້"
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button type="submit" disabled={pending} className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-60">
          {pending ? "ກຳລັງກວດ..." : "ຕິດຕາມ"}
        </button>
      </form>

      {order && (
        <div className="mt-5 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">ເລກອໍເດີ</div>
              <div className="font-bold text-brand-dark">{order.orderNo}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">ຍອດລວມ</div>
              <div className="font-extrabold text-price">{formatKip(order.total)}</div>
            </div>
          </div>
          {order.status !== "cancelled" ? (
            <OrderTimeline status={order.status} paymentMethod={order.paymentMethod} />
          ) : (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">ອໍເດີຖືກຍົກເລີກ</div>
          )}
          <div className="border-t border-slate-100 pt-3 text-sm text-slate-600">
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-2 py-0.5">
                <span className="line-clamp-1">{it.name}</span>
                <span className="shrink-0 text-slate-400">×{it.qty}</span>
              </div>
            ))}
          </div>
          <Link href={`/order/${order.orderNo}`} className="block text-center text-sm font-semibold text-brand-dark hover:underline">
            ເບິ່ງລາຍລະອຽດ
          </Link>
        </div>
      )}
    </div>
  );
}
