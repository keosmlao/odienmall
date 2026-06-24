import { redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import { getSystemStatus, type StatusLevel } from "@/lib/system-status";
import { PageHeader, Card, CardTitle } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const DOT: Record<StatusLevel, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  info: "bg-slate-300",
};
const TEXT: Record<StatusLevel, string> = {
  ok: "text-emerald-600",
  warn: "text-amber-600",
  info: "text-slate-500",
};

export default async function AdminStatusPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");
  const items = await getSystemStatus();
  const warns = items.filter((i) => i.level === "warn").length;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="ສະຖານະລະບົບ"
        subtitle={warns > 0 ? `${warns} ລາຍການຄວນກວດກ່ອນ deploy` : "ການຕັ້ງຄ່າພ້ອມ deploy"}
      />
      <Card>
        <CardTitle hint="ບໍ່ສະແດງຄ່າລັບ — ສະແດງສະຖານະເທົ່ານັ້ນ">ກວດການຕັ້ງຄ່າ</CardTitle>
        <div className="divide-y divide-slate-100">
          {items.map((i) => (
            <div key={i.label} className="flex items-start gap-3 py-3">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[i.level]}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm font-bold text-slate-800">{i.label}</span>
                  <span className={`text-sm font-semibold ${TEXT[i.level]}`}>{i.value}</span>
                </div>
                {i.hint && <p className="mt-0.5 text-xs text-slate-400">{i.hint}</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
