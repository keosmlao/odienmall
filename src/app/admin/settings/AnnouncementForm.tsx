"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Announcement } from "@/lib/settings";
import { BTN_PRIMARY } from "@/components/admin/ui";
import { saveAnnouncement } from "./actions";

export default function AnnouncementForm({ initial }: { initial: Announcement }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [enabled, setEnabled] = useState(initial.enabled);
  const [message, setMessage] = useState(initial.message);
  const [link, setLink] = useState(initial.link ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveAnnouncement({ enabled, message, link });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold text-gray-800">ສະແດງແຖບປະກາດ</span>
          <span className="block text-xs text-gray-500">ສະແດງເທິງສຸດທຸກໜ້າຂອງໜ້າຮ້ານ</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
            enabled ? "bg-brand" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ຂໍ້ຄວາມ</span>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="inp w-full"
          maxLength={200}
          placeholder="ເຊັ່ນ: ສົ່ງຟຣີທົ່ວນະຄອນຫຼວງວຽງຈັນ"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ລິ້ງ (ທາງເລືອກ — ເສັ້ນທາງພາຍໃນ)</span>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="inp w-full"
          maxLength={200}
          placeholder="/products"
        />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>
          {pending ? "..." : "ບັນທຶກ"}
        </button>
        {saved && !error && <span className="text-xs font-medium text-emerald-600">ບັນທຶກແລ້ວ ✓</span>}
        {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
      </div>
    </form>
  );
}
