"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DeliveryConfig } from "@/lib/settings";
import { BTN_PRIMARY } from "@/components/admin/ui";
import { saveDeliveryConfig } from "./actions";

export default function DeliveryConfigForm({ initial }: { initial: DeliveryConfig }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [odien, setOdien] = useState(initial.odienEstimate);
  const [thanjai, setThanjai] = useState(initial.thanjaiEstimate);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await saveDeliveryConfig({ odienEstimate: odien, thanjaiEstimate: thanjai });
      if (res.ok) { setSaved(true); router.refresh(); }
      else setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">ໂອດ້ຽນຂົນສົ່ງ</span>
        <input value={odien} onChange={(e) => setOdien(e.target.value)} className="inp w-full" maxLength={60} placeholder="2-3 ວັນ" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">ຂົນສົ່ງທັນໃຈ</span>
        <input value={thanjai} onChange={(e) => setThanjai(e.target.value)} className="inp w-full" maxLength={60} placeholder="1 ວັນ" />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>{pending ? "..." : "ບັນທຶກ"}</button>
        {saved && !error && <span className="text-xs font-medium text-emerald-600">ບັນທຶກແລ້ວ ✓</span>}
        {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
      </div>
    </form>
  );
}
