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
    <div className="adm-surface relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      {/* decorative brand glows */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-brand/5 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* logo + heading */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="inline-flex items-center rounded-2xl bg-white px-5 py-3 shadow-sm shadow-gray-200/60 ring-1 ring-gray-100">
            <Image src="/odm.png" alt="OdienMall" width={132} height={94} priority className="h-11 w-auto" />
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">ເຂົ້າສູ່ລະບົບ</h1>
          <p className="mt-1.5 text-sm text-gray-500">ປ້ອນລະຫັດພະນັກງານ ແລະ ລະຫັດຜ່ານຂອງທ່ານ</p>
        </div>

        {/* card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm shadow-gray-200/40 sm:p-8">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="emp" className="mb-1.5 block text-sm font-medium text-gray-700">
                ລະຫັດພະນັກງານ
              </label>
              <div className="relative">
                <Icon name="user" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="emp"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm text-gray-800 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
                  placeholder="ເຊັ່ນ 23053"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="pw" className="mb-1.5 block text-sm font-medium text-gray-700">
                ລະຫັດຜ່ານ
              </label>
              <div className="relative">
                <Icon name="lock" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="pw"
                  required
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-10 pr-11 text-sm text-gray-800 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition hover:text-gray-600"
                  aria-label={showPw ? "ເຊື່ອງລະຫັດຜ່ານ" : "ສະແດງລະຫັດຜ່ານ"}
                >
                  <Icon name={showPw ? "eyeOff" : "eye"} className="h-5 w-5" />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-600 ring-1 ring-rose-100">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:ring-4 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60"
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

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-gray-100 pt-4 text-xs text-gray-400">
            <Icon name="lock" className="h-3.5 w-3.5" />
            ການເຊື່ອມຕໍ່ປອດໄພ · ສະເພາະພະນັກງານທີ່ໄດ້ຮັບອະນຸຍາດ
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-xs text-gray-400">
          <span>© {new Date().getFullYear()} OdienMall · ODG</span>
          <Link href="/" className="inline-flex items-center gap-1 text-brand transition hover:text-brand-dark">
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
