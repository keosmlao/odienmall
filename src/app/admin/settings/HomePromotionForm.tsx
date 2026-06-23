"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { HomePromotion } from "@/lib/settings";
import { BTN_PRIMARY } from "@/components/admin/ui";
import { saveHomePromotion } from "./actions";

function localDateTime(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function HomePromotionForm({ initial }: { initial: HomePromotion }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [title, setTitle] = useState(initial.title);
  const [endsAt, setEndsAt] = useState(localDateTime(initial.endsAt));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const iso = endsAt ? new Date(endsAt).toISOString() : "";
      const result = await saveHomePromotion({ enabled, title, endsAt: iso });
      if (result.ok) {
        setMessage("ບັນທຶກແລ້ວ ✓");
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold text-gray-800">ເປີດ Flash Sale</span>
          <span className="block text-xs text-gray-500">ສະແດງສິນຄ້າ ERP ທີ່ຖືກໝາຍເປັນໂປຣໂມຊັນ</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((value) => !value)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
            enabled ? "bg-brand" : "bg-gray-300"
          }`}
        >
          <span className={`h-5 w-5 rounded-full bg-white shadow transition ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`} />
        </button>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ຊື່ໂປຣໂມຊັນ</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="inp" maxLength={80} />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ວັນ ແລະ ເວລາສິ້ນສຸດ</span>
        <input
          type="datetime-local"
          value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)}
          className="inp"
        />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>
          {pending ? "..." : "ບັນທຶກ"}
        </button>
        {message && <span className="text-xs font-medium text-gray-500">{message}</span>}
      </div>
    </form>
  );
}
