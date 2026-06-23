"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCodEnabled } from "./actions";

// Manager toggle: offer cash-on-delivery at checkout. Saves immediately on flip.
export default function CodToggleForm({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveCodEnabled(next);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setEnabled(!next); // revert on failure
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold text-gray-800">ເປີດໃຫ້ເກັບເງິນປາຍທາງ (COD)</span>
          <span className="block text-xs leading-5 text-gray-500">
            ເມື່ອປິດ ລູກຄ້າຈະເຫັນສະເພາະການໂອນຜ່ານ BCEL ຢູ່ໜ້າຊຳລະ.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggle}
          disabled={pending}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
            enabled ? "bg-orange-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>
      <p className={`rounded-lg px-3 py-2 text-xs leading-5 ${enabled ? "bg-orange-50 text-orange-700" : "bg-gray-50 text-gray-500"}`}>
        {enabled ? "COD ກຳລັງເປີດ — ລູກຄ້າເລືອກຈ່າຍປາຍທາງໄດ້." : "COD ປິດຢູ່ — ມີສະເພາະການໂອນເງິນ."}
        {saved && <span className="ml-2 font-medium text-emerald-600">ບັນທຶກແລ້ວ ✓</span>}
        {error && <span className="ml-2 font-medium text-rose-600">{error}</span>}
      </p>
    </div>
  );
}
