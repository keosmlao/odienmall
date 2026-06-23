"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatKip } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import OrderTrackSteps from "@/components/OrderTrackSteps";
import { trackOrder, type TrackedOrder } from "./actions";

export default function TrackForm({ initialOrderNo = "" }: { initialOrderNo?: string }) {
  const [q, setQ] = useState(initialOrderNo);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await trackOrder(q);
      if (res.ok) setOrders(res.orders);
      else {
        setOrders(null);
        setError(res.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-black text-slate-900">ຕິດຕາມຄຳສັ່ງຊື້</h1>
      <p className="mt-1 text-sm text-slate-500">ໃສ່ <span className="font-semibold">ເລກອໍເດີ ຫຼື ເບີໂທ</span> ຢ່າງໃດໜຶ່ງ (ບໍ່ຕ້ອງເຂົ້າສູ່ລະບົບ)</p>

      <form onSubmit={submit} className="mt-4 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ເລກອໍເດີ (OM…/CAE…) ຫຼື ເບີໂທ"
              className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-brand"
              autoFocus
            />
          </div>
          <button type="submit" disabled={pending} className="shrink-0 rounded-xl bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-60">
            {pending ? "..." : "ຕິດຕາມ"}
          </button>
        </div>
        {error && <p className="px-2 pb-1 pt-2 text-sm text-rose-600">{error}</p>}
      </form>

      {orders && orders.length > 1 && (
        <p className="mt-4 text-xs font-semibold text-slate-400">ພົບ {orders.length} ອໍເດີ</p>
      )}

      <div className="mt-4 space-y-4">
        {orders?.map((order) => (
          <div key={order.orderNo} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-50 pb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-brand-dark">{order.orderNo}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  {new Date(order.createdAt).toLocaleDateString("lo-LA")}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[11px] text-slate-400">ຍອດລວມ</div>
                <div className="font-extrabold text-price">{formatKip(order.total)}</div>
              </div>
            </div>

            <div className="py-4">
              <OrderTrackSteps status={order.status} paymentMethod={order.paymentMethod} />
            </div>

            <div className="border-t border-slate-50 pt-3 text-sm text-slate-600">
              {order.items.slice(0, 4).map((it, i) => (
                <div key={i} className="flex justify-between gap-2 py-0.5">
                  <span className="line-clamp-1">{it.name}</span>
                  <span className="shrink-0 text-slate-400">×{it.qty}</span>
                </div>
              ))}
              {order.items.length > 4 && <div className="text-xs text-slate-400">+{order.items.length - 4} ລາຍການ</div>}
            </div>

            <Link href={`/order/${encodeURIComponent(order.orderNo)}`} className="mt-3 block rounded-xl bg-slate-50 py-2.5 text-center text-sm font-semibold text-brand-dark transition hover:bg-slate-100">
              ເບິ່ງລາຍລະອຽດ →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
