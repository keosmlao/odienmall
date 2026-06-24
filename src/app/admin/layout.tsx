import Link from "next/link";
import { isAdmin, getAdminSession } from "@/lib/auth";
import { getTotalUnread } from "@/lib/chat";
import { countPendingReturns } from "@/lib/returns";
import { countOpenQuestions } from "@/lib/qna";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Not authenticated (e.g. /admin/login) → render full-bleed, no admin chrome.
  // The login page owns its own full-screen layout.
  if (!(await isAdmin())) {
    return <>{children}</>;
  }

  const admin = await getAdminSession();
  const [chatUnread, returnsPending, qnaOpen] = await Promise.all([
    getTotalUnread().catch(() => 0),
    countPendingReturns().catch(() => 0),
    countOpenQuestions().catch(() => 0),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white flex flex-col lg:flex-row">
      <AdminNav adminName={admin?.name} role={admin?.role} chatUnread={chatUnread} returnsPending={returnsPending} qnaOpen={qnaOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        {/* Sticky Desktop Topbar */}
        <header className="sticky top-0 z-20 hidden h-16 w-full items-center justify-between border-b border-slate-200/50 bg-white/80 px-6 backdrop-blur-md lg:flex print:hidden">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ລະບົບຈັດການ</span>
            <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 rounded-md px-2 py-1">OdienMall Portal</span>
          </div>
          
          {/* Right side: quick stats, admin name, settings, logout button */}
          <div className="flex items-center gap-5">
            {/* Quick stats indicators with reactive alerts */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-4">
              <Link href="/admin/chat" className="relative rounded-lg p-1.5 text-slate-450 transition hover:bg-slate-150/50 hover:text-slate-755" title="ແຊັດ">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6a8.5 8.5 0 0 1-.9-3.9A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
                </svg>
                {chatUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm shadow-rose-500/20 animate-pulse">
                    {chatUnread}
                  </span>
                )}
              </Link>
              <Link href="/admin/returns" className="relative rounded-lg p-1.5 text-slate-450 transition hover:bg-slate-150/50 hover:text-slate-755" title="ຄືນສິນຄ້າ">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8" />
                </svg>
                {returnsPending > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm shadow-rose-500/20">
                    {returnsPending}
                  </span>
                )}
              </Link>
              <Link href="/admin/qna" className="relative rounded-lg p-1.5 text-slate-450 transition hover:bg-slate-150/50 hover:text-slate-755" title="ຖາມ-ຕອບ">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 10h8M8 14h5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                {qnaOpen > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm shadow-rose-500/20">
                    {qnaOpen}
                  </span>
                )}
              </Link>
            </div>

            {/* Profile Avatar */}
            {admin?.name && (
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-xs font-bold text-white shadow-sm shadow-orange-500/20">
                  {admin.name.slice(0, 1)}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700 leading-tight">{admin.name}</span>
                  <span className="text-[10px] text-slate-400 font-bold leading-none uppercase tracking-wide">
                    {admin.role || "Staff"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="w-full px-4 py-5 sm:px-5 lg:px-6 print:m-0 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
