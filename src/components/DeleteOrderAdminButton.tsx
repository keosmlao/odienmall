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
          className="grid h-8.5 w-8.5 place-items-center rounded-xl border border-rose-200 bg-white text-rose-500 hover:text-white hover:bg-rose-500 hover:border-rose-500 transition-all duration-300 shadow-sm active:scale-95 cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-600 hover:border-rose-350 hover:bg-rose-50/50 active:scale-97 transition-all duration-300 cursor-pointer shadow-xs"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
          ລົບ
        </button>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="ປິດ"
            onClick={() => !pending && setConfirm(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300"
          />
          
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-[0_20px_50px_rgba(15,23,42,0.15)] transition-all duration-350 transform scale-100">
            {/* Warning Alert Icon Container */}
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 border border-rose-100/60 shadow-sm">
              <svg viewBox="0 0 24 24" className="h-6.5 w-6.5 text-rose-600" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-base font-black text-slate-900 leading-tight">ລົບຄຳສັ່ງຊື້</h3>
            
            <p className="mt-2.5 text-xs font-semibold text-slate-500 leading-relaxed px-1">
              ລົບອໍເດີ <span className="font-mono font-extrabold text-slate-800">{orderNo}</span> ຖາວອນ
              (ລາຍການ, ການເລືອກສາງ, ຄິວບິນ). <span className="font-extrabold text-rose-600 block mt-1.5 bg-rose-50/50 rounded-lg py-1 border border-rose-100/40">ກັບຄືນບໍ່ໄດ້.</span>
            </p>
            
            {error && (
              <p className="mt-3.5 rounded-lg bg-rose-50 border border-rose-100/50 px-3 py-2 text-xs font-bold text-rose-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                disabled={pending}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 active:scale-97 transition-all duration-300 disabled:opacity-50 cursor-pointer"
              >
                ຍົກເລີກ
              </button>
              <button
                type="button"
                onClick={run}
                disabled={pending}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-rose-500/10 hover:shadow-rose-500/20 active:scale-97 transition-all duration-300 disabled:opacity-60 cursor-pointer"
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
