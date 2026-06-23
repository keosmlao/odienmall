"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Facet } from "@/lib/products-admin";

// Filter bar for the admin product list: search + category + brand + a toggle to
// include out-of-stock items (hidden by default, matching the storefront).
export default function ProductFilters({
  groups,
  categories,
  brands,
  search,
  groupCode,
  categoryCode,
  brandCode,
  includeOutOfStock,
  lowStock,
}: {
  groups: Facet[];
  categories: Facet[];
  brands: Facet[];
  search: string;
  groupCode: string;
  categoryCode: string;
  brandCode: string;
  includeOutOfStock: boolean;
  lowStock: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(search);

  // Build the query string from current values + an override, resetting page.
  function push(next: { q?: string; group?: string; cat?: string; brand?: string; oos?: boolean; low?: boolean }) {
    const sp = new URLSearchParams();
    const qv = next.q ?? q;
    const group = next.group ?? groupCode;
    const cat = next.cat ?? categoryCode;
    const brand = next.brand ?? brandCode;
    const oos = next.oos ?? includeOutOfStock;
    const low = next.low ?? lowStock;
    if (qv.trim()) sp.set("q", qv.trim());
    if (group) sp.set("group", group);
    if (cat) sp.set("cat", cat);
    if (brand) sp.set("brand", brand);
    if (oos) sp.set("oos", "1");
    if (low) sp.set("low", "1");
    const s = sp.toString();
    router.push(s ? `/admin/products?${s}` : "/admin/products");
  }

  const selectCls =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";

  const hasFilter = !!q || !!groupCode || !!categoryCode || !!brandCode || includeOutOfStock || lowStock;

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
          placeholder="ຄົ້ນຫາ ຊື່ ຫຼື ລະຫັດ..."
          className="w-56 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
          ຄົ້ນຫາ
        </button>
      </form>

      <select value={groupCode} onChange={(e) => push({ group: e.target.value, cat: "" })} className={selectCls}>
        <option value="">ທຸກກຸ່ມ</option>
        {groups.map((g) => (
          <option key={g.code} value={g.code}>
            {g.name}
          </option>
        ))}
      </select>

      <select value={categoryCode} onChange={(e) => push({ cat: e.target.value })} className={selectCls}>
        <option value="">ທຸກໝວດ</option>
        {categories.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>

      <select value={brandCode} onChange={(e) => push({ brand: e.target.value })} className={selectCls}>
        <option value="">ທຸກຍີ່ຫໍ້</option>
        {brands.map((b) => (
          <option key={b.code} value={b.code}>
            {b.name}
          </option>
        ))}
      </select>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={includeOutOfStock}
          onChange={(e) => push({ oos: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 accent-brand"
        />
        ສະແດງສິນຄ້າໝົດສະຕັອກ
      </label>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={lowStock}
          onChange={(e) => push({ low: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 accent-amber-500"
        />
        ສະຕັອກໜ້ອຍ (≤5)
      </label>

      {hasFilter && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.push("/admin/products");
          }}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ລ້າງ
        </button>
      )}
    </div>
  );
}
