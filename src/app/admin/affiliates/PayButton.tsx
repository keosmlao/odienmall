"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { payCommission } from "./actions";
import { formatKip } from "@/lib/format";

export default function PayButton({ code, earned }: { code: string; earned: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const disabled = earned <= 0;

  function pay() {
    if (disabled) return;
    if (!confirm(`ຢືນຢັນຈ່າຍຄ່ານາຍໜ້າ ${formatKip(earned)}?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await payCommission(code);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div>
      <button
        onClick={pay}
        disabled={pending || disabled}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {pending ? "ກຳລັງຈ່າຍ..." : `ຈ່າຍຄ່ານາຍໜ້າ (${formatKip(earned)})`}
      </button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
