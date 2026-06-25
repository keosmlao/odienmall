"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { adminLogin } from "../actions";

export default function AdminLoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await adminLogin(username, password);
      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="adm-surface flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <Image src="/odm.png" alt="OdienMall" width={132} height={94} priority className="h-11 w-auto" />
          </span>
          <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-950">ເຂົ້າສູ່ລະບົບ</h1>
          <p className="mt-1.5 text-sm font-bold text-slate-500">OdienMall Admin Studio</p>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-7">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#f97316,#22c55e,#06b6d4,#e11d48)]" />
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="emp" className="mb-1.5 block text-sm font-bold text-slate-700">
                ລະຫັດພະນັກງານ
              </label>
              <div className="relative">
                <Icon name="user" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="emp"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="adm-focus w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm font-semibold text-slate-800 transition focus:border-orange-400"
                  placeholder="ເຊັ່ນ 23053"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="pw" className="mb-1.5 block text-sm font-bold text-slate-700">
                ລະຫັດຜ່ານ
              </label>
              <div className="relative">
                <Icon name="lock" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="pw"
                  required
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="adm-focus w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm font-semibold text-slate-800 transition focus:border-orange-400"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="adm-focus absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:text-slate-700"
                  aria-label={showPw ? "ເຊື່ອງລະຫັດຜ່ານ" : "ສະແດງລະຫັດຜ່ານ"}
                >
                  <Icon name={showPw ? "eyeOff" : "eye"} className="h-5 w-5" />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="adm-focus flex w-full items-center justify-center gap-2 rounded-lg bg-[linear-gradient(90deg,#0f172a,#f97316)] py-3 text-sm font-black text-white shadow-sm shadow-orange-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Spinner />
                  ກຳລັງເຂົ້າ...
                </>
              ) : (
                "ເຂົ້າສູ່ລະບົບ"
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
            <Icon name="lock" className="h-3.5 w-3.5" />
            ການເຊື່ອມຕໍ່ປອດໄພ · ສະເພາະພະນັກງານທີ່ໄດ້ຮັບອະນຸຍາດ
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>© {new Date().getFullYear()} OdienMall · ODG</span>
          <Link href="/" className="adm-focus inline-flex items-center gap-1 rounded-md text-slate-700 transition hover:text-orange-600">
            <Icon name="arrowLeft" className="h-3.5 w-3.5" />
            ກັບໄປໜ້າຮ້ານ
          </Link>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

const PATHS: Record<string, string> = {
  user: "M16 19a4 4 0 0 0-8 0",
  lock: "",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z",
  eyeOff: "M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.8 4.2A10.6 10.6 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.4 3.3M6.1 6.1A18.4 18.4 0 0 0 2 12s3.5 7 10 7a10.3 10.3 0 0 0 3-.4",
  alert: "M12 8v4M12 16h.01",
  arrowLeft: "M15 18l-6-6 6-6",
};

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "user" && <circle cx="12" cy="8" r="3.5" />}
      {name === "lock" && (
        <>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </>
      )}
      {name === "eye" && <circle cx="12" cy="12" r="3" />}
      {name === "alert" && <circle cx="12" cy="12" r="9" />}
      {PATHS[name] && <path d={PATHS[name]} />}
    </svg>
  );
}
