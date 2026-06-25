import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatKip } from "@/lib/format";
import ProductImage from "./ProductImage";
import AddToCartButton from "./AddToCartButton";
import WishlistButton from "./WishlistButton";
import StarRating from "./StarRating";
import CompareButton from "./CompareButton";

// Lazada-style product card: square image with a discount badge, bold price with
// struck-through original + % off, then a rating · sold row.
export default function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.stock <= 0;
  const deal = product.flashPrice ?? product.memberPrice ?? null;
  const hasDeal = deal != null && product.price != null && deal < product.price;
  const off = hasDeal ? Math.round(((product.price! - deal!) / product.price!) * 100) : 0;
  const dealTag = product.flashPrice != null ? "FLASH" : "ສະມາຊິກ";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100/70 bg-white transition-all duration-300 hover:border-orange-200/80 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] hover:-translate-y-1">
      <Link href={`/product/${encodeURIComponent(product.code)}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-white">
          <ProductImage
            code={product.code}
            name={product.name}
            brand={product.brandName}
            imageUrl={product.imageUrl}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-103"
          />
          {/* Discount and Promo Badges Stack */}
          <div className="absolute left-0 top-0 z-10 flex flex-col items-start gap-1">
            {off > 0 && (
              <div className="bg-[linear-gradient(135deg,#f43f5e,#e11d48)] px-2 py-1 text-center text-[9px] font-black leading-none text-white rounded-br-lg shadow-sm">
                -{off}%
                <span className="block text-[6px] font-black uppercase tracking-wider mt-0.5">{dealTag}</span>
              </div>
            )}
            <div className="flex flex-col gap-1 pl-1.5 pt-1.5">
              {product.isNew && (
                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[8px] font-black uppercase text-white shadow-xs border border-orange-400/20">ໃໝ່</span>
              )}
              {product.isPromo && !product.isNew && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[8px] font-black uppercase text-white shadow-xs border border-amber-400/20">ໂປຣ</span>
              )}
            </div>
          </div>
          {outOfStock && (
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-slate-900/85 px-2.5 py-0.5 text-[9px] font-black text-white backdrop-blur-xs">
              ສິນຄ້າໝົດ
            </span>
          )}
        </div>
      </Link>

      {/* Control Buttons (Desktop fades/slides in on hover, mobile always visible) */}
      <div className="absolute right-1.5 top-1.5 z-10 flex flex-col gap-1.5 transition-all duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:translate-x-2 lg:group-hover:translate-x-0">
        <WishlistButton product={product} />
        <CompareButton product={product} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <Link href={`/product/${encodeURIComponent(product.code)}`}>
          <h3
            title={product.name}
            className="line-clamp-2 min-h-[34px] w-full break-words text-xs font-bold leading-normal text-slate-800 transition-colors group-hover:text-orange-600"
          >
            {product.name}
          </h3>
        </Link>

        {/* Pricing Panel */}
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className={`whitespace-nowrap text-sm font-black tracking-tight ${product.price == null ? "text-slate-400 text-xs" : "text-orange-600"}`}>
            {product.price == null
              ? (product.priceNote ?? "ສອບຖາມລາຄາ")
              : formatKip(hasDeal ? deal! : product.price)}
          </span>
          {hasDeal && (
            <span className="whitespace-nowrap text-[10px] font-semibold text-slate-400 line-through">{formatKip(product.price)}</span>
          )}
        </div>

        {/* Member & Commission Badges */}
        {(product.memberPct || product.commissionKip) && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {product.memberPct ? (
              <span className="rounded bg-violet-50 border border-violet-100/50 px-1.5 py-0.5 text-[8px] font-bold text-violet-600">ສະມາຊິກ −{product.memberPct}%</span>
            ) : null}
            {product.commissionKip ? (
              <span className="rounded bg-emerald-50 border border-emerald-100/50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-600">
                ນາຍໜ້າ +{formatKip(product.commissionKip)}
              </span>
            ) : null}
          </div>
        )}

        {/* Ratings and Sales Metrics Row */}
        <div className="mt-auto flex items-center justify-between gap-1 pt-1.5 text-[10px] text-slate-400 border-t border-slate-50/50">
          <span className="flex items-center gap-1 font-semibold">
            {product.rating != null && product.reviewCount > 0 ? (
              <>
                <StarRating value={product.rating} size={10} />
                <span className="text-amber-500">{product.rating.toFixed(1)}</span>
              </>
            ) : (
              <span className="text-slate-300">ຍັງບໍ່ມີຣີວິວ</span>
            )}
          </span>
          {product.soldCount ? (
            <span className="bg-slate-550/5 px-2 py-0.5 rounded-full text-[9px] font-black text-slate-500">
              ຂາຍແລ້ວ {product.soldCount.toLocaleString("en-US")}
            </span>
          ) : null}
        </div>

        {/* Cart button and Unit info */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {product.unit ? (
            <span className="text-[9px] font-black text-slate-400">/ {product.unit}</span>
          ) : (
            <span />
          )}
          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}
