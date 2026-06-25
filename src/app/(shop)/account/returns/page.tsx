import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listReturnsByCustomer, RETURN_STATUS_LABEL, type ReturnStatus } from "@/lib/returns";
import { formatKip } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "ຄຳຮ້ອງຄືນສິນຄ້າ" };

const STATUS_TONE: Record<ReturnStatus, string> = {
  pending:  "bg-amber-100  text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100   text-rose-700",
  refunded: "bg-blue-100   text-blue-700",
};

export default async function ReturnsPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/account/returns");

  const returns = await listReturnsByCustomer(session.code);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-gray-900">ຄຳຮ້ອງຄືນສິນຄ້າ</h1>
        <Link href="/account" className="text-sm text-brand hover:underline">← ບັນຊີ</Link>
      </div>

      {returns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <div className="text-3xl">📦</div>
          <p className="mt-3 text-sm font-medium text-gray-500">ຍັງບໍ່ມີຄຳຮ້ອງຄືນສິນຄ້າ</p>
          <Link href="/account" className="mt-4 inline-block text-sm text-brand hover:underline">ກັບໄປໜ້າບັນຊີ</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {returns.map((r) => (
            <li key={r.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/order/${encodeURIComponent(r.orderNo)}`}
                      className="font-bold text-brand hover:underline text-sm"
                    >
                      {r.orderNo}
                    </Link>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[r.status]}`}>
                      {RETURN_STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-gray-700">{r.reason}</p>
                  {r.detail && <p className="mt-1 text-xs text-gray-500">{r.detail}</p>}
                  {r.adminNote && (
                    <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      <span className="font-semibold">ໝາຍເຫດ admin: </span>{r.adminNote}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 shrink-0">
                  {new Date(r.createdAt).toLocaleDateString("lo-LA")}
                </div>
              </div>
              {r.resolvedAt && (
                <p className="mt-2 text-xs text-gray-400">
                  ດຳເນີນການ: {new Date(r.resolvedAt).toLocaleDateString("lo-LA")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
