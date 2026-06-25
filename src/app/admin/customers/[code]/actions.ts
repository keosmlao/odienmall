"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { addCustomerNote, deleteCustomerNote, type CustomerNote, type CustomerFlag } from "@/lib/customer-notes";

export async function addCustomerNoteAction(
  customerCode: string,
  content: string,
  flag: CustomerFlag,
): Promise<{ ok: boolean; note?: CustomerNote; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    const admin = await getAdminSession();
    const note = await addCustomerNote(customerCode, content, flag, admin?.code);
    await logAudit({ action: "customer.note.add", entity: customerCode, detail: flag ? `${flag}: ${content.slice(0,50)}` : content.slice(0,50) });
    revalidatePath(`/admin/customers/${encodeURIComponent(customerCode)}`);
    return { ok: true, note };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

export async function deleteCustomerNoteAction(id: number): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  try {
    await deleteCustomerNote(id);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
