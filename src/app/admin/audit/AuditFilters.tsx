"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuditFilters({
  search,
  action,
  actions,
}: {
  search: string;
  action: string;
  actions: string[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(search);

  function push(next: { q?: string; action?: string }) {
    const sp = new URLSearchParams();
    const qv = next.q ?? q;
    const act = next.action ?? action;
    if (qv.trim()) sp.set("q", qv.trim());
    if (act) sp.set("action", act);
    const s = sp.toString();
    router.push(s ? `/admin/audit?${s}` : "/admin/audit");
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm shadow-gray-200/40">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          push({ q });
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ຄົ້ນຫາ ຜູ້ໃຊ້ / ລາຍການ / ລາຍລະອຽດ..."
          className="w-60 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
          ຄົ້ນຫາ
        </button>
      </form>

      <select
        value={action}
        onChange={(e) => push({ action: e.target.value })}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
      >
        <option value="">ທຸກປະເພດ</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      {(search || action) && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.push("/admin/audit");
          }}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ລ້າງ
        </button>
      )}
    </div>
  );
}
