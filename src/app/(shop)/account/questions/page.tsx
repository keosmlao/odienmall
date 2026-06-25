import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listQuestionsByCustomer } from "@/lib/qna";

export const dynamic = "force-dynamic";
export const metadata = { title: "ຄຳຖາມຂອງຂ້ອຍ" };

export default async function QuestionsPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/account/questions");

  const questions = await listQuestionsByCustomer(session.code);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-gray-900">ຄຳຖາມຂອງຂ້ອຍ</h1>
        <Link href="/account" className="text-sm text-brand hover:underline">← ບັນຊີ</Link>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <div className="text-3xl">💬</div>
          <p className="mt-3 text-sm font-medium text-gray-500">ຍັງບໍ່ໄດ້ຖາມຄຳຖາມໃດ</p>
          <Link href="/products" className="mt-4 inline-block text-sm text-brand hover:underline">ໄປເລືອກສິນຄ້າ</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {questions.map((q) => (
            <li key={q.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${encodeURIComponent(q.productCode)}`}
                    className="text-xs font-mono text-brand hover:underline"
                  >
                    {q.productCode}
                  </Link>
                  <p className="mt-1 text-sm font-medium text-gray-800">{q.question}</p>
                  {q.answer ? (
                    <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-800">
                      <span className="font-semibold text-emerald-600">ຕອບ: </span>{q.answer}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-amber-600">⏳ ລໍຖ້າຄຳຕອບ...</p>
                  )}
                </div>
                <div className="text-xs text-gray-400 shrink-0">
                  {new Date(q.createdAt).toLocaleDateString("lo-LA")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
