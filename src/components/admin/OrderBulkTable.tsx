"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkCancelOrders } from "@/app/admin/actions";
import OrderRowExpandable from "./OrderRowExpandable";
import type { OrderRowData } from "./OrderRowExpandable";

export default function OrderBulkTable({ orders }: { orders: OrderRowData[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const cancellable = orders.filter(
    (o) => o.status === "pending" || o.status === "awaiting_confirmation" || o.status === "cod",
  );

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelected(new Set(cancellable.map((o) => o.orderNo)));
    } else {
      setSelected(new Set());
    }
  }

  function toggle(orderNo: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(orderNo) : next.delete(orderNo);
      return next;
    });
  }

  function cancelSelected() {
    if (selected.size === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await bulkCancelOrders(Array.from(selected));
      if (res.ok) {
        setSelected(new Set());
        router.refresh();
      } else {
        setError(res.error ?? "ຍົກເລີກລົ້ມເຫລວ");
      }
    });
  }

  function whatsappBlast() {
    const msg = encodeURIComponent("ສະບາຍດີ! ຄຳສັ່ງຊື້ຂອງທ່ານຈາກ OdienMall ກຳລັງດຳເນີນການ. ຂອບໃຈທີ່ໃຊ້ບໍລິການ 🙏");
    const selectedOrders = orders.filter((o) => selected.has(o.orderNo));
    for (const o of selectedOrders) {
      if (o.phone) {
        const phone = o.phone.replace(/\D/g, "");
        window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
      }
    }
  }

  const allSelected = cancellable.length > 0 && cancellable.every((o) => selected.has(o.orderNo));
  const someSelected = selected.size > 0;

  return (
    <div>
      {/* Bulk action bar */}
      {someSelected && (
        <div className="sticky top-0 z-20 mb-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 shadow-sm">
          <span className="text-sm font-semibold text-amber-800">
            ເລືອກແລ້ວ {selected.size} ອໍເດີ
          </span>
          <div className="flex items-center gap-2">
            {error && <span className="text-xs text-rose-600">{error}</span>}
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={pending}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              ຍົກເລີກການເລືອກ
            </button>
            <button
              type="button"
              onClick={whatsappBlast}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
            >
              📲 WhatsApp {selected.size} ຄົນ
            </button>
            <button
              type="button"
              onClick={cancelSelected}
              disabled={pending}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {pending ? "ກຳລັງຍົກເລີກ..." : `ຍົກເລີກ ${selected.size} ອໍເດີ`}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-50/70 text-slate-500 text-[10px] font-black uppercase tracking-wider">
              <th className="px-4 py-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  disabled={cancellable.length === 0}
                  className="h-4 w-4 rounded border-slate-300 accent-orange-500"
                  aria-label="ເລືອກທັງໝົດ"
                />
              </th>
              <th className="px-6 py-4 font-black">ເລກບິນ SML / ໃບ SML</th>
              <th className="px-6 py-4 font-black">ລູກຄ້າ</th>
              <th className="px-6 py-4 font-black">ລາຍລະອຽດສິນຄ້າ</th>
              <th className="px-6 py-4 font-black text-right">ລວມ</th>
              <th className="px-6 py-4 font-black">ພະນັກງານຂາຍ</th>
              <th className="px-6 py-4 font-black">ສະຖານະ / ວັນທີ</th>
              <th className="px-6 py-4 font-black text-right">ຈັດການ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {orders.map((o) => {
              const isCancellable =
                o.status === "pending" || o.status === "awaiting_confirmation" || o.status === "cod";
              return (
                <OrderRowExpandable
                  key={o.orderNo}
                  o={o}
                  checked={selected.has(o.orderNo)}
                  onCheck={isCancellable ? (v) => toggle(o.orderNo, v) : undefined}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
