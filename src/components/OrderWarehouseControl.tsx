"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOrderWarehouse } from "@/app/admin/actions";
import type { OrderWarehouseOptions } from "@/lib/order-warehouse";
import {
  ADMIN_TRANSPORTS,
  adminTransportLabel,
} from "@/lib/admin-shipping-constants";

// After payment: admin picks ONE warehouse (simple dropdown) and clicks ອອກບິນ —
// which allocates the whole order to that warehouse and issues the SML bill.
export default function OrderWarehouseControl({
  orderNo,
  status,
  options,
}: {
  orderNo: string;
  status: string;
  options: OrderWarehouseOptions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [choice, setChoice] = useState<string>(
    options.selectedWhCode ??
      options.warehouses.find((w) => w.canFulfill)?.whCode ??
      "",
  );
  const [transportCode, setTransportCode] = useState("");

  const issued = ["paid", "shipping", "completed"].includes(status);
  const chosen = options.warehouses.find((w) => w.whCode === choice);

  function run() {
    if (!choice) {
      setError("ກະລຸນາເລືອກສາງ");
      return;
    }
    if (!transportCode) {
      setError("ກະລຸນາເລືອກຂົນສົ່ງ");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await saveOrderWarehouse(orderNo, choice, transportCode);
      if (res.ok) {
        setConfirm(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (status === "pending") {
    return (
      <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
        ລໍຖ້າລູກຄ້າຊຳລະເງິນກ່ອນ ຈຶ່ງອອກບິນໄດ້.
      </p>
    );
  }

  if (issued) {
    const whName =
      options.warehouses.find((w) => w.whCode === options.selectedWhCode)?.whName ??
      options.selectedWhCode;
    return (
      <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        ອອກບິນແລ້ວ ✓{whName ? <> — ຈ່າຍຈາກສາງ <span className="font-semibold">{whName}</span></> : null}
      </div>
    );
  }

  // Both transfer (awaiting_confirmation, paid) and COD (cod) orders are flag 34
  // awaiting allocation + ອອກບິນ (34→44). COD just hasn't collected cash yet.
  if (status !== "awaiting_confirmation" && status !== "cod") {
    return (
      <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
        ອໍເດີຍັງບໍ່ພ້ອມສຳລັບການອອກບິນ.
      </p>
    );
  }

  // trans_flag 34 → pick warehouse + issue
  if (options.warehouses.length === 0) {
    return (
      <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
        ບໍ່ພົບ stock ສະພາບດີໃນສາງສຳລັບລາຍການນີ້
      </p>
    );
  }

  return (
    <div>
      {status === "cod" && (
        <p className="mb-3 rounded-lg bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-700">
          ເກັບເງິນປາຍທາງ (COD) — ຍັງບໍ່ໄດ້ຮັບເງິນ. ເກັບເງິນສົດເມື່ອລູກຄ້າຮັບສິນຄ້າ.
        </p>
      )}
      <label className="mb-1.5 block text-sm font-medium text-gray-700">ສາງຈ່າຍ</label>
      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        disabled={pending}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60"
      >
        <option value="">— ເລືອກສາງ —</option>
        {options.warehouses.map((wh) => (
          <option key={wh.whCode} value={wh.whCode} disabled={!wh.canFulfill}>
            {wh.whName}
            {wh.canFulfill ? "" : " (ສິນຄ້າບໍ່ພໍ)"}
          </option>
        ))}
      </select>
      <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700">
        ຂົນສົ່ງ
      </label>
      <select
        value={transportCode}
        onChange={(event) => setTransportCode(event.target.value)}
        disabled={pending}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60"
      >
        <option value="">— ເລືອກຂົນສົ່ງ —</option>
        {ADMIN_TRANSPORTS.map((transport) => (
          <option key={transport.code} value={transport.code}>
            {transport.label}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-gray-400">
        ລະບົບຈະຢືນຢັນອໍເດີເປັນ 44 ແລະສ້າງລາຍການຂົນສົ່ງ.
      </p>

      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <button
        type="button"
        onClick={() =>
          choice && transportCode
            ? setConfirm(true)
            : setError(!choice ? "ກະລຸນາເລືອກສາງ" : "ກະລຸນາເລືອກຂົນສົ່ງ")
        }
        disabled={pending || !choice || !transportCode}
        className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        ຢືນຢັນການສັ່ງຊື້
      </button>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="ປິດ"
            onClick={() => !pending && setConfirm(false)}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">ຢືນຢັນການສັ່ງຊື້</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              ອໍເດີ <span className="font-semibold text-gray-800">{orderNo}</span>{" "}
              ຈ່າຍຈາກສາງ <span className="font-semibold text-gray-800">{chosen?.whName}</span>,
              ຂົນສົ່ງ <span className="font-semibold text-gray-800">
                {adminTransportLabel(transportCode)}
              </span>{" "}
              ແລະປ່ຽນ SML ຈາກ 34 ເປັນ 44.
            </p>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
              >
                ຍົກເລີກ
              </button>
              <button
                type="button"
                onClick={run}
                disabled={pending}
                className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
              >
                {pending ? "ກຳລັງຢືນຢັນ..." : "ຢືນຢັນການສັ່ງຊື້"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
