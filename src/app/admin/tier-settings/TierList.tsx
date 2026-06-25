"use client";

import { useState, useTransition } from "react";
import { TIER_RANK_STYLES } from "@/lib/tier-constants";
import type { TierConfig } from "@/lib/member-tier";
import { saveTierOverride } from "./actions";

interface TierListProps {
  initialTiers: TierConfig[];
}

export default function TierList({ initialTiers }: TierListProps) {
  const [tiers, setTiers] = useState<TierConfig[]>(initialTiers);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  // Form states for the currently edited tier
  const [discountVal, setDiscountVal] = useState<string>("");
  const [minSpendVal, setMinSpendVal] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit(tier: TierConfig) {
    setEditingCode(tier.code);
    setDiscountVal(String(tier.discountPct));
    setMinSpendVal(String(tier.minSpend));
    setError(null);
  }

  function cancelEdit() {
    setEditingCode(null);
    setError(null);
  }

  function handleSave(tierCode: string) {
    const discount = parseFloat(discountVal);
    const minSpend = parseFloat(minSpendVal);

    if (isNaN(discount) || discount < 0 || discount > 100) {
      setError("ສ່ວນຫຼຸດຕ້ອງຢູ່ລະຫວ່າງ 0% ຫາ 100%");
      return;
    }
    if (isNaN(minSpend) || minSpend < 0) {
      setError("ຍອດຂັ້ນຕ່ຳຕ້ອງບໍ່ຫຼຸດກວ່າ 0 ₭");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await saveTierOverride(tierCode, discount, minSpend);
      if (res.ok) {
        // Update local state
        setTiers((prev) =>
          prev.map((t) =>
            t.code === tierCode
              ? { ...t, discountPct: discount, minSpend: minSpend }
              : t
          )
        );
        setEditingCode(null);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {tiers.map((t) => {
        const style = TIER_RANK_STYLES[Math.min(t.rank, 2)];
        const isEditing = editingCode === t.code;

        return (
          <div
            key={t.code}
            className={`rounded-2xl border transition-all duration-300 ${
              isEditing
                ? "border-orange-500/50 bg-slate-900 shadow-[0_4px_20px_rgba(249,115,22,0.15)]"
                : "border-slate-800 bg-slate-900/90 hover:border-slate-700/80 hover:shadow-md"
            } p-5`}
          >
            {isEditing ? (
              // Editing Mode Form
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${style.badgeClass}`}
                  >
                    {style.icon}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-sm">{t.name}</h3>
                    <span className="font-mono text-[10px] text-orange-400">
                      ລະຫັດ: {t.code}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                      ສ່ວນຫຼຸດ (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={discountVal}
                      onChange={(e) => setDiscountVal(e.target.value)}
                      disabled={pending}
                      className="w-full rounded-xl border border-slate-850 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                      ຍອດສະສົມຕໍ່າສຸດ (₭)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minSpendVal}
                      onChange={(e) => setMinSpendVal(e.target.value)}
                      disabled={pending}
                      className="w-full rounded-xl border border-slate-850 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg bg-rose-950/40 border border-rose-900/30 px-3.5 py-2 text-xs font-semibold text-rose-450">
                    ⚠️ {error}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={pending}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition disabled:opacity-50 cursor-pointer"
                  >
                    ຍົກເລີກ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(t.code)}
                    disabled={pending}
                    className="rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/10 hover:bg-orange-500 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
                  </button>
                </div>
              </div>
            ) : (
              // Display Mode Card
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl shadow-inner ${style.badgeClass}`}
                  >
                    {style.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-white text-base">{t.name}</span>
                      <span className="rounded bg-slate-800/80 px-2 py-0.5 font-mono text-[9px] font-extrabold text-orange-400">
                        {t.code}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        ສ່ວນຫຼຸດ:{" "}
                        <span className="font-extrabold text-green-450 bg-green-500/10 px-2 py-0.5 rounded-md">
                          {t.discountPct}%
                        </span>
                      </span>
                      <span className="text-slate-700 font-extrabold select-none">•</span>
                      <span className="flex items-center gap-1">
                        ຍອດຂັ້ນຕ່ຳ:{" "}
                        {t.minSpend > 0 ? (
                          <span className="font-extrabold text-white">
                            {t.minSpend.toLocaleString("lo-LA")} ₭
                          </span>
                        ) : (
                          <span className="text-slate-550 font-semibold">0 ₭ (ເລີ່ມຕົ້ນ)</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden sm:block text-right">
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider">sub_no {t.rank + 3}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    className="rounded-xl border border-slate-750 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:border-orange-500/30 hover:bg-slate-750 hover:text-white transition cursor-pointer"
                  >
                    ແກ້ໄຂ
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
