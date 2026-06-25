"use client";

import { useState, useEffect } from "react";

type Left = { d: number; h: number; m: number; s: number } | null;

function getLeft(toDate: string): Left {
  const end = new Date(toDate + "T23:59:59");
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return { d, h, m, s };
}

const p = (n: number) => String(n).padStart(2, "0");

const SHELL =
  "inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600";
const Clock = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinecap="round" />
  </svg>
);

export default function CountdownTimer({ toDate }: { toDate: string }) {
  // Time depends on Date.now(), which differs between the server render and the
  // client — so we render a stable placeholder until mounted (no hydration
  // mismatch), then tick the live value client-side.
  const [mounted, setMounted] = useState(false);
  const [left, setLeft] = useState<Left>(null);

  useEffect(() => {
    setMounted(true);
    setLeft(getLeft(toDate));
    const id = setInterval(() => setLeft(getLeft(toDate)), 1000);
    return () => clearInterval(id);
  }, [toDate]);

  if (!mounted) {
    return (
      <span className={SHELL}>
        <Clock />
        <span className="tabular-nums">--:--:--</span>
      </span>
    );
  }

  if (!left) return <span className={SHELL}>ໝົດອາຍຸ</span>;

  const urgent = left.d < 3;
  return (
    <span className={`${SHELL} ${urgent ? "animate-pulse" : ""}`}>
      <Clock />
      {left.d > 0 && <span>{left.d}ວ </span>}
      <span className="tabular-nums">{p(left.h)}:{p(left.m)}:{p(left.s)}</span>
    </span>
  );
}
