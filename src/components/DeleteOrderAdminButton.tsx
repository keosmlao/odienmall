"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteOrderAdmin } from "@/app/admin/actions";

// Admin: permanently delete an order (for clearing test data). Confirms first.
export default function DeleteOrderAdminButton({ orderNo, compact = false }: { orderNo: string; compact?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await deleteOrderAdmin(orderNo);
      if (res.ok) {
        // List context: stay + refresh. Detail context: back to the list.
        if (compact) router.refresh();
        else router.push("/admin");
        setConfirm(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirm(true); }}
          aria-label="ລົບ"
          className="grid h-8 w-8 place-items-center rounded-lg border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
          ລົບ
        </button>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="ປິດ"
            onClick={() => !pending && setConfirm(false)}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">ລົບຄຳສັ່ງຊື້</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              ລົບອໍເດີ <span className="font-semibold text-gray-800">{orderNo}</span> ຖາວອນ
              (ລາຍການ, ການເລືອກສາງ, ຄິວບິນ). <span className="font-semibold text-rose-600">ກັບคืນບໍ່ໄດ້.</span>
            </p>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
              >
                ຍົກເລີກ
              </button>
              <button
                type="button"
                onClick={run}
                disabled={pending}
                className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
              >
                {pending ? "ກຳລັງລົບ..." : "ລົບຖາວອນ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
