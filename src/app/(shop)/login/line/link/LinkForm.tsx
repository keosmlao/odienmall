"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkExistingAction, registerAction } from "./actions";

type Step = "ask" | "existing" | "register";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 disabled:opacity-60";

export default function LinkForm({ displayName }: { displayName: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("ask");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("0000");
  const [name, setName] = useState(displayName ?? "");
  const [error, setError] = useState<string | null>(null);

  function done(res: { ok: boolean; error?: string }) {
    if (res.ok) {
      router.push("/account");
      router.refresh();
    } else {
      setError(res.error ?? "ເກີດຂໍ້ຜິດພາດ");
    }
  }

  function submitExisting(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => done(await linkExistingAction(phone, password)));
  }
  function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => done(await registerAction(name, phone)));
  }

  // Step 1 — have you shopped with OdienMall before?
  if (step === "ask") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {displayName ? <><b>{displayName}</b> — </> : null}ເຂົ້າສູ່ລະບົບ LINE ສຳເລັດ 🎉
        </div>
        <p className="text-center text-sm font-bold text-slate-700">
          ທ່ານເຄີຍຊື້ເຄື່ອງຢູ່ OdienMall ບໍ່?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setError(null); setStep("existing"); }}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-sm font-black text-white transition hover:shadow-md"
          >
            ເຄີຍ
          </button>
          <button
            type="button"
            onClick={() => { setError(null); setStep("register"); }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            ບໍ່ເຄີຍ
          </button>
        </div>
      </div>
    );
  }

  // Step 2a — existing customer: phone + password (default 0000)
  if (step === "existing") {
    return (
      <form onSubmit={submitExisting} className="space-y-4">
        <p className="text-sm text-slate-600">
          ກະລຸນາປ້ອນ <b>ເບີໂທ</b> ທີ່ທ່ານເຄີຍຊື້ເຄື່ອງກັບ OdienMall ແລະ ລະຫັດຜ່ານ (ເລີ່ມຕົ້ນ <b>0000</b>).
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">ເບີໂທ</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={pending}
            autoComplete="tel" className={inputCls} placeholder="020 XXXX XXXX" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">ລະຫັດຜ່ານ</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={pending}
            autoComplete="current-password" className={inputCls} />
        </div>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <button type="submit" disabled={pending || !phone}
          className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:shadow-md disabled:opacity-60">
          {pending ? "ກຳລັງເຂົ້າສູ່ລະບົບ…" : "ເຂົ້າສູ່ລະບົບ"}
        </button>
        <button type="button" onClick={() => { setError(null); setStep("ask"); }} disabled={pending}
          className="w-full text-center text-xs font-bold text-slate-400 hover:text-orange-600">‹ ກັບຄືນ</button>
      </form>
    );
  }

  // Step 2b — new member registration
  return (
    <form onSubmit={submitRegister} className="space-y-4">
      <p className="text-sm text-slate-600">ສະໝັກສະມາຊິກໃໝ່ — ຕື່ມຂໍ້ມູນ ແລ້ວເຂົ້າສູ່ລະບົບເລີຍ.</p>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">ຊື່</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={pending}
          className={inputCls} placeholder="ຊື່ ແລະ ນາມສະກຸນ" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">ເບີໂທ</label>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={pending}
          autoComplete="tel" className={inputCls} placeholder="020 XXXX XXXX" />
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
      <button type="submit" disabled={pending || !name || !phone}
        className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:shadow-md disabled:opacity-60">
        {pending ? "ກຳລັງສະໝັກ…" : "ສະໝັກ ແລະ ເຂົ້າສູ່ລະບົບ"}
      </button>
      <button type="button" onClick={() => { setError(null); setStep("ask"); }} disabled={pending}
        className="w-full text-center text-xs font-bold text-slate-400 hover:text-orange-600">‹ ກັບຄືນ</button>
    </form>
  );
}
