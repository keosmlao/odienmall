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
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">ກຳລັງອອນລາຍ</span>
      </div>
      <div className="mt-2 text-4xl font-black text-emerald-700">{count.toLocaleString("en-US")}</div>
      <div className="mt-1 text-xs text-slate-500">ຄົນທີ່ເຄື່ອນໄຫວໃນ 5 ນາທີຜ່ານມາ</div>
    </div>
  );
}
