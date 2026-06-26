import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getWarehouses, getStockByWarehouse } from "@/lib/inventory-stock";
import { PageHeader, ButtonLink, Card, TableShell, THEAD, TH, TBODY, TR, TD, EmptyState } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; wh?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const sp = await searchParams;
  const search = (sp.q ?? "").trim();
  const whCode = (sp.wh ?? "").trim();

  const [warehouses, rows] = await Promise.all([
    getWarehouses(),
    getStockByWarehouse({ search, whCode }),
  ]);

  // Group rows by product for display.
  const byProduct = new Map<string, { name: string; lines: typeof rows; total: number }>();
  for (const r of rows) {
    let g = byProduct.get(r.code);
    if (!g) { g = { name: r.name, lines: [], total: 0 }; byProduct.set(r.code, g); }
    g.lines.push(r);
    g.total += r.qty;
  }
  const products = [...byProduct.entries()];
  const hasFilter = !!(search || whCode);

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="ສິນຄ້າຄົງເຫຼືອຕາມສາງ"
        subtitle="ຍອດຄົງເຫຼືອ realtime ຈາກ SML (ກົງກັບຕອນອອກບິນ/ໃບເບີກ)"
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/admin/stock/sales-warehouses">ກຳນົດສາງຂາຍ</ButtonLink>
            <ButtonLink href="/admin/stock/receipts">ປະຫວັດການຮັບເຂົ້າ</ButtonLink>
            <ButtonLink href="/admin/stock/transfer" variant="primary">ໃບຂໍໂອນສິນຄ້າ</ButtonLink>
          </div>
        }
      />

      {/* Filters card */}
      <Card padded={true} className="bg-slate-50/50">
        <form className="flex flex-wrap items-end gap-3" action="/admin/stock">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">ຄົ້ນຫາສິນຄ້າ</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                name="q" 
                defaultValue={search} 
                placeholder="ລະຫັດ ຫຼື ຊື່ສິນຄ້າ..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-bold text-slate-800 outline-none transition focus:border-orange-500 shadow-sm" 
              />
            </div>
          </div>
          
          <div className="flex-1 min-w-[200px] max-w-xs">
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">ສາງ</label>
            <select 
              name="wh" 
              defaultValue={whCode}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none transition focus:border-orange-500 shadow-sm"
            >
              <option value="">— ທຸກສາງ —</option>
              {warehouses.map((w) => <option key={w.code} value={w.code}>{w.code} · {w.name}</option>)}
            </select>
          </div>
          
          <button 
            type="submit" 
            className="h-9 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-xs font-black text-white shadow-sm transition active:scale-[0.98]"
          >
            ຄົ້ນຫາ
          </button>
          
          {hasFilter && (
            <Link 
              href="/admin/stock" 
              className="h-9 px-4 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-black text-slate-500 hover:text-slate-800 shadow-sm transition"
            >
              ລ້າງຄຳຄົ້ນຫາ
            </Link>
          )}
        </form>
      </Card>

      {!hasFilter ? (
        <EmptyState
          title="ເລືອກສາງ ຫຼື ຄົ້ນຫາສິນຄ້າ"
          hint="ກະລຸນາເລືອກສາງ ຫຼື ປ້ອນຄຳຄົ້ນຫາດ້ານເທິງ ເພື່ອສະແດງລາຍການສິນຄ້າຄົງເຫຼືອ"
          icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      ) : products.length === 0 ? (
        <EmptyState
          title="ບໍ່ພົບສິນຄ້າຄົງເຫຼືອ"
          hint="ລອງຄົ້ນຫາດ້ວຍຄຳສັບອື່ນ ຫຼື ກວດສອບຕົວເລືອກສາງຂອງທ່ານຄືນໃໝ່"
          icon="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              ພົບເຫັນ {products.length} ລາຍການສິນຄ້າ
            </span>
          </div>

          <Card padded={false}>
            <TableShell minWidth={850}>
              <thead className={THEAD}>
                <tr>
                  <th className={`${TH} w-32`}>ລະຫັດສິນຄ້າ</th>
                  <th className={TH}>ຊື່ສິນຄ້າ</th>
                  <th className={TH}>ສາງ</th>
                  <th className={TH}>ຊັ້ນວາງສິນຄ້າ</th>
                  <th className={`${TH} text-right`}>ຈຳນວນຄົງເຫຼືອ</th>
                  <th className={`${TH} text-center w-28`}>ຍອດລວມ</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {products.map(([code, g]) => {
                  return g.lines.map((l, index) => {
                    const isLast = index === g.lines.length - 1;
                    return (
                      <tr 
                        key={`${code}-${index}`} 
                        className={`${TR} ${isLast ? "border-b border-slate-200" : "border-b border-slate-100/50"}`}
                      >
                        {index === 0 && (
                          <td 
                            className={`${TD} font-mono text-xs font-bold text-slate-500 bg-slate-50/30 align-top pt-4`} 
                            rowSpan={g.lines.length}
                          >
                            <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                              {code}
                            </span>
                          </td>
                        )}
                        {index === 0 && (
                          <td 
                            className={`${TD} font-bold text-slate-800 bg-slate-50/10 align-top pt-4 max-w-sm`} 
                            rowSpan={g.lines.length}
                          >
                            <div className="line-clamp-2 leading-relaxed" title={g.name}>
                              {g.name}
                            </div>
                          </td>
                        )}
                        <td className={`${TD} font-semibold text-slate-750`}>
                          {l.whName}
                        </td>
                        <td className={`${TD} text-slate-450 font-semibold`}>
                          {l.shelfName || "—"}
                        </td>
                        <td className={`${TD} text-right font-extrabold tabular-nums text-slate-800`}>
                          {l.qty.toLocaleString()}
                        </td>
                        {index === 0 && (
                          <td 
                            className={`${TD} text-center align-middle bg-slate-50/20`} 
                            rowSpan={g.lines.length}
                          >
                            <span className="inline-flex min-h-6 min-w-[60px] items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700 tabular-nums">
                              {g.total.toLocaleString()}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </TableShell>
          </Card>
        </div>
      )}
    </div>
  );
}
