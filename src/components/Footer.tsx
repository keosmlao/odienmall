import Link from "next/link";
import Image from "next/image";
import { t, type Locale } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Footer({ locale = "lo" }: { locale?: Locale }) {
  return (
    <footer className="mt-12 border-t-4 border-orange-500 bg-white text-slate-500">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <div>
            <Link href="/" className="inline-block transition-transform duration-200 hover:scale-[1.02]">
              <span className="inline-flex items-center rounded-xl bg-white p-2 shadow-md">
                <Image
                  src="/odm.png"
                  alt="ODIENMALL"
                  width={100}
                  height={72}
                  className="h-10 w-auto object-contain"
                />
              </span>
            </Link>
          </div>
          <p className="text-sm leading-relaxed text-slate-500">
            {t("footer.tagline", locale)}
          </p>
        </div>
        <div>
          <h4 className="mb-4 border-l-4 border-orange-500 pl-2 text-xs font-bold uppercase tracking-wider text-slate-800">{t("footer.shop", locale)}</h4>
          <ul className="space-y-3 text-sm">
            <li><Link href="/products" className="transition hover:text-orange-600">{t("footer.all_products", locale)}</Link></li>
            <li><Link href="/brands" className="transition hover:text-orange-600">{t("footer.all_brands", locale)}</Link></li>
            <li><Link href="/cart" className="transition hover:text-orange-600">{t("footer.my_cart", locale)}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 border-l-4 border-orange-500 pl-2 text-xs font-bold uppercase tracking-wider text-slate-800">{t("footer.help", locale)}</h4>
          <ul className="space-y-3 text-sm">
            <li><Link href="/promotions" className="transition hover:text-orange-600">ໂປຣໂມຊັນແຕ້ມ</Link></li>
            <li><Link href="/track" className="transition hover:text-orange-600">{t("footer.track", locale)}</Link></li>
            <li><Link href="/help" className="transition hover:text-orange-600">{t("footer.faq", locale)}</Link></li>
            <li><Link href="/policy/shipping" className="transition hover:text-orange-600">{t("footer.shipping", locale)}</Link></li>
            <li><Link href="/policy/returns" className="transition hover:text-orange-600">{t("footer.returns", locale)}</Link></li>
            <li><Link href="/affiliate" className="transition hover:text-orange-600">{t("footer.affiliate", locale)}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 border-l-4 border-orange-500 pl-2 text-xs font-bold uppercase tracking-wider text-slate-800">{t("footer.contact", locale)}</h4>
          <ul className="space-y-3 text-sm">
            <li>
              ໂທ:{" "}
              <a href="tel:+8562059929992" className="font-semibold text-orange-600 transition hover:text-orange-700">
                (+856) 20 5992 9992
              </a>
            </li>
            <li className="leading-relaxed">
              ບ້ານ ຂົວຫຼວງ, ເມືອງ ຈັນທະບູລີ,<br />
              ນະຄອນຫຼວງວຽງຈັນ, ສປປ ລາວ
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 bg-slate-50 py-5">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-6 text-center text-xs text-slate-400 sm:flex-row">
          <span>© {new Date().getFullYear()} ODIENMALL · ODG. ສະຫງວນລິຂະສິດ.</span>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href="/admin/login" className="inline-flex items-center gap-1.5 transition hover:text-orange-600">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            ສຳລັບພະນັກງານ (ລະບົບຈັດການ)
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
