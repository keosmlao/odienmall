// Client-safe tier constants — NO server/db imports.
// Used by Header (client), useMemberTier hook, and server-side tier helpers.

export type TierKey = "gold" | "platinum" | "black";

export interface TierCookieData {
  code: string;
  key: TierKey;
  name: string;
  rank: number;
  discountPct: number;           // % discount from ar_group_sub
  spend: number;                 // total LAK spend
  nextSpend: number | null;      // LAK threshold for next tier
  nextName: string | null;       // display name of next tier
  nextDiscountPct: number | null; // discount % after reaching next tier
}

/** Visual styles per tier rank (index = rank 0/1/2). */
export const TIER_RANK_STYLES = [
  // rank 0 — Gold
  {
    key: "gold" as TierKey,
    icon: "👑",
    topBarBg: "bg-gradient-to-r from-amber-400 to-yellow-400",
    topBarBorder: "border-amber-500",
    topBarText: "text-amber-900",
    linkHover: "hover:text-amber-950 hover:underline",
    badgeClass: "bg-amber-900/20 text-amber-900 ring-1 ring-amber-900/30",
    progressBg: "bg-amber-800",
    progressTrack: "bg-amber-200/60",
    headerAccent: "from-amber-400 to-yellow-400",
  },
  // rank 1 — Platinum
  {
    key: "platinum" as TierKey,
    icon: "💎",
    topBarBg: "bg-gradient-to-r from-slate-400 to-slate-500",
    topBarBorder: "border-slate-500",
    topBarText: "text-white",
    linkHover: "hover:text-slate-100 hover:underline",
    badgeClass: "bg-white/20 text-white ring-1 ring-white/40",
    progressBg: "bg-white",
    progressTrack: "bg-white/30",
    headerAccent: "from-slate-300 to-slate-500",
  },
  // rank 2 — Black Card
  {
    key: "black" as TierKey,
    icon: "✦",
    topBarBg: "bg-gradient-to-r from-slate-900 to-black",
    topBarBorder: "border-slate-700",
    topBarText: "text-slate-200",
    linkHover: "hover:text-white hover:underline",
    badgeClass: "bg-white/10 text-white ring-1 ring-white/20",
    progressBg: "bg-white",
    progressTrack: "bg-white/20",
    headerAccent: "from-slate-700 to-slate-900",
  },
] as const;

export type TierRankStyle = (typeof TIER_RANK_STYLES)[number];

export function getTierStyle(rank: number): TierRankStyle {
  return TIER_RANK_STYLES[Math.min(Math.max(rank, 0), 2)];
}
