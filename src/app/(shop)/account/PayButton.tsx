"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnepayQr from "@/app/(shop)/order/[orderNo]/OnepayQr";

// Compact "ຊຳລະເງິນ" button for the account order list — opens the BCEL QR modal
// directly (generates the QR on open) instead of navigating to the order page.
// Closing returns to the list; successful payment automatically opens the order.
export default function PayButton({
  orderNo,
  amount,
  tracked,
}: {
  orderNo: string;
  amount: number;
  tracked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function closeAndRefresh() {
    setOpen(false);
    router.refresh();
  }

  function goToOrder() {
    router.replace(`/order/${encodeURIComponent(orderNo)}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark"
      >
        ຊຳລະເງິນ
      </button>
      {open && (
        <OnepayQr
          orderNo={orderNo}
          amount={amount}
          variant="modal"
          tracked={tracked}
          onClose={closeAndRefresh}
          onExpire={closeAndRefresh}
          onPaid={goToOrder}
        />
      )}
    </>
  );
}
