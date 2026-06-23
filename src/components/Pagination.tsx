import Link from "next/link";

// Simple link-based pagination. `hrefFor` builds the URL for a given page so the
// host page controls how query params are preserved.
export default function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let p = Math.max(1, end - 4); p <= end; p++) pages.push(p);

  const base =
    "grid h-9 min-w-9 place-items-center rounded-md border px-3 text-sm transition";
  const idle = "border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand-dark";
  const active = "border-brand bg-brand text-white";
  const disabled = "pointer-events-none border-gray-100 bg-gray-50 text-gray-300";

  return (
    <nav className="mt-6 flex items-center justify-center gap-1.5">
      <Link
        href={hrefFor(page - 1)}
        className={`${base} ${page <= 1 ? disabled : idle}`}
        aria-label="ກ່ອນໜ້າ"
      >
        ‹
      </Link>
      {pages[0] > 1 && <span className="px-1 text-gray-400">…</span>}
      {pages.map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          className={`${base} ${p === page ? active : idle}`}
        >
          {p}
        </Link>
      ))}
      {pages[pages.length - 1] < totalPages && (
        <span className="px-1 text-gray-400">…</span>
      )}
      <Link
        href={hrefFor(page + 1)}
        className={`${base} ${page >= totalPages ? disabled : idle}`}
        aria-label="ຕໍ່ໄປ"
      >
        ›
      </Link>
    </nav>
  );
}
