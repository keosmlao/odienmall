"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemRewardAction } from "./actions";

type State = "idle" | "ok" | "error";

export default function RedeemButton({
  promoCode,
  canRedeem,
  loggedIn,
}: {
  promoCode: string;
  canRedeem: boolean;
  loggedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  if (!loggedIn) {
    return (
      <a
        href="/login?next=/rewards"
        className="block rounded-lg bg-slate-100 py-1.5 text-center text-[11px] font-black text-slate-500 transition hover:bg-slate-200"
      >
        ເຂົ້າສູ່ລະບົບເພື່ອແລກ
      </a>
    );
  }

  if (state === "ok") {
    return (
      <span className="block rounded-lg bg-emerald-50 py-1.5 text-center text-[11px] font-black text-emerald-600">
        ✓ ສົ່ງຄຳຂໍແລ້ວ
      </span>
    );
  }

  function onClick() {
    if (pending) return;
    setState("idle");
    startTransition(async () => {
      const res = await redeemRewardAction(promoCode);
      if (res.ok) {
        setState("ok");
        router.refresh();
      } else {
        setState("error");
        setMsg(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending || !canRedeem}
        className={`rounded-lg py-1.5 text-center text-[11px] font-black transition active:scale-95 ${
          canRedeem
            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:shadow-md disabled:opacity-60"
            : "cursor-not-allowed bg-slate-100 text-slate-400"
        }`}
      >
        {pending ? "ກຳລັງດຳເນີນ…" : canRedeem ? "🎁 ແລກລາງວັນ" : "ແຕ້ມບໍ່ພໍ"}
      </button>
      {state === "error" && <span className="text-center text-[10px] font-bold text-rose-500">{msg}</span>}
    </div>
  );
}
