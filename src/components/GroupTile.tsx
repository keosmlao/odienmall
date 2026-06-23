import Link from "next/link";
import { hashHue } from "@/lib/format";

// Home-page category tile for a product group_sub. Mirrors the top GroupMenu
// (same group_main/group_sub taxonomy) so the homepage and the primary nav show
// the SAME categories — links to the matching /group/[main]/[sub] page.
export default function GroupTile({
  mainCode,
  code,
  name,
  productCount,
}: {
  mainCode: string;
  code: string;
  name: string;
  productCount: number;
}) {
  const hue = hashHue(code);
  return (
    <Link
      href={`/group/${encodeURIComponent(mainCode)}/${encodeURIComponent(code)}`}
      className="group flex min-w-0 flex-col items-center gap-2 bg-white p-3 text-center transition hover:relative hover:z-10 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <span
        className="grid h-14 w-14 place-items-center rounded-full text-lg font-bold transition group-hover:scale-105"
        style={{
          backgroundColor: `hsl(${hue} 75% 92%)`,
          color: `hsl(${hue} 55% 38%)`,
        }}
      >
        {name.slice(0, 1)}
      </span>
      <span className="line-clamp-2 min-h-8 break-words text-xs leading-4 text-gray-700 group-hover:text-brand-dark">
        {name}
      </span>
      <span className="hidden text-[11px] text-gray-400 sm:block">{productCount} ລາຍການ</span>
    </Link>
  );
}
