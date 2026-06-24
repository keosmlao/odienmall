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
    <div className="min-h-screen adm-surface print:bg-white flex flex-col lg:flex-row">
      <AdminNav adminName={admin?.name} role={admin?.role} chatUnread={chatUnread} returnsPending={returnsPending} qnaOpen={qnaOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        {/* Sticky Desktop Topbar */}
        <header className="sticky top-0 z-20 hidden h-16 w-full items-center justify-between border-b border-slate-200/40 bg-white/70 px-6 backdrop-blur-md lg:flex print:hidden shadow-[0_1px_3px_rgba(15,23,42,0.01)]">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">ລະບົບຈັດການ</span>
            <svg className="h-3 w-3 text-slate-350" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[11px] font-bold text-slate-650 bg-slate-100/80 border border-slate-200/50 rounded-xl px-2.5 py-1">OdienMall Portal</span>
          </div>
          
          {/* Right side: quick stats, admin name, settings, logout button */}
          <div className="flex items-center gap-5">
            {/* Quick stats indicators with reactive alerts */}
            <div className="flex items-center gap-1.5 border-r border-slate-200/80 pr-4">
              <Link href="/admin/chat" className="relative rounded-xl p-2 text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-800" title="ແຊັດ">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6a8.5 8.5 0 0 1-.9-3.9A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
                </svg>
                {chatUnread > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-sm shadow-rose-500/20 animate-pulse">
                    {chatUnread}
                  </span>
                )}
              </Link>
              <Link href="/admin/returns" className="relative rounded-xl p-2 text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-800" title="ຄືນສິນຄ້າ">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8" />
                </svg>
                {returnsPending > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-sm shadow-rose-500/20">
                    {returnsPending}
                  </span>
                )}
              </Link>
              <Link href="/admin/qna" className="relative rounded-xl p-2 text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-800" title="ຖາມ-ຕອບ">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 10h8M8 14h5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                {qnaOpen > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-sm shadow-rose-500/20">
                    {qnaOpen}
                  </span>
                )}
              </Link>
            </div>

            {/* Profile Avatar Capsule */}
            {admin?.name && (
              <div className="flex items-center gap-2.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl p-1 pr-3.5 shadow-xs">
                <span className="grid h-7.5 w-7.5 shrink-0 place-items-center rounded-xl bg-slate-800 text-[10px] font-black text-white shadow-xs">
                  {admin.name.slice(0, 1)}
                </span>
                <div className="flex flex-col min-w-0 leading-none">
                  <span className="text-xs font-bold text-slate-750 truncate max-w-[120px]">{admin.name}</span>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">
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
