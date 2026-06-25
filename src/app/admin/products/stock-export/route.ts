import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// Export product stock levels to CSV (UTF-8 BOM for Excel).
// ?low=1  → only items with balance_qty ≤ 5
// ?out=1  → include out-of-stock (balance_qty ≤ 0)
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const lowOnly = searchParams.get("low") === "1";
  const includeOut = searchParams.get("out") === "1";

  const stockFilter = lowOnly
    ? "and coalesce(i.balance_qty, 0) between 0 and 5"
    : includeOut
    ? ""
    : "and coalesce(i.balance_qty, 0) > 0";

  const rows = await query<{
    code: string;
    name: string;
    category: string;
    brand: string;
    group_main: string;
    balance_qty: number;
    price: number | null;
    is_hidden: boolean;
    is_featured: boolean;
  }>(
    `select
       i.code,
       coalesce(nullif(i.name_1,''), nullif(i.name_2,''), i.code) as name,
       coalesce(nullif(c.name_1,''), i.item_category, '') as category,
       coalesce(nullif(b.name_1,''), i.item_brand, '') as brand,
       i.group_main,
       coalesce(i.balance_qty, 0)::int as balance_qty,
       (select min(bc.price) from public.ic_inventory_barcode bc where bc.ic_code = i.code and bc.price > 0) as price,
       coalesce(ov.is_hidden, false) as is_hidden,
       coalesce(ov.is_featured, false) as is_featured
     from public.ic_inventory i
     left join public.ic_category c on c.code = i.item_category
     left join public.ic_brand b on b.code = i.item_brand
     left join odg_ecom.product_overlays ov on ov.product_code = i.code
     where i.group_main between '11' and '14'
       ${stockFilter}
     order by i.balance_qty asc, i.code`,
  );

  const BOM = "﻿";
  const header = ["ລະຫັດ", "ຊື່ສິນຄ້າ", "ໝວດ", "ຍີ່ຫໍ້", "ກຸ່ມ", "ເຄົງ (ຊິ້ນ)", "ລາຄາ (₭)", "ຊ່ອນ", "Featured"].join(",");
  const escape = (v: string | number | boolean | null) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [r.code, r.name, r.category, r.brand, r.group_main, r.balance_qty, r.price ?? "", r.is_hidden ? "ຊ່ອນ" : "", r.is_featured ? "Featured" : ""]
      .map(escape)
      .join(","),
  );

  const csv = BOM + [header, ...lines].join("\n");
  const filename = lowOnly ? "stock-low.csv" : "stock-all.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
