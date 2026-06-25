import Header from "@/components/Header";
import GroupMenu from "@/components/GroupMenu";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import AnnouncementBar from "@/components/AnnouncementBar";
import ChatWidget from "@/components/ChatWidget";
import BackToTop from "@/components/BackToTop";
import CartAddedToast from "@/components/CartAddedToast";
import CartSync from "@/components/CartSync";
import CartSyncClient from "@/components/CartSyncClient";
import VisitTracker from "@/components/VisitTracker";
import { getAnnouncement } from "@/lib/settings";
import { getSession } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import { LocaleProvider } from "@/lib/i18n-context";
import PageTransitionLoader from "@/components/PageTransitionLoader";
import LiffAutoLogin from "@/components/LiffAutoLogin";
import { autoUpgradeTier } from "@/lib/member-tier";
import { getBalance } from "@/lib/loyalty";

export default async function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [ann, session, locale] = await Promise.all([
    getAnnouncement(),
    getSession(),
    getLocale(),
  ]);

  const [tierData, points] = session
    ? await Promise.all([
        autoUpgradeTier(session.code).catch(() => null),
        getBalance(session.code).catch(() => 0),
      ])
    : [null, 0];
  return (
    <LocaleProvider locale={locale}>
      <PageTransitionLoader />
      <div className="shop-shell flex min-h-screen flex-col bg-[#f5f5f5]">
        {ann.enabled && ann.message && (
          <AnnouncementBar message={ann.message} link={ann.link} />
        )}
        <div className="sticky top-0 z-40 shadow-[0_2px_16px_rgba(15,23,42,0.07)]">
          <Header initialTier={tierData} points={points} />
          <GroupMenu />
        </div>
        <main className="shop-main mx-auto w-full max-w-[1400px] flex-1 overflow-x-clip px-3 py-4 pb-24 sm:px-4 sm:py-6 sm:pb-6">
          {children}
        </main>
        <Footer locale={locale} />
        <MobileNav />
        <ChatWidget />
        <BackToTop />
        <CartAddedToast />
        <CartSync enabled={!!session} />
        {session && <CartSyncClient customerCode={session.code} />}
        <VisitTracker />
        {process.env.NEXT_PUBLIC_LINE_LIFF_ID && (
          <LiffAutoLogin
            liffId={process.env.NEXT_PUBLIC_LINE_LIFF_ID}
            loggedIn={!!session}
          />
        )}
      </div>
    </LocaleProvider>
  );
}
