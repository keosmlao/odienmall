"use client";

import { useState, useTransition } from "react";
import { saveShortDescription } from "../actions";
import { BTN_PRIMARY } from "@/components/admin/ui";

export default function ShortDescriptionForm({
  code,
  initial,
}: {
  code: string;
  initial: string | null;
}) {
  const [text, setText] = useState(initial ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await saveShortDescription(code, text);
      if (res.ok) setSaved(true);
      else setError(res.error ?? "ຜິດພາດ");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved(false); }}
        rows={3}
        maxLength={500}
        placeholder="ຄຳອະທິບາຍຫຍໍ້ (1-3 ແຖວ, ສະແດງໃກ້ລາຄາ)"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold leading-6 text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>
          {pending ? "..." : "ບັນທຶກ"}
        </button>
        <span className="text-xs text-slate-400">{text.length}/500</span>
        {saved && <span className="text-xs font-semibold text-emerald-600">ບັນທຶກແລ້ວ ✓</span>}
        {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
      </div>
    </form>
  );
}
