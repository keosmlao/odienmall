"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { changeStatus } from "@/app/admin/actions";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/order-constants";

// Extra confirmation context for impactful transitions (domain side-effects).
const STATUS_NOTE: Partial<Record<OrderStatus, string>> = {
  cancelled: "ຄຳສັ່ງຊື້ນີ້ຈະຖືກຍົກເລີກ (ic_trans.is_cancel = 1).",
};

export default function OrderStatusControl({
  orderNo,
  current,
  warehouseReady = false,
}: {
  orderNo: string;
  current: string;
  warehouseReady?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<OrderStatus | null>(null);

  // Open the confirm modal for a chosen status.
  function ask(status: OrderStatus) {
    if (status === current) return;
    setError(null);
    setTarget(status);
  }

  function close() {
    if (pending) return;
    setTarget(null);
    setError(null);
  }

  function confirm() {
    if (!target) return;
    setError(null);
    startTransition(async () => {
      const res = await changeStatus(orderNo, target);
      if (res.ok) {
        setTarget(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  // Close on Escape while the modal is open.
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, pending]);

  return (
    <div>
      <div className="grid gap-2">
        {ORDER_STATUSES.map((s) => (
          (() => {
            // ic_trans model: only "cancelled" is a manual admin transition.
            // paid = ອອກບິນ (34→44); shipping/completed come from TMS.
            const blocked =
              s !== "cancelled" || current === "completed" || current === "cancelled";
            return (
          <button
            key={s}
            onClick={() => ask(s)}
            disabled={pending || s === current || blocked}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition disabled:opacity-70 ${
              s === current
                ? "border-brand bg-brand-light text-brand-dark ring-1 ring-brand/20"
                : s === "cancelled"
                  ? "border-gray-200 bg-white text-gray-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                  : "border-gray-200 bg-white text-gray-600 hover:border-brand hover:bg-brand-light/40 hover:text-brand-dark"
            }`}
          >
            <span>{STATUS_LABEL[s]}</span>
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                s === current ? "bg-brand text-white" : "bg-gray-100 text-gray-400"
              }`}
            >
              {s === current ? "✓" : "›"}
            </span>
          </button>
            );
          })()
        ))}
      </div>
      {current === "awaiting_confirmation" && (
        <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">
          {warehouseReady
            ? "ກົດ “ຢືນຢັນການສັ່ງຊື້” ເພື່ອປ່ຽນຈາກ 34 ເປັນ 44."
            : "ກວດ stock ແລະເລືອກສາງຈ່າຍໃຫ້ຄົບກ່ອນຢືນຢັນ."}
        </p>
      )}
      {(current === "shipping" || current === "completed") && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500">
          ສະຖານະຈັດສົ່ງ ອັບເດດອັດຕະໂນມັດຈາກລະບົບຂົນສົ່ງ (TMS).
        </p>
      )}
      {error && !target && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      {target && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* backdrop */}
          <button
            type="button"
            aria-label="ປິດ"
            onClick={close}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          />
          {/* dialog */}
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">ຢືນຢັນການປ່ຽນສະຖານະ</h3>
            <p className="mt-2 text-sm text-gray-600">
              ປ່ຽນສະຖານະຄຳສັ່ງຊື້{" "}
              <span className="font-semibold text-gray-800">{orderNo}</span>
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-3 py-3 text-sm">
              <span className="rounded-full bg-gray-200 px-2.5 py-0.5 font-medium text-gray-600">
                {STATUS_LABEL[current as OrderStatus] ?? current}
              </span>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              <span className="rounded-full bg-brand px-2.5 py-0.5 font-semibold text-white">
                {STATUS_LABEL[target]}
              </span>
            </div>
            {STATUS_NOTE[target] && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {STATUS_NOTE[target]}
              </p>
            )}
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
              >
                ຍົກເລີກ
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
              >
                {pending ? "ກຳລັງບັນທຶກ..." : "ຢືນຢັນ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
