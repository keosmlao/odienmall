"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueRedemption, rejectRedemption } from "@/app/admin/rewards/actions";
import type { ReqWarehouseOptions } from "@/lib/reward-requisition";
import { ADMIN_TRANSPORTS } from "@/lib/admin-shipping-constants";

export default function RedemptionControl({
  id,
  status,
  options,
}: {
  id: number;
  status: string;
  options: ReqWarehouseOptions | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [wh, setWh] = useState(options?.warehouses.find((w) => w.canFulfill)?.whCode ?? "");
  const [transport, setTransport] = useState("");

  if (status === "fulfilled") {
    return <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">ອອກໃບເບີກ + ຈັດສົ່ງແລ້ວ ✓</div>;
  }
  if (status === "rejected") {
    return <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">ຖືກປະຕິເສດ — ແຕ້ມຄືນແລ້ວ</div>;
  }
  if (!options) {
    return (
      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
        ຍັງບໍ່ມີໃບຂໍເບີກໃນ SML (ກວດ SML_DIRECT_WRITE / REWARD_DOC_FORMAT).
      </div>
    );
  }

  function doIssue() {
    if (!wh) return setError("ກະລຸນາເລືອກສາງ");
    if (!transport) return setError("ກະລຸນາເລືອກຂົນສົ່ງ");
    setError(null);
    startTransition(async () => {
      const res = await issueRedemption(id, wh, transport);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }
  function doReject() {
    if (!confirm("ປະຕິເສດການແລກນີ້? ແຕ້ມຈະຄືນໃຫ້ລູກຄ້າ.")) return;
    setError(null);
    startTransition(async () => {
      const res = await rejectRedemption(id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  const chosen = options.warehouses.find((w) => w.whCode === wh);

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">ສາງຈ່າຍ</label>
        <select
          value={wh}
          onChange={(e) => setWh(e.target.value)}
          disabled={pending}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 disabled:opacity-60"
        >
          <option value="">— ເລືອກສາງ —</option>
          {options.warehouses.map((w) => (
            <option key={w.whCode} value={w.whCode} disabled={!w.canFulfill}>
              {w.whName}{w.canFulfill ? "" : " (ສິນຄ້າບໍ່ພໍ)"}
            </option>
          ))}
        </select>
      </div>

      {chosen && (
        <div className="overflow-hidden rounded-lg border border-gray-200 text-xs">
          <table className="w-full">
            <tbody className="divide-y divide-gray-100">
              {chosen.lines.map((l) => (
                <tr key={l.roworder} className={l.ok ? "" : "bg-rose-50"}>
                  <td className="px-3 py-2 text-gray-800">{l.itemName}{l.shelfName ? ` · ${l.shelfName}` : ""}</td>
                  <td className="px-3 py-2 text-right text-gray-600">ຕ້ອງ {l.qty}</td>
                  <td className={`px-3 py-2 text-right font-bold ${l.ok ? "text-emerald-600" : "text-rose-600"}`}>ເຄົງ {l.available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">ຂົນສົ່ງ</label>
        <select
          value={transport}
          onChange={(e) => setTransport(e.target.value)}
          disabled={pending}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 disabled:opacity-60"
        >
          <option value="">— ເລືອກຂົນສົ່ງ —</option>
          {ADMIN_TRANSPORTS.map((t) => (
            <option key={t.code} value={t.code}>{t.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={doIssue}
          disabled={pending || !wh || !transport}
          className="flex-1 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {pending ? "ກຳລັງດຳເນີນ…" : "ອອກໃບເບີກ + ຈັດສົ່ງ"}
        </button>
        <button
          type="button"
          onClick={doReject}
          disabled={pending}
          className="rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
        >
          ປະຕິເສດ
        </button>
      </div>
    </div>
  );
}
