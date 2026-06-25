import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { verifyPayload } from "@/lib/session";
import LinkForm from "./LinkForm";

export const metadata: Metadata = { title: "ເຊື່ອມຕໍ່ບັນຊີ LINE" };
export const dynamic = "force-dynamic";

const PENDING_COOKIE = "om_line_pending";
const PENDING_MAX_AGE = 15 * 60;

interface PendingLine {
  lineUserId: string;
  displayName?: string | null;
}

export default async function LineLinkPage() {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  const pending = token ? verifyPayload<PendingLine>(token, PENDING_MAX_AGE) : null;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-black text-slate-800">ເຊື່ອມຕໍ່ບັນຊີ LINE</h1>
        <p className="mb-5 text-sm text-slate-500">ເຊື່ອມ LINE ກັບບັນຊີ OdienMall ຂອງທ່ານ</p>

        {pending?.lineUserId ? (
          <LinkForm displayName={pending.displayName ?? null} />
        ) : (
          <div className="space-y-4">
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              ໝົດເວລາເຊື່ອມຕໍ່ ຫຼື ບໍ່ພົບຂໍ້ມູນ LINE. ກະລຸນາລອງເຂົ້າສູ່ລະບົບດ້ວຍ LINE ໃໝ່ອີກຄັ້ງ.
            </p>
            <Link
              href="/login/line"
              className="block rounded-lg bg-[#06C755] px-4 py-2.5 text-center text-sm font-bold text-white transition hover:brightness-95"
            >
              ເຂົ້າສູ່ລະບົບ LINE ໃໝ່
            </Link>
            <Link href="/login" className="block text-center text-xs font-bold text-slate-400 hover:text-orange-600">
              ກັບໄປໜ້າ login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
