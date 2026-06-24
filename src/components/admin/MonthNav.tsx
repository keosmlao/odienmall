"use client";

import { useRouter, usePathname } from "next/navigation";

// Month switcher (‹ [YYYY-MM] ›) that drives a ?month= query param. Used to view
// per-month sales targets.
export default function MonthNav({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function go(m: string) {
    router.push(`${pathname}?month=${m}`);
  }
  function shift(delta: number) {
    const [y, mo] = month.split("-").map(Number);
    const d = new Date(y, mo - 1 + delta, 1);
    go(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => shift(-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="ເດືອນກ່ອນ">‹</button>
      <input
        type="month"
        value={month}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <button onClick={() => shift(1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="ເດືອນຖັດໄປ">›</button>
    </div>
  );
}
