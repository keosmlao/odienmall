"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Order search + date-range filter. The active status (set by the chips below)
// is preserved; CSV export links out with all current filters.
export default function OrderFilters({
  status,
  search,
  from,
  to,
  exportHref,
}: {
  status: string;
  search: string;
  from: string;
  to: string;
  exportHref: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(search);
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (q.trim()) sp.set("q", q.trim());
    if (f) sp.set("from", f);
    if (t) sp.set("to", t);
    const s = sp.toString();
    router.push(s ? `/admin?${s}` : "/admin");
  }

  function clear() {
    setQ("");
    setF("");
    setT("");
    router.push(status ? `/admin?status=${status}` : "/admin");
  }

  const inputCls =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";
  const hasFilter = !!q || !!from || !!to;

  return (
    <form
      onSubmit={apply}
      className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm shadow-gray-200/40"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ຄົ້ນຫາ ເລກ / ຊື່ / ເບີໂທ..."
        className={`${inputCls} w-52`}
      />
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <input type="date" value={f} onChange={(e) => setF(e.target.value)} className={inputCls} aria-label="ແຕ່ວັນທີ" />
        <span>–</span>
        <input type="date" value={t} onChange={(e) => setT(e.target.value)} className={inputCls} aria-label="ຫາວັນທີ" />
      </div>
      <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
        ກັ່ນຕອງ
      </button>
      {hasFilter && (
        <button type="button" onClick={clear} className="text-sm text-gray-400 hover:text-gray-600">
          ລ້າງ
        </button>
      )}
      <a
        href={exportHref}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-brand hover:text-brand-dark"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        ດາວໂຫຼດ CSV
      </a>
    </form>
  );
}
