"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, getAdminSession } from "@/lib/auth";
import { answerQuestion, setQuestionHidden } from "@/lib/qna";
import { logAudit } from "@/lib/audit";

export type QnaResult = { ok: true } | { ok: false; error: string };

export async function answerQ(id: number, answer: string): Promise<QnaResult> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  if (!answer?.trim()) return { ok: false, error: "ກະລຸນາພິມຄຳຕອບ" };
  try {
    const admin = await getAdminSession();
    const ok = await answerQuestion(id, answer, admin?.code);
    if (!ok) return { ok: false, error: "ບໍ່ພົບຄຳຖາມ" };
    await logAudit({ action: "qna.answer", entity: String(id), detail: "answered" });
    revalidatePath("/admin/qna");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

export async function hideQ(id: number, hidden: boolean): Promise<QnaResult> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    await setQuestionHidden(id, hidden);
    await logAudit({ action: "qna.hide", entity: String(id), detail: hidden ? "hidden" : "shown" });
    revalidatePath("/admin/qna");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}
