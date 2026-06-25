import Link from "next/link";
import Image from "next/image";
import type { PointPromotion } from "@/lib/promotions";

const CARD_BADGE: Record<string, string> = {
  "0": "bg-blue-100 text-blue-700",
  "1": "bg-amber-100 text-amber-700",
  "2": "bg-purple-100 text-purple-800",
};
const CARD_LABEL: Record<string, string> = {
  "0": "ທົ່ວໄປ",
  "1": "ສະມາຊິກ",
  "2": "VIP",
};

export default function PromotionRail({ promos }: { promos: PointPromotion[] }) {
  if (!promos.length) return null;

  return (
    <section className="!mb-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="text-lg">🎁</span>
          ໂປຣໂມຊັນແຕ້ມ
        </h2>
        <Link href="/promotions" className="text-xs font-bold text-orange-600 hover:underline">
          ເບິ່ງທັງໝົດ ›
        </Link>
      </div>

      {/* Horizontal scroll rail */}
      <div className="thin-scroll flex gap-3 overflow-x-auto pb-1">
        {promos.map((p) => (
          <div
            key={p.code}
            className="flex w-[140px] shrink-0 flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
          >
            {/* Image */}
            <div className="relative h-20 w-full overflow-hidden rounded-lg bg-slate-50">
              {p.imageUrl ? (
                <Image
                  src={p.imageUrl}
                  alt={p.name}
                  fill
                  sizes="140px"
                  className="object-contain p-1"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl text-slate-200">
                  🎁
                </div>
              )}
            </div>

            {/* Name */}
            <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-slate-700">
              {p.name}
            </p>

            {/* Points */}
            <div className="flex flex-wrap gap-1">
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                ⭐ {p.points.toLocaleString()}
              </span>
              {p.freeQty != null && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                  🎁 {p.freeQty} {p.unitCode}
                </span>
              )}
            </div>

            {/* Type badge */}
            <span className={`self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ${CARD_BADGE[p.cardType] ?? CARD_BADGE["0"]}`}>
              {CARD_LABEL[p.cardType] ?? "ທົ່ວໄປ"}
            </span>
          </div>
        ))}

        {/* See all card */}
        <Link
          href="/promotions"
          className="flex w-[110px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-orange-200 bg-orange-50 p-3 text-center transition hover:bg-orange-100"
        >
          <span className="text-2xl">→</span>
          <span className="text-xs font-bold text-orange-600">ເບິ່ງທັງໝົດ</span>
        </Link>
      </div>
    </section>
  );
}
