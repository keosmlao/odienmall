import type { Metadata } from "next";
import Image from "next/image";
import { getActiveRewards, getAvailablePoints, type PointReward } from "@/lib/rewards";
import CountdownTimer from "@/components/CountdownTimer";
import RedeemButton from "./RedeemButton";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ແລກຂອງລາງວັນ",
  description: "ແລກຂອງລາງວັນດ້ວຍແຕ້ມສະສົມ — ສະສົມແຕ້ມຈາກການຊື້ສິນຄ້າ ແລ້ວນຳແຕ້ມມາແລກຂອງລາງວັນ",
};

export const dynamic = "force-dynamic";

const CARD_META: Record<string, {
  label: string;
  topAccent: string;
  badgeBg: string;
  badgeText: string;
  icon: string;
  glow: string;
}> = {
  "0": {
    label: "ທຸກລູກຄ້າ",
    topAccent: "from-blue-400 to-cyan-400",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    icon: "🎁",
    glow: "hover:shadow-blue-100",
  },
  "1": {
    label: "ສະມາຊິກ",
    topAccent: "from-amber-400 to-yellow-400",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    icon: "⭐",
    glow: "hover:shadow-amber-100",
  },
  "2": {
    label: "VIP",
    topAccent: "from-purple-400 to-violet-500",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-800",
    icon: "👑",
    glow: "hover:shadow-purple-100",
  },
};

function RewardCard({ reward, myPoints, loggedIn }: { reward: PointReward; myPoints: number; loggedIn: boolean }) {
  const meta = CARD_META[reward.cardType] ?? CARD_META["0"];
  const canRedeem = myPoints > 0 && myPoints >= reward.points;
  const redeemCount = myPoints > 0 ? Math.floor(myPoints / reward.points) : 0;

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm
      transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${meta.glow}`}>

      {/* Coloured top accent strip */}
      <div className={`h-1 w-full bg-gradient-to-r ${meta.topAccent}`} />

      {/* Pinned badge */}
      {reward.pinned && (
        <span className="absolute right-2 top-3 z-10 flex items-center gap-0.5 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          📌 ແນະນຳ
        </span>
      )}

      {/* Image */}
      <div className="relative mx-3 mt-3 overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="relative h-32 w-full">
          {reward.imageUrl ? (
            <Image
              src={reward.imageUrl}
              alt={reward.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl opacity-20 transition-all duration-500 group-hover:opacity-30 group-hover:scale-110">
              🎁
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        {/* Name */}
        <p className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-800">
          {reward.name}
        </p>

        {/* Points + Gift qty — opposite sides */}
        <div className="flex items-center justify-between gap-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 px-3 py-1 text-xs font-black text-white shadow-sm">
            ⭐ {reward.points.toLocaleString()} ແຕ້ມ
          </span>
          {reward.freeQty != null && reward.unitCode && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
              🎁 {reward.freeQty} {reward.unitCode}
            </span>
          )}
        </div>

        {/* Member/VIP badge */}
        {reward.cardType !== "0" && (
          <span className={`self-start rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badgeBg} ${meta.badgeText}`}>
            {meta.icon} {meta.label}
          </span>
        )}

        {/* Redeem calc — shown only to logged-in customers */}
        {myPoints > 0 && (
          <div className={`rounded-xl px-3 py-2 text-xs font-bold ${canRedeem ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"}`}>
            {canRedeem
              ? `ແລກໄດ້ ${redeemCount} ຄັ້ງ (ມີ ${myPoints.toLocaleString()} ແຕ້ມ)`
              : `ຂາດ ${(reward.points - myPoints).toLocaleString()} ແຕ້ມ`}
          </div>
        )}

        {/* Redeem button */}
        <RedeemButton promoCode={reward.code} canRedeem={canRedeem} loggedIn={loggedIn} />

        {/* Countdown — pushed to bottom */}
        <div className="mt-auto pt-1 border-t border-slate-100">
          <CountdownTimer toDate={reward.toDate} />
        </div>
      </div>
    </div>
  );
}

function Section({ type, rewards, myPoints, loggedIn }: { type: "0" | "1" | "2"; rewards: PointReward[]; myPoints: number; loggedIn: boolean }) {
  if (!rewards.length) return null;
  const meta = CARD_META[type];
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <span className="text-xl">{meta.icon}</span>
        <h2 className="font-bold text-slate-800">{meta.label}</h2>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.badgeBg} ${meta.badgeText}`}>
          {rewards.length} ລາຍການ
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {rewards.map((r, i) => <RewardCard key={`${r.code}-${i}`} reward={r} myPoints={myPoints} loggedIn={loggedIn} />)}
      </div>
    </section>
  );
}

export default async function RewardsPage() {
  const session = await getSession();
  const [{ all, member, vip }, myPoints] = await Promise.all([
    getActiveRewards(),
    session ? getAvailablePoints(session.code) : Promise.resolve(0),
  ]);
  const loggedIn = Boolean(session);
  const total = all.length + member.length + vip.length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 p-6 text-white shadow-lg shadow-orange-200">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl drop-shadow">🎁</span>
            <div>
              <h1 className="text-2xl font-black tracking-tight">ແລກຂອງລາງວັນ</h1>
              <p className="mt-0.5 text-orange-100 text-sm">
                ສະສົມແຕ້ມຈາກການຊື້ສິນຄ້າ → ນຳແຕ້ມມາແລກຂອງລາງວັນ · {total} ລາຍການ
              </p>
            </div>
          </div>
          {/* My points badge */}
          {session && (
            <div className="shrink-0 rounded-2xl bg-white/20 px-4 py-2.5 text-right backdrop-blur-sm">
              <p className="text-[10px] font-semibold text-orange-100">ແຕ້ມຂອງທ່ານ</p>
              <p className="text-2xl font-black tabular-nums">{myPoints.toLocaleString()}</p>
              <p className="text-[10px] font-semibold text-orange-100">ແຕ້ມ</p>
            </div>
          )}
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 right-20 h-32 w-32 rounded-full bg-white/10" />
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
          ບໍ່ມີຂອງລາງວັນໃນຂະນະນີ້
        </div>
      ) : (
        <>
          <Section type="0" rewards={all} myPoints={myPoints} loggedIn={loggedIn} />
          <Section type="1" rewards={member} myPoints={myPoints} loggedIn={loggedIn} />
          <Section type="2" rewards={vip} myPoints={myPoints} loggedIn={loggedIn} />
        </>
      )}

      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        <span className="font-semibold text-slate-700">ໝາຍເຫດ:</span>{" "}
        ຂອງລາງວັນ ອາດມີການປ່ຽນແປງໂດຍບໍ່ຕ້ອງແຈ້ງລ່ວງໜ້າ · ສອບຖາມ: 020 5992 9992
      </div>
    </div>
  );
}
