"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useRef } from "react";
import { adminConfirmPayment, pollOrderPaymentStatus } from "@/app/admin/actions";
import { adminUploadSlip } from "@/app/admin/orders/new/actions";

// Admin order-detail control for a PENDING transfer order: attach the customer's
// transfer slip, then confirm payment (marks paid + materialises to SML).
export default function PendingPaymentControl({ orderNo, initialSlip }: { orderNo: string; initialSlip?: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slipUrl, setSlipUrl] = useState<string | null>(initialSlip ?? null);
  const [slipUploading, setSlipUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect when BCEL callback arrives and updates the DB — refresh the page
  // so the admin sees the new status without needing to manually reload.
  const refreshedRef = useRef(false);
  useEffect(() => {
    const id = setInterval(async () => {
      if (refreshedRef.current) return;
      const res = await pollOrderPaymentStatus(orderNo);
      if (res.status === "paid") {
        refreshedRef.current = true;
        router.refresh();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [orderNo, router]);

  async function onSlip(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSlipUploading(true);
    const fd = new FormData();
    fd.append("slip", file);
    const res = await adminUploadSlip(orderNo, fd);
    setSlipUploading(false);
    if (res.ok) setSlipUrl(res.url);
    else setError(res.error);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await adminConfirmPayment(orderNo);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="mb-1.5 block text-xs font-semibold text-gray-500">ສະລິບການໂອນ</span>
        {slipUrl ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slipUrl} alt="slip" className="h-16 w-16 rounded object-cover" />
            <a href={slipUrl} target="_blank" rel="noreferrer" className="flex-1 text-xs font-bold text-emerald-700 underline">ເບິ່ງສະລິບ</a>
            <label className="shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600">
              ປ່ຽນ<input type="file" accept="image/*" onChange={onSlip} className="hidden" />
            </label>
          </div>
        ) : (
          <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-3 text-xs font-bold text-slate-500 hover:border-brand hover:text-brand-dark ${slipUploading ? "opacity-60" : ""}`}>
            {slipUploading ? "ກຳລັງອັບໂຫຼດ..." : "📎 ແນບສະລິບທີ່ລູກຄ້າໂອນ"}
            <input type="file" accept="image/*" onChange={onSlip} disabled={slipUploading} className="hidden" />
          </label>
        )}
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <button
        type="button"
        onClick={confirm}
        disabled={pending}
        className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "ກຳລັງຢືນຢັນ..." : "✓ ຢືນຢັນຮັບເງິນແລ້ວ"}
      </button>
      <p className="text-[11px] leading-relaxed text-gray-400">ກວດຍອດໃນບັນຊີ BCEL ກ່ອນ — ກົດແລ້ວອໍເດີຈະປ່ຽນເປັນ “ຊຳລະແລ້ວ” ແລະ ບັນທຶກເຂົ້າ SML.</p>
    </div>
  );
}
