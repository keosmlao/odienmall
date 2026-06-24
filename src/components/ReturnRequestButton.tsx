"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestReturn, myReturn } from "@/app/(shop)/order/[orderNo]/return-actions";

const REASONS = ["ສິນຄ້າຊຳລຸດ/ເສຍຫາຍ", "ໄດ້ຮັບຜິດລາຍການ", "ບໍ່ກົງກັບຄຳອະທິບາຍ", "ບໍ່ຕ້ອງການແລ້ວ", "ອື່ນໆ"];
const STATUS_LABEL: Record<string, string> = {
  pending: "ລໍຖ້າກວດສອບ",
  approved: "ອະນຸມັດແລ້ວ",
  rejected: "ປະຕິເສດ",
  refunded: "ຄືນເງິນແລ້ວ",
};

// Shows the current return state for an order, or a button+form to request one.
// Only meaningful for the logged-in owner of a paid/shipping/completed order.
export default function ReturnRequestButton({ orderNo }: { orderNo: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ status: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    myReturn(orderNo).then((r) => {
      if (alive) {
        setState(r ? { status: r.status } : null);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [orderNo]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await requestReturn(orderNo, reason, detail);
      if (res.ok) {
        setOpen(false);
        setState({ status: "pending" });
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (!loaded) return null;

  if (state) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm">
        <span className="font-semibold text-amber-700">ຄຳຮ້ອງຄືນສິນຄ້າ: {STATUS_LABEL[state.status] ?? state.status}</span>
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-rose-300 hover:text-rose-600"
        >
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8" /></svg>
          ຮ້ອງຂໍຄືນສິນຄ້າ / ຄືນເງິນ
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-bold text-gray-900">ຮ້ອງຂໍຄືນສິນຄ້າ</p>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand">
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            placeholder="ລາຍລະອຽດເພີ່ມເຕີມ (ທາງເລືອກ)"
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} disabled={pending} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100">ຍົກເລີກ</button>
            <button type="button" onClick={submit} disabled={pending} className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">
              {pending ? "ກຳລັງສົ່ງ..." : "ສົ່ງຄຳຮ້ອງ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
