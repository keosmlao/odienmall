"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ShopError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl border border-rose-100 bg-white px-6 py-16 text-center shadow-sm">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-2xl font-black text-rose-500">!</span>
      <h1 className="mt-4 text-xl font-black text-slate-900">ບໍ່ສາມາດໂຫຼດໜ້ານີ້ໄດ້</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        ອາດເກີດຈາກສັນຍານອິນເຕີເນັດ ຫຼືລະບົບກຳລັງຕອບສະໜອງຊ້າ.
      </p>
      {error.digest && <p className="mt-2 text-[10px] text-slate-300">Ref: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 text-sm font-bold text-white shadow-md"
        >
          ລອງໃໝ່
        </button>
        <Link href="/" className="rounded-sm border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600">
          ກັບໜ້າຫຼັກ
        </Link>
      </div>
    </div>
  );
}
