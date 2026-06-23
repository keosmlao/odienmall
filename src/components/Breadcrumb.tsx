import Link from "next/link";

export default function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav className="mb-3 flex min-h-8 flex-wrap items-center gap-1 text-xs text-gray-500">
      <Link href="/" className="hover:text-orange-600">
        ໜ້າຫຼັກ
      </Link>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="text-gray-300">/</span>
          {it.href ? (
            <Link href={it.href} className="hover:text-orange-600">
              {it.label}
            </Link>
          ) : (
            <span className="text-gray-700">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
