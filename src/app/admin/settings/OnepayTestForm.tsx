"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OnepayRuntimeConfig } from "@/lib/settings";
import { BTN_PRIMARY } from "@/components/admin/ui";
import { saveOnepayTestMode } from "./actions";

export default function OnepayTestForm({
  initial,
}: {
  initial: OnepayRuntimeConfig;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initial.testMode);
  const [amount, setAmount] = useState(String(initial.testAmount));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveOnepayTestMode({
        testMode: enabled,
        testAmount: Number(amount),
      });
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold text-gray-800">ເປີດໂໝດທົດສອບ</span>
          <span className="block text-xs leading-5 text-gray-500">
            QR ທີ່ສ້າງໃໝ່ຈະໃຊ້ຍອດທົດສອບ; ຍອດອໍເດີຈິງບໍ່ປ່ຽນ.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((value) => !value)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
            enabled ? "bg-amber-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ຍອດ QR ທົດສອບ (₭)</span>
        <input
          type="number"
          min={1}
          max={100000}
          step={1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={!enabled}
          className="inp w-full disabled:bg-gray-100 disabled:text-gray-400"
        />
      </label>

      {enabled && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
          ໂໝດ TEST ກຳລັງເປີດ: ລູກຄ້າທີ່ສ້າງ QR ໃໝ່ຈະເຫັນຍອດ {Number(amount || 0).toLocaleString()} ₭.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>
          {pending ? "..." : "ບັນທຶກ"}
        </button>
        {saved && <span className="text-xs font-medium text-emerald-600">ບັນທຶກແລ້ວ ✓</span>}
        {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
      </div>
    </form>
  );
}
