"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setReturn } from "@/app/admin/returns/actions";
import type { ReturnStatus } from "@/lib/returns";

// Per-row action buttons for an admin return request.
export default function ReturnRowControls({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function act(next: ReturnStatus, withNote = false) {
    let note: string | undefined;
    if (withNote) {
      const v = prompt("ໝາຍເຫດ (ທາງເລືອກ)") ?? undefined;
      note = v;
    }
    startTransition(async () => {
      await setReturn(id, next, note);
      router.refresh();
    });
  }

  if (status === "refunded" || status === "rejected") {
    return <span className="text-xs text-gray-400">ສຳເລັດ</span>;
  }
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {status === "pending" && (
        <>
          <button onClick={() => act("approved")} disabled={pending} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">ອະນຸມັດ</button>
          <button onClick={() => act("rejected", true)} disabled={pending} className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">ປະຕິເສດ</button>
        </>
      )}
      {status === "approved" && (
        <button onClick={() => act("refunded", true)} disabled={pending} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">ຄືນເງິນແລ້ວ</button>
      )}
    </div>
  );
}
