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

  // Custom SVGs for stats card headers
  const TodayIcon = (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  const MonthIcon = (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const ViewsIcon = (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="ສະຖິຕິຜູ້ເຂົ້າເວັບ"
        subtitle="ຈຳນວນຜູ້ເຂົ້າຊົມຮ້ານ — ສົດ, ລາຍວັນ ແລະ ລາຍເດືອນ."
      />

      {/* Overview Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OnlineNow initial={stats.online} />
        
        <Stat
          label="ມື້ນີ້"
          value={stats.todayVisitors}
          unit="ຄົນ"
          accentColor="orange"
          icon={TodayIcon}
          sub={
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="font-bold text-slate-500">
                {stats.todayViews.toLocaleString("en-US")} ການເບິ່ງ
              </span>
            </span>
          }
        />

        <Stat
          label="ເດືອນນີ້"
          value={stats.monthVisitors}
          unit="ຄົນ"
          accentColor="indigo"
          icon={MonthIcon}
          sub={
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-bold text-slate-500">ເດືອນປະຈຸບັນ</span>
            </span>
          }
        />

        <Stat
          label="ການເບິ່ງທັງໝົດ"
          value={stats.totalViews}
          unit="ຄັ້ງ"
          accentColor="blue"
          icon={ViewsIcon}
          sub={
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
              </svg>
              <span className="font-bold text-slate-500">ສະສົມທັງໝົດ</span>
            </span>
          }
        />
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <BarChartCard
            title="ລາຍວັນ (14 ມື້ຫຼ້າສຸດ)"
            subtitle="ສະຖິຕິການເຂົ້າຊົມລາຍວັນ"
            data={stats.daily}
            colorGradient="from-orange-500 to-amber-500"
            empty="ຍັງບໍ່ມີຂໍ້ມູນການເຂົ້າຊົມ"
          />
        </Card>

        <Card>
          <BarChartCard
            title="ລາຍເດືອນ (12 ເດືອນຫຼ້າສຸດ)"
            subtitle="ສະຖິຕິການເຂົ້າຊົມລາຍເດືອນ"
            data={stats.monthly}
            colorGradient="from-indigo-600 to-purple-500"
            empty="ຍັງບໍ່ມີຂໍ້ມູນການເຂົ້າຊົມ"
          />
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit = "ຄົນ",
  sub,
  icon,
  accentColor = "indigo",
}: {
  label: string;
  value: number;
  unit?: string;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  accentColor?: "orange" | "indigo" | "blue" | "emerald";
}) {
  const colorMap = {
    orange: {
      border: "hover:border-orange-200 hover:shadow-orange-500/5",
      icon: "text-orange-500 bg-orange-50 border-orange-100",
    },
    indigo: {
      border: "hover:border-indigo-200 hover:shadow-indigo-500/5",
      icon: "text-indigo-500 bg-indigo-50 border-indigo-100",
    },
    blue: {
      border: "hover:border-blue-200 hover:shadow-blue-500/5",
      icon: "text-blue-500 bg-blue-50 border-blue-100",
    },
    emerald: {
      border: "hover:border-emerald-200 hover:shadow-emerald-500/5",
      icon: "text-emerald-500 bg-emerald-50 border-emerald-100",
    },
  };

  const colors = colorMap[accentColor];

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${colors.border}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div>
        <div className={`rounded-xl border p-2 transition-all duration-300 group-hover:scale-110 ${colors.icon}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {value.toLocaleString("en-US")}
        </span>
        <span className="text-xs font-bold text-slate-500">{unit}</span>
      </div>
      {sub && <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function BarChartCard({
  title,
  subtitle,
  data,
  colorGradient,
  empty,
}: {
  title: string;
  subtitle?: string;
  data: VisitBucket[];
  colorGradient: string;
  empty: string;
}) {
  if (data.length === 0) {
    return (
      <div>
        <h3 className="mb-4 text-sm font-bold text-slate-900">{title}</h3>
        <p className="py-6 text-center text-sm text-slate-500">{empty}</p>
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.visitors));
  const totalVisitors = data.reduce((sum, d) => sum + d.visitors, 0);
  const totalViews = data.reduce((sum, d) => sum + d.views, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs font-semibold text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <div className="rounded-lg bg-slate-50 px-2 py-1 border border-slate-100 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
            <span className="font-extrabold text-slate-600">{totalVisitors.toLocaleString()} ຄົນ</span>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-1 border border-slate-100 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-350" />
            <span className="font-extrabold text-slate-500">{totalViews.toLocaleString()} ເບິ່ງ</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((d) => {
          const isPeak = d.visitors === max && max > 0;
          return (
            <div key={d.label} className="group flex items-center gap-3 rounded-lg p-1 transition-colors duration-200 hover:bg-slate-50/50 text-xs">
              <span className={`w-20 shrink-0 font-bold transition-colors duration-200 ${isPeak ? 'text-slate-900' : 'text-slate-450'}`}>
                {d.label}
              </span>
              
              <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-slate-50 border border-slate-100/50">
                <div
                  className={`h-full rounded-md bg-gradient-to-r shadow-sm transition-all duration-500 ${colorGradient}`}
                  style={{
                    width: `${Math.round((d.visitors / max) * 100)}%`,
                    minWidth: d.visitors > 0 ? "4px" : "0"
                  }}
                />
              </div>

              <div className="flex w-28 shrink-0 items-center justify-end gap-1.5">
                <span className={`font-black text-right ${isPeak ? 'text-slate-950' : 'text-slate-700'}`}>
                  {d.visitors.toLocaleString("en-US")} ຄົນ
                </span>
                {isPeak && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-orange-50 border border-orange-100 px-1 py-0.5 text-[8px] font-black text-orange-600 uppercase tracking-wide">
                    🔥 ສູງສຸດ
                  </span>
                )}
              </div>

              <span className="hidden w-16 shrink-0 text-right font-semibold text-slate-500 sm:block">
                {d.views.toLocaleString("en-US")} ເບິ່ງ
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
