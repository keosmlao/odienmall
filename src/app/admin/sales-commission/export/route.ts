import { isManager } from "@/lib/auth";
import { getCommissionEarners } from "@/lib/sales-link";

export const dynamic = "force-dynamic";

// CSV of salesperson commission (earned / paid / outstanding) for payroll.
// Manager-only. App-owned data — no ERP write.
export async function GET() {
  if (!(await isManager())) return new Response("Unauthorized", { status: 401 });

  const earners = await getCommissionEarners();
  const header = ["ລະຫັດ", "ພະນັກງານຂາຍ", "ອັດຕາ %", "ໄດ້ຮັບ (LAK)", "ຈ່າຍແລ້ວ (LAK)", "ຄ້າງຈ່າຍ (LAK)"];
  const rows = earners.map((e) => [
    e.saleCode,
    e.saleName,
    String(e.rate),
    String(e.earnedAll),
    String(e.paid),
    String(e.outstanding),
  ]);

  // ﻿ BOM so Excel reads the UTF-8 Lao text correctly.
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="commission.csv"',
    },
  });
}

function cell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
