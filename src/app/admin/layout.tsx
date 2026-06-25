import Link from "next/link";
import { isAdmin, getAdminSession } from "@/lib/auth";
import { getTotalUnread } from "@/lib/chat";
import { countPendingReturns } from "@/lib/returns";
import { countOpenQuestions } from "@/lib/qna";
import { getOrderStats } from "@/lib/orders";
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
  const [chatUnread, returnsPending, qnaOpen, orderStats] = await Promise.all([
    getTotalUnread().catch(() => 0),
    countPendingReturns().catch(() => 0),
    countOpenQuestions().catch(() => 0),
    getOrderStats().catch(() => null),
  ]);
  const pendingOrders =
    (orderStats?.byStatus.pending ?? 0) +
    (orderStats?.byStatus.awaiting_confirmation ?? 0) +
    (orderStats?.byStatus.cod ?? 0);

  return (
    <div className="adm-surface flex min-h-screen flex-col print:bg-white lg:flex-row">
      <AdminNav adminName={admin?.name} role={admin?.role} chatUnread={chatUnread} returnsPending={returnsPending} qnaOpen={qnaOpen} pendingOrders={pendingOrders} />
      
      <div className="flex min-w-0 flex-1 flex-col lg:pl-56">
        <header className="sticky top-0 z-20 hidden h-14 w-full items-center justify-between border-b border-slate-200 bg-white/85 px-5 backdrop-blur lg:flex print:hidden">
          <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,#f97316,#22c55e,#06b6d4,#e11d48)]" />
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ລະບົບຈັດການ</span>
            <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-black text-orange-700">OdienMall Studio</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 border-r border-slate-200 pr-3">
              <Link href="/admin/chat" className="adm-focus relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" title="ແຊັດ">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6a8.5 8.5 0 0 1-.9-3.9A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
                </svg>
                {chatUnread > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-md bg-rose-600 px-1 text-[9px] font-black text-white">
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </span>
                )}
              </Link>
              <Link href="/admin/returns" className="adm-focus relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" title="ຄືນສິນຄ້າ">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8" />
                </svg>
                {returnsPending > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-md bg-rose-600 px-1 text-[9px] font-black text-white">
                    {returnsPending > 99 ? "99+" : returnsPending}
                  </span>
                )}
              </Link>
              <Link href="/admin/qna" className="adm-focus relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" title="ຖາມ-ຕອບ">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 10h8M8 14h5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                {qnaOpen > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-md bg-rose-600 px-1 text-[9px] font-black text-white">
                    {qnaOpen > 99 ? "99+" : qnaOpen}
                  </span>
                )}
              </Link>
            </div>

            {admin?.name && (
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-1 pr-3 shadow-sm">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[linear-gradient(135deg,#f97316,#22c55e)] text-[10px] font-black text-white">
                  {admin.name.slice(0, 1)}
                </span>
                <div className="flex flex-col min-w-0 leading-none">
                  <span className="max-w-[140px] truncate text-xs font-black text-slate-800">{admin.name}</span>
                  <span className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                    {admin.role || "Staff"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="w-full overflow-x-clip px-3 py-4 sm:px-5 sm:py-5 lg:px-6 xl:px-8 print:m-0 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
