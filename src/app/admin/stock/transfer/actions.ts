"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, getAdminSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { createTransferRequisition, type TransferLine } from "@/lib/stock-transfer";
import { logAudit } from "@/lib/audit";

export interface ItemHit { code: string; name: string; unit: string }

/** Product search for the transfer line picker (web items). */
export async function searchTransferItems(q: string): Promise<ItemHit[]> {
  if (!(await isAdmin())) return [];
  const s = (q || "").trim();
  if (s.length < 2) return [];
  const rows = await query<{ code: string; name: string; unit: string | null }>(
    `select i.code,
            coalesce(nullif(i.name_1,''), nullif(i.name_2,''), i.code) as name,
            (select b.unit_code from public.ic_inventory_barcode b where b.ic_code = i.code order by b.price asc limit 1) as unit
       from public.ic_inventory i
      where i.is_eordershow = 1 and (i.code ilike $1 or i.name_1 ilike $1 or i.name_2 ilike $1)
      order by i.code limit 20`,
    [`%${s}%`],
  );
  return rows.map((r) => ({ code: r.code, name: r.name, unit: r.unit ?? "" }));
}

type Result = { ok: true; docNo: string } | { ok: false; error: string };

export async function createTransferAction(input: {
  kind: "in" | "return";
  whFrom: string;
  shelfFrom: string;
  whTo: string;
  shelfTo: string;
  note: string;
  lines: TransferLine[];
}): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    const by = (await getAdminSession())?.code;
    const docNo = await createTransferRequisition({
      kind: input.kind === "return" ? "return" : "in",
      whFrom: input.whFrom,
      shelfFrom: input.shelfFrom,
      whTo: input.whTo,
      shelfTo: input.shelfTo,
      note: input.note,
      lines: input.lines,
      createdBy: by,
      saleCode: by,
    });
    if (!docNo) return { ok: false, error: "SML_DIRECT_WRITE ປິດ — ບໍ່ສາມາດສ້າງໃບຂໍໂອນ" };
    await logAudit({ action: "stock.transfer.create", entity: docNo, detail: `${input.whFrom}→${input.whTo} (${input.lines.length})` });
    revalidatePath("/admin/stock/transfer");
    return { ok: true, docNo };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ສ້າງບໍ່ສຳເລັດ" };
  }
}
