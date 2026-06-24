"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AiLogRow } from "@/lib/ai-logs";
import { cleanupAiLogs } from "./actions";

export default function ChatBotLogs({ logs }: { logs: AiLogRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function cleanup() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await cleanupAiLogs(30);
      if (res.ok) {
        setMessage(`ລ້າງ log ເກົ່າແລ້ວ ${res.count} ແຖວ`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-black text-slate-800">AI recent logs</p>
          <p className="text-xs text-slate-500">
            redacted logs — ປິດບັງເບີໂທ/ອີເມວ/order/token ແລະ ບໍ່ສະແດງ API key
          </p>
        </div>
        <button
          type="button"
          onClick={cleanup}
          disabled={pending}
          className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
        >
          {pending ? "ກຳລັງລ້າງ..." : "ລ້າງ log ເກົ່າ >30 ມື້"}
        </button>
      </div>
      {(message || error) && (
        <p className={`mb-3 rounded-xl px-3 py-2 text-xs font-semibold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
          {error ?? message}
        </p>
      )}
      {logs.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
          ຍັງບໍ່ມີ AI log.
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className={`rounded-xl border p-3 text-xs leading-5 ${l.ok ? "border-emerald-100 bg-emerald-50/60" : "border-rose-100 bg-rose-50/70"}`}>
              <div className="flex flex-wrap gap-2 font-black text-slate-700">
                <span>{l.ok ? "OK" : "FAIL"}</span>
                <span>{l.event}</span>
                <span>{l.provider ?? "none"}</span>
                <span>{l.model ?? "—"}</span>
                {l.threadId != null && <span>thread #{l.threadId}</span>}
                {l.latencyMs != null && <span>{l.latencyMs}ms</span>}
                <span>{new Date(l.createdAt).toLocaleString("lo-LA")}</span>
              </div>
              {l.error && <p className="mt-1 font-semibold text-rose-700">{l.error}</p>}
              {l.prompt && <p className="mt-1 truncate text-slate-500">Q: {l.prompt}</p>}
              {l.reply && <p className="mt-1 line-clamp-2 text-slate-600">A: {l.reply}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
