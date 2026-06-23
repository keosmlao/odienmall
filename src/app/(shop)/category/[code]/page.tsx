import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategory, getCategoryBrands, getProducts } from "@/lib/catalog";
import { firstParam, parseBool, parseNum, parsePage, parseSort } from "@/lib/params";
import ProductListing from "@/components/ProductListing";
import Breadcrumb from "@/components/Breadcrumb";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const category = await getCategory(decodeURIComponent(code));
  if (!category) return { title: "ໝວດໝູ່" };
  return {
    title: category.name,
    description: `ຊື້ ${category.name} ຄຸນນະພາບ ລາຄາດີ ທີ່ OdienMall`,
    alternates: { canonical: `/category/${encodeURIComponent(code)}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { code } = await params;
  const decoded = decodeURIComponent(code);
  const sp = await searchParams;
  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);
  const brand = firstParam(sp.brand);
  const inStock = parseBool(sp.instock);
  const priceMin = parseNum(sp.pmin);
  const priceMax = parseNum(sp.pmax);

  const [category, data, brands] = await Promise.all([
    getCategory(decoded),
    getProducts({
      categoryCode: decoded,
      sort,
      page,
      pageSize: 24,
      brandCode: brand,
      inStock,
      priceMin,
      priceMax,
    }),
    getCategoryBrands(decoded),
  ]);

  if (!category) notFound();

  return (
    <div>
      <Breadcrumb
        items={[{ label: "ໝວດໝູ່", href: "/products" }, { label: category.name }]}
      />
      <ProductListing
        data={data}
        sort={sort}
        basePath={`/category/${encodeURIComponent(decoded)}`}
        title={category.name}
        brands={brands}
        selectedBrand={brand}
        inStock={inStock}
        priceMin={priceMin}
        priceMax={priceMax}
      />
    </div>
  );
}
