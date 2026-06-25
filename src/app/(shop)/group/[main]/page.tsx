import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGroupMain, getGroupBrands, getGroupCategories, getProducts } from "@/lib/catalog";
import { firstParam, parseBool, parseNum, parsePage, parseSort } from "@/lib/params";
import ProductListing from "@/components/ProductListing";
import Breadcrumb from "@/components/Breadcrumb";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ main: string }>;
}): Promise<Metadata> {
  const { main } = await params;
  const group = await getGroupMain(decodeURIComponent(main));
  if (!group) return { title: "ໝວດສິນຄ້າ" };
  return {
    title: group.name,
    description: `ຊື້ ${group.name} ຄຸນນະພາບ ລາຄາດີ ທີ່ OdienMall`,
    alternates: { canonical: `/group/${encodeURIComponent(main)}` },
  };
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ main: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { main } = await params;
  const decoded = decodeURIComponent(main);
  const sp = await searchParams;
  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);
  const brand = firstParam(sp.brand);
  const category = firstParam(sp.cat);
  const inStock = parseBool(sp.instock);
  const priceMin = parseNum(sp.pmin);
  const priceMax = parseNum(sp.pmax);

  const [group, data, brands, categories] = await Promise.all([
    getGroupMain(decoded),
    getProducts({
      groupMain: decoded,
      sort,
      page,
      pageSize: 24,
      brandCode: brand,
      categoryCode: category,
      inStock,
      priceMin,
      priceMax,
    }),
    getGroupBrands({ groupMain: decoded }),
    getGroupCategories({ groupMain: decoded }),
  ]);

  if (!group) notFound();

  return (
    <div>
      <Breadcrumb
        items={[{ label: "ໝວດສິນຄ້າ", href: "/products" }, { label: group.name }]}
      />

      {group.subs.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-slate-200/60 bg-white p-3 shadow-xs">
          {group.subs.map((s) => (
            <Link
              key={s.code}
              href={`/group/${encodeURIComponent(group.code)}/${encodeURIComponent(s.code)}`}
              className="group rounded-full border border-slate-200 bg-slate-50/50 px-4.5 py-2 text-xs font-bold text-slate-600 transition duration-150 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 hover:shadow-xs"
            >
              {s.name}
              <span className="ml-1.5 text-[10px] font-black text-slate-400 group-hover:text-orange-500 transition-colors">
                ({s.productCount})
              </span>
            </Link>
          ))}
        </div>
      )}

      <ProductListing
        data={data}
        sort={sort}
        basePath={`/group/${encodeURIComponent(decoded)}`}
        title={group.name}
        brands={brands}
        selectedBrand={brand}
        categories={categories}
        selectedCategory={category}
        inStock={inStock}
        priceMin={priceMin}
        priceMax={priceMax}
      />
    </div>
  );
}
