"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AFFILIATE_BANKS } from "@/lib/affiliate-banks";
import { confirmAffiliateOtp, requestAffiliateOtp } from "./actions";

export default function ApplyAffiliateButton({ email }: { email: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [applicationEmail, setApplicationEmail] = useState(email ?? "");
  const [bankCode, setBankCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function requestCode() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await requestAffiliateOtp({
        email: applicationEmail,
        bankCode,
        accountName,
        accountNo,
      });
      if (res.ok) {
        setStep("otp");
        setNotice(`ສົ່ງລະຫັດ 6 ຕົວໄປທີ່ ${res.email ?? email}`);
      } else {
        setError(res.error);
      }
    });
  }

  function verify() {
    setError(null);
    startTransition(async () => {
      const res = await confirmAffiliateOtp(otp);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  const input =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

  return (
    <div className="max-w-xl space-y-3">
      {step === "details" ? (
        <>
          <input
            type="email"
            value={applicationEmail}
            onChange={(e) => setApplicationEmail(e.target.value)}
            placeholder="Email ສຳລັບຢືນຢັນຕົວຕົນ *"
            autoComplete="email"
            className={input}
          />
          <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className={input}>
            <option value="">ເລືອກທະນາຄານ *</option>
            {AFFILIATE_BANKS.map((bank) => (
              <option key={bank.code} value={bank.code}>{bank.name}</option>
            ))}
          </select>
          <input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="ຊື່ສະແດງໃນບັນຊີທະນາຄານ *"
            className={input}
          />
          <input
            value={accountNo}
            onChange={(e) => setAccountNo(e.target.value.replace(/[^0-9 -]/g, ""))}
            inputMode="numeric"
            placeholder="ເລກບັນຊີ *"
            className={input}
          />
          <button
            type="button"
            onClick={requestCode}
            disabled={
              pending ||
              !applicationEmail.trim() ||
              !bankCode ||
              !accountName.trim() ||
              !accountNo.trim()
            }
            className="rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:from-orange-600 hover:to-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "ກຳລັງສົ່ງ..." : "ສົ່ງລະຫັດຢືນຢັນທາງ email"}
          </button>
        </>
      ) : (
        <>
          {notice && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="ລະຫັດ 6 ຕົວ"
            className={`${input} text-center text-xl font-bold tracking-[0.35em]`}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={verify}
              disabled={pending || otp.length !== 6}
              className="rounded-sm bg-orange-500 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {pending ? "ກຳລັງຢືນຢັນ..." : "ຢືນຢັນ ແລະສົ່ງໃບສະໝັກ"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("details"); setOtp(""); setError(null); }}
              disabled={pending}
              className="rounded-sm border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
            >
              ແກ້ໄຂຂໍ້ມູນ
            </button>
          </div>
        </>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
