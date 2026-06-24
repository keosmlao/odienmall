"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSalesTarget } from "@/app/admin/sales-targets/actions";

// Add a monthly target for ONE salesperson at a time: pick a person + amount.
// Re-uses saveSalesTarget (upsert), then refreshes the list.
export default function AddSalesTarget({
  options,
  defaultMonth,
}: {
  options: { code: string; name: string }[];
  defaultMonth: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [month, setMonth] = useState(defaultMonth);
  const [amount, setAmount] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    if (!code) { setError("ກະລຸນາເລືອກພະນັກງານຂາຍ"); return; }
    if (!month) { setError("ກະລຸນາເລືອກເດືອນ"); return; }
    const amt = Math.round(Number(amount.replace(/[^0-9.]/g, "")) || 0);
    if (amt <= 0) { setError("ກະລຸນາໃສ່ເປົ້າ"); return; }
    startTransition(async () => {
      const res = await saveSalesTarget(code, month, amt);
      if (res.ok) {
        setCode("");
        setAmount("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[160px] flex-1">
        <label className="mb-1 block text-xs font-semibold text-slate-500">ພະນັກງານຂາຍ</label>
        <select value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">— ເລືອກ —</option>
          {options.map((o) => (
            <option key={o.code} value={o.code}>{o.name}</option>
          ))}
        </select>
      </div>
      <div className="w-36">
        <label className="mb-1 block text-xs font-semibold text-slate-500">ເດືອນ</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
      </div>
      <div className="w-32">
        <label className="mb-1 block text-xs font-semibold text-slate-500">ເປົ້າ (ກີບ)</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
          placeholder="0"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm"
        />
      </div>
      <button onClick={add} disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {pending ? "..." : "ເພີ່ມ"}
      </button>
      {error && <p className="w-full text-xs text-rose-600">{error}</p>}
    </div>
  );
}
