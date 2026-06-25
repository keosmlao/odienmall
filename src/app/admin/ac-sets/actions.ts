"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { createAcSet, deleteAcSet, searchAcCandidates } from "@/lib/products-admin";

export async function addAcSet(formData: FormData) {
  if (!(await isAdmin())) return { error: "ບໍ່ມີສິດ" };
  const codeC = (formData.get("code_c") as string | null)?.trim();
  const codeH = (formData.get("code_h") as string | null)?.trim();
  if (!codeC || !codeH) return { error: "ກະລຸນາລະບຸ code C ແລະ H" };
  try {
    await createAcSet(codeC, codeH);
    revalidatePath("/admin/ac-sets");
    revalidatePath("/products");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg.includes("unique") ? "Code ນີ້ຖືກໃຊ້ແລ້ວ" : msg };
  }
}

export async function removeAcSet(id: number) {
  if (!(await isAdmin())) return { error: "ບໍ່ມີສິດ" };
  await deleteAcSet(id);
  revalidatePath("/admin/ac-sets");
  revalidatePath("/products");
  return { ok: true };
}

export async function searchCandidates(suffix: "[C]" | "[H]", q: string) {
  if (!(await isAdmin())) return [];
  return searchAcCandidates(suffix, q);
}
