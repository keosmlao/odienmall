import Link from "next/link";
import Image from "next/image";
import type { PointReward } from "@/lib/rewards";
import CountdownTimer from "@/components/CountdownTimer";

const CARD_STYLE: Record<string, {
  accent: string;
  glow: string;
  ptsBg: string;
  icon: string;
}> = {
  "0": { accent: "from-blue-400 via-cyan-400 to-sky-500",      glow: "hover:shadow-blue-200",   ptsBg: "from-blue-500 to-cyan-500",    icon: "🎁" },
  "1": { accent: "from-amber-400 via-yellow-400 to-orange-400", glow: "hover:shadow-amber-200",  ptsBg: "from-amber-500 to-orange-500", icon: "⭐" },
  "2": { accent: "from-purple-500 via-violet-500 to-indigo-500",glow: "hover:shadow-purple-200", ptsBg: "from-purple-600 to-violet-600",icon: "👑" },
};

export default function RewardsRail({ promos }: { promos: PointReward[] }) {
  if (!promos.length) return null;
  const visible = promos.slice(0, 6);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4 shadow-sm ring-1 ring-orange-100 sm:p-5">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-200/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 left-10 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl" />

      {/* Header */}
      <div className="relative mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-base shadow-sm shadow-orange-300">
            🎁
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-800 sm:text-base">ແລກຂອງລາງວັນ</h2>
            <p className="text-[10px] font-semibold text-orange-500">ສະສົມແຕ້ມ → ແລກຂອງລາງວັນ</p>
          </div>
        </div>
        <Link
          href="/rewards"
          className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1.5 text-[11px] font-black text-white shadow-sm shadow-orange-300 transition hover:bg-orange-600 active:scale-95"
        >
          ເບິ່ງທັງໝົດ
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </div>

      {/* Cards */}
      <div className="relative grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5 lg:grid-cols-6">
        {visible.map((p, i) => {
          const s = CARD_STYLE[p.cardType] ?? CARD_STYLE["0"];
          return (
            <Link
              key={`${p.code}-${i}`}
              href="/rewards"
              className={`group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100
                transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:ring-orange-200 ${s.glow}`}
            >
              {/* Top gradient accent */}
              <div className={`h-[3px] w-full bg-gradient-to-r ${s.accent}`} />

              {/* Pinned */}
              {p.pinned && (
                <span className="absolute right-1.5 top-2.5 z-10 text-[10px]">📌</span>
              )}

              {/* Image */}
              <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 px-2 py-3">
                {p.imageUrl ? (
                  <div className="relative h-28 w-full sm:h-36">
                    <Image
                      src={p.imageUrl}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 17vw"
                      className="object-contain transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                ) : (
                  <div className="flex h-28 w-full items-center justify-center sm:h-36">
                    <span className="text-5xl opacity-20 transition-all duration-500 group-hover:opacity-35 group-hover:scale-110">
                      {s.icon}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                <p className="line-clamp-2 text-[10px] font-bold leading-snug text-slate-700 sm:text-[11px]">
                  {p.name}
                </p>
                <div className="mt-auto flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`rounded-full bg-gradient-to-r px-2 py-0.5 text-[9px] font-black text-white sm:text-[10px] ${s.ptsBg}`}>
                      ⭐ {p.points.toLocaleString()} ແຕ້ມ
                    </span>
                    {p.freeQty != null && p.unitCode && (
                      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white">
                        🎁 {p.freeQty} {p.unitCode}
                      </span>
                    )}
                  </div>
                  <div className="pt-0.5 border-t border-slate-100">
                    <CountdownTimer toDate={p.toDate} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
