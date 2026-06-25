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

export default async function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [ann, session, locale] = await Promise.all([
    getAnnouncement(),
    getSession(),
    getLocale(),
  ]);
  return (
    <LocaleProvider locale={locale}>
      <div className="shop-shell flex min-h-screen flex-col bg-[#f5f5f5]">
        {ann.enabled && ann.message && (
          <AnnouncementBar message={ann.message} link={ann.link} />
        )}
        <Header />
        <GroupMenu />
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
      </div>
    </LocaleProvider>
  );
}
