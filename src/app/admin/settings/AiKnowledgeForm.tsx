"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BTN_PRIMARY } from "@/components/admin/ui";
import { saveAiKnowledge } from "./actions";

type AiKnowledge = {
  enabled: boolean;
  content: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

export default function AiKnowledgeForm({ initial }: { initial: AiKnowledge }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [content, setContent] = useState(initial.content);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await saveAiKnowledge({ enabled, content });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-violet-100 bg-violet-50/40 p-3 sm:p-4">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-black text-slate-800">AI extra knowledge</span>
          <span className="block text-xs leading-5 text-slate-500">
            ໃສ່ FAQ/ນະໂຍບາຍ/ໂປຣໂມຊັນພິເສດ. AI ຈະໃຊ້ຂໍ້ມູນນີ້ເມື່ອຕອບລູກຄ້າ.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${enabled ? "bg-violet-600" : "bg-gray-300"}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </label>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={8}
        maxLength={12000}
        placeholder={`ຕົວຢ່າງ:\n- ຖ້າລູກຄ້າຖາມຮັບປະກັນ: ໃຫ້ບອກວ່າຂຶ້ນກັບແຕ່ລະຍີ່ຫໍ້ ແລະສົ່ງຕໍ່ພະນັກງານ.\n- ໂປຣໂມຊັນເດືອນນີ້: ...`}
        className="mt-4 w-full rounded-xl border border-violet-100 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-500">
          {content.length.toLocaleString("en-US")} / 12,000
          {initial.updatedAt && (
            <span className="ml-2 text-slate-400" suppressHydrationWarning>
              ອັບເດດ: {new Date(initial.updatedAt).toLocaleString("lo-LA")}
            </span>
          )}
        </p>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={BTN_PRIMARY}>
            {pending ? "..." : "ບັນທຶກ AI knowledge"}
          </button>
          {saved && !error && <span className="text-xs font-medium text-emerald-600">ບັນທຶກແລ້ວ ✓</span>}
          {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
        </div>
      </div>
    </form>
  );
}
