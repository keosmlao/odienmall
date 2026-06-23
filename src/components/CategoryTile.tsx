import Link from "next/link";
import type { Category } from "@/lib/types";
import { hashHue } from "@/lib/format";

export default function CategoryTile({ category }: { category: Category }) {
  const hue = hashHue(category.code);
  return (
    <Link
      href={`/category/${encodeURIComponent(category.code)}`}
      className="group flex flex-col items-center gap-2 rounded-lg bg-white p-3 text-center transition hover:shadow-md"
    >
      <span
        className="grid h-14 w-14 place-items-center rounded-full text-lg font-bold transition group-hover:scale-105"
        style={{
          backgroundColor: `hsl(${hue} 75% 92%)`,
          color: `hsl(${hue} 55% 38%)`,
        }}
      >
        {category.name.slice(0, 1)}
      </span>
      <span className="line-clamp-2 text-xs leading-tight text-gray-700 group-hover:text-brand-dark">
        {category.name}
      </span>
      <span className="text-[11px] text-gray-400">{category.productCount} ລາຍການ</span>
    </Link>
  );
}
