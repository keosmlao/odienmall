import { getProducts } from "@/lib/catalog";
import { firstParam, parseBool, parseNum, parsePage, parseSort } from "@/lib/params";
import ProductListing from "@/components/ProductListing";
import Breadcrumb from "@/components/Breadcrumb";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? "").trim();
  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);
  const inStock = parseBool(sp.instock);
  const priceMin = parseNum(sp.pmin);
  const priceMax = parseNum(sp.pmax);

  const data = q
    ? await getProducts({ search: q, sort, page, pageSize: 24, inStock, priceMin, priceMax })
    : { items: [], total: 0, page: 1, pageSize: 24, totalPages: 1 };

  return (
    <div>
      <Breadcrumb items={[{ label: "ຄົ້ນຫາ" }]} />
      {q ? (
        <ProductListing
          data={data}
          sort={sort}
          basePath="/search"
          params={{ q }}
          title={`ຜົນການຄົ້ນຫາ: “${q}”`}
          subtitle={`ພົບ ${data.total.toLocaleString()} ລາຍການ`}
          inStock={inStock}
          priceMin={priceMin}
          priceMax={priceMax}
        />
      ) : (
        <div className="border border-dashed border-orange-200 bg-white p-16 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-orange-50 text-3xl text-orange-500">⌕</span>
          <p className="mt-4 font-bold text-slate-700">ຄົ້ນຫາສິນຄ້າໃນ OdienMall</p>
          <p className="mt-1 text-sm text-gray-400">ພິມຊື່, ລະຫັດ ຫຼືຍີ່ຫໍ້ສິນຄ້າໃນຊ່ອງຄົ້ນຫາດ້ານເທິງ</p>
        </div>
      )}
    </div>
  );
}
