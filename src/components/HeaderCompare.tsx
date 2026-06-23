"use client";

import Link from "next/link";
import { useCompare } from "@/lib/compare";

export default function HeaderCompare() {
  const { count, ready } = useCompare();
  return (
    <Link
      href="/compare"
      aria-label="ປຽບທຽບສິນຄ້າ"
      className="relative flex min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600 sm:min-w-16"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M7 4v16M17 4v16M3 8h8M13 16h8M5 6l2-2 2 2M15 18l2 2 2-2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {ready && count > 0 && (
        <span className="absolute right-0.5 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
          {count}
        </span>
      )}
      <span className="hidden text-xs font-semibold md:block">ປຽບທຽບ</span>
    </Link>
  );
}
