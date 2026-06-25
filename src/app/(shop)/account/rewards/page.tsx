import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getMyRedemptions,
  getAvailablePoints,
  getCustomerPointBalance,
  REDEMPTION_STATUS_LABEL,
} from "@/lib/rewards";

export const metadata: Metadata = { title: "ປະຫວັດການແລກລາງວັນ" };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  fulfilled: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-600",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default async function AccountRewardsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account/rewards");

  const [items, available, balance] = await Promise.all([
    getMyRedemptions(session.code),
    getAvailablePoints(session.code),
    getCustomerPointBalance(session.code),
  ]);
  const reserved = balance - available;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-800">ປະຫວັດການແລກລາງວັນ</h1>
        <Link href="/rewards" className="text-xs font-bold text-orange-600 hover:underline">
          ແລກລາງວັນເພີ່ມ ›
        </Link>
      </div>

      {/* Points summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-4 text-white">
          <p className="text-[10px] font-semibold text-orange-100">ໃຊ້ໄດ້</p>
          <p className="text-2xl font-black tabular-nums">{available.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <p className="text-[10px] font-semibold text-slate-400">ທັງໝົດ</p>
          <p className="text-2xl font-black tabular-nums text-slate-700">{balance.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <p className="text-[10px] font-semibold text-slate-400">ຈອງໄວ້</p>
          <p className="text-2xl font-black tabular-nums text-slate-700">{reserved.toLocaleString()}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
          ຍັງບໍ່ມີການແລກລາງວັນ
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{r.rewardName}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                  {fmtDate(r.createdAt)} · ⭐ {r.pointsSpent.toLocaleString()} ແຕ້ມ
                  {r.freeQty != null && r.unitCode ? ` · 🎁 ${r.freeQty} ${r.unitCode}` : ""}
                </p>
                {r.note && <p className="mt-0.5 text-[11px] text-slate-500">{r.note}</p>}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${STATUS_STYLE[r.status] ?? "bg-slate-100 text-slate-500"}`}
              >
                {REDEMPTION_STATUS_LABEL[r.status]}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
        ໝາຍເຫດ: ແຕ້ມຈະຖືກຈອງໄວ້ທັນທີທີ່ສົ່ງຄຳຂໍ. ຖ້າຄຳຂໍຖືກປະຕິເສດ ແຕ້ມຈະຄືນອັດຕະໂນມັດ. ຮັບຂອງລາງວັນທີ່ຮ້ານ · 020 5992 9992
      </p>
    </div>
  );
}
