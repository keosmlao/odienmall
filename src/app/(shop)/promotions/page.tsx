import type { Metadata } from "next";
import Image from "next/image";
import { getActivePointPromotions, type PointPromotion } from "@/lib/promotions";

export const metadata: Metadata = {
  title: "ໂປຣໂມຊັນແຕ້ມ",
  description: "ສິນຄ້າໂປຣໂມຊັນ — ຊື້ສິນຄ້າຮັບແຕ້ມ ແລະ ຂອງແຖມ",
};

export const revalidate = 3600;

const CARD_META: Record<string, { label: string; border: string; badge: string; icon: string }> = {
  "0": { label: "ທຸກລູກຄ້າ", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", icon: "🛍️" },
  "1": { label: "ລູກຄ້າສະມາຊິກ", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", icon: "⭐" },
  "2": { label: "ລູກຄ້າ VIP", border: "border-purple-200", badge: "bg-purple-100 text-purple-800", icon: "👑" },
};

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function PromoCard({ promo }: { promo: PointPromotion }) {
  const meta = CARD_META[promo.cardType] ?? CARD_META["0"];

  return (
    <div className={`relative flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm ${meta.border}`}>
      {/* Pinned badge */}
      {promo.pinned && (
        <span className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          📌 ແນະນຳ
        </span>
      )}
      {/* Image */}
      <div className="relative mx-auto h-28 w-full overflow-hidden rounded-lg bg-slate-50">
        {promo.imageUrl ? (
          <Image
            src={promo.imageUrl}
            alt={promo.name}
            fill
            sizes="240px"
            className="object-contain p-2"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-slate-200">
            🎁
          </div>
        )}
      </div>

      {/* Name */}
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800">
        {promo.name}
      </p>

      {/* Points + gift */}
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
          ⭐ {promo.points.toLocaleString()} ແຕ້ມ
        </span>
        {promo.freeQty != null && promo.unitCode && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            🎁 {promo.freeQty} {promo.unitCode}
          </span>
        )}
      </div>

      {/* Date + badge */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-400">
          {fmtDate(promo.fromDate)} – {fmtDate(promo.toDate)}
        </p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
          {meta.icon} {meta.label}
        </span>
      </div>
    </div>
  );
}

function Section({ type, promos }: { type: "0" | "1" | "2"; promos: PointPromotion[] }) {
  if (!promos.length) return null;
  const meta = CARD_META[type];
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <span className="text-xl">{meta.icon}</span>
        <h2 className="font-bold text-slate-800">{meta.label}</h2>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.badge}`}>
          {promos.length} ລາຍການ
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {promos.map((p) => <PromoCard key={p.code} promo={p} />)}
      </div>
    </section>
  );
}

export default async function PromotionsPage() {
  const { all, member, vip } = await getActivePointPromotions();
  const total = all.length + member.length + vip.length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 p-6 text-white">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🎁</span>
          <div>
            <h1 className="text-2xl font-bold">ໂປຣໂມຊັນແຕ້ມ</h1>
            <p className="mt-0.5 text-orange-100">
              ຊື້ສິນຄ້າທີ່ຮ່ວມໂປຣ ຮັບແຕ້ມ ແລະ ຂອງແຖມ — {total} ລາຍການ
            </p>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
          ບໍ່ມີໂປຣໂມຊັນໃນຂະນະນີ້
        </div>
      ) : (
        <>
          <Section type="0" promos={all} />
          <Section type="1" promos={member} />
          <Section type="2" promos={vip} />
        </>
      )}

      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        <p>
          <span className="font-semibold text-slate-700">ໝາຍເຫດ:</span>{" "}
          ໂປຣໂມຊັນ ແລະ ຂອງແຖມ ອາດມີການປ່ຽນແປງໂດຍບໍ່ຕ້ອງແຈ້ງລ່ວງໜ້າ.
          ສອບຖາມຂໍ້ມູນເພີ່ມຕຶ່ມ: 020 5992 9992
        </p>
      </div>
    </div>
  );
}
