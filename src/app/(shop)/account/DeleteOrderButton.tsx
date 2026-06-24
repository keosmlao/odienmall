"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMyOrder } from "./actions";

export default function DeleteOrderButton({ orderNo }: { orderNo: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function del() {
    if (!confirm(`ລົບຄຳສັ່ງຊື້ ${orderNo}? ການກະທຳນີ້ບໍ່ສາມາດກັບຄືນໄດ້.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMyOrder(orderNo);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={del}
        disabled={pending}
        aria-label="ລົບຄຳສັ່ງຊື້"
        className="rounded-lg p-2 text-gray-300 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
        </svg>
      </button>
      {error && <span className="max-w-[10rem] text-right text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
