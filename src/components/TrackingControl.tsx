"use client";

import { useState, useTransition } from "react";
import { setTrackingNumber } from "@/app/admin/actions";

export default function TrackingControl({
  orderNo,
  initial,
}: {
  orderNo: string;
  initial: { trackingNo: string | null; carrier: string | null } | null;
}) {
  const [trackingNo, setNo] = useState(initial?.trackingNo ?? "");
  const [carrier, setCarrier] = useState(initial?.carrier ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    start(async () => {
      const res = await setTrackingNumber(orderNo, trackingNo.trim(), carrier.trim());
      if (res.ok) setSaved(true);
      else setError(res.error ?? "ຜິດພາດ");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">ຜູ້ຂົນສົ່ງ</label>
          <input
            value={carrier}
            onChange={(e) => { setCarrier(e.target.value); setSaved(false); }}
            placeholder="ຕ.ຢ. ໂອດ້ຽນຂົນສົ່ງ"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">ເລກພັດສະດຸ</label>
          <input
            value={trackingNo}
            onChange={(e) => { setNo(e.target.value); setSaved(false); }}
            placeholder="ຕ.ຢ. TH-2024-000123"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
        >
          {pending ? "..." : "ບັນທຶກ"}
        </button>
        {saved && <span className="text-xs font-semibold text-emerald-600">ບັນທຶກແລ້ວ ✓</span>}
        {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
      </div>
    </form>
  );
}
