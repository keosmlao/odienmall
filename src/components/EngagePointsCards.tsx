"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collectPointAction, facebookShareAction } from "@/app/(shop)/account/collect-actions";

interface Rules {
  addressEnabled: boolean; addressPoints: number;
  birthdayEnabled: boolean; birthdayPoints: number;
  collectEnabled: boolean; collectPoints: number; collectMaxPerDay: number;
  shareEnabled: boolean; sharePoints: number;
}

export default function EngagePointsCards({
  rules,
  collect,
  profile,
  shareUrl,
}: {
  rules: Rules;
  collect: { usedToday: number; maxPerDay: number; remaining: number };
  profile: { addressAwarded: boolean; birthdayAwarded: boolean };
  shareUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [remaining, setRemaining] = useState(collect.remaining);
  const [used, setUsed] = useState(collect.usedToday);
  const [shared, setShared] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(t: string) {
    setToast(t);
    setTimeout(() => setToast(null), 2500);
  }

  function doCollect() {
    if (pending || remaining <= 0) return;
    startTransition(async () => {
      const r = await collectPointAction();
      if (r.awarded > 0) { setRemaining(r.remaining); setUsed(r.usedToday); flash(`+${r.awarded} ແຕ້ມ 🎉`); router.refresh(); }
      else if (r.reason === "limit") { setRemaining(0); flash("ມື້ນີ້ຄົບແລ້ວ"); }
    });
  }
  function doShare() {
    if (pending || shared) return;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank", "noopener,noreferrer,width=600,height=500");
    startTransition(async () => {
      const r = await facebookShareAction();
      if (r.awarded > 0) { setShared(true); flash(`+${r.awarded} ແຕ້ມ 💙`); router.refresh(); }
      else if (r.reason === "limit") { setShared(true); flash("ແບ່ງປັນຄົບແລ້ວມື້ນີ້"); }
    });
  }

  const profilePts = (rules.addressEnabled && !profile.addressAwarded ? rules.addressPoints : 0)
    + (rules.birthdayEnabled && !profile.birthdayAwarded ? rules.birthdayPoints : 0);
  const showProfile = (rules.addressEnabled || rules.birthdayEnabled) && profilePts > 0;

  const cards: React.ReactNode[] = [];

  if (rules.collectEnabled) {
    const done = remaining <= 0;
    cards.push(
      <button key="collect" type="button" onClick={doCollect} disabled={pending || done}
        className={`group flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition active:scale-95 ${
          done ? "cursor-not-allowed border-slate-100 bg-slate-50" : "border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 hover:-translate-y-0.5 hover:shadow-md"}`}>
        <span className="text-2xl">🎁</span>
        <span className="text-[11px] font-black text-slate-700">ຮັບແຕ້ມ</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${done ? "bg-slate-200 text-slate-400" : "bg-orange-500 text-white"}`}>
          {done ? "ຄົບແລ້ວ" : `+${rules.collectPoints}`}
        </span>
        <span className="text-[9px] font-bold tabular-nums text-slate-400">{used}/{collect.maxPerDay} ມື້ນີ້</span>
      </button>,
    );
  }

  if (rules.shareEnabled) {
    cards.push(
      <button key="share" type="button" onClick={doShare} disabled={pending || shared}
        className={`group flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition active:scale-95 ${
          shared ? "cursor-not-allowed border-slate-100 bg-slate-50" : "border-blue-100 bg-gradient-to-br from-blue-50 to-sky-50 hover:-translate-y-0.5 hover:shadow-md"}`}>
        <span className="text-2xl">📘</span>
        <span className="text-[11px] font-black text-slate-700">ແບ່ງປັນ FB</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${shared ? "bg-slate-200 text-slate-400" : "bg-[#1877F2] text-white"}`}>
          {shared ? "ແບ່ງປັນແລ້ວ" : `+${rules.sharePoints}`}
        </span>
        <span className="text-[9px] font-bold text-slate-400">ລົງ Facebook</span>
      </button>,
    );
  }

  if (showProfile) {
    cards.push(
      <Link key="profile" href="/account/profile"
        className="group flex flex-col items-center gap-1.5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md">
        <span className="text-2xl">📝</span>
        <span className="text-[11px] font-black text-slate-700">ຕື່ມຂໍ້ມູນ</span>
        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white">+{parseFloat(profilePts.toFixed(1))}</span>
        <span className="text-[9px] font-bold text-slate-400">ທີ່ຢູ່ · ວັນເກີດ</span>
      </Link>,
    );
  }

  if (cards.length === 0) return null;

  return (
    <section className="!mb-4 rounded-2xl border border-amber-100 bg-white/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-800">
          <span className="text-base">⭐</span> ສະສົມແຕ້ມ
        </h2>
        <Link href="/account" className="text-[11px] font-bold text-orange-600 hover:underline">ແຕ້ມຂອງຂ້ອຍ ›</Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">{cards}</div>
      {toast && <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{toast}</div>}
    </section>
  );
}
