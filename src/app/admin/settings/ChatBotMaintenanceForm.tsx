"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetChatBotHandovers } from "./actions";

export default function ChatBotMaintenanceForm({ handoffCount }: { handoffCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetAll() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await resetChatBotHandovers();
      if (res.ok) {
        setMessage(`reset ແລ້ວ ${res.count} thread`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-800">AI handover threads</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            ມີ <span className="font-black text-slate-800">{handoffCount}</span> thread ທີ່ AI ຖືກປິດເພາະພະນັກງານຮັບຊ່ວງແລ້ວ.
          </p>
        </div>
        <button
          type="button"
          onClick={resetAll}
          disabled={pending || handoffCount === 0}
          className="min-h-11 rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-black text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "ກຳລັງ reset..." : "Reset AI ທັງໝົດ"}
        </button>
      </div>
      {(message || error) && (
        <p className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
          {error ?? message}
        </p>
      )}
    </div>
  );
}
