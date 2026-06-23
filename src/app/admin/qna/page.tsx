import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listQuestions } from "@/lib/qna";
import { PageHeader, EmptyState, Card } from "@/components/admin/ui";
import QnaAnswer from "@/components/admin/QnaAnswer";

export const dynamic = "force-dynamic";

export default async function AdminQnaPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const questions = await listQuestions();

  return (
    <div>
      <PageHeader title="ຖາມ-ຕອບສິນຄ້າ" subtitle="ຕອບຄຳຖາມລູກຄ້າ — ຄຳຕອບຈະສະແດງໃນໜ້າສິນຄ້າ" />
      {questions.length === 0 ? (
        <EmptyState title="ຍັງບໍ່ມີຄຳຖາມ" icon="M8 10h8M8 14h5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Link href={`/product/${encodeURIComponent(q.productCode)}`} className="font-mono text-xs font-semibold text-brand-dark hover:underline">
                  {q.productCode}
                </Link>
                <span className="text-xs text-gray-400">
                  {q.customerName} · {new Date(q.createdAt).toLocaleDateString("lo-LA")}
                  {!q.answer && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">ລໍຖ້າຕອບ</span>}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800">Q: {q.question}</p>
              {q.answer && <p className="mt-1.5 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">A: {q.answer}</p>}
              <div className="mt-3">
                <QnaAnswer id={q.id} answered={!!q.answer} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
