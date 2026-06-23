import Link from "next/link";

export default function SectionHeader({
  title,
  href,
  accent,
  flush = false,
}: {
  title: string;
  href?: string;
  accent?: boolean;
  flush?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between border-b border-slate-100 ${
        flush ? "mb-0 px-4 py-3 sm:px-5" : "mb-4 pb-3"
      }`}
    >
      <h2
        className={`border-l-4 pl-3 text-lg font-bold sm:text-xl ${
          accent ? "border-rose-500 text-rose-500" : "border-orange-500 text-gray-800"
        }`}
      >
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="text-sm font-semibold text-orange-600 hover:text-orange-700"
        >
          ເບິ່ງທັງໝົດ ›
        </Link>
      )}
    </div>
  );
}
