"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveRate, removeRate } from "./actions";

// Edit the single default commission rate.
export function DefaultRateForm({ current }: { current: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState(String(current));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveRate({ scope: "default", ratePct: Number(rate) });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="mb-1 block text-xs text-gray-500">ອັດຕາເລີ່ມຕົ້ນ (%)</span>
        <input
          type="number"
          step="0.001"
          min="0"
          max="100"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="inp w-32"
          required
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "..." : "ບັນທຶກ"}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </form>
  );
}

// Add (or overwrite) a category / product rate override.
export function AddRateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"category" | "brand" | "product">("category");
  const [refKey, setRefKey] = useState("");
  const scopeLabel = scope === "category" ? "ໝວດ" : scope === "brand" ? "ຍີ່ຫໍ້" : "ສິນຄ້າ";
  const [rate, setRate] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveRate({ scope, refKey, ratePct: Number(rate) });
      if (res.ok) {
        setRefKey("");
        setRate("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="mb-1 block text-xs text-gray-500">ປະເພດ</span>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as "category" | "brand" | "product")}
          className="inp w-32"
        >
          <option value="category">ໝວດ</option>
          <option value="brand">ຍີ່ຫໍ້</option>
          <option value="product">ສິນຄ້າ</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-gray-500">ລະຫັດ{scopeLabel}</span>
        <input
          value={refKey}
          onChange={(e) => setRefKey(e.target.value)}
          className="inp w-40"
          placeholder={`ລະຫັດ${scopeLabel}`}
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-gray-500">ອັດຕາ (%)</span>
        <input
          type="number"
          step="0.001"
          min="0"
          max="100"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="inp w-28"
          required
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "..." : "ເພີ່ມ / ແກ້ໄຂ"}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </form>
  );
}

export function RateDeleteButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function del() {
    startTransition(async () => {
      const res = await removeRate(id);
      if (res.ok) router.refresh();
    });
  }

  return (
    <button
      onClick={del}
      disabled={pending}
      className="rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
    >
      ລຶບ
    </button>
  );
}
