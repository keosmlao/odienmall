"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleAlert, getAlertState } from "@/app/(shop)/product/[code]/alert-actions";

// Subscribe to back-in-stock / price-drop alerts for a product (logged-in only).
export default function ProductAlertButton({ productCode }: { productCode: string }) {
  const [on, setOn] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getAlertState(productCode).then((v) => {
      if (alive) setOn(v);
    });
    return () => {
      alive = false;
    };
  }, [productCode]);

  function click() {
    setMsg(null);
    startTransition(async () => {
      const res = await toggleAlert(productCode);
      if (res.ok) {
        setOn(res.on);
        setMsg(res.on ? "ຈະແຈ້ງເຕືອນເມື່ອມີ stock ຫຼື ລາຄາລົງ" : null);
      } else {
        setMsg(res.error);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={click}
        disabled={pending}
        className={`inline-flex items-center gap-2 rounded-sm border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
          on
            ? "border-amber-300 bg-amber-50 text-amber-700"
            : "border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:text-amber-700"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {on ? "ກຳລັງແຈ້ງເຕືອນ" : "ແຈ້ງເຕືອນເມື່ອມີ stock / ລາຄາລົງ"}
      </button>
      {msg && <p className="mt-1.5 text-xs text-amber-600">{msg}</p>}
    </div>
  );
}
