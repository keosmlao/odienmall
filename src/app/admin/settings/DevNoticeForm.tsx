"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DevNotice } from "@/lib/settings";
import { BTN_PRIMARY } from "@/components/admin/ui";
import { saveDevNotice } from "./actions";

export default function DevNoticeForm({ initial }: { initial: DevNotice }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [enabled, setEnabled] = useState(initial.enabled);
  const [title, setTitle] = useState(initial.title);
  const [message, setMessage] = useState(initial.message);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveDevNotice({ enabled, title, message });
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
      {/* On/off toggle */}
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold text-gray-800">
            ສະແດງ modal ເຕືອນ
          </span>
          <span className="block text-xs text-gray-500">
            ປ໊ອບອັບຂຶ້ນທຸກຄັ້ງທີ່ມີຄົນເຂົ້າໜ້າຫຼັກ
          </span>
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
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ຫົວຂໍ້</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="inp w-full"
          maxLength={120}
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ຂໍ້ຄວາມ</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="inp w-full"
          rows={4}
          maxLength={500}
          required
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
