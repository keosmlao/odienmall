"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { login } from "./actions";
import LineMiniLoginButton from "./LineMiniLoginButton";

const LINE_ERRORS: Record<string, string> = {
  line_config: "ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ LINE Login",
  line_state: "LINE Login ໝົດອາຍຸ ຫຼື state ບໍ່ຖືກຕ້ອງ — ລອງໃໝ່ອີກຄັ້ງ",
  line_token: "ຮັບ token ຈາກ LINE ບໍ່ສຳເລັດ",
  line_profile: "ອ່ານ profile LINE ບໍ່ສຳເລັດ",
  line_unlinked: "LINE account ນີ້ຍັງບໍ່ກົງກັບບັນຊີລູກຄ້າ OdienMall. ກະລຸນາ login ດ້ວຍເບີ/ອີເມວກ່ອນ ຫຼືໃຊ້ LINE ທີ່ມີ email ກົງກັບບັນຊີ.",
  line_failed: "LINE Login ຂັດຂ້ອງ — ກະລຸນາລອງໃໝ່",
};

export default function LoginForm({
  redirect,
  lineEnabled,
  lineLiffId,
  lineError,
}: {
  redirect: string;
  lineEnabled: boolean;
  lineLiffId: string;
  lineError?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lineLocalError, setLineLocalError] = useState("");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await login(id, pw);
      if (res.ok) {
        router.push(redirect);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-sm bg-white shadow-sm md:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-rose-500 p-10 text-white md:flex md:flex-col md:justify-between">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="relative">
          <span className="inline-flex rounded-xl bg-white p-3 shadow-lg">
            <Image src="/odm.png" alt="OdienMall" width={100} height={72} className="h-14 w-auto object-contain" />
          </span>
          <h2 className="mt-8 text-3xl font-black leading-tight">ຊ໊ອບງ່າຍ<br />ຈັດສົ່ງທົ່ວລາວ</h2>
          <p className="mt-4 max-w-xs text-sm leading-7 text-white/80">
            ເຂົ້າລະບົບເພື່ອຕິດຕາມອໍເດີ, ບັນທຶກທີ່ຢູ່ ແລະຮັບແຕ້ມສະສົມ.
          </p>
        </div>
        <p className="relative text-xs text-white/70">OdienMall · Official ODG Store</p>
      </div>
      <div className="p-7 sm:p-10">
        <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-900">ເຂົ້າສູ່ລະບົບ</h1>
        <p className="mb-6 text-xs font-semibold text-slate-400">
          ໃຊ້ເບີໂທ, ອີເມວ ຫຼື ລະຫັດລູກຄ້າ ຂອງທ່ານ
        </p>
        {(lineLocalError || lineError) && LINE_ERRORS[lineLocalError || lineError || ""] && (
          <p className="mb-4 rounded-sm border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-600">
            {LINE_ERRORS[lineLocalError || lineError || ""]}
          </p>
        )}
        {(lineEnabled || lineLiffId) && (
          <>
            {lineLiffId ? (
              <LineMiniLoginButton liffId={lineLiffId} redirect={redirect} onError={setLineLocalError} />
            ) : (
              <Link
                href={`/login/line?redirect=${encodeURIComponent(redirect)}`}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-sm bg-[#06C755] py-3.5 text-sm font-black text-white shadow-md transition hover:bg-[#05b84f]"
              >
                <span className="grid h-5 w-5 place-items-center rounded bg-white text-[10px] font-black text-[#06C755]">LINE</span>
                ເຂົ້າລະບົບຜ່ານ LINE
              </Link>
            )}
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">or</span>
              <span className="h-px flex-1 bg-slate-100" />
            </div>
          </>
        )}
        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">ເບີໂທ / ອີເມວ / ລະຫັດ</span>
            <input
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="inp"
              placeholder="020 XXXX XXXX"
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">ລະຫັດຜ່ານ</span>
            <input
              required
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="inp"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 py-3.5 text-sm font-bold text-white shadow-md transition hover:from-orange-600 hover:to-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "ກຳລັງເຂົ້າສູ່ລະບົບ..." : "ເຂົ້າສູ່ລະບົບ"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs font-bold">
        <Link href="/products" className="text-orange-600 transition hover:text-orange-700">
          ສືບຕໍ່ຊ໊ອບປິ້ງໂດຍບໍ່ເຂົ້າສູ່ລະບົບ
        </Link>
      </p>
      </div>
    </div>
  );
}
