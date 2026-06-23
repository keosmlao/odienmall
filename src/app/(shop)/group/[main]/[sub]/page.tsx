import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGroupSub, getGroupBrands, getGroupCategories, getProducts } from "@/lib/catalog";
import { firstParam, parseBool, parseNum, parsePage, parseSort } from "@/lib/params";
import ProductListing from "@/components/ProductListing";
import Breadcrumb from "@/components/Breadcrumb";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ main: string; sub: string }>;
}): Promise<Metadata> {
  const { main, sub } = await params;
  const group = await getGroupSub(decodeURIComponent(sub));
  if (!group) return { title: "ໝວດສິນຄ້າ" };
  return {
    title: group.name,
    description: `ຊື້ ${group.name} ຄຸນນະພາບ ລາຄາດີ ທີ່ OdienMall`,
    alternates: {
      canonical: `/group/${encodeURIComponent(main)}/${encodeURIComponent(sub)}`,
    },
  };
}

export default async function GroupSubPage({
  params,
  searchParams,
}: {
  params: Promise<{ main: string; sub: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { main, sub } = await params;
  const decodedSub = decodeURIComponent(sub);
  const sp = await searchParams;
  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);
  const brand = firstParam(sp.brand);
  const category = firstParam(sp.cat);
  const inStock = parseBool(sp.instock);
  const priceMin = parseNum(sp.pmin);
  const priceMax = parseNum(sp.pmax);

  const [group, data, brands, categories] = await Promise.all([
    getGroupSub(decodedSub),
    getProducts({
      groupSub: decodedSub,
      sort,
      page,
      pageSize: 24,
      brandCode: brand,
      categoryCode: category,
      inStock,
      priceMin,
      priceMax,
    }),
    getGroupBrands({ groupSub: decodedSub }),
    getGroupCategories({ groupSub: decodedSub }),
  ]);

  if (!group) notFound();

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "ໝວດສິນຄ້າ", href: "/products" },
          {
            label: group.mainName,
            href: `/group/${encodeURIComponent(group.mainCode)}`,
          },
          { label: group.name },
        ]}
      />
      <ProductListing
        data={data}
        sort={sort}
        basePath={`/group/${encodeURIComponent(decodeURIComponent(main))}/${encodeURIComponent(decodedSub)}`}
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
