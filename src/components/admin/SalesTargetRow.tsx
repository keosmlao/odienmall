"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatKip } from "@/lib/format";
import { saveSalesTarget, removeSalesTarget } from "@/app/admin/sales-targets/actions";

// One salesperson row on the targets board: name + achievement bar + an inline
// editable monthly target + remove. Saves via the manager-only server action.
export default function SalesTargetRow({
  saleCode,
  saleName,
  month,
  monthlyTarget,
  revenueMonth,
}: {
  saleCode: string;
  saleName: string;
  month: string;
  monthlyTarget: number;
  revenueMonth: number;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(String(monthlyTarget || ""));
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pct = monthlyTarget > 0 ? Math.round((revenueMonth / monthlyTarget) * 100) : 0;
  const reached = monthlyTarget > 0 && revenueMonth >= monthlyTarget;

  function save() {
    setError(null);
    const amount = Math.round(Number(draft.replace(/[^0-9.]/g, "")) || 0);
    startTransition(async () => {
      const res = await saveSalesTarget(saleCode, month, amount);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await removeSalesTarget(saleCode, month);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-800">{saleName}</div>
          <div className="text-[11px] text-slate-500">{saleCode}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-extrabold text-price">{formatKip(revenueMonth)}</div>
          {editing ? (
            <div className="mt-1 flex items-center gap-1">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                inputMode="numeric"
                placeholder="ເປົ້າ (ກີບ)"
                className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-right text-xs"
              />
              <button onClick={save} disabled={pending} className="rounded-lg bg-brand px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50">
                {pending ? "..." : "✓"}
              </button>
              <button onClick={() => { setEditing(false); setDraft(String(monthlyTarget || "")); }} className="px-1 text-xs text-slate-500">✕</button>
            </div>
          ) : (
            <div className="mt-1 flex items-center justify-end gap-2">
              <button onClick={() => setEditing(true)} className="text-[11px] font-semibold text-slate-500 hover:text-brand-dark">
                ເປົ້າ: {formatKip(monthlyTarget)} ✎
              </button>
              <button onClick={remove} disabled={pending} className="text-[11px] font-semibold text-rose-600 hover:text-rose-600">ລຶບ</button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${reached ? "bg-emerald-500" : "bg-brand"}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <span className={`shrink-0 text-xs font-bold ${reached ? "text-emerald-600" : "text-slate-500"}`}>
          {pct}%{reached ? " 🎉" : ""}
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
