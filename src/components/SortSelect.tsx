"use client";

import { usePathname, useRouter } from "next/navigation";
import type { SortKey } from "@/lib/types";

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "ໃໝ່ລ່າສຸດ" },
  { value: "rating", label: "ຄະແນນສູງສຸດ" },
  { value: "price_asc", label: "ລາຄາ: ຕ່ຳ → ສູງ" },
  { value: "price_desc", label: "ລາຄາ: ສູງ → ຕ່ຳ" },
  { value: "name", label: "ຊື່ A → Z" },
];

export default function SortSelect({
  value,
  params,
}: {
  value: SortKey;
  params: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sp = new URLSearchParams(params);
    sp.set("sort", e.target.value);
    sp.delete("page");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-gray-500">
      <span className="hidden sm:inline">ຮຽງລຳດັບ:</span>
      <select
        value={value}
        onChange={onChange}
        className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-brand"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
