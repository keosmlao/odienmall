"use client";

import { useState, useTransition } from "react";
import { addAcSet, searchCandidates } from "./actions";
import type { AcCandidate } from "@/lib/products-admin";
import { formatKip } from "@/lib/format";

function CandidatePicker({
  suffix,
  label,
  name,
  value,
  onChange,
}: {
  suffix: "[C]" | "[H]";
  label: string;
  name: string;
  value: AcCandidate | null;
  onChange: (c: AcCandidate | null) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AcCandidate[]>([]);
  const [open, setOpen] = useState(false);

  async function search(text: string) {
    setQ(text);
    if (text.length < 2) { setResults([]); return; }
    const r = await searchCandidates(suffix, text);
    setResults(r);
    setOpen(true);
  }

  return (
    <div className="relative flex-1">
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      {value ? (
        <div className="flex items-center gap-2 rounded border border-green-300 bg-green-50 px-3 py-2 text-xs">
          <span className="font-mono font-bold text-gray-700">{value.code}</span>
          <span className="min-w-0 flex-1 truncate text-gray-600">{value.name}</span>
          {value.price && <span className="shrink-0 text-gray-500">{formatKip(value.price)}</span>}
          <button type="button" onClick={() => onChange(null)} className="shrink-0 text-rose-500 hover:text-rose-700">✕</button>
        </div>
      ) : (
        <input
          type="text"
          placeholder={`ຄົ້ນຫາ ${label}...`}
          value={q}
          onChange={(e) => search(e.target.value)}
          onFocus={() => q.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="inp w-full !py-2 !text-xs"
        />
      )}
      <input type="hidden" name={name} value={value?.code ?? ""} />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
          {results.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                onMouseDown={() => { onChange(c); setOpen(false); setQ(""); setResults([]); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-orange-50"
              >
                <span className="font-mono font-bold text-gray-700 shrink-0">{c.code}</span>
                <span className="min-w-0 flex-1 truncate text-gray-600">{c.name}</span>
                <span className="shrink-0 text-gray-400">{c.stock > 0 ? `${c.stock} ໜ່ວຍ` : "ໝົດ"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AcSetForm() {
  const [pending, startTransition] = useTransition();
  const [codeC, setCodeC] = useState<AcCandidate | null>(null);
  const [codeH, setCodeH] = useState<AcCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addAcSet(formData);
      if (res?.error) { setError(res.error); return; }
      setCodeC(null);
      setCodeH(null);
    });
  }

  return (
    <form action={submit} className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
      <p className="mb-3 text-sm font-semibold text-gray-700">ເພີ່ມຊຸດໃໝ່</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <CandidatePicker suffix="[C]" label="Indoor [C]" name="code_c" value={codeC} onChange={setCodeC} />
        <div className="flex items-end pb-2 text-gray-400 text-lg font-bold sm:pb-2.5">+</div>
        <CandidatePicker suffix="[H]" label="Outdoor [H]" name="code_h" value={codeH} onChange={setCodeH} />
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={pending || !codeC || !codeH}
        className="mt-3 rounded bg-orange-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-600 disabled:opacity-40"
      >
        {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກຊຸດ"}
      </button>
    </form>
  );
}
