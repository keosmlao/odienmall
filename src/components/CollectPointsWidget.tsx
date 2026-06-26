"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { collectPointAction, facebookShareAction } from "@/app/(shop)/account/collect-actions";

export default function CollectPointsWidget({
  collect,
  share,
  shareUrl,
  compact = false,
}: {
  collect: { usedToday: number; maxPerDay: number; remaining: number; points: number; enabled: boolean };
  share: { enabled: boolean; points: number; remaining: number };
  shareUrl: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [remaining, setRemaining] = useState(collect.remaining);
  const [used, setUsed] = useState(collect.usedToday);
  const [shareLeft, setShareLeft] = useState(share.remaining);
  const [toast, setToast] = useState<string | null>(null);

  function flash(t: string) {
    setToast(t);
    setTimeout(() => setToast(null), 2500);
  }

  function doCollect() {
    if (pending || remaining <= 0) return;
    startTransition(async () => {
      const r = await collectPointAction();
      if (r.awarded > 0) {
        setRemaining(r.remaining);
        setUsed(r.usedToday);
        flash(`+${r.awarded} ແຕ້ມ 🎉`);
        router.refresh();
      } else if (r.reason === "limit") {
        setRemaining(0);
        flash("ມື້ນີ້ຄົບແລ້ວ — ກັບມາໃໝ່ມື້ອື່ນ");
      } else {
        flash("ບໍ່ສຳເລັດ");
      }
    });
  }

  function doShare() {
    if (pending) return;
    // Open the Facebook share dialog, then credit the points (capped per day).
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener,noreferrer,width=600,height=500",
    );
    startTransition(async () => {
      const r = await facebookShareAction();
      if (r.awarded > 0) {
        setShareLeft(r.remaining);
        flash(`+${r.awarded} ແຕ້ມ ຂອບໃຈທີ່ແບ່ງປັນ 💙`);
        router.refresh();
      } else if (r.reason === "limit") {
        setShareLeft(0);
        flash("ແບ່ງປັນຄົບແລ້ວມື້ນີ້");
      }
    });
  }

  if (!collect.enabled && !share.enabled) return null;

  return (
    <div className={`relative ${compact ? "" : "rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-4"}`}>
      {!compact && (
        <p className="mb-3 flex items-center gap-2 text-sm font-black text-amber-800">
          <span>⭐</span> ສະສົມແຕ້ມປະຈຳວັນ
        </p>
      )}
      <div className="flex flex-wrap gap-2.5">
        {collect.enabled && (
          <button
            type="button"
            onClick={doCollect}
            disabled={pending || remaining <= 0}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition active:scale-95 ${
              remaining > 0
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:shadow-md"
                : "cursor-not-allowed bg-slate-100 text-slate-400"
            }`}
          >
            🎁 {remaining > 0 ? `ຮັບແຕ້ມ +${collect.points}` : "ມື້ນີ້ຄົບແລ້ວ"}
            <span className="rounded-full bg-white/25 px-1.5 text-[10px] tabular-nums">{used}/{collect.maxPerDay}</span>
          </button>
        )}
        {share.enabled && (
          <button
            type="button"
            onClick={doShare}
            disabled={pending || shareLeft <= 0}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition active:scale-95 ${
              shareLeft > 0
                ? "bg-[#1877F2] text-white shadow-sm hover:brightness-105"
                : "cursor-not-allowed bg-slate-100 text-slate-400"
            }`}
          >
            📘 {shareLeft > 0 ? `ແບ່ງປັນ +${share.points}` : "ແບ່ງປັນແລ້ວ"}
          </button>
        )}
      </div>
      {toast && (
        <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{toast}</div>
      )}
    </div>
  );
}
