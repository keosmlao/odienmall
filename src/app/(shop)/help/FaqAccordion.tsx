"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/pages-content";

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
      {items.map((it, i) => (
        <div key={i}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
          >
            <span className="text-sm font-semibold text-slate-800">{it.q}</span>
            <span className={`shrink-0 text-slate-400 transition ${open === i ? "rotate-180" : ""}`}>⌄</span>
          </button>
          {open === i && <p className="px-4 pb-4 text-sm leading-7 text-slate-600">{it.a}</p>}
        </div>
      ))}
    </div>
  );
}
