"use server";

import { revalidatePath } from "next/cache";
import { isManager, getAdminSession } from "@/lib/auth";
import { upsertFlashDeal, deleteFlashDeal } from "@/lib/flash";
import { searchOrderProducts, type OrderProductHit } from "@/lib/order-builder";
import { logAudit } from "@/lib/audit";

export async function flashSearchProducts(q: string): Promise<OrderProductHit[]> {
  if (!(await isManager())) return [];
  return searchOrderProducts(q);
}

export type FlashResult = { ok: true } | { ok: false; error: string };

export async function saveFlashDeal(input: {
  productCode: string;
  salePrice: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
}): Promise<FlashResult> {
  if (!(await isManager())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  if (!input.productCode || !(input.salePrice > 0)) return { ok: false, error: "ກະລຸນາໃສ່ສິນຄ້າ + ລາຄາ" };
  if (!input.endsAt) return { ok: false, error: "ກະລຸນາໃສ່ເວລາສິ້ນສຸດ" };
  try {
    const admin = await getAdminSession();
    await upsertFlashDeal({
      productCode: input.productCode,
      salePrice: input.salePrice,
      startsAt: input.startsAt || new Date().toISOString(),
      endsAt: input.endsAt,
      active: input.active,
      by: admin?.code,
    });
    await logAudit({ action: "flash.save", entity: input.productCode, detail: `${input.salePrice}` });
    revalidatePath("/admin/flash");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

export async function removeFlashDeal(productCode: string): Promise<FlashResult> {
  if (!(await isManager())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    await deleteFlashDeal(productCode);
    await logAudit({ action: "flash.delete", entity: productCode, detail: "deleted" });
    revalidatePath("/admin/flash");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}
