"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatKip } from "@/lib/format";
import {
  saveCommissionDefault,
  saveCommissionOverride,
  removeCommissionOverride,
} from "@/app/admin/sales-commission/actions";

interface OverrideRow {
  saleCode: string;
  saleName: string;
  rate: number;
  completedMonth: number;
  earnedMonth: number;
}

// Commission config: a single global default rate + per-person overrides added
// one at a time. Mirrors the curated targets UX (no edit-everyone-inline list).
export default function CommissionManager({
  defaultRate,
  overrides,
  options,
}: {
  defaultRate: number;
  overrides: OverrideRow[];
  options: { code: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Default rate editor
  const [def, setDef] = useState(String(defaultRate || ""));
  function saveDefault() {
    setError(null);
    startTransition(async () => {
      const res = await saveCommissionDefault(Number(def.replace(/[^0-9.]/g, "")) || 0);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  // Add override
  const [code, setCode] = useState("");
  const [pct, setPct] = useState("");
  function addOverride() {
    setError(null);
    if (!code) { setError("ກະລຸນາເລືອກພະນັກງານຂາຍ"); return; }
    startTransition(async () => {
      const res = await saveCommissionOverride(code, Number(pct.replace(/[^0-9.]/g, "")) || 0);
      if (res.ok) { setCode(""); setPct(""); router.refresh(); }
      else setError(res.error);
    });
  }

  function remove(c: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeCommissionOverride(c);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  // Salespeople without an override yet (so the picker doesn't offer dupes).
  const taken = new Set(overrides.map((o) => o.saleCode));
  const pickable = options.filter((o) => !taken.has(o.code));

  return (
    <div className="space-y-5">
      {/* Default rate */}
      <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-4">
        <label className="mb-1.5 block text-xs font-semibold text-slate-500">ອັດຕາມາດຕະຖານ (ທຸກຄົນ)</label>
        <div className="flex items-center gap-2">
          <input
            value={def}
            onChange={(e) => setDef(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-right text-sm"
          />
          <span className="text-sm font-bold text-slate-500">%</span>
          <button onClick={saveDefault} disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {pending ? "..." : "ບັນທຶກ"}
          </button>
        </div>
      </div>

      {/* Add override */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-500">ກຳນົດສະເພາະຄົນ</label>
          <select value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">— ເລືອກພະນັກງານຂາຍ —</option>
            {pickable.map((o) => (
              <option key={o.code} value={o.code}>{o.name}</option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs font-semibold text-slate-500">%</label>
          <input value={pct} onChange={(e) => setPct(e.target.value)} inputMode="decimal" placeholder="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm" />
        </div>
        <button onClick={addOverride} disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "..." : "ເພີ່ມ"}
        </button>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {/* Overrides list */}
      {overrides.length > 0 && (
        <div className="divide-y divide-slate-100 border-t border-slate-100 pt-1">
          {overrides.map((o) => (
            <div key={o.saleCode} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-800">{o.saleName}</div>
                <div className="text-[11px] text-slate-500">{o.saleCode} · {o.rate}%</div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-right">
                <div>
                  <div className="text-[10px] text-slate-500">ຄອມເດືອນນີ້</div>
                  <div className="font-bold text-price">{formatKip(o.earnedMonth)}</div>
                </div>
                <button onClick={() => remove(o.saleCode)} disabled={pending} className="text-[11px] font-semibold text-rose-600 hover:text-rose-600">ລຶບ</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
