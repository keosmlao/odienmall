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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {tiers.map((t) => {
        const style = TIER_RANK_STYLES[Math.min(t.rank, 2)];
        const isEditing = editingCode === t.code;

        return (
          <div
            key={t.code}
            className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 flex flex-col justify-between min-h-[280px] ${
              isEditing
                ? "border-orange-500 shadow-[0_10px_30px_rgba(249,115,22,0.12)] ring-2 ring-orange-500/10"
                : "border-slate-200 hover:border-slate-300 hover:shadow-md"
            }`}
          >
            {/* Card Header with Tier Status Gradient */}
            <div className={`h-24 bg-gradient-to-br ${
              t.rank === 0 ? "from-amber-400 to-yellow-500 text-amber-950" :
              t.rank === 1 ? "from-slate-300 to-slate-500 text-white" :
              "from-slate-800 to-slate-950 text-white"
            } p-4 flex items-center justify-between relative`}>
              <div className="space-y-0.5 z-10">
                <h3 className="font-black text-base tracking-wide leading-tight">{t.name}</h3>
                <span className={`font-mono text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                  t.rank === 0 ? "bg-amber-950/10 text-amber-900" : "bg-white/10 text-white/90"
                }`}>
                  CODE {t.code}
                </span>
              </div>
              <span className="text-3xl filter drop-shadow-sm select-none z-10">{style.icon}</span>
              {/* Decorative background shape */}
              <div className="absolute right-[-10px] bottom-[-20px] text-8xl opacity-15 pointer-events-none select-none font-black font-sans leading-none">
                {style.icon}
              </div>
            </div>

            {isEditing ? (
              // Editing Mode Form
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                      ຍອດສະສົມຕໍ່າສຸດ (₭)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minSpendVal}
                      onChange={(e) => setMinSpendVal(e.target.value)}
                      disabled={pending}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition disabled:opacity-50"
                    />
                  </div>

                  {error && (
                    <p className="rounded-lg bg-rose-50 border border-rose-100 p-2 text-[10px] font-semibold text-rose-600">
                      ⚠️ {error}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-auto">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={pending}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition disabled:opacity-50 cursor-pointer"
                  >
                    ຍົກເລີກ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(t.code)}
                    disabled={pending}
                    className="rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    {pending ? "..." : "ບັນທຶກ"}
                  </button>
                </div>
              </div>
            ) : (
              // Display Mode Card
              <div className="p-5 flex-1 flex flex-col justify-between gap-5">
                <div className="space-y-4">
                  {/* Discount Section */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ສ່ວນຫຼຸດເວັບໄຊທ໌</span>
                    <span className="text-xl font-black text-emerald-600 tabular-nums">{t.discountPct}%</span>
                  </div>
                  {/* Spend Threshold Section */}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ຍອດໃຊ້ຈ່າຍສະສົມຂັ້ນຕ່ຳ</span>
                    <span className="text-base font-black text-slate-800 tabular-nums">
                      {t.minSpend > 0 ? (
                        `${t.minSpend.toLocaleString("lo-LA")} ₭`
                      ) : (
                        <span className="text-slate-500 font-bold">0 ₭ (ເລີ່ມຕົ້ນ)</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Footer Info & Action */}
                <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-auto">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    sub_no {t.rank + 3}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:border-orange-500/30 hover:bg-orange-50 hover:text-orange-600 transition cursor-pointer active:scale-95 shadow-2xs"
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
