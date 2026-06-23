"use server";

import { getSession } from "@/lib/auth";
import { askQuestion, getProductQuestions, type ProductQuestion } from "@/lib/qna";

export type AskResult = { ok: true } | { ok: false; error: string };

export async function askProductQuestion(productCode: string, question: string): Promise<AskResult> {
  const session = await getSession();
  if (!session?.code) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນຖາມ" };
  return askQuestion({
    productCode,
    customerCode: session.code,
    customerName: session.name || "ລູກຄ້າ",
    question,
  });
}

export async function refreshQuestions(productCode: string): Promise<ProductQuestion[]> {
  return getProductQuestions(productCode);
}
