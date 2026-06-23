"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Brand, Category, GroupMain, ProductPage, SortKey } from "@/lib/types";
import ProductGrid from "./ProductGrid";
import Pagination from "./Pagination";
import SortSelect from "./SortSelect";
import FilterSidebar from "./FilterSidebar";

// Reusable listing block: filter sidebar + (title row + sort + grid + pagination).
// Used by the category, search and all-products pages.
export default function ProductListing({
  data,
  sort,
  basePath,
  params = {},
  title,
  subtitle,
  brands = [],
  selectedBrand,
  categories = [],
  selectedCategory,
  groups = [],
  selectedGroup,
  inStock = false,
  priceMin,
  priceMax,
}: {
  data: ProductPage;
  sort: SortKey;
  basePath: string;
  /** Page-specific params to preserve (e.g. { q }). */
  params?: Record<string, string>;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  brands?: Brand[];
  selectedBrand?: string;
  categories?: Category[];
  selectedCategory?: string;
  /** Product-group (group_main) facet; empty hides the section. */
  groups?: GroupMain[];
  selectedGroup?: string;
  inStock?: boolean;
  priceMin?: number;
  priceMax?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // All active params that must survive sort + pagination links.
  const filterParams: Record<string, string> = { ...params };
  if (selectedBrand) filterParams.brand = selectedBrand;
  if (selectedCategory) filterParams.cat = selectedCategory;
  if (selectedGroup) filterParams.group = selectedGroup;
  if (inStock) filterParams.instock = "1";
  if (priceMin != null) filterParams.pmin = String(priceMin);
  if (priceMax != null) filterParams.pmax = String(priceMax);

  const hrefFor = (p: number) => {
    const sp = new URLSearchParams(filterParams);
    sp.set("sort", sort);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  function handleSortChange(newSort: SortKey) {
    const sp = new URLSearchParams(filterParams);
    if (newSort === "newest") {
      sp.delete("sort");
    } else {
      sp.set("sort", newSort);
    }
    sp.delete("page");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function togglePriceSort() {
    let nextSort: SortKey = "price_asc";
    if (sort === "price_asc") {
      nextSort = "price_desc";
    }
    handleSortChange(nextSort);
  }

  const hasActiveFilters =
    !!selectedBrand || !!selectedCategory || !!selectedGroup || inStock || priceMin != null || priceMax != null;

  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
      {/* Desktop & Mobile Filter Sidebar */}
      <FilterSidebar
        basePath={basePath}
        brands={brands}
        selectedBrand={selectedBrand}
        categories={categories}
        selectedCategory={selectedCategory}
        groups={groups}
        selectedGroup={selectedGroup}
        inStock={inStock}
        priceMin={priceMin}
        priceMax={priceMax}
        sort={sort}
        isOpenMobile={isMobileFilterOpen}
        onCloseMobile={() => setIsMobileFilterOpen(false)}
      />

      <div className="min-w-0 rounded-sm bg-white p-3 shadow-sm sm:p-4">
        {/* Desktop Header Row (Hidden on Mobile) */}
        <div className="mb-5 hidden flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4 lg:flex">
          <div>
            <h1 className="border-l-4 border-orange-500 pl-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            ) : (
              <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-slate-450">
                ພົບ {data.total.toLocaleString()} ລາຍການ
              </p>
            )}
          </div>
          <SortSelect value={sort} params={filterParams} />
        </div>

        {/* Mobile Header Row (Hidden on Desktop) */}
        <div className="lg:hidden mb-4">
          <div className="flex items-baseline justify-between px-1 mb-2.5">
            <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
            <span className="text-xs font-bold text-slate-400">
              ພົບ {data.total.toLocaleString()} ລາຍການ
            </span>
          </div>

          {/* Mobile Sort & Filter Sticky Bar */}
          <div className="flex select-none divide-x divide-slate-100 overflow-hidden rounded-sm border border-slate-200 bg-white text-[11px] font-bold shadow-sm">
            <button
              onClick={() => handleSortChange("newest")}
              className={`flex-1 py-3.5 text-center transition ${
                sort === "newest" ? "text-slate-900 font-extrabold" : "text-slate-500 font-medium"
              }`}
            >
              ໃໝ່ລ່າສຸດ
            </button>
            <button
              onClick={() => handleSortChange("rating")}
              className={`flex-1 py-3.5 text-center transition ${
                sort === "rating" ? "text-slate-900 font-extrabold" : "text-slate-500 font-medium"
              }`}
            >
              ຄະແນນສູງສຸດ
            </button>
            <button
              onClick={togglePriceSort}
              className={`flex-1 py-3.5 text-center transition flex items-center justify-center gap-1 ${
                sort === "price_asc" || sort === "price_desc" ? "text-slate-900 font-extrabold" : "text-slate-500 font-medium"
              }`}
            >
              ລາຄາ
              {sort === "price_asc" && (
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3.5}>
                  <path d="M12 4v16M5 11l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {sort === "price_desc" && (
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3.5}>
                  <path d="M12 4v16M5 13l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {sort !== "price_asc" && sort !== "price_desc" && (
                <svg viewBox="0 0 24 24" className="h-3 w-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={3.5}>
                  <path d="M7 15l5 5 5-5M7 9l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className={`flex-1 py-3.5 text-center transition flex items-center justify-center gap-1.5 ${
                hasActiveFilters ? "text-slate-900 font-extrabold" : "text-slate-500 font-medium"
              }`}
            >
              ກັ່ນຕອງ
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3.5}>
                <path d="M4 4h16v2l-6 6v6l-4 2v-8L4 6V4z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {hasActiveFilters && (
                <span className="h-1.5 w-1.5 rounded-full bg-price shrink-0 animate-ping" />
              )}
            </button>
          </div>
        </div>

        <ProductGrid products={data.items} dense />
        <Pagination page={data.page} totalPages={data.totalPages} hrefFor={hrefFor} />
      </div>
    </div>
  );
}
