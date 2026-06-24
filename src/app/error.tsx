"use client";

// Route-level error boundary — shown instead of a raw crash when a page/segment
// throws on the server or client. Keeps the user in a recoverable state.
import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <div className="text-5xl">⚠️</div>
      <h1 className="text-lg font-bold text-slate-800">ເກີດຂໍ້ຜິດພາດ</h1>
      <p className="text-sm text-slate-500">ຂໍອະໄພ ມີບັນຫາເກີດຂຶ້ນ. ກະລຸນາລອງໃໝ່ອີກຄັ້ງ.</p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={reset}
          className="rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:from-orange-600 hover:to-rose-600"
        >
          ລອງໃໝ່
        </button>
        <Link href="/" className="rounded-sm border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
          ກັບໜ້າຫຼັກ
        </Link>
      </div>
      {error.digest && <p className="mt-2 text-[10px] text-slate-300">ref: {error.digest}</p>}
    </div>
  );
}
