import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getWarehouses, getReceiptHistory } from "@/lib/inventory-stock";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; wh?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const sp = await searchParams;
  const search = (sp.q ?? "").trim();
  const whCode = (sp.wh ?? "").trim();

  const [warehouses, docs] = await Promise.all([
    getWarehouses(),
    getReceiptHistory({ search, whCode, limit: 40 }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="ປະຫວັດການຮັບສິນຄ້າເຂົ້າສາງ"
        subtitle="ຈາກ serial ledger (sn_trans_detail · ຮັບເຂົ້າ) — read-only"
        back={{ href: "/admin/stock", label: "ສິນຄ້າຄົງເຫຼືອ" }}
      />

      <form className="flex flex-wrap items-end gap-2" action="/admin/stock/receipts">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-500">ຄົ້ນຫາ</label>
          <input name="q" defaultValue={search} placeholder="ເລກໃບ / ລະຫັດ / ຊື່ສິນຄ້າ"
            className="w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-500">ສາງ</label>
          <select name="wh" defaultValue={whCode}
            className="w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500">
            <option value="">— ທຸກສາງ —</option>
            {warehouses.map((w) => <option key={w.code} value={w.code}>{w.code} · {w.name}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600">ຄົ້ນຫາ</button>
        {(search || whCode) && <Link href="/admin/stock/receipts" className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:text-slate-900">ລ້າງ</Link>}
      </form>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-500">ບໍ່ພົບການຮັບສິນຄ້າ</div>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <div key={`${d.docNo}-${d.warehouse}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
                <div>
                  <span className="font-mono text-sm font-bold text-slate-900">{d.docNo}</span>
                  <span className="ml-2 text-xs text-slate-500">{fmtDate(d.docDate)} · {d.whName}</span>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
                  {d.itemCount} ລາຍການ · {d.totalQty.toLocaleString()} ໜ່ວຍ
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {d.items.map((it) => (
                    <tr key={it.code} className="text-slate-700">
                      <td className="px-4 py-2"><div className="truncate">{it.name}</div><div className="text-[11px] text-slate-500">{it.code}</div></td>
                      <td className="px-4 py-2 text-right tabular-nums">{it.qty.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-[11px] text-slate-500">{it.snCount} SN</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
