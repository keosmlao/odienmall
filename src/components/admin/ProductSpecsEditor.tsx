"use client";

import { useState, useTransition, useRef } from "react";
import {
  saveProductSpec,
  removeProductSpec,
  clearProductSpecsAction,
  bulkImportSpecsAction,
} from "@/app/admin/products/actions";
import type { ProductSpec } from "@/lib/products-admin";

function parseErpLines(text: string): { label: string; value: string }[] {
  return text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.+?)\s*:\s*(.+)$/);
      return m ? { label: m[1].trim(), value: m[2].trim() } : { label: "", value: l };
    });
}

export default function ProductSpecsEditor({
  productCode,
  initial,
  erpDescription,
}: {
  productCode: string;
  initial: ProductSpec[];
  erpDescription?: string;
}) {
  const [specs, setSpecs] = useState<ProductSpec[]>(initial);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const valueRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);

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

  function add() {
    if (!value.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await saveProductSpec(productCode, { label, value, sortOrder: specs.length });
      if (!res.ok) { setError(res.error ?? "ຜິດພາດ"); return; }
      setSpecs((prev) => [...prev, { id: Date.now(), productCode, label, value, sortOrder: prev.length }]);
      setLabel("");
      setValue("");
      labelRef.current?.focus();
    });
  }

  function handleLabelKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      valueRef.current?.focus();
    }
  }

  function handleValueKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  function saveEdit(e: React.FormEvent) {
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

  function handleClear() {
    if (!confirm(`ລ້າງ ${specs.length} ລາຍການ?`)) return;
    startTransition(async () => {
      const res = await clearProductSpecsAction(productCode);
      if (!res.ok) { setError(res.error ?? "ຜິດພາດ"); return; }
      setSpecs([]);
    });
  }

  function handlePullErp() {
    if (!erpDescription?.trim()) return;
    const rows = parseErpLines(erpDescription);
    if (!rows.length) return;
    if (specs.length > 0 && !confirm(`ແທນທີ່ ${specs.length} ລາຍການທີ່ມີ?`)) return;
    startTransition(async () => {
      const res = await bulkImportSpecsAction(productCode, rows);
      if (!res.ok) { setError(res.error ?? "ຜິດພາດ"); return; }
      setSpecs(rows.map((r, i) => ({ id: Date.now() + i, productCode, label: r.label, value: r.value, sortOrder: i })));
    });
  }

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500 font-semibold">
          {specs.length > 0 ? `${specs.length} ລາຍການ` : "ຍັງບໍ່ມີ"}
          {specs.length === 0 && erpDescription?.trim() && (
            <span className="ml-1 text-slate-400">· ໃຊ້ຂໍ້ຄວາມ ERP ຕາມເດີມ</span>
          )}
        </span>
        <div className="flex gap-2">
          {erpDescription?.trim() && (
            <button
              type="button"
              onClick={handlePullErp}
              disabled={pending}
              className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-40"
            >
              ດຶງຈາກ ERP
            </button>
          )}
          {specs.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={pending}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-40"
            >
              ລ້າງ
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {specs.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-400">
              <th className="pb-1.5 pr-2 w-8">#</th>
              <th className="pb-1.5 pr-4 w-36">ຫົວຂໍ້</th>
              <th className="pb-1.5 pr-4">ລາຍລະອຽດ</th>
              <th className="pb-1.5 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {specs.map((s, idx) =>
              editId === s.id ? (
                <tr key={s.id}>
                  <td className="py-1.5 pr-2 text-xs text-slate-300">{idx + 1}</td>
                  <td className="py-1.5 pr-2">
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full rounded border border-violet-300 px-2 py-1 text-xs outline-none focus:border-violet-500"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full rounded border border-violet-300 px-2 py-1 text-xs outline-none focus:border-violet-500"
                    />
                  </td>
                  <td className="py-1.5">
                    <form onSubmit={saveEdit} className="flex gap-1">
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        ບັນທຶກ
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        ຍົກເລີກ
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="group">
                  <td className="py-1.5 pr-2 text-xs text-slate-300">{idx + 1}</td>
                  <td className="py-1.5 pr-4 font-semibold text-slate-600">{s.label || <span className="text-slate-300">—</span>}</td>
                  <td className="py-1.5 pr-4 text-slate-700">{s.value}</td>
                  <td className="py-1.5">
                    <span className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => startEdit(s)}
                        className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-violet-100 hover:text-violet-700"
                      >
                        ແກ້
                      </button>
                      <button
                        onClick={() => remove(s.id)}
                        className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-red-100 hover:text-red-600"
                      >
                        ລຶບ
                      </button>
                    </span>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}

      {/* Add row */}
      <div className="flex gap-2 items-end pt-1">
        <div className="w-36 shrink-0">
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">ຫົວຂໍ້</label>
          <input
            ref={labelRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleLabelKeyDown}
            placeholder="ຂະໜາດ, ນ້ຳໜັກ…"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">ລາຍລະອຽດ</label>
          <input
            ref={valueRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleValueKeyDown}
            placeholder="185×70×65 cm"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
          />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={pending || !value.trim()}
          className="shrink-0 rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
        >
          + ເພີ່ມ
        </button>
      </div>
      <p className="text-[10px] text-slate-400">
        Enter ທີ່ ຫົວຂໍ້ → ໄປ ລາຍລະອຽດ · Enter ທີ່ ລາຍລະອຽດ = ເພີ່ມແຖວ · ປ່ອຍວ່າງໝົດ = ໃຊ້ຂໍ້ຄວາມ ERP
      </p>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
