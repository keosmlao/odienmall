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
    <div className="group relative flex flex-col overflow-hidden rounded-sm border border-slate-100 bg-white transition-all duration-200 hover:z-10 hover:border-orange-200 hover:shadow-[0_4px_18px_rgba(249,115,22,0.18)]">
      <Link href={`/product/${encodeURIComponent(product.code)}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-white">
          <ProductImage
            code={product.code}
            name={product.name}
            brand={product.brandName}
            imageUrl={product.imageUrl}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
          {/* Badges stack top-left (discount ribbon + new/promo) — keeps the
              top-right clear for the wishlist / compare buttons. */}
          <div className="absolute left-0 top-0 z-10 flex flex-col items-start gap-1">
            {off > 0 && (
              <div className="bg-rose-500 px-1.5 py-1 text-center text-[10px] font-black leading-none text-white">
                -{off}%
                <span className="block text-[7px] font-bold tracking-wide">{dealTag}</span>
              </div>
            )}
            <div className="flex flex-col gap-1 pl-1.5">
              {product.isNew && (
                <span className="rounded-sm bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">ໃໝ່</span>
              )}
              {product.isPromo && !product.isNew && (
                <span className="rounded-sm bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">ໂປຣ</span>
              )}
            </div>
          </div>
          {outOfStock && (
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
              ສິນຄ້າໝົດ
            </span>
          )}
        </div>
      </Link>

      <div className="absolute right-1.5 top-1.5 z-10 flex flex-col gap-1.5">
        <WishlistButton product={product} />
        <CompareButton product={product} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2">
        <Link href={`/product/${encodeURIComponent(product.code)}`}>
          <h3
            title={product.name}
            className="line-clamp-2 min-h-[34px] break-words text-[13px] leading-[17px] text-slate-700 transition-colors group-hover:text-orange-600"
          >
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-black tracking-tight text-orange-600">
            {formatKip(hasDeal ? deal! : product.price)}
          </span>
          {hasDeal && (
            <span className="text-[11px] font-medium text-slate-400 line-through">{formatKip(product.price)}</span>
          )}
        </div>

        {/* Member / affiliate badges */}
        {(product.memberPct || product.commissionKip) && (
          <div className="flex flex-wrap gap-1">
            {product.memberPct ? (
              <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">ສະມາຊິກ −{product.memberPct}%</span>
            ) : null}
            {product.commissionKip ? (
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                ນາຍໜ້າ +{formatKip(product.commissionKip)}
              </span>
            ) : null}
          </div>
        )}

        {/* Rating · sold (Lazada bottom row) */}
        <div className="mt-auto flex items-center justify-between gap-1 pt-1 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            {product.rating != null && product.reviewCount > 0 ? (
              <>
                <StarRating value={product.rating} size={11} />
                <span className="text-amber-500">{product.rating.toFixed(1)}</span>
              </>
            ) : (
              <span className="text-slate-300">ຍັງບໍ່ມີຣີວິວ</span>
            )}
          </span>
          {product.soldCount ? <span>ຂາຍແລ້ວ {product.soldCount.toLocaleString("en-US")}</span> : null}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {product.unit ? <span className="text-[10px] font-bold text-slate-400">/ {product.unit}</span> : <span />}
          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}
