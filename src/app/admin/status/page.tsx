import { redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import { getSystemStatus } from "@/lib/system-status";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminStatusPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");
  
  const items = await getSystemStatus();
  const totalCount = items.length;
  const okCount = items.filter((i) => i.level === "ok").length;
  const warnCount = items.filter((i) => i.level === "warn").length;
  const infoCount = items.filter((i) => i.level === "info").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ສະຖານະລະບົບ"
        subtitle={warnCount > 0 ? `${warnCount} ລາຍການຄວນກວດສອບກ່ອນ deploy` : "ການຕັ້ງຄ່າທັງໝົດພ້ອມ deploy ແລ້ວ"}
      />

      {/* Overview Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-slate-400" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">ລາຍການກວດສອບ</span>
            <span className="rounded-lg bg-slate-50 p-1.5 text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900 leading-none">{totalCount} <span className="text-xs font-semibold text-slate-500">ລາຍການ</span></div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 shadow-sm sm:p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">ພ້ອມໃຊ້ງານ (OK)</span>
            <span className="rounded-lg bg-emerald-100/70 text-emerald-700 p-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-800 leading-none">{okCount} <span className="text-xs font-semibold text-emerald-500">ລາຍການ</span></div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-amber-150 bg-amber-50/30 p-4 shadow-sm sm:p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-905">ເຕືອນ (Warning)</span>
            <span className={`rounded-lg bg-amber-100 text-amber-800 p-1.5 ${warnCount > 0 ? "animate-pulse" : ""}`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-950 leading-none">{warnCount} <span className="text-xs font-semibold text-amber-600">ລາຍການ</span></div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-slate-350" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-455">ຂໍ້ມູນ (Info)</span>
            <span className="rounded-lg bg-slate-100 text-slate-600 p-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-800 leading-none">{infoCount} <span className="text-xs font-semibold text-slate-500">ລາຍການ</span></div>
        </div>
      </div>

      {/* Grid of status cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => {
          const isOk = i.level === "ok";
          const isWarn = i.level === "warn";
          
          let borderTheme = "border-slate-200 hover:border-slate-300";
          let bgTheme = "bg-white";
          let leftBar = "bg-slate-300";
          let badgeTheme = "bg-slate-100 text-slate-600";
          let badgeText = "ຂໍ້ມູນ";
          let valueTextTheme = "text-slate-850";

          if (isOk) {
            borderTheme = "border-slate-200 hover:border-emerald-300";
            leftBar = "bg-emerald-500";
            badgeTheme = "bg-emerald-50 text-emerald-700 border border-emerald-100";
            badgeText = "ປອດໄພ";
            valueTextTheme = "text-emerald-800";
          } else if (isWarn) {
            borderTheme = "border-amber-200 hover:border-amber-400";
            bgTheme = "bg-amber-50/10";
            leftBar = "bg-amber-500";
            badgeTheme = "bg-amber-50 text-amber-800 border border-amber-200";
            badgeText = "ເຕືອນ";
            valueTextTheme = "text-amber-900";
          }

          return (
            <div
              key={i.label}
              className={`relative overflow-hidden rounded-xl border p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${borderTheme} ${bgTheme}`}
            >
              {/* Left accent indicator bar */}
              <div className={`absolute inset-y-0 left-0 w-1 ${leftBar}`} />

              <div className="pl-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-black uppercase text-slate-500 tracking-wider truncate max-w-[70%]" title={i.label}>
                    {i.label}
                  </span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${badgeTheme}`}>
                    {badgeText}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-1.5">
                  <span className={`text-base font-black tracking-tight leading-tight break-words ${valueTextTheme}`}>
                    {i.value}
                  </span>
                  {i.hint && (
                    <p className="mt-2 text-xs font-semibold leading-normal text-slate-500">
                      {i.hint}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
