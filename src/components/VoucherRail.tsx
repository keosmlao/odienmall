"use client";

import Link from "next/link";
import { useState } from "react";
import type { Voucher } from "@/lib/vouchers";
import { formatKip } from "@/lib/format";

const SAVED_VOUCHER_KEY = "odienmall.checkout.voucher";

function offer(voucher: Voucher) {
  if (voucher.kind === "percent") {
    return `ຫຼຸດ ${voucher.value}%`;
  }
  return `ຫຼຸດ ${formatKip(voucher.value)}`;
}

export default function VoucherRail({ vouchers }: { vouchers: Voucher[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (vouchers.length === 0) return null;

  async function save(code: string) {
    localStorage.setItem(SAVED_VOUCHER_KEY, code);
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Saving for checkout still succeeds when clipboard access is unavailable.
    }
    setCopied(code);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <section className="!mb-4 !p-0">
      <div className="flex items-center justify-between border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-lg font-black text-slate-900">ຄູປ໋ອງສ່ວນຫຼຸດ</h2>
          <p className="text-xs text-slate-500">ກົດເກັບ code ແລ້ວນຳໄປໃຊ້ຕອນ checkout</p>
        </div>
        <span className="rounded bg-orange-500 px-2 py-1 text-[10px] font-black tracking-wider text-white">VOUCHER</span>
      </div>
      <div className="thin-scroll flex gap-3 overflow-x-auto p-3 sm:p-4">
        {vouchers.map((voucher) => (
          <article
            key={voucher.id}
            className="relative flex min-w-[285px] overflow-hidden rounded-sm border border-orange-200 bg-white shadow-sm"
          >
            <div className="grid w-20 shrink-0 place-items-center bg-gradient-to-br from-orange-500 to-rose-500 p-3 text-center text-white">
              <span className="text-xl font-black">{voucher.kind === "percent" ? `${voucher.value}%` : "₭"}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider">OFF</span>
            </div>
            <div className="min-w-0 flex-1 p-3">
              <strong className="block text-base font-black text-orange-600">{offer(voucher)}</strong>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {voucher.minSubtotal > 0
                  ? `ຍອດຂັ້ນຕ່ຳ ${formatKip(voucher.minSubtotal)}`
                  : "ບໍ່ກຳນົດຍອດຂັ້ນຕ່ຳ"}
              </p>
              {voucher.maxDiscount != null && voucher.kind === "percent" && (
                <p className="text-[10px] text-slate-400">ຫຼຸດສູງສຸດ {formatKip(voucher.maxDiscount)}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <code className="rounded bg-orange-50 px-2 py-1 text-xs font-black tracking-wider text-orange-700">
                  {voucher.code}
                </code>
                <button
                  type="button"
                  onClick={() => save(voucher.code)}
                  className="text-xs font-bold text-orange-600 hover:underline"
                >
                  {copied === voucher.code ? "ເກັບແລ້ວ ✓" : "ເກັບ code"}
                </button>
              </div>
            </div>
          </article>
        ))}
        <Link
          href="/products"
          className="flex min-w-40 flex-col items-center justify-center rounded-sm border border-dashed border-orange-200 bg-orange-50/40 p-4 text-center text-orange-600"
        >
          <span className="text-3xl">›</span>
          <strong className="text-xs">ເລືອກສິນຄ້າ</strong>
        </Link>
      </div>
    </section>
  );
}
