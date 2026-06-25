import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatKip } from "@/lib/format";
import ProductImage from "./ProductImage";
import AddToCartButton from "./AddToCartButton";
import WishlistButton from "./WishlistButton";
import StarRating from "./StarRating";
import CompareButton from "./CompareButton";

// Modern premium storefront product card:
// - Clean shadow transitions, subtle borders, and smooth translation animations.
// - Crisp typography with balanced weights.
// - High-contrast price panels and beautifully formatted discount badges.
export default function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.stock <= 0;
  const deal = product.flashPrice ?? product.memberPrice ?? null;
  const hasDeal = deal != null && product.price != null && deal < product.price;
  const off = hasDeal ? Math.round(((product.price! - deal!) / product.price!) * 100) : 0;
  const dealTag = product.flashPrice != null ? "FLASH" : "ສະມາຊິກ";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm transition hover:border-orange-200 hover:shadow-md sm:rounded-xl">
      <Link href={`/product/${encodeURIComponent(product.code)}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-slate-50">
          <ProductImage
            code={product.code}
            name={product.name}
            brand={product.brandName}
            imageUrl={product.imageUrl}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
          {/* Discount and Promo Badges Stack */}
          <div className="absolute left-0 top-0 z-10 flex flex-col items-start gap-1">
            {off > 0 && (
              <div className="rounded-br-lg bg-rose-600 px-2 py-1 text-center text-[9px] font-black leading-none text-white shadow-sm sm:px-2.5 sm:py-1.5 sm:text-[10px]">
                -{off}%
                <span className="mt-0.5 block text-[6px] font-bold uppercase tracking-widest">{dealTag}</span>
              </div>
            )}
            <div className="flex flex-col gap-1 pl-1.5 pt-1.5 sm:pl-2 sm:pt-2">
              {product.isNew && (
                <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">ໃໝ່</span>
              )}
              {product.isPromo && !product.isNew && (
                <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">ໂປຣ</span>
              )}
            </div>
          </div>
          {outOfStock && (
            <span className="absolute bottom-2 left-2 rounded bg-slate-900/80 px-2 py-1 text-[9px] font-black text-white backdrop-blur-xs">
              ສິນຄ້າໝົດ
            </span>
          )}
        </div>
      </Link>

      {/* Mobile: wishlist button always visible. Desktop: both buttons fade in on hover. */}
      <div className="absolute right-1.5 top-1.5 z-10 flex flex-col gap-1.5 sm:right-2 sm:top-2">
        <div className="opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 lg:block max-lg:opacity-100 max-lg:translate-y-0">
          <WishlistButton product={product} />
        </div>
        <div className="hidden lg:block opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          <CompareButton product={product} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 bg-white p-2 sm:gap-2 sm:p-3">
        <Link href={`/product/${encodeURIComponent(product.code)}`}>
          <h3
            title={product.name}
            className="line-clamp-2 min-h-[34px] w-full break-words text-[12px] font-black leading-[1.42] text-slate-800 transition-colors group-hover:text-orange-600 sm:min-h-[38px] sm:text-[13px]"
          >
            {product.name}
          </h3>
        </Link>

        {/* Pricing Panel */}
        <div className="flex min-h-8 flex-wrap items-baseline gap-1 sm:gap-1.5">
          <span className={`font-black tracking-tight ${product.price == null ? "rounded-md border border-slate-100 bg-slate-50 px-1.5 py-1 text-[10px] text-slate-400 sm:px-2 sm:py-1.5 sm:text-xs" : "text-[15px] text-orange-600 sm:text-[17px] lg:text-[18px]"}`}>
            {product.price == null
              ? (product.priceNote ?? "ສອບຖາມລາຄາ")
              : formatKip(hasDeal ? deal! : product.price)}
          </span>
          {hasDeal && (
            <span className="whitespace-nowrap text-[10px] sm:text-[11px] font-bold text-slate-400 line-through">{formatKip(product.price)}</span>
          )}
        </div>

        {/* Commission badge only. Member discount already appears in the price. */}
        {product.commissionKip ? (
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            <span className="rounded-md border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[8px] font-extrabold text-emerald-600 sm:px-2 sm:text-[9px]">
              ນາຍໜ້າ +{formatKip(product.commissionKip)}
            </span>
          </div>
        ) : null}

        {/* Unified Bottom Row (Ratings, Sales, Unit & Cart) */}
        <div className="mt-auto flex items-end justify-between gap-1.5 border-t border-slate-100 pt-1.5 sm:pt-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-400 sm:text-[10px]">
              {product.rating != null && product.reviewCount > 0 ? (
                <>
                  <StarRating value={product.rating} size={9} />
                  <span className="text-amber-500 font-bold">{product.rating.toFixed(1)}</span>
                </>
              ) : (
                <span className="text-slate-400">ຍັງບໍ່ມີ ຣີວິວ</span>
              )}
            </span>
            {product.soldCount ? (
              <div className="flex flex-wrap items-center gap-1 text-[9px] leading-none text-slate-400 sm:text-[10px]">
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[8px] font-black text-slate-500 sm:text-[9px]">
                  ຂາຍ {product.soldCount.toLocaleString("en-US")}
                </span>
                {product.unit && (
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-400">/ {product.unit}</span>
                )}
              </div>
            ) : null}
          </div>
          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}
