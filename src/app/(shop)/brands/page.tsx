import Link from "next/link";
import { getWebBrands } from "@/lib/catalog";
import Breadcrumb from "@/components/Breadcrumb";
import BrandLogo from "@/components/BrandLogo";
import StorePageHeader from "@/components/StorePageHeader";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await getWebBrands();

  return (
    <div>
      <Breadcrumb items={[{ label: "ຍີ່ຫໍ້ທັງໝົດ" }]} />
      <section className="!p-0">
      <StorePageHeader
        title="ຍີ່ຫໍ້ທັງໝົດ"
        subtitle={`ເລືອກຊື້ສິນຄ້າຈາກ ${brands.length} ແບຣນຊັ້ນນຳ`}
      />
      {brands.length === 0 ? (
        <p className="p-12 text-center text-gray-400">ບໍ່ພົບຍີ່ຫໍ້</p>
      ) : (
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {brands.map((b) => (
            <Link
              key={b.code}
              href={`/brand/${encodeURIComponent(b.code)}`}
              className="group flex min-h-36 flex-col items-center justify-center gap-2 bg-white p-4 text-center transition hover:relative hover:z-10 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <BrandLogo code={b.code} name={b.name} logo={b.logo} size="list" />
              <span className="text-base font-bold text-gray-700 transition group-hover:text-brand-dark">
                {b.name}
              </span>
              <span className="text-xs text-gray-400">{b.productCount} ລາຍການ</span>
            </Link>
          ))}
        </div>
      )}
      </section>
    </div>
  );
}
