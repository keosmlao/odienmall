"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Filter bar for the admin review list: search + rating + visibility.
export default function ReviewFilters({
  search,
  rating,
  visibility,
}: {
  search: string;
  rating: string;
  visibility: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(search);

  function push(next: { q?: string; rating?: string; vis?: string }) {
    const sp = new URLSearchParams();
    const qv = next.q ?? q;
    const rt = next.rating ?? rating;
    const vis = next.vis ?? visibility;
    if (qv.trim()) sp.set("q", qv.trim());
    if (rt) sp.set("rating", rt);
    if (vis) sp.set("vis", vis);
    const s = sp.toString();
    router.push(s ? `/admin/reviews?${s}` : "/admin/reviews");
  }

  const selectCls =
    "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";

  const hasFilter = !!q || !!rating || !!visibility;

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
          placeholder="ຄົ້ນຫາ ສິນຄ້າ / ລູກຄ້າ / ຄຳເຫັນ..."
          className="w-60 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
          ຄົ້ນຫາ
        </button>
      </form>

      <select value={rating} onChange={(e) => push({ rating: e.target.value })} className={selectCls}>
        <option value="">ທຸກຄະແນນ</option>
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n} ດາວ
          </option>
        ))}
      </select>

      <select value={visibility} onChange={(e) => push({ vis: e.target.value })} className={selectCls}>
        <option value="">ທັງໝົດ</option>
        <option value="visible">ສະແດງຢູ່</option>
        <option value="hidden">ເຊື່ອງຢູ່</option>
      </select>

      {hasFilter && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.push("/admin/reviews");
          }}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ລ້າງ
        </button>
      )}
    </div>
  );
}
