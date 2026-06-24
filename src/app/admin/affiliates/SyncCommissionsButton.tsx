"use client";

import { useState, useTransition } from "react";
import { syncCommissionsNow } from "./actions";

// Manager-triggered affiliate commission recompute (from TMS-delivered orders).
// A safety net so commissions don't depend on the /api/cron scheduler running.
export default function SyncCommissionsButton({ pending: pendingCount = 0 }: { pending?: number }) {
  const [running, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run() {
    setMsg(null);
    startTransition(async () => {
      const r = await syncCommissionsNow();
      setMsg(r.ok ? `✓ ກວດ ${r.scanned} · ເພີ່ມ ${r.created} · ຍົກເລີກ ${r.voided}` : r.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={running}
        className={`relative inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
          pendingCount > 0
            ? "border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400"
            : "border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand-dark"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
        </svg>
        {running ? "ກຳລັງຄິດໄລ່..." : "ຄິດໄລ່ຄອມມິສຊັນ"}
        {pendingCount > 0 && !running && (
          <span className="ml-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{pendingCount}</span>
        )}
      </button>
      {msg && <span className="text-xs font-medium text-slate-500">{msg}</span>}
    </div>
  );
}
