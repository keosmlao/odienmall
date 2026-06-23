import Link from "next/link";
import type { GroupMain } from "@/lib/types";
import type { HomeBanner } from "@/lib/banners";
import HomeBannerSlider from "./HomeBannerSlider";

export default function MarketplaceHero({
  groups,
  banners,
}: {
  groups: GroupMain[];
  banners: HomeBanner[];
}) {
  const categories = groups.flatMap((group) =>
    group.subs.map((sub) => ({
      ...sub,
      mainCode: group.code,
      mainName: group.name,
    })),
  );

  return (
    <section className="!mb-3 !border-0 !bg-transparent !p-0 !shadow-none">
      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
        <aside className="hidden min-h-[360px] overflow-hidden rounded bg-white shadow-sm lg:block">
          <div className="flex h-11 items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-400 px-4 text-sm font-bold text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
            ໝວດໝູ່ສິນຄ້າ
          </div>
          <nav className="py-1.5">
            {categories.slice(0, 10).map((category) => (
              <Link
                key={`${category.mainCode}-${category.code}`}
                href={`/group/${encodeURIComponent(category.mainCode)}/${encodeURIComponent(category.code)}`}
                className="group flex h-[30px] items-center justify-between gap-2 px-4 text-xs text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
              >
                <span className="min-w-0 truncate">{category.name}</span>
                <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-orange-400">›</span>
              </Link>
            ))}
          </nav>
          <Link
            href="/products"
            className="mx-3 mt-1 block border-t border-slate-100 px-1 pt-2 text-xs font-semibold text-orange-600"
          >
            ເບິ່ງທຸກໝວດໝູ່ ›
          </Link>
        </aside>

        <HomeBannerSlider slides={banners} />

        <div className="hidden grid-rows-2 gap-3 lg:grid">
          <Link
            href="/products?sort=newest"
            className="group relative overflow-hidden rounded bg-gradient-to-br from-[#fff0db] to-[#ffd2a8] p-5 shadow-sm"
          >
            <span className="absolute -bottom-8 -right-6 text-8xl font-black text-orange-500/10">NEW</span>
            <span className="text-[10px] font-black tracking-[0.16em] text-orange-600">NEW ARRIVALS</span>
            <strong className="mt-2 block text-xl leading-tight text-slate-900">ສິນຄ້າມາໃໝ່</strong>
            <span className="mt-3 inline-flex text-xs font-bold text-orange-600 transition group-hover:translate-x-1">
              ເລືອກຊື້ ›
            </span>
          </Link>
          <Link
            href="/brands"
            className="group relative overflow-hidden rounded bg-gradient-to-br from-[#e8f2ff] to-[#c7dcff] p-5 shadow-sm"
          >
            <span className="absolute -bottom-5 -right-2 text-8xl text-blue-600/10">✦</span>
            <span className="text-[10px] font-black tracking-[0.16em] text-blue-600">TOP BRANDS</span>
            <strong className="mt-2 block text-xl leading-tight text-slate-900">ແບຣນຊັ້ນນຳ</strong>
            <span className="mt-3 inline-flex text-xs font-bold text-blue-600 transition group-hover:translate-x-1">
              ເບິ່ງແບຣນ ›
            </span>
          </Link>
        </div>
      </div>

      <div className="thin-scroll mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {categories.slice(0, 8).map((category, index) => (
          <Link
            key={`${category.mainCode}-${category.code}`}
            href={`/group/${encodeURIComponent(category.mainCode)}/${encodeURIComponent(category.code)}`}
            className="flex min-w-28 items-center gap-2 rounded bg-white p-2.5 text-xs font-medium text-slate-700 shadow-sm"
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
              ["bg-orange-100 text-orange-600", "bg-blue-100 text-blue-600", "bg-violet-100 text-violet-600"][index % 3]
            }`}>
              {category.name.slice(0, 1)}
            </span>
            <span className="line-clamp-2">{category.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
