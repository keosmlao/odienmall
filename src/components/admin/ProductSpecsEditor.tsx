"use client";

import { useState, useTransition } from "react";
import { saveProductSpec, removeProductSpec } from "@/app/admin/products/actions";
import type { ProductSpec } from "@/lib/products-admin";

export default function ProductSpecsEditor({
  productCode,
  initial,
}: {
  productCode: string;
  initial: ProductSpec[];
}) {
  const [specs, setSpecs] = useState<ProductSpec[]>(initial);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit(s: ProductSpec) {
    setEditId(s.id);
    setEditLabel(s.label);
    setEditValue(s.value);
  }

  function cancelEdit() {
    setEditId(null);
    setEditLabel("");
    setEditValue("");
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveProductSpec(productCode, { label, value, sortOrder: specs.length });
      if (!res.ok) { setError(res.error ?? "ຜິດພາດ"); return; }
      // Reload from server via page refresh pattern
      setSpecs((prev) => [...prev, { id: Date.now(), productCode, label, value, sortOrder: prev.length }]);
      setLabel("");
      setValue("");
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setError(null);
    startTransition(async () => {
      const res = await saveProductSpec(productCode, { id: editId, label: editLabel, value: editValue });
      if (!res.ok) { setError(res.error ?? "ຜິດພາດ"); return; }
      setSpecs((prev) => prev.map((s) => s.id === editId ? { ...s, label: editLabel, value: editValue } : s));
      cancelEdit();
    });
  }

  function remove(id: number) {
    if (!confirm("ລຶບລາຍການນີ້?")) return;
    startTransition(async () => {
      const res = await removeProductSpec(productCode, id);
      if (!res.ok) { setError(res.error ?? "ຜິດພາດ"); return; }
      setSpecs((prev) => prev.filter((s) => s.id !== id));
    });
  }

  return (
    <div className="space-y-3">
      {specs.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
              <th className="pb-1.5 pr-4 w-40">ລາຍການ</th>
              <th className="pb-1.5 pr-4">ຄ່າ</th>
              <th className="pb-1.5 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {specs.map((s) =>
              editId === s.id ? (
                <tr key={s.id}>
                  <td className="py-1.5 pr-2">
                    <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full rounded border border-violet-300 px-2 py-1 text-xs outline-none focus:border-violet-500" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      className="w-full rounded border border-violet-300 px-2 py-1 text-xs outline-none focus:border-violet-500" />
                  </td>
                  <td className="py-1.5">
                    <form onSubmit={save} className="flex gap-1">
                      <button type="submit" disabled={pending} className="rounded bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50">ບັນທຶກ</button>
                      <button type="button" onClick={cancelEdit} className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200">ຍົກເລີກ</button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="group">
                  <td className="py-1.5 pr-4 font-semibold text-slate-700">{s.label}</td>
                  <td className="py-1.5 pr-4 text-slate-600">{s.value}</td>
                  <td className="py-1.5">
                    <span className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => startEdit(s)} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-violet-100 hover:text-violet-700">ແກ້</button>
                      <button onClick={() => remove(s.id)} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-red-100 hover:text-red-600">ລຶບ</button>
                    </span>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}

      <form onSubmit={add} className="flex gap-2 items-end pt-1">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">ລາຍການ</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ຂະໜາດ, ນ້ຳໜັກ, ສີ…"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">ຄ່າ</label>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="185×70×65 cm"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10" />
        </div>
        <button type="submit" disabled={pending || !label.trim() || !value.trim()}
          className="shrink-0 rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-40">
          + ເພີ່ມ
        </button>
      </form>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
