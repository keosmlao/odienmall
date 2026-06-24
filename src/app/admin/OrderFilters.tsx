"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OrderFilters({
  status,
  search,
  from,
  to,
  sale,
  salespeople = [],
  exportHref,
}: {
  status: string;
  search: string;
  from: string;
  to: string;
  sale?: string;
  salespeople?: { code: string; name: string }[];
  exportHref: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(search);
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const [sc, setSc] = useState(sale ?? "");

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (q.trim()) sp.set("q", q.trim());
    if (f) sp.set("from", f);
    if (t) sp.set("to", t);
    if (sc) sp.set("sale", sc);
    const s = sp.toString();
    router.push(s ? `/admin?${s}` : "/admin");
  }

  function clear() {
    setQ("");
    setF("");
    setT("");
    setSc("");
    router.push(status ? `/admin?status=${status}` : "/admin");
  }

  const hasFilter = !!q || !!from || !!to || !!sc;

  return (
    <form
      onSubmit={apply}
      className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/60 bg-white/90 p-3 shadow-sm shadow-slate-200/30 backdrop-blur-md transition-all duration-300 hover:border-slate-300 sm:p-4 lg:flex-row lg:flex-wrap lg:items-center"
    >
      {/* Search Input */}
      <div className="relative w-full lg:min-w-[240px] lg:flex-1">
        <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ຄົ້ນຫາ ເລກ / ຊື່ / ເບີໂທ..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition-all duration-300 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 placeholder:text-slate-400"
        />
      </div>

      {/* Date Pickers */}
      <div className="grid w-full grid-cols-[auto_1fr_auto_1fr] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-1 sm:flex sm:gap-2 sm:px-3 lg:w-auto lg:min-w-[280px]">
        <span className="pr-1 text-xs font-bold uppercase tracking-wider text-slate-400">ວັນທີ</span>
        <input
          type="date"
          value={f}
          onChange={(e) => setF(e.target.value)}
          className="min-w-0 rounded-lg border-none bg-transparent py-1.5 text-sm font-semibold text-slate-750 outline-none focus:ring-0 cursor-pointer"
          aria-label="ແຕ່ວັນທີ"
        />
        <span className="text-slate-300 font-bold">—</span>
        <input
          type="date"
          value={t}
          onChange={(e) => setT(e.target.value)}
          className="min-w-0 rounded-lg border-none bg-transparent py-1.5 text-sm font-semibold text-slate-750 outline-none focus:ring-0 cursor-pointer"
          aria-label="ຫາວັນທີ"
        />
      </div>

      {/* Salesperson Dropdown */}
      {salespeople.length > 0 && (
        <div className="relative w-full lg:w-auto lg:min-w-[200px]">
          <select
            value={sc}
            onChange={(e) => setSc(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-4 pr-10 text-sm font-semibold text-slate-700 outline-none transition-all duration-300 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
            aria-label="ພະນັກງານຂາຍ"
          >
            <option value="">ພະນັກງານຂາຍ (ທັງໝົດ)</option>
            {salespeople.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-500/15 transition-all duration-300 hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-500/25 active:scale-97 cursor-pointer"
        >
          ກັ່ນຕອງ
        </button>

        {hasFilter && (
          <button
            type="button"
            onClick={clear}
            className="rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-550 transition hover:bg-slate-50 hover:text-slate-800 active:scale-97 cursor-pointer"
          >
            ລ້າງ
          </button>
        )}
      </div>

      {/* CSV Export */}
      <a
        href={exportHref}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all duration-300 hover:border-orange-500/45 hover:bg-orange-50/20 hover:text-orange-600 active:scale-97 sm:w-auto lg:ml-auto"
      >
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-slate-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        ດາວໂຫຼດ CSV
      </a>
    </form>
  );
}
