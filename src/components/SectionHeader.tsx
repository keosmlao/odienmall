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
      className={`flex items-center justify-between ${
        flush ? "mb-0 px-4 py-3 sm:px-5" : "mb-3"
      }`}
    >
      <h2 className="flex items-center gap-2.5 text-lg font-black tracking-tight text-slate-800 sm:text-xl">
        <span className={`h-5 w-1.5 rounded-full ${accent ? "bg-rose-500" : "bg-gradient-to-b from-orange-500 to-amber-400"}`} />
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
        >
          ເບິ່ງທັງໝົດ
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </Link>
      )}
    </div>
  );
}
