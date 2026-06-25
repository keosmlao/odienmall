"use client";

import { useEffect, useState } from "react";
import { refreshOnline } from "./actions";

// Live "online now" counter — polls every 15s. Starts from the server value.
export default function OnlineNow({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      refreshOnline()
        .then((n) => {
          if (alive) setCount(n);
        })
        .catch(() => {});
    };
    const id = setInterval(tick, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-emerald-950/20">
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-teal-500/5 blur-2xl" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 sm:text-xs">
            ກຳລັງອອນລາຍ
          </span>
        </div>
        <div className="rounded-full bg-slate-900/80 p-1.5 text-emerald-400 border border-slate-800">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]">
          {count.toLocaleString("en-US")}
        </span>
        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
          ສົດ
        </span>
      </div>

      <p className="mt-2 text-xs font-semibold text-slate-400">
        ຄົນທີ່ເຄື່ອນໄຫວໃນ 5 ນາທີຜ່ານມາ
      </p>
    </div>
  );
}
