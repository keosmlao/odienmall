import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrand, getProducts } from "@/lib/catalog";
import { parsePage, parseSort } from "@/lib/params";
import ProductListing from "@/components/ProductListing";
import Breadcrumb from "@/components/Breadcrumb";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const brand = await getBrand(decodeURIComponent(code));
  if (!brand) return { title: "ຍີ່ຫໍ້" };
  return {
    title: brand.name,
    description: `ສິນຄ້າຍີ່ຫໍ້ ${brand.name} ທີ່ OdienMall`,
    alternates: { canonical: `/brand/${encodeURIComponent(code)}` },
  };
}

export default async function BrandPage({
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

  const [brand, data] = await Promise.all([
    getBrand(decoded),
    getProducts({ brandCode: decoded, sort, page, pageSize: 24 }),
  ]);

  if (!brand) notFound();

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "ຍີ່ຫໍ້", href: "/brands" },
          { label: brand.name },
        ]}
      />
      <ProductListing
        data={data}
        sort={sort}
        basePath={`/brand/${encodeURIComponent(decoded)}`}
        title={brand.name}
        subtitle={`ສິນຄ້າຍີ່ຫໍ້ ${brand.name} · ${data.total} ລາຍການ`}
      />
    </div>
  );
}
