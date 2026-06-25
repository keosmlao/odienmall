import Link from "next/link";
import Image from "next/image";
import { t, type Locale } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Footer({ locale = "lo" }: { locale?: Locale }) {
  return (
    <footer className="mt-10 border-t border-orange-100 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:py-10">
        <div className="grid gap-5 lg:grid-cols-[1.25fr_2fr_1.1fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-lg bg-white shadow-sm">
                <Image src="/odm.png" alt="ODIENMALL" width={96} height={70} className="h-10 w-auto object-contain" />
              </span>
              <span>
                <span className="block text-base font-black tracking-wide text-white">ODIENMALL</span>
                <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.18em] text-orange-400">Official ODG Store</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm font-semibold leading-7 text-slate-400">
              {t("footer.tagline", locale)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black">
              <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">ສິນຄ້າແທ້</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">ຈັດສົ່ງທົ່ວລາວ</span>
            </div>
          </div>

          <div className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
            <FooterColumn
              title={t("footer.shop", locale)}
              links={[
                ["/products", t("footer.all_products", locale)],
                ["/brands", t("footer.all_brands", locale)],
                ["/cart", t("footer.my_cart", locale)],
                ["/wishlist", "ສິນຄ້າທີ່ມັກ"],
              ]}
            />
            <FooterColumn
              title={t("footer.help", locale)}
              links={[
                ["/promotions", "ໂປຣໂມຊັນ"],
                ["/track", t("footer.track", locale)],
                ["/help", t("footer.faq", locale)],
                ["/policy/shipping", t("footer.shipping", locale)],
                ["/policy/returns", t("footer.returns", locale)],
                ["/affiliate", t("footer.affiliate", locale)],
              ]}
            />
          </div>

          <div className="rounded-lg border border-orange-400/25 bg-orange-500 p-4 text-white shadow-lg shadow-orange-950/15">
            <h4 className="text-sm font-black">{t("footer.contact", locale)}</h4>
            <a href="tel:+8562059929992" className="mt-3 block text-xl font-black tracking-tight hover:underline">
              (+856) 20 5992 9992
            </a>
            <p className="mt-3 text-sm font-semibold leading-7 text-white/85">
              ບ້ານ ຂົວຫຼວງ, ເມືອງ ຈັນທະບູລີ,<br />
              ນະຄອນຫຼວງວຽງຈັນ, ສປປ ລາວ
            </p>
            <Link
              href="/track"
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-black text-orange-600 transition hover:bg-orange-50"
            >
              ຕິດຕາມຄຳສັ່ງຊື້
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ODIENMALL · ODG. ສະຫງວນລິຂະສິດ.</span>
          <div className="flex flex-wrap items-center gap-4">
            <LanguageSwitcher />
            <Link href="/admin/login" className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-orange-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              ລະບົບຈັດການ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white">
        <span className="h-4 w-1 rounded-full bg-orange-500" />
        {title}
      </h4>
      <ul className="grid gap-2 text-sm font-semibold">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="inline-flex rounded-md text-slate-400 transition hover:text-orange-400">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
