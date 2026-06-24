"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { formatKip } from "@/lib/format";
import ProductImage from "@/components/ProductImage";
import StorePageHeader from "@/components/StorePageHeader";
import RecentlyViewed from "@/components/RecentlyViewed";
import CartCrossSell from "@/components/CartCrossSell";
import { getCheckoutLoyalty } from "@/app/(shop)/checkout/actions";

export default function CartPage() {
  const { items, totalQty, totalPrice, setQty, remove, clear, ready } = useCart();

  // Member discount (logged-in members get the baseline %, tier may raise it).
  // Shown as a separate line — item prices stay full, matching checkout + the
  // server-side re-pricing in createOrder.
  const [member, setMember] = useState<{ pct: number; tier: string | null }>({ pct: 0, tier: null });
  useEffect(() => {
    getCheckoutLoyalty()
      .then((l) => setMember({ pct: l.memberPct, tier: l.memberTier }))
      .catch(() => {});
  }, []);
  // Discount applied PER LINE (rounded per unit), so each row shows its own
  // struck price; the summary is derived from the per-line sum to stay exact.
  const factor = member.pct > 0 ? 1 - member.pct / 100 : 1;
  const discUnit = (p: number | null) => (p == null ? 0 : Math.round(p * factor));
  const discountedSubtotal = items.reduce((s, it) => s + discUnit(it.price) * it.qty, 0);
  const memberDiscount = totalPrice - discountedSubtotal;
  const grandTotal = Math.max(0, discountedSubtotal);

  if (!ready) {
    return <div className="py-24 text-center text-slate-400 font-semibold animate-pulse">ກຳລັງໂຫຼດກະຕ່າ...</div>;
  }

  if (items.length === 0) {
    return (
      <div>
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-5 rounded-sm border border-orange-100 bg-white p-10 py-20 text-center shadow-sm">
        <div className="text-6xl mb-2">🛒</div>
        <p className="text-lg font-bold text-slate-800">ກະຕ່າຂອງທ່ານວ່າງເປົ່າ</p>
        <p className="text-xs text-slate-400 -mt-2">ກະລຸນາເລືອກສິນຄ້າທີ່ຕ້ອງການເພື່ອເພີ່ມລົງໃນກະຕ່າ</p>
        <Link
          href="/products"
          className="rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-3.5 text-xs font-bold text-white shadow-md transition hover:from-orange-600 hover:to-rose-600"
        >
          ເລີ່ມຊ໊ອບປິ້ງ
        </Link>
      </div>
      <RecentlyViewed title="ສິນຄ້າທີ່ທ່ານເຄີຍເບິ່ງ" />
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-0">
      <section className="!mb-4 !p-0">
        <StorePageHeader
          title={`ກະຕ່າສິນຄ້າ (${totalQty})`}
          subtitle="ກວດສອບຈຳນວນ ແລະລາຄາກ່ອນດຳເນີນການສັ່ງຊື້"
          action={
            <button
              onClick={clear}
              className="text-xs font-bold text-slate-400 transition hover:text-rose-500"
            >
              ລ້າງກະຕ່າ
            </button>
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Items */}
        <div className="space-y-3.5">
          {items.map((it) => (
            <div
              key={it.code}
              className="flex gap-4 border-b border-slate-100 bg-white p-4 shadow-sm transition first:border-t hover:relative hover:z-10 hover:shadow-md sm:rounded-sm sm:border"
            >
              <Link
                href={`/product/${encodeURIComponent(it.code)}`}
                className="shrink-0 transition-transform duration-200 hover:scale-[1.02]"
              >
                <ProductImage
                  code={it.code}
                  name={it.name}
                  brand={it.brandName}
                  imageUrl={it.imageUrl}
                  rounded="rounded-xl"
                  className="h-20 w-20 border border-slate-100 object-contain"
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div>
                  <Link
                    href={`/product/${encodeURIComponent(it.code)}`}
                    className="line-clamp-2 text-sm font-semibold text-slate-800 hover:text-slate-950 transition-colors duration-150"
                  >
                    {it.name}
                  </Link>
                  {it.brandName && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 block">{it.brandName}</span>
                  )}
                </div>
                
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-50">
                  <div className="inline-flex items-center rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <button
                      onClick={() => setQty(it.code, it.qty - 1)}
                      className="grid h-8.5 w-8.5 place-items-center text-slate-500 hover:bg-slate-200/70 font-bold transition-colors"
                      aria-label="ຫຼຸດ"
                    >
                      −
                    </button>
                    <span className="w-9 text-center text-xs font-bold text-slate-800">{it.qty}</span>
                    <button
                      onClick={() => setQty(it.code, it.qty + 1)}
                      className="grid h-8.5 w-8.5 place-items-center text-slate-500 hover:bg-slate-200/70 font-bold transition-colors"
                      aria-label="ເພີ່ມ"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    {memberDiscount > 0 && it.price != null ? (
                      <>
                        <div className="text-[11px] font-medium text-slate-400 line-through">
                          {formatKip(it.price * it.qty)}
                        </div>
                        <div className="text-sm font-extrabold text-orange-600">
                          {formatKip(discUnit(it.price) * it.qty)}
                        </div>
                        <div className="text-[10px] font-bold text-violet-600">ສະມາຊິກ −{member.pct}%</div>
                      </>
                    ) : (
                      <div className="text-sm font-extrabold text-orange-600">
                        {formatKip((it.price ?? 0) * it.qty)}
                      </div>
                    )}
                    <button
                      onClick={() => remove(it.code)}
                      className="text-xs font-bold text-slate-400 hover:text-price transition-colors duration-150 mt-0.5"
                    >
                      ລຶບ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="h-fit rounded-sm border border-orange-100 bg-white p-5 shadow-sm lg:sticky lg:top-32">
          <h2 className="mb-4 font-bold text-slate-900 pb-2.5 border-b border-slate-50">ສະຫຼຸບລາຍການ</h2>
          <div className="space-y-2">
            <div className="flex justify-between py-0.5 text-xs font-semibold text-slate-500">
              <span>ຈຳນວນສິນຄ້າ</span>
              <span className="text-slate-800 font-bold">{totalQty} ລາຍການ</span>
            </div>
            <div className="flex justify-between py-0.5 text-xs font-semibold text-slate-500">
              <span>ຍອດສິນຄ້າ</span>
              <span className="text-slate-800 font-bold">{formatKip(totalPrice)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-xs font-semibold text-slate-500">
              <span>ຄ່າຈັດສົ່ງ</span>
              <span className="font-bold text-emerald-600">ຟຣີ</span>
            </div>
            {memberDiscount > 0 && (
              <div className="flex justify-between py-0.5 text-xs font-semibold text-violet-600">
                <span>ສ່ວນຫຼຸດສະມາຊິກ{member.tier ? ` (${member.tier})` : ""} {member.pct}%</span>
                <span className="font-bold">−{formatKip(memberDiscount)}</span>
              </div>
            )}
          </div>
          <div className="my-4 border-t border-slate-50" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-900">ລວມທັງໝົດ</span>
            <span className="text-2xl font-black tracking-tight text-orange-600">
              {formatKip(grandTotal)}
            </span>
          </div>
          <Link
            href="/checkout"
            className="mt-6 block w-full rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 py-3.5 text-center text-sm font-bold text-white shadow-md transition hover:from-orange-600 hover:to-rose-600"
          >
            ດຳເນີນການສັ່ງຊື້
          </Link>
          <Link
            href="/products"
            className="mt-4 block text-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            ຊ໊ອບປິ້ງຕໍ່
          </Link>
          <div className="mt-5 border-t border-slate-100 pt-4 text-center text-[10px] font-medium leading-5 text-slate-400">
            🔒 ຊຳລະປອດໄພຜ່ານ BCEL OnePay<br />ລາຄາຈະຖືກກວດສອບຈາກລະບົບອີກຄັ້ງ
          </div>
        </div>
      </div>
      <CartCrossSell />
      <RecentlyViewed title="ສິນຄ້າແນະນຳຈາກທີ່ທ່ານເບິ່ງ" />

      {/* Mobile sticky checkout bar (Lazada-style) */}
      <div className="fixed inset-x-0 bottom-[53px] z-30 flex items-center gap-3 border-t border-orange-100 bg-white/95 px-4 py-2.5 shadow-[0_-6px_20px_rgba(15,23,42,0.10)] backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold text-slate-400">
            ລວມ ({totalQty}){memberDiscount > 0 ? ` · ຫຼຸດ ${member.pct}%` : ""}
          </div>
          <div className="truncate text-lg font-black text-orange-600">{formatKip(grandTotal)}</div>
        </div>
        <Link
          href="/checkout"
          className="shrink-0 rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 px-7 py-3 text-sm font-bold text-white shadow-md"
        >
          ສັ່ງຊື້
        </Link>
      </div>
    </div>
  );
}
