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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-[75vh] w-full flex items-center justify-center py-10 px-4 sm:px-6 bg-slate-50/30">
      <div className="w-full max-w-4xl grid overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.035)] md:grid-cols-[1.1fr_1fr]">
        
        {/* Left Branding Panel */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600 p-12 text-white md:flex md:flex-col md:justify-between">
          {/* Subtle Glow Effects */}
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-rose-400/20 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
          
          <div className="relative z-10">
            <span className="inline-flex rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(249,115,22,0.2)] transition-all duration-500 hover:scale-105 hover:rotate-2 select-none">
              <Image src="/odm.png" alt="OdienMall" width={110} height={80} className="h-14 w-auto object-contain" />
            </span>
            <h2 className="mt-12 text-4xl font-extrabold leading-tight tracking-tight drop-shadow-sm">
              ຊ໊ອບງ່າຍ<br />ຈັດສົ່ງທົ່ວລາວ
            </h2>
            <p className="mt-5 max-w-xs text-sm font-semibold leading-relaxed text-white/90">
              ເຂົ້າລະບົບເພື່ອຕິດຕາມອໍເດີ, ຈັດການທີ່ຢູ່ຈັດສົ່ງ ແລະສະສົມຄະແນນຮັບສ່ວນຫຼຸດສະມາຊິກ.
            </p>
          </div>
          <p className="relative z-10 text-xs font-bold tracking-widest text-white/70 select-none">
            OdienMall &middot; Official ODG Store
          </p>
        </div>

        {/* Right Login Panel */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          
          {/* Mobile Header Logo */}
          <div className="block md:hidden text-center mb-8">
            <div className="inline-flex rounded-2xl bg-white p-3.5 shadow-[0_10px_25px_rgba(0,0,0,0.03)] border border-slate-100/80 mb-3">
              <Image src="/odm.png" alt="OdienMall" width={80} height={58} className="h-10 w-auto object-contain" />
            </div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">OdienMall</p>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 leading-none">
            ເຂົ້າສູ່ລະບົບ
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-400">
            ໃຊ້ເບີໂທ, ອີເມວ ຫຼື ລະຫັດລູກຄ້າ ຂອງທ່ານ
          </p>

          {/* LINE Errors */}
          {(lineLocalError || lineError) && LINE_ERRORS[lineLocalError || lineError || ""] && (
            <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold leading-relaxed text-rose-600 flex items-start gap-2.5 shadow-sm">
              <span className="text-base leading-none">⚠️</span>
              <p>{LINE_ERRORS[lineLocalError || lineError || ""]}</p>
            </div>
          )}

          {/* LINE Login Action */}
          {(lineEnabled || lineLiffId) && (
            <div className="mt-8">
              {lineLiffId ? (
                <LineMiniLoginButton liffId={lineLiffId} redirect={redirect} onError={setLineLocalError} />
              ) : (
                <Link
                  href={`/login/line?redirect=${encodeURIComponent(redirect)}`}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#06C755] py-3.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(6,199,85,0.15)] transition-all duration-300 hover:bg-[#05b84f] hover:shadow-[0_8px_25px_rgba(6,199,85,0.25)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <span className="grid h-5.5 w-5.5 place-items-center rounded bg-white text-[10px] font-black text-[#06C755] select-none shadow-sm">
                    LINE
                  </span>
                  ເຂົ້າລະບົບຜ່ານ LINE
                </Link>
              )}
              <div className="my-6 flex items-center gap-4 text-slate-200">
                <span className="h-px flex-1 bg-slate-100" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 select-none">
                  ຫຼື ໃຊ້ບັນຊີອື່ນ
                </span>
                <span className="h-px flex-1 bg-slate-100" />
              </div>
            </div>
          )}

          {/* Standard Form */}
          <form onSubmit={submit} className={`space-y-5 ${!(lineEnabled || lineLiffId) ? "mt-8" : ""}`}>
            <div>
              <span className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                ເບີໂທ / ອີເມວ / ລະຫັດ
              </span>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  required
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400/80 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200"
                  placeholder="020 XXXX XXXX"
                  autoComplete="username"
                />
              </div>
            </div>
            
            <div>
              <span className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                ລະຫັດຜ່ານ
              </span>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-11 pr-12 py-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400/80 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3 text-xs font-semibold text-rose-600 flex items-center gap-2.5 shadow-sm">
                <span className="text-base leading-none">⚠️</span>
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/10 hover:shadow-xl hover:shadow-orange-500/20 hover:from-orange-600 hover:to-rose-600 hover:scale-[1.01] active:scale-[0.99] transition-all duration-250 disabled:cursor-not-allowed disabled:opacity-50 disabled:scale-100 cursor-pointer flex items-center justify-center gap-2"
            >
              {pending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  ກຳລັງເຂົ້າສູ່ລະບົບ...
                </>
              ) : (
                "ເຂົ້າສູ່ລະບົບ"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs font-bold">
            <Link href="/products" className="text-orange-600 transition-colors hover:text-orange-700 hover:underline inline-flex items-center gap-1">
              ສືບຕໍ່ຊ໊ອບປິ້ງໂດຍບໍ່ເຂົ້າສູ່ລະບົບ <span className="text-sm font-normal">&rarr;</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
