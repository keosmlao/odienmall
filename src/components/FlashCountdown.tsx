"use client";

import { useEffect, useState } from "react";

// Live mm/hh/dd countdown to a flash-sale end time.
export default function FlashCountdown({ endsAt }: { endsAt: string }) {
  const [left, setLeft] = useState(() => Math.max(0, Date.parse(endsAt) - Date.now()));

  useEffect(() => {
    const t = setInterval(() => {
      setLeft(Math.max(0, Date.parse(endsAt) - Date.now()));
    }, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  if (left <= 0) return null;
  const s = Math.floor(left / 1000);
  const dd = Math.floor(s / 86400);
  const hh = Math.floor((s % 86400) / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const cell = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="flex items-center gap-1 text-sm font-bold">
      <span className="hidden text-xs font-medium text-white/80 sm:inline">ໝົດໃນ</span>
      {dd > 0 && <Box>{cell(dd)}</Box>}
      <Box>{cell(hh)}</Box>
      <span className="text-white">:</span>
      <Box>{cell(mm)}</Box>
      <span className="text-white">:</span>
      <Box>{cell(ss)}</Box>
    </span>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid min-w-6 place-items-center rounded bg-black/25 px-1.5 py-0.5 font-mono text-white tabular-nums">
      {children}
    </span>
  );
}
