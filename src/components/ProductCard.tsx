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
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-200 hover:shadow-[0_18px_36px_rgba(249,115,22,0.06),0_4px_12px_rgba(0,0,0,0.02)]">
      <Link href={`/product/${encodeURIComponent(product.code)}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-slate-50/50">
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
              <div className="bg-gradient-to-br from-rose-500 to-red-600 px-2.5 py-1.5 text-center text-[10px] font-black leading-none text-white rounded-br-xl shadow-md border-r border-b border-white/10">
                -{off}%
                <span className="block text-[6px] font-bold uppercase tracking-widest mt-0.5">{dealTag}</span>
              </div>
            )}
            <div className="flex flex-col gap-1 pl-2 pt-2">
              {product.isNew && (
                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[8px] font-black uppercase text-white shadow-xs border border-orange-400/20">ໃໝ່</span>
              )}
              {product.isPromo && !product.isNew && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[8px] font-black uppercase text-white shadow-xs border border-amber-400/20">ໂປຣ</span>
              )}
            </div>
          </div>
          {outOfStock && (
            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-slate-900/80 px-3 py-1 text-[9px] font-black text-white backdrop-blur-xs shadow-sm">
              ສິນຄ້າໝົດ
            </span>
          )}
        </div>
      </Link>

      {/* Control Buttons (Desktop transitions in on hover, mobile always visible) */}
      <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5 opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 max-lg:opacity-100 max-lg:translate-y-0">
        <WishlistButton product={product} />
        <CompareButton product={product} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3.5 gap-2 bg-white">
        <Link href={`/product/${encodeURIComponent(product.code)}`}>
          <h3
            title={product.name}
            className="line-clamp-2 min-h-[36px] w-full break-words text-[13px] font-bold leading-snug text-slate-800 transition-colors group-hover:text-orange-600"
          >
            {product.name}
          </h3>
        </Link>

        {/* Pricing Panel */}
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className={`whitespace-nowrap text-base font-extrabold tracking-tight ${product.price == null ? "text-slate-400 text-xs font-bold bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100" : "text-orange-600 text-[17px] sm:text-[18px]"}`}>
            {product.price == null
              ? (product.priceNote ?? "ສອບຖາມລາຄາ")
              : formatKip(hasDeal ? deal! : product.price)}
          </span>
          {hasDeal && (
            <span className="whitespace-nowrap text-[11px] font-bold text-slate-400 line-through">{formatKip(product.price)}</span>
          )}
        </div>

        {/* Member & Commission Badges */}
        {(product.memberPct || product.commissionKip) && (
          <div className="flex flex-wrap gap-1.5">
            {product.memberPct ? (
              <span className="rounded-full bg-violet-50 border border-violet-100/50 px-2 py-0.5 text-[9px] font-extrabold text-violet-600">ສະມາຊິກ −{product.memberPct}%</span>
            ) : null}
            {product.commissionKip ? (
              <span className="rounded-full bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-600">
                ນາຍໜ້າ +{formatKip(product.commissionKip)}
              </span>
            ) : null}
          </div>
        )}

        {/* Ratings and Sales Metrics Row */}
        <div className="mt-auto flex items-center justify-between gap-1 pt-2 text-[10px] text-slate-400 border-t border-slate-100/70">
          <span className="flex items-center gap-1 font-semibold">
            {product.rating != null && product.reviewCount > 0 ? (
              <>
                <StarRating value={product.rating} size={10} />
                <span className="text-amber-500 font-bold">{product.rating.toFixed(1)}</span>
              </>
            ) : (
              <span className="text-slate-400">ຍັງບໍ່ມີຣີວິວ</span>
            )}
          </span>
          {product.soldCount ? (
            <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[9px] font-black text-slate-500">
              ຂາຍແລ້ວ {product.soldCount.toLocaleString("en-US")}
            </span>
          ) : null}
        </div>

        {/* Cart button and Unit info */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/40">
          {product.unit ? (
            <span className="text-[10px] font-black text-slate-400">/ {product.unit}</span>
          ) : (
            <span />
          )}
          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}
