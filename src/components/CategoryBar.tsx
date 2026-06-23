import Link from "next/link";
import { getWebCategories } from "@/lib/catalog";

// Horizontal category nav under the header. Server component — fetches the
// top web categories once per request.
export default async function CategoryBar() {
  const categories = await getWebCategories(20);
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href="/products"
          className="shrink-0 rounded-full px-3 py-1.5 font-medium text-gray-600 transition hover:bg-brand-light hover:text-brand-dark"
        >
          ສິນຄ້າທັງໝົດ
        </Link>
        {categories.map((c) => (
          <Link
            key={c.code}
            href={`/category/${encodeURIComponent(c.code)}`}
            className="shrink-0 rounded-full px-3 py-1.5 text-gray-600 transition hover:bg-brand-light hover:text-brand-dark"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
