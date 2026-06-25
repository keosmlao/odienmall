import type { Metadata } from "next";
import { getAllPromotions, type AdminPromotion } from "@/lib/promotions-admin";
import PromoImageManager from "./PromoImageManager";

export const metadata: Metadata = { title: "ໂປຣໂມຊັນແຕ້ມ" };
export const dynamic = "force-dynamic";

const CARD_LABELS: Record<string, string> = {
  "0": "ທຸກລູກຄ້າ",
  "1": "ສະມາຊິກ",
  "2": "VIP",
};
const CARD_COLORS: Record<string, string> = {
  "0": "bg-blue-50 text-blue-700",
  "1": "bg-amber-50 text-amber-700",
  "2": "bg-purple-50 text-purple-800",
};

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default async function AdminPromotionsPage() {
  const promos = await getAllPromotions();
  const active = promos.filter((p) => p.isActive);
  const expired = promos.filter((p) => !p.isActive);
  const withImg = promos.filter((p) => p.imageUrl).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">ໂປຣໂມຊັນແຕ້ມ</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            ຈັດການຮູບສຳລັບໂປຣໂມຊັນ · {promos.length} ລາຍການ · {withImg} ມີຮູບ
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700">
            {active.length} ກຳລັງໃຊ້
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-500">
            {expired.length} ໝົດອາຍຸ
          </span>
        </div>
      </div>

      {/* Active promotions */}
      {active.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
            ກຳລັງໃຊ້ງານ ({active.length})
          </h2>
          <PromoGrid promos={active} />
        </section>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
            ໝົດອາຍຸ ({expired.length})
          </h2>
          <PromoGrid promos={expired} dimmed />
        </section>
      )}
    </div>
  );
}

function PromoGrid({ promos, dimmed }: { promos: AdminPromotion[]; dimmed?: boolean }) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${dimmed ? "opacity-60" : ""}`}>
      {promos.map((p) => (
        <PromoCard key={p.code} promo={p} />
      ))}
    </div>
  );
}

function PromoCard({ promo }: { promo: AdminPromotion }) {
  const ct = CARD_LABELS[promo.cardType] ?? "ທຸກລູກຄ້າ";
  const cc = CARD_COLORS[promo.cardType] ?? CARD_COLORS["0"];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Image area */}
      <PromoImageManager
        promoCode={promo.code}
        imageUrl={promo.imageUrl}
        name={promo.name}
        pinned={promo.pinned}
      />

      {/* Info */}
      <div className="space-y-1.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800">
          {promo.name}
        </p>
        <p className="text-xs text-slate-400">
          {promo.icCode}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cc}`}>
            {ct}
          </span>
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700">
            ⭐ {promo.points.toLocaleString()} ແຕ້ມ
          </span>
          {promo.freeQty != null && (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
              🎁 {promo.freeQty} {promo.unitCode}
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-400">
          {fmtDate(promo.fromDate)} – {fmtDate(promo.toDate)}
        </p>
      </div>
    </div>
  );
}
