"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { assignTier } from "@/app/admin/customers/[code]/actions";

interface Tier {
  code: string;
  name: string;
  discountPct: number;
}

// Manager assigns a customer's membership tier (discount % comes from ar_group_sub).
export default function CustomerTierControl({
  customerCode,
  current,
  tiers,
}: {
  customerCode: string;
  current: string | null; // current group_sub code
  tiers: Tier[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function save(next: string) {
    setValue(next);
    setMsg(null);
    startTransition(async () => {
      const res = await assignTier(customerCode, next || null);
      setMsg(res.ok ? "ບັນທຶກແລ້ວ" : res.error);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={value}
        onChange={(e) => save(e.target.value)}
        disabled={pending}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-60"
      >
        <option value="">— ບໍ່ມີ tier —</option>
        {tiers.map((t) => (
          <option key={t.code} value={t.code}>
            {t.name} ({t.discountPct}%)
          </option>
        ))}
      </select>
      {msg && <span className="text-xs text-gray-500">{msg}</span>}
    </div>
  );
}
