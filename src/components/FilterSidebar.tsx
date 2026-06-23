"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { Brand, Category, GroupMain, SortKey } from "@/lib/types";

interface Props {
  basePath: string;
  brands: Brand[];
  selectedBrand?: string;
  /** Item-category facet (group pages only); empty elsewhere. */
  categories?: Category[];
  selectedCategory?: string;
  /** Product-group (group_main) facet; empty hides the section. */
  groups?: GroupMain[];
  selectedGroup?: string;
  inStock: boolean;
  priceMin?: number;
  priceMax?: number;
  sort: SortKey;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function FilterSidebar({
  basePath,
  brands,
  selectedBrand,
  categories = [],
  selectedCategory,
  groups = [],
  selectedGroup,
  inStock,
  priceMin,
  priceMax,
  sort,
  isOpenMobile = false,
  onCloseMobile,
}: Props) {
  const router = useRouter();

  // Desktop states
  const [min, setMin] = useState(priceMin != null ? String(priceMin) : "");
  const [max, setMax] = useState(priceMax != null ? String(priceMax) : "");

  // Mobile drawer states
  const [localBrand, setLocalBrand] = useState(selectedBrand);
  const [localCategory, setLocalCategory] = useState(selectedCategory);
  const [localGroup, setLocalGroup] = useState(selectedGroup);
  const [localInStock, setLocalInStock] = useState(inStock);
  const [localMin, setLocalMin] = useState(priceMin != null ? String(priceMin) : "");
  const [localMax, setLocalMax] = useState(priceMax != null ? String(priceMax) : "");

  // Sync states when props or mobile drawer open state changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMin(priceMin != null ? String(priceMin) : "");
    setMax(priceMax != null ? String(priceMax) : "");
  }, [priceMin, priceMax]);

  useEffect(() => {
    if (isOpenMobile) {
      // Reset the draft whenever a fresh mobile drawer session opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalBrand(selectedBrand);
      setLocalCategory(selectedCategory);
      setLocalGroup(selectedGroup);
      setLocalInStock(inStock);
      setLocalMin(priceMin != null ? String(priceMin) : "");
      setLocalMax(priceMax != null ? String(priceMax) : "");
    }
  }, [selectedBrand, selectedCategory, selectedGroup, inStock, priceMin, priceMax, isOpenMobile]);

  function build(next: {
    brand?: string;
    category?: string;
    group?: string;
    instock?: boolean;
    pmin?: number;
    pmax?: number;
  }) {
    const brand = "brand" in next ? next.brand : selectedBrand;
    const category = "category" in next ? next.category : selectedCategory;
    const group = "group" in next ? next.group : selectedGroup;
    const instock = "instock" in next ? next.instock : inStock;
    const pmin = "pmin" in next ? next.pmin : priceMin;
    const pmax = "pmax" in next ? next.pmax : priceMax;
    const sp = new URLSearchParams();
    if (brand) sp.set("brand", brand);
    if (category) sp.set("cat", category);
    if (group) sp.set("group", group);
    if (instock) sp.set("instock", "1");
    if (pmin != null) sp.set("pmin", String(pmin));
    if (pmax != null) sp.set("pmax", String(pmax));
    if (sort && sort !== "newest") sp.set("sort", sort);
    const qs = sp.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const num = (s: string) => {
    const n = Number(s);
    return s.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  const hasActive =
    !!selectedBrand || !!selectedCategory || !!selectedGroup || inStock || priceMin != null || priceMax != null;

  const clearMobileFilters = () => {
    setLocalBrand(undefined);
    setLocalCategory(undefined);
    setLocalGroup(undefined);
    setLocalInStock(false);
    setLocalMin("");
    setLocalMax("");
  };

  const applyMobileFilters = () => {
    build({
      brand: localBrand,
      category: localCategory,
      group: localGroup,
      instock: localInStock,
      pmin: num(localMin),
      pmax: num(localMax),
    });
    onCloseMobile?.();
  };

  return (
    <>
      {/* Desktop Sidebar Layout - Lazada Flat Style */}
      <aside className="hidden h-fit space-y-6 rounded-sm bg-white p-4 text-sm shadow-sm lg:block">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className="font-bold text-gray-900 text-base">ກັ່ນຕອງ</h2>
          {hasActive && (
            <button
              onClick={() => build({ brand: undefined, category: undefined, group: undefined, instock: false, pmin: undefined, pmax: undefined })}
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              ລ້າງທັງໝົດ
            </button>
          )}
        </div>

        {/* Product Group (group_main) Filter Section */}
        {groups.length > 0 && (
          <div className="border-b border-gray-200 pb-5">
            <div className="mb-3 font-semibold text-gray-800 text-xs uppercase tracking-wider">ກຸ່ມສິນຄ້າ</div>
            <ul className="space-y-2">
              {groups.map((g) => (
                <li key={g.code}>
                  <label className="flex cursor-pointer items-center justify-between rounded py-0.5 text-gray-600 hover:text-gray-900 transition">
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={g.code === selectedGroup}
                        onChange={() => build({ group: g.code === selectedGroup ? undefined : g.code })}
                        className="h-4 w-4 rounded border-gray-300 accent-orange-500 focus:ring-orange-500"
                      />
                      <span className={`line-clamp-1 ${g.code === selectedGroup ? "font-semibold text-orange-600" : ""}`}>
                        {g.name}
                      </span>
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-gray-400">({g.productCount})</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Category Filter Section (group pages only) */}
        {categories.length > 0 && (
          <div className="border-b border-gray-200 pb-5">
            <div className="mb-3 font-semibold text-gray-800 text-xs uppercase tracking-wider">ໝວດສິນຄ້າ</div>
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              {categories.map((c) => (
                <li key={c.code}>
                  <label className="flex cursor-pointer items-center justify-between rounded py-0.5 text-gray-600 hover:text-gray-900 transition">
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={c.code === selectedCategory}
                        onChange={() => build({ category: c.code === selectedCategory ? undefined : c.code })}
                        className="h-4 w-4 rounded border-gray-300 accent-orange-500 focus:ring-orange-500"
                      />
                      <span className={`line-clamp-1 ${c.code === selectedCategory ? "font-semibold text-orange-600" : ""}`}>
                        {c.name}
                      </span>
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-gray-400">({c.productCount})</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Price Range Filter Section */}
        <div className="border-b border-gray-200 pb-5">
          <div className="mb-3 font-semibold text-gray-800 text-xs uppercase tracking-wider">ຊ່ວງລາຄາ (₭)</div>
          <div className="flex items-center gap-2">
            <input
              value={min}
              onChange={(e) => setMin(e.target.value)}
              inputMode="numeric"
              placeholder="ຕ່ຳສຸດ"
              className="inp !px-3 !py-2 text-xs"
            />
            <span className="text-gray-400 font-medium">–</span>
            <input
              value={max}
              onChange={(e) => setMax(e.target.value)}
              inputMode="numeric"
              placeholder="ສູງສຸດ"
              className="inp !px-3 !py-2 text-xs"
            />
          </div>
          <button
            onClick={() => build({ pmin: num(min), pmax: num(max) })}
            className="mt-3 w-full rounded-sm bg-orange-500 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600"
          >
            ນຳໃຊ້
          </button>
        </div>

        {/* Brands Filter Section */}
        {brands.length > 0 && (
          <div className="pb-5">
            <div className="mb-3 font-semibold text-gray-800 text-xs uppercase tracking-wider">ຍີ່ຫໍ້</div>
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              {brands.map((b) => (
                <li key={b.code}>
                  <label className="flex cursor-pointer items-center justify-between rounded py-0.5 text-gray-600 hover:text-gray-900 transition">
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={b.code === selectedBrand}
                        onChange={() => build({ brand: b.code === selectedBrand ? undefined : b.code })}
                        className="h-4 w-4 rounded border-gray-300 accent-brand focus:ring-brand"
                      />
                      <span className={`line-clamp-1 ${b.code === selectedBrand ? "font-semibold text-brand-dark" : ""}`}>
                        {b.name}
                      </span>
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-gray-400">({b.productCount})</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* Mobile Drawer Layout */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 lg:hidden ${
          isOpenMobile ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onCloseMobile}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-[300px] max-w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isOpenMobile ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <h2 className="font-bold text-gray-950 text-base">ກັ່ນຕອງ</h2>
          <button
            onClick={onCloseMobile}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            aria-label="ປິດ"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
          {/* Product group (group_main) filter */}
          {groups.length > 0 && (
            <div className="border-b border-gray-100 pb-5">
              <div className="mb-3 font-semibold text-gray-800 text-xs uppercase tracking-wider">ກຸ່ມສິນຄ້າ</div>
              <ul className="space-y-3.5">
                {groups.map((g) => (
                  <li key={g.code}>
                    <label className="flex cursor-pointer items-center justify-between rounded text-gray-600">
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={g.code === localGroup}
                          onChange={() => setLocalGroup(g.code === localGroup ? undefined : g.code)}
                          className="h-4 w-4 rounded border-gray-300 accent-brand focus:ring-brand"
                        />
                        <span className={`line-clamp-1 ${g.code === localGroup ? "font-semibold text-brand-dark" : ""}`}>
                          {g.name}
                        </span>
                      </span>
                      <span className="ml-2 shrink-0 text-xs text-gray-400">({g.productCount})</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Category filter (group pages only) */}
          {categories.length > 0 && (
            <div className="border-b border-gray-100 pb-5">
              <div className="mb-3 font-semibold text-gray-800 text-xs uppercase tracking-wider">ໝວດສິນຄ້າ</div>
              <ul className="max-h-72 space-y-3.5 overflow-y-auto pr-1 scrollbar-thin">
                {categories.map((c) => (
                  <li key={c.code}>
                    <label className="flex cursor-pointer items-center justify-between rounded text-gray-600">
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={c.code === localCategory}
                          onChange={() => setLocalCategory(c.code === localCategory ? undefined : c.code)}
                          className="h-4 w-4 rounded border-gray-300 accent-brand focus:ring-brand"
                        />
                        <span className={`line-clamp-1 ${c.code === localCategory ? "font-semibold text-brand-dark" : ""}`}>
                          {c.name}
                        </span>
                      </span>
                      <span className="ml-2 shrink-0 text-xs text-gray-400">({c.productCount})</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Price filter */}
          <div className="border-b border-gray-100 pb-5">
            <div className="mb-3 font-semibold text-gray-800 text-xs uppercase tracking-wider">ຊ່ວງລາຄາ (₭)</div>
            <div className="flex items-center gap-2">
              <input
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                inputMode="numeric"
                placeholder="ຕ່ຳສຸດ"
                className="inp !px-3 !py-2 text-xs"
              />
              <span className="text-gray-400 font-medium">–</span>
              <input
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                inputMode="numeric"
                placeholder="ສູງສຸດ"
                className="inp !px-3 !py-2 text-xs"
              />
            </div>
          </div>

          {/* Brand filter */}
          {brands.length > 0 && (
            <div>
              <div className="mb-3 font-semibold text-gray-800 text-xs uppercase tracking-wider">ຍີ່ຫໍ້</div>
              <ul className="max-h-80 space-y-3.5 overflow-y-auto pr-1 scrollbar-thin">
                {brands.map((b) => (
                  <li key={b.code}>
                    <label className="flex cursor-pointer items-center justify-between rounded text-gray-600">
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={b.code === localBrand}
                          onChange={() => setLocalBrand(b.code === localBrand ? undefined : b.code)}
                          className="h-4 w-4 rounded border-gray-300 accent-brand focus:ring-brand"
                        />
                        <span className={`line-clamp-1 ${b.code === localBrand ? "font-semibold text-brand-dark" : ""}`}>
                          {b.name}
                        </span>
                      </span>
                      <span className="ml-2 shrink-0 text-xs text-gray-400">({b.productCount})</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Drawer Footer (Fixed) */}
        <div className="border-t border-gray-100 p-4 bg-gray-50 grid grid-cols-2 gap-3 shrink-0">
          <button
            onClick={clearMobileFilters}
            className="rounded border border-gray-300 py-2.5 text-center text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            ລ້າງທັງໝົດ
          </button>
          <button
            onClick={applyMobileFilters}
            className="rounded bg-brand py-2.5 text-center text-xs font-semibold text-white transition hover:bg-brand-dark shadow-sm"
          >
            ຕົກລົງ
          </button>
        </div>
      </div>
    </>
  );
}
