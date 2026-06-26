"use server";

import { revalidatePath } from "next/cache";
import { isManager, getAdminSession } from "@/lib/auth";
import { setSalesWarehouses } from "@/lib/sales-warehouse";
import { logAudit } from "@/lib/audit";

type Result = { ok: true } | { ok: false; error: string };

export async function saveSalesWarehousesAction(codes: string[]): Promise<Result> {
  if (!(await isManager())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    await setSalesWarehouses(codes, (await getAdminSession())?.code);
    await logAudit({ action: "stock.sales_warehouses", detail: codes.join(",") || "(ທຸກສາງ)" });
    revalidatePath("/admin/stock/sales-warehouses");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ບັນທຶກບໍ່ສຳເລັດ" };
  }
}
