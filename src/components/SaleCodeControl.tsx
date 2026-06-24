"use client";

import { useState, useTransition } from "react";
import { updateOrderSaleCode } from "@/app/admin/actions";

// Inline salesperson (ພະນັກງານຂາຍ) picker on the admin order detail. Defaults to
// read-only display of the current salesperson; click "ປ່ຽນ" to choose another
// from the pool and save. Persists to the order snapshot and, for materialised
// orders (with SML direct-write on), to ic_trans.sale_code.
export default function SaleCodeControl({
  orderNo,
  saleCode,
  saleName,
  salespeople,
  canEdit = true,
}: {
  orderNo: string;
  saleCode: string | null;
  saleName: string | null;
  salespeople: { code: string; name: string }[];
  /** Only managers can reassign the salesperson; staff see it read-only. */
  canEdit?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(saleCode ?? "");
  const [savedName, setSavedName] = useState(saleName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateOrderSaleCode(orderNo, code || null);
      if (res.ok) {
        setSavedName(res.name);
        setEditing(false);
      } else {
        setError(res.error);
      }
    });
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="font-medium text-gray-800">{savedName ?? "— ບໍ່ໄດ້ກຳນົດ —"}</span>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-bold text-brand-dark hover:underline"
          >
            ປ່ຽນ
          </button>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <select
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={pending}
        className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
      >
        <option value="">— ບໍ່ກຳນົດ —</option>
        {/* Keep the current value selectable even if it's not in the pool. */}
        {saleCode && !salespeople.some((s) => s.code === saleCode) && (
          <option value={saleCode}>{saleName ?? saleCode}</option>
        )}
        {salespeople.map((s) => (
          <option key={s.code} value={s.code}>{s.name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="rounded-lg bg-brand px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
      >
        {pending ? "..." : "ບັນທຶກ"}
      </button>
      <button
        type="button"
        onClick={() => { setEditing(false); setCode(saleCode ?? ""); }}
        disabled={pending}
        className="text-xs font-bold text-gray-400 hover:text-gray-600"
      >
        ຍົກເລີກ
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
