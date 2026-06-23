"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelOrder } from "@/app/(shop)/account/actions";

// "ຍົກເລີກອໍເດີ" — customer self-cancel for an unpaid COD order, with a confirm step.
export default function CancelOrderButton({
  orderNo,
  variant = "compact",
}: {
  orderNo: string;
  variant?: "compact" | "full";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await cancelOrder(orderNo);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const trigger =
    variant === "full"
      ? "rounded-full border border-rose-200 bg-white px-6 py-2.5 text-sm font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
      : "rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={pending} className={`${trigger} disabled:opacity-60`}>
        ຍົກເລີກອໍເດີ
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="ປິດ"
            onClick={() => !pending && setOpen(false)}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">ຍົກເລີກອໍເດີ?</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              ທ່ານຕ້ອງການຍົກເລີກອໍເດີ{" "}
              <span className="font-semibold text-gray-800">{orderNo}</span> ແທ້ບໍ?
              ການກະທຳນີ້ບໍ່ສາມາດກັບຄືນໄດ້.
            </p>
            {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
              >
                ບໍ່
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
              >
                {pending ? "ກຳລັງຍົກເລີກ..." : "ຍົກເລີກອໍເດີ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
