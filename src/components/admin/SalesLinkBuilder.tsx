"use client";

import { useEffect, useState } from "react";
import { formatKip } from "@/lib/format";
import { adminSearchProducts } from "@/app/admin/actions";

interface ProductHit {
  code: string;
  name: string;
  price: number | null;
  unit: string | null;
  stock: number;
}

// Staff sales-attribution link builder. The salesperson shares /s/<their code>;
// when the customer checks out via it, the order's sale_code = this employee.
// Optional product code → deep-links straight to that product page.
export default function SalesLinkBuilder({
  saleCode,
  saleName,
}: {
  saleCode: string;
  saleName: string;
}) {
  const [product, setProduct] = useState("");
  const [copied, setCopied] = useState(false);

  // Product Autocomplete Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<ProductHit[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductHit | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const to = product.trim() ? `?to=/product/${encodeURIComponent(product.trim())}` : "";
  const link = `${origin}/s/${encodeURIComponent(saleCode)}${to}`;
  const msg = `ສະບາຍດີ 🙏 ເລືອກຊື້ສິນຄ້າ ODIEN ຜ່ານລິ້ງນີ້ໄດ້ເລີຍ:\n${link}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const line = `https://line.me/R/msg/text/?${encodeURIComponent(msg)}`;

  // Debounced search query observer
  useEffect(() => {
    let alive = true;
    const term = searchQuery.trim();
    const delayDebounceFn = setTimeout(async () => {
      if (!term) {
        if (alive) {
          setHits([]);
          setSearching(false);
        }
        return;
      }
      if (alive) setSearching(true);
      try {
        const results = await adminSearchProducts(term);
        if (alive) setHits(results as ProductHit[]);
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setSearching(false);
      }
    }, term ? 400 : 0);

    return () => {
      alive = false;
      clearTimeout(delayDebounceFn);
    };
  }, [searchQuery]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-5">
      {/* Salesperson Profile Card */}
      <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 shadow-sm">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-sm font-black text-slate-900 shadow-md">
          {saleName ? saleName.trim().slice(0, 1).toUpperCase() : "?"}
        </span>
        <div className="flex flex-col min-w-0 leading-tight">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">ພະນັກງານຂາຍ</span>
          <span className="text-sm font-black text-slate-800 mt-0.5 truncate">{saleName}</span>
          <span className="text-xs font-semibold text-slate-500 mt-0.5">ລະຫັດ: {saleCode}</span>
        </div>
      </div>

      {/* Product Search Input Dropdown Selector */}
      <div className="relative">
        <label className="mb-2 block text-xs font-bold text-slate-550">
          ຄົ້ນຫາສິນຄ້າ (ບໍ່ບັງຄັບ — ເພື່ອລິ້ງໄປຫາໜ້າສິນຄ້າໂດຍກົງ)
        </label>
        
        {selectedProduct ? (
          /* Selected Product Display Card */
          <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50/30 p-3.5 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-600 text-[10px] font-black">
                ITEM
              </span>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-xs font-bold text-slate-800 truncate">{selectedProduct.name}</span>
                <span className="text-[10px] text-slate-500 font-semibold mt-1">
                  ລະຫັດ: <span className="font-mono">{selectedProduct.code}</span>
                  {selectedProduct.price && ` • ລາຄາ: ${formatKip(selectedProduct.price)}`}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedProduct(null);
                setProduct("");
                setSearchQuery("");
              }}
              className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              title="ລຶບສິນຄ້າ"
            >
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          /* Search Input Box */
          <div className="relative">
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="ຄົ້ນຫາດ້ວຍຊື່ ຫຼື ລະຫັດສິນຄ້າ..."
                className="w-full rounded-xl border border-slate-250 bg-white pl-10 pr-4 py-3 text-sm font-semibold text-slate-700 placeholder-slate-350 transition-all duration-300 focus:border-orange-500 focus:outline-hidden focus:ring-4 focus:ring-orange-500/10"
              />
              <span className="absolute left-3.5 top-3.5 text-slate-500">
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              {searching && (
                <span className="absolute right-3.5 top-3.5">
                  <svg className="animate-spin h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </span>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && searchQuery.trim().length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute left-0 right-0 z-40 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
                  {hits.length > 0 ? (
                    hits.map((hit) => (
                      <button
                        key={hit.code}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(hit);
                          setProduct(hit.code);
                          setShowDropdown(false);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="text-slate-800 font-bold truncate">{hit.name}</div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5 font-mono">ລະຫັດ: {hit.code}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          {hit.price ? (
                            <div className="text-orange-600 font-extrabold">{formatKip(hit.price)}</div>
                          ) : (
                            <div className="text-slate-500 text-[10px]">ສອບຖາມລາຄາ</div>
                          )}
                          <div className="text-[9px] text-slate-500 mt-0.5">ຄົງເຫຼືອ: {hit.stock}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    !searching && (
                      <div className="px-4 py-3 text-center text-xs font-bold text-slate-500">
                        ບໍ່ພົບສິນຄ້າ
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sharing Link display & copy */}
      <div>
        <label className="mb-2 block text-xs font-bold text-slate-550">ລິ້ງສຳລັບສົ່ງໃຫ້ລູກຄ້າ</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={link}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 font-mono text-xs font-semibold text-slate-600 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={copy}
            className={`shrink-0 rounded-xl px-5 py-3 text-sm font-black transition-all duration-300 shadow-sm ${
              copied
                ? "bg-emerald-500 text-white shadow-emerald-500/10"
                : "bg-white text-slate-900 hover:bg-slate-100 shadow-slate-900/10 active:scale-97 cursor-pointer"
            }`}
          >
            {copied ? (
              <span className="flex items-center gap-1.5 justify-center">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                ສຳເນົາແລ້ວ
              </span>
            ) : (
              "ສຳເນົາລິ້ງ"
            )}
          </button>
        </div>
      </div>

      {/* WhatsApp / LINE Share buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#22c35e] text-white px-5 py-3 text-sm font-black shadow-sm shadow-[#25D366]/10 transition-all duration-300 active:scale-97"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.825 0 00-3.48-8.413z" />
          </svg>
          ສົ່ງຜ່ານ WhatsApp
        </a>
        <a
          href={line}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#06C755] hover:bg-[#05b54d] text-white px-5 py-3 text-sm font-black shadow-sm shadow-[#06C755]/10 transition-all duration-300 active:scale-97"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M12 2C6.477 2 2 5.477 2 9.778c0 2.227 1.22 4.238 3.197 5.626-.168.625-.61 2.274-.698 2.607-.1.378.136.37.288.275.12-.075 1.916-1.302 2.684-1.82.5.115 1.026.177 1.572.177 5.523 0 10-3.477 10-7.778S17.523 2 12 2zm4.35 10.3c0 .165-.135.3-.3.3h-1.42c-.165 0-.3-.135-.3-.3V7.75h-1v4.55c0 .165-.135.3-.3.3h-1.42c-.165 0-.3-.135-.3-.3V7.75H10v2.662l-1.442-2.31A.302.302 0 0 0 8.3 8H6.92c-.165 0-.3.135-.3.3v4c0 .165.135.3.3.3h1.42c.165 0 .3-.135.3-.3v-1.74l.956 1.53c.057.091.157.146.264.146h1.29c.165 0 .3-.135.3-.3V9.75h1.03v2.55c0 .165.135.3.3.3h3.02c.165 0 .3-.135.3-.3v-4.55c0-.165-.135-.3-.3-.3h-1.42c-.165 0-.3.135-.3.3v2.55h-.03v-2.55c0-.165-.135-.3-.3-.3h-1.42c-.165 0-.3.135-.3.3v4.55z" />
          </svg>
          ສົ່ງຜ່ານ LINE
        </a>
      </div>

      {/* Info Alert Footer */}
      <div className="flex items-start gap-2.5 rounded-xl bg-orange-50/50 border border-orange-100/60 p-3.5 text-xs text-slate-600 font-semibold leading-relaxed">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-orange-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>
          ເມື່ອລູກຄ້າສັ່ງຊື້ຜ່ານລິ້ງນີ້ ພາຍໃນ 30 ວັນ, ລະບົບຈະບັນທຶກໃຫ້ທ່ານເປັນພະນັກງານຂາຍ (sale_code) ໂດຍອັດຕະໂນມັດ.
        </p>
      </div>
    </div>
  );
}
