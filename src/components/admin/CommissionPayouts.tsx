"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatKip } from "@/lib/format";
import { payCommission } from "@/app/admin/sales-commission/actions";

interface Earner {
  saleCode: string;
  saleName: string;
  rate: number;
  earnedAll: number;
  paid: number;
  outstanding: number;
}

// Commission payout list: salespeople who earned, with earned / paid / outstanding
// + an inline payment (defaults to the outstanding amount). Manager-only action.
export default function CommissionPayouts({ earners }: { earners: Earner[] }) {
  if (earners.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">ຍັງບໍ່ມີຄອມມິສຊັນທີ່ໄດ້ຮັບ</p>;
  }
  return (
    <div className="divide-y divide-slate-100">
      {earners.map((e) => (
        <PayoutRow key={e.saleCode} earner={e} />
      ))}
    </div>
  );
}

function PayoutRow({ earner }: { earner: Earner }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(earner.outstanding || ""));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pay() {
    setError(null);
    const amt = Math.round(Number(amount.replace(/[^0-9.]/g, "")) || 0);
    if (amt <= 0) { setError("ໃສ່ຈຳນວນ"); return; }
    startTransition(async () => {
      const res = await payCommission(earner.saleCode, amt);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-800">{earner.saleName}</div>
          <div className="text-[11px] text-slate-500">{earner.saleCode} · {earner.rate}%</div>
        </div>
        <div className="shrink-0 text-right text-xs">
          <div className="text-slate-500">ໄດ້ຮັບ {formatKip(earner.earnedAll)} · ຈ່າຍແລ້ວ {formatKip(earner.paid)}</div>
          <div className={`font-extrabold ${earner.outstanding > 0 ? "text-price" : "text-emerald-600"}`}>
            ຄ້າງ {formatKip(earner.outstanding)}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
          placeholder="ຈຳນວນ"
          className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-right text-xs"
        />
        <button onClick={pay} disabled={pending} className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-bold text-white disabled:opacity-50">
          {pending ? "..." : "ຈ່າຍ"}
        </button>
      </div>
      {error && <p className="mt-1 text-right text-xs text-rose-600">{error}</p>}
    </div>
  );
}
