"use client";

import { useState, useTransition } from "react";
import type { OrderSummary } from "@/lib/orders";
import { submitReturnAction } from "./actions";

const REASONS = [
  "ສິນຄ້າຊຳຫຼຸດ / ບົກພ່ອງ",
  "ສິນຄ້າບໍ່ຕົງຕາມທີ່ສັ່ງ",
  "ຈຳນວນບໍ່ຄົບ",
  "ໄດ້ຮັບສິນຄ້າຜິດ",
  "ປ່ຽນໃຈ",
  "ອື່ນໆ",
];

interface Props {
  orders: OrderSummary[];
  customerCode: string;
}

export default function ReturnForm({ orders }: Props) {
  const [open, setOpen] = useState(false);
  const [orderNo, setOrderNo] = useState(orders[0]?.orderNo ?? "");
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  const [result, setResult] = useState<{ ok: true } | { ok: false; error: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await submitReturnAction(orderNo, reason, detail);
      setResult(res);
      if (res.ok) {
        setOrderNo(orders[0]?.orderNo ?? "");
        setReason(REASONS[0]);
        setDetail("");
        setOpen(false);
      }
    });
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">ຍື່ນຄຳຮ້ອງໃໝ່</h2>
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); setResult(null); }}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {open ? "ປິດ" : "+ ຍື່ນຄຳຮ້ອງ"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">ເລກອໍເດີ</label>
            {orders.length === 0 ? (
              <p className="text-xs text-gray-500">ບໍ່ມີອໍເດີທີ່ສາມາດຍື່ນຄຳຮ້ອງໄດ້</p>
            ) : (
              <select
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              >
                {orders.map((o) => (
                  <option key={o.orderNo} value={o.orderNo}>
                    {o.orderNo} — {o.status}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">ເຫດຜົນ</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              ລາຍລະອຽດເພີ່ມເຕີມ <span className="font-normal text-gray-400">(ທາງເລືອກ)</span>
            </label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder="ອະທິບາຍລາຍລະອຽດເພີ່ມເຕີມ..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none resize-none"
            />
          </div>

          {result && !result.ok && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{result.error}</p>
          )}

          <button
            type="submit"
            disabled={isPending || orders.length === 0}
            className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "ກຳລັງສົ່ງ..." : "ສົ່ງຄຳຮ້ອງ"}
          </button>
        </form>
      )}

      {result?.ok && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          ສົ່ງຄຳຮ້ອງສຳເລັດແລ້ວ — ທີມງານຈະຕິດຕໍ່ກັບໃຈໄວໆ
        </p>
      )}
    </div>
  );
}
