"use server";

import { isAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface ImportRow {
  code: string;
  status: "ok" | "error" | "skip";
  message: string;
}

function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const cols: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === '"') {
        if (inQ && trimmed[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        cols.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    rows.push(cols);
  }
  return rows;
}

export async function importProductOverlays(
  csv: string,
): Promise<{ rows: ImportRow[] }> {
  if (!(await isAdmin())) return { rows: [{ code: "—", status: "error", message: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" }] };

  const parsed = parseCsv(csv.trim());
  if (parsed.length < 2) return { rows: [{ code: "—", status: "skip", message: "ບໍ່ມີຂໍ້ມູນ" }] };

  const header = parsed[0].map((h) => h.toLowerCase().trim());
  const codeIdx = header.indexOf("code");
  const descIdx = header.indexOf("description");
  const priceNoteIdx = header.indexOf("price_note");

  if (codeIdx === -1) return { rows: [{ code: "—", status: "error", message: "ບໍ່ພົບ column 'code'" }] };

  const results: ImportRow[] = [];
  for (let i = 1; i < parsed.length; i++) {
    const cols = parsed[i];
    const code = cols[codeIdx]?.trim();
    if (!code) { results.push({ code: "—", status: "skip", message: `ແຖວ ${i + 1}: code ວ່າງ` }); continue; }

    const description = descIdx !== -1 ? (cols[descIdx]?.trim() ?? null) : undefined;
    const priceNote = priceNoteIdx !== -1 ? (cols[priceNoteIdx]?.trim() ?? null) : undefined;

    if (description === undefined && priceNote === undefined) {
      results.push({ code, status: "skip", message: "ບໍ່ມີ column ທີ່ຮູ້ຈັກ" });
      continue;
    }

    try {
      const sets: string[] = ["product_code = $1", "updated_at = now()"];
      const vals: unknown[] = [code];
      let idx = 2;
      if (description !== undefined) { sets.push(`description = $${idx++}`); vals.push(description || null); }
      if (priceNote !== undefined) { sets.push(`price_note = $${idx++}`); vals.push(priceNote || null); }

      await query(
        `insert into odg_ecom.product_overlays (product_code, ${
          description !== undefined ? "description," : ""
        }${priceNote !== undefined ? "price_note," : ""}updated_at)
         values ($1, ${vals.slice(1).map((_, k) => `$${k + 2}`).join(",")}, now())
         on conflict (product_code) do update
           set ${sets.slice(1).join(", ")}`,
        vals,
      );
      const parts: string[] = [];
      if (description !== undefined) parts.push(`description=${description ? `"${description.slice(0, 30)}"` : "ລຶບ"}`);
      if (priceNote !== undefined) parts.push(`price_note=${priceNote || "ລຶບ"}`);
      results.push({ code, status: "ok", message: parts.join(", ") });
    } catch (e) {
      results.push({ code, status: "error", message: e instanceof Error ? e.message : "ຜິດພາດ" });
    }
  }

  revalidatePath("/admin/products");
  return { rows: results };
}
