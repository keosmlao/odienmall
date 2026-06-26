import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getWarehouses } from "@/lib/inventory-stock";
import { getTransferDocs } from "@/lib/stock-transfer";
import { smlDirectWriteEnabled } from "@/lib/sml-sale-order";
import { PageHeader, Card, CardTitle, TableShell, THEAD, TH, TBODY, TR, TD, Badge, EmptyState } from "@/components/admin/ui";
import TransferForm from "./TransferForm";

export const dynamic = "force-dynamic";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default async function TransferPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const [warehouses, docs] = await Promise.all([getWarehouses(), getTransferDocs({ limit: 30 })]);
  const gateOff = !smlDirectWriteEnabled();

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="ໃບຂໍໂອນສິນຄ້າ (FR)"
        subtitle="ຈັດການໂອນສິນຄ້າລະຫວ່າງສາງ ຫຼື ໂອນຄືນສິນຄ້າ — ບັນທຶກລົງ ERP ໂດຍກົງ"
        back={{ href: "/admin/stock", label: "ສິນຄ້າຄົງເຫຼືອ" }}
      />

      {gateOff && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-800 shadow-sm backdrop-blur-sm">
          <svg className="h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-xs sm:text-sm font-semibold leading-relaxed">
            <span className="font-bold">SML_DIRECT_WRITE ປິດ:</span> ການສ້າງໃບຂໍໂອນຈະບໍ່ບັນທຶກລົງ ERP (ໃຫ້ເປີດ gate ກ່ອນໃຊ້ຈິງ).
          </div>
        </div>
      )}

      <TransferForm warehouses={warehouses} />

      {/* Recent docs */}
      <Card padded={true}>
        <CardTitle hint={<span className="text-[11px] font-bold text-slate-400">ສະແດງ 30 ລາຍການຫຼ້າສຸດ</span>}>
          ໃບຂໍໂອນຫຼ້າສຸດ
        </CardTitle>
        
        {docs.length === 0 ? (
          <EmptyState 
            title="ຍັງບໍ່ມີໃບຂໍໂອນສິນຄ້າ" 
            hint="ເລີ່ມສ້າງໃບຂໍໂອນສິນຄ້າໂດຍການເລືອກສາງ ແລະ ປ້ອນລາຍການສິນຄ້າດ້ານເທິງ" 
            icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        ) : (
          <TableShell minWidth={600}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>ເລກທີໃບໂອນ</th>
                <th className={TH}>ວັນທີສ້າງ</th>
                <th className={TH}>ປະເພດ</th>
                <th className={TH}>ເສັ້ນທາງການໂອນ (ສາງຕົ້ນທາງ ➔ ປາຍທາງ)</th>
              </tr>
            </thead>
            <tbody className={TBODY}>
              {docs.map((d) => (
                <tr key={d.docNo} className={TR}>
                  <td className={TD}>
                    <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-800">
                      {d.docNo}
                    </span>
                  </td>
                  <td className={`${TD} text-slate-500 font-medium`}>
                    {fmtDate(d.docDate)}
                  </td>
                  <td className={TD}>
                    {d.kind === "return" ? (
                      <Badge tone="rose">ໂອນຄືນ</Badge>
                    ) : (
                      <Badge tone="blue">ໂອນມາສາງ</Badge>
                    )}
                  </td>
                  <td className={`${TD} font-semibold text-slate-700`}>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-50 border border-slate-150 px-2 py-1 text-xs font-bold text-slate-600 shadow-sm">
                        {d.whFrom}
                      </span>
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="rounded bg-orange-50 border border-orange-100 px-2 py-1 text-xs font-bold text-orange-700 shadow-sm">
                        {d.whTo}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
