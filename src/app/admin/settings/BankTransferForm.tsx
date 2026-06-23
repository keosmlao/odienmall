"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BankTransfer } from "@/lib/settings";
import { BTN_PRIMARY } from "@/components/admin/ui";
import { saveBankTransfer, uploadBankQr, removeBankQr } from "./actions";

export default function BankTransferForm({ initial }: { initial: BankTransfer }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [bankName, setBankName] = useState(initial.bankName);
  const [accountName, setAccountName] = useState(initial.accountName);
  const [accountNo, setAccountNo] = useState(initial.accountNo);
  const [note, setNote] = useState(initial.note ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveBankTransfer({ bankName, accountName, accountNo, note });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function onUploadQr() {
    const input = fileRef.current;
    if (!input?.files?.length) return;
    setError(null);
    const fd = new FormData();
    fd.set("file", input.files[0]);
    startTransition(async () => {
      const res = await uploadBankQr(fd);
      if (res.ok) {
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function onRemoveQr() {
    startTransition(async () => {
      const res = await removeBankQr();
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* QR image (BCEL / bank) */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
        <span className="mb-2 block text-xs font-medium text-gray-600">QR ໂອນເງິນ (BCEL One)</span>
        {initial.qrUrl ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={initial.qrUrl} alt="QR" className="h-28 w-28 rounded-xl border border-gray-200 bg-white object-contain" />
            <button
              type="button"
              onClick={onRemoveQr}
              disabled={pending}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              ລຶບ QR
            </button>
          </div>
        ) : (
          <p className="mb-2 text-xs text-gray-400">ຍັງບໍ່ມີ QR — ອັບໂຫຼດຮູບ QR ຈາກແອັບ BCEL One.</p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onUploadQr}
          disabled={pending}
          className="mt-2 block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-gray-400">JPG / PNG / WEBP · ສູງສຸດ 3MB</p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ທະນາຄານ</span>
        <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="inp w-full" maxLength={100} placeholder="ເຊັ່ນ: BCEL" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ຊື່ບັນຊີ</span>
        <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className="inp w-full" maxLength={120} placeholder="ຊື່ເຈົ້າຂອງບັນຊີ" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ເລກບັນຊີ</span>
        <input value={accountNo} onChange={(e) => setAccountNo(e.target.value)} className="inp w-full" maxLength={60} placeholder="XXX-XX-XX-XXXXXXXX" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ໝາຍເຫດ (ທາງເລືອກ)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="inp w-full" maxLength={200} placeholder="ເຊັ່ນ: ໂອນແລ້ວສົ່ງສະລິບທາງ WhatsApp" />
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
