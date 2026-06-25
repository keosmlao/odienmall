import { getProducts, getWebBrands, getGroupMenu, getGroupCategories, getWebCategories } from "@/lib/catalog";
import { firstParam, parseBool, parseNum, parsePage, parseSort } from "@/lib/params";
import ProductListing from "@/components/ProductListing";
import Breadcrumb from "@/components/Breadcrumb";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);
  const brand = firstParam(sp.brand);
  const cat = firstParam(sp.cat);
  const group = firstParam(sp.group);
  const inStock = parseBool(sp.instock);
  const priceMin = parseNum(sp.pmin);
  const priceMax = parseNum(sp.pmax);

  const [data, brands, groups, categories] = await Promise.all([
    getProducts({ sort, page, pageSize: 24, brandCode: brand, categoryCode: cat, groupMain: group, inStock, priceMin, priceMax }),
    getWebBrands(30),
    getGroupMenu(),
    group ? getGroupCategories({ groupMain: group }) : getWebCategories(50),
  ]);

  return (
    <div>
      <Breadcrumb items={[{ label: "ສິນຄ້າທັງໝົດ" }]} />
      <ProductListing
        data={data}
        sort={sort}
        basePath="/products"
        title="ສິນຄ້າທັງໝົດ"
        brands={brands}
        selectedBrand={brand}
        categories={categories}
        selectedCategory={cat}
        groups={groups}
        selectedGroup={group}
        inStock={inStock}
        priceMin={priceMin}
        priceMax={priceMax}
      />
    </div>
  );
}
