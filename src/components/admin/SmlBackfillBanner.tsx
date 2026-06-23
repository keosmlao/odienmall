"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { backfillSmlDocs } from "@/app/admin/actions";

// Shown when orders exist that were never written to SML (created before direct
// write was on). One click creates their ໃບສັ່ງຊື້ (ic_trans flag 34).
export default function SmlBackfillBanner({ count }: { count: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run() {
    setMsg(null);
    startTransition(async () => {
      const res = await backfillSmlDocs();
      if (res.ok) {
        setMsg(`ສ້າງສຳເລັດ ${res.created} ໃບ${res.failed ? `, ລົ້ມເຫຼວ ${res.failed}` : ""}`);
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="text-sm text-amber-800">
        <span className="font-semibold">{count}</span> ອໍເດີຍັງບໍ່ມີໃບ SML (ສ້າງກ່ອນເປີດ direct write).
        <span className="ml-1 text-amber-600">ກົດສ້າງໃບສັ່ງຊື້ (flag 34) ໃຫ້ມັນ.</span>
        {msg && <span className="ml-2 font-medium text-amber-900">— {msg}</span>}
      </div>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
      >
        {pending ? "ກຳລັງສ້າງ..." : "ສ້າງໃບ SML"}
      </button>
    </div>
  );
}
