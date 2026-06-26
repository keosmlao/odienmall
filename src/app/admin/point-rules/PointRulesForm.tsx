"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePointRulesAction } from "./actions";
import type { PointRules } from "@/lib/engage-points";

const numCls =
  "w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm disabled:bg-slate-50 disabled:text-slate-400";

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 cursor-pointer outline-none focus:ring-2 focus:ring-orange-500/20 ${
        on ? "bg-emerald-500" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

interface RuleCardProps {
  title: string;
  desc: string;
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  children: React.ReactNode;
  iconPath: string;
}

function RuleCard({ title, desc, enabled, onEnabled, children, iconPath }: RuleCardProps) {
  return (
    <div
      className={`rounded-2xl border transition-all duration-300 p-5 bg-white shadow-sm flex flex-col justify-between min-h-[160px] ${
        enabled
          ? "border-slate-200 hover:border-slate-300 hover:shadow-md"
          : "border-slate-150 bg-slate-50/50 opacity-70"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm transition-all duration-300 ${
                enabled
                  ? "bg-orange-50 border-orange-100 text-orange-600 shadow-2xs"
                  : "bg-slate-100 border-slate-200 text-slate-400"
              }`}
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
              </svg>
            </span>
            <div>
              <h4 className="text-xs font-black text-slate-800 tracking-wide uppercase leading-tight">{title}</h4>
              <p className="mt-1 text-[10.5px] text-slate-400 font-semibold leading-normal">{desc}</p>
            </div>
          </div>
          <Toggle on={enabled} onChange={onEnabled} />
        </div>
      </div>

      <div
        className={`flex flex-wrap items-center gap-3 transition-opacity duration-300 ${
          enabled ? "" : "opacity-40 pointer-events-none"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function PointRulesForm({ initial }: { initial: PointRules }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [r, setR] = useState<PointRules>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof PointRules>(k: K, v: PointRules[K]) =>
    setR((p) => ({ ...p, [k]: v }));

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await savePointRulesAction(r);
      setMsg(res.ok ? { ok: true, text: "ບັນທຶກສຳເລັດ ✓" } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* 2-Column Grid of Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Address Points */}
        <RuleCard
          title="ທີ່ຢູ່ຄົບ (ບ້ານ/ເມືອງ/ແຂວງ)"
          desc="ໃຫ້ຄັ້ງດຽວ ເມື່ອລູກຄ້າຕື່ມທີ່ຢູ່ຄົບ"
          enabled={r.addressEnabled}
          onEnabled={(v) => set("addressEnabled", v)}
          iconPath="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        >
          <label className="text-xs font-bold text-slate-500">ແຕ້ມ</label>
          <input
            type="number"
            step="0.1"
            value={r.addressPoints}
            disabled={!r.addressEnabled}
            onChange={(e) => set("addressPoints", Number(e.target.value))}
            className={numCls}
          />
        </RuleCard>

        {/* Birthday + Gender Points */}
        <RuleCard
          title="ວັນເກີດ + ເພດ"
          desc="ໃຫ້ຄັ້ງດຽວ ເມື່ອລູກຄ້າຕື່ມວັນເກີດ ແລະ ເພດ"
          enabled={r.birthdayEnabled}
          onEnabled={(v) => set("birthdayEnabled", v)}
          iconPath="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        >
          <label className="text-xs font-bold text-slate-500">ແຕ້ມ</label>
          <input
            type="number"
            step="0.1"
            value={r.birthdayPoints}
            disabled={!r.birthdayEnabled}
            onChange={(e) => set("birthdayPoints", Number(e.target.value))}
            className={numCls}
          />
        </RuleCard>

        {/* Daily Collect Points */}
        <RuleCard
          title="ຮັບແຕ້ມປະຈຳວັນ (collect)"
          desc="ກົດຮັບແຕ້ມໄດ້ຫຼາຍຄັ້ງຕໍ່ມື້"
          enabled={r.collectEnabled}
          onEnabled={(v) => set("collectEnabled", v)}
          iconPath="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        >
          <label className="text-xs font-bold text-slate-500">ແຕ້ມ/ຄັ້ງ</label>
          <input
            type="number"
            step="0.1"
            value={r.collectPoints}
            disabled={!r.collectEnabled}
            onChange={(e) => set("collectPoints", Number(e.target.value))}
            className={numCls}
          />
          <label className="text-xs font-bold text-slate-500">ສູງສຸດ/ມື້</label>
          <input
            type="number"
            step="1"
            value={r.collectMaxPerDay}
            disabled={!r.collectEnabled}
            onChange={(e) => set("collectMaxPerDay", Number(e.target.value))}
            className={numCls}
          />
        </RuleCard>

        {/* Facebook Share Points */}
        <RuleCard
          title="ແບ່ງປັນ Facebook"
          desc="ກົດແບ່ງປັນເວັບລົງ Facebook"
          enabled={r.shareEnabled}
          onEnabled={(v) => set("shareEnabled", v)}
          iconPath="M8.684 10.742l4.743-2.372m0 7.26l-4.743-2.372M16 12a3 3 0 11-6 0 3 3 0 016 0zm-6-7a3 3 0 11-6 0 3 3 0 016 0zm0 14a3 3 0 11-6 0 3 3 0 016 0z"
        >
          <label className="text-xs font-bold text-slate-500">ແຕ້ມ/ຄັ້ງ</label>
          <input
            type="number"
            step="0.1"
            value={r.sharePoints}
            disabled={!r.shareEnabled}
            onChange={(e) => set("sharePoints", Number(e.target.value))}
            className={numCls}
          />
          <label className="text-xs font-bold text-slate-500">ສູງສຸດ/ມື້</label>
          <input
            type="number"
            step="1"
            value={r.shareMaxPerDay}
            disabled={!r.shareEnabled}
            onChange={(e) => set("shareMaxPerDay", Number(e.target.value))}
            className={numCls}
          />
        </RuleCard>
      </div>

      {/* Save Status Banners */}
      {msg && (
        <div
          className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed transition-all duration-300 ${
            msg.ok ? "border-emerald-250 bg-emerald-50 text-emerald-800" : "border-rose-250 bg-rose-50 text-rose-850"
          }`}
        >
          {msg.ok ? (
            <svg className="h-4.5 w-4.5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-4.5 w-4.5 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-bold">{msg.text}</span>
        </div>
      )}

      {/* Save Button */}
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="relative flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 text-sm font-black text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:from-orange-600 hover:to-amber-600 hover:shadow-lg disabled:opacity-60 disabled:pointer-events-none active:scale-[0.98] cursor-pointer"
      >
        {pending ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            ກຳລັງບັນທຶກ...
          </>
        ) : (
          <>
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            ບັນທຶກການຕັ້ງຄ່າ
          </>
        )}
      </button>
    </div>
  );
}
