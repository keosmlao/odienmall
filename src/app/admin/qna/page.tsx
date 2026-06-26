import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listQuestions } from "@/lib/qna";
import { PageHeader } from "@/components/admin/ui";
import QnaList from "./QnaList";

export const dynamic = "force-dynamic";

export default async function AdminQnaPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const questions = await listQuestions();

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="ຖາມ-ຕອບສິນຄ້າ"
        subtitle="ຕອບຄຳຖາມລູກຄ້າ — ຄຳຕອບຈະສະແດງໃນໜ້າສິນຄ້າ"
      />
      <QnaList questions={questions} />
    </div>
  );
}
