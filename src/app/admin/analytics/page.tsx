import { redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import { getVisitStats, type VisitBucket } from "@/lib/analytics";
import { PageHeader, Card } from "@/components/admin/ui";
import OnlineNow from "./OnlineNow";

export const dynamic = "force-dynamic";

export default async function AdminAnalytics() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");

  const stats = await getVisitStats();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="ສະຖິຕິຜູ້ເຂົ້າເວັບ"
        subtitle="ຈຳນວນຜູ້ເຂົ້າຊົມຮ້ານ — ສົດ, ລາຍວັນ ແລະ ລາຍເດືອນ."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OnlineNow initial={stats.online} />
        <Stat label="ມື້ນີ້ (ຄົນ)" value={stats.todayVisitors} sub={`${stats.todayViews.toLocaleString("en-US")} ການເບິ່ງ`} />
        <Stat label="ເດືອນນີ້ (ຄົນ)" value={stats.monthVisitors} />
        <Stat label="ການເບິ່ງທັງໝົດ" value={stats.totalViews} />
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 text-sm font-bold text-slate-900">ລາຍວັນ (14 ມື້ຫຼ້າສຸດ)</h2>
        <BarChart data={stats.daily} color="bg-orange-400" empty="ຍັງບໍ່ມີຂໍ້ມູນການເຂົ້າຊົມ" />
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-bold text-slate-900">ລາຍເດືອນ (12 ເດືອນຫຼ້າສຸດ)</h2>
        <BarChart data={stats.monthly} color="bg-indigo-400" empty="ຍັງບໍ່ມີຂໍ້ມູນການເຂົ້າຊົມ" />
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-450">{label}</div>
      <div className="mt-2 text-3xl font-black text-slate-900">{value.toLocaleString("en-US")}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

// Horizontal bars: visitors (primary) with the view count alongside.
function BarChart({ data, color, empty }: { data: VisitBucket[]; color: string; empty: string }) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">{empty}</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.visitors));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-xs">
          <span className="w-20 shrink-0 font-medium text-slate-500">{d.label}</span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
            <div
              className={`h-full rounded ${color}`}
              style={{ width: `${Math.round((d.visitors / max) * 100)}%`, minWidth: d.visitors > 0 ? "2px" : "0" }}
            />
          </div>
          <span className="w-24 shrink-0 text-right font-semibold text-slate-700">
            {d.visitors.toLocaleString("en-US")} ຄົນ
          </span>
          <span className="hidden w-24 shrink-0 text-right text-slate-400 sm:block">
            {d.views.toLocaleString("en-US")} ເບິ່ງ
          </span>
        </div>
      ))}
    </div>
  );
}
