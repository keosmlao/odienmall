"use client";

import { useState, useTransition } from "react";
import { importProductOverlays } from "./actions";

interface ImportRow {
  code: string;
  status: "ok" | "error" | "skip";
  message: string;
}

export default function ImportForm() {
  const [csv, setCsv] = useState("");
  const [results, setResults] = useState<ImportRow[] | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResults(null);
    start(async () => {
      const res = await importProductOverlays(csv);
      setResults(res.rows);
    });
  }

  const ok = results?.filter((r) => r.status === "ok").length ?? 0;
  const err = results?.filter((r) => r.status === "error").length ?? 0;
  const skip = results?.filter((r) => r.status === "skip").length ?? 0;

  return (
    <div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-bold text-slate-700">ວາງ CSV ທີ່ນີ້</label>
          <textarea
            value={csv}
            onChange={(e) => { setCsv(e.target.value); setResults(null); }}
            rows={12}
            placeholder={"code,description,price_note\nABC001,\"ຄຳອະທິບາຍ\",\nABC002,,ສອບຖາມລາຄາ 020-XXXX"}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-xs text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !csv.trim()}
          className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          {pending ? "ກຳລັງ import..." : "Import"}
        </button>
      </form>

      {results && (
        <div className="mt-6">
          <div className="mb-3 flex gap-4 text-sm">
            <span className="font-bold text-emerald-600">✓ {ok} ສຳເລັດ</span>
            {err > 0 && <span className="font-bold text-red-600">✕ {err} ລົ້ມເຫລວ</span>}
            {skip > 0 && <span className="font-bold text-gray-400">— {skip} ຂ້າມ</span>}
          </div>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Code</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">ສະຖານະ</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">ລາຍລະອຽດ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {results.map((r, i) => (
                  <tr key={i} className={r.status === "error" ? "bg-red-50" : r.status === "skip" ? "bg-gray-50" : ""}>
                    <td className="px-3 py-1.5 font-mono">{r.code}</td>
                    <td className="px-3 py-1.5">
                      <span className={
                        r.status === "ok" ? "text-emerald-600 font-bold" :
                        r.status === "error" ? "text-red-600 font-bold" :
                        "text-gray-400"
                      }>
                        {r.status === "ok" ? "✓" : r.status === "error" ? "✕" : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-600">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
