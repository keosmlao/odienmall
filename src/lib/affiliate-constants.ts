// Affiliate constants — NO server-only / db imports, so both client and server
// components can import these safely (mirrors order-constants.ts).

export const AFFILIATE_STATUSES = ["pending", "active", "suspended"] as const;
export type AffiliateStatus = (typeof AFFILIATE_STATUSES)[number];

export const AFFILIATE_STATUS_LABEL: Record<AffiliateStatus, string> = {
  pending: "ລໍຖ້າອະນຸມັດ",
  active: "ໃຊ້ງານ",
  suspended: "ລະງັບ",
};

export const COMMISSION_STATUSES = ["earned", "paid"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const COMMISSION_STATUS_LABEL: Record<CommissionStatus, string> = {
  earned: "ຄ້າງຈ່າຍ",
  paid: "ຈ່າຍແລ້ວ",
};

export const RATE_SCOPES = ["default", "category", "brand", "product"] as const;
export type RateScope = (typeof RATE_SCOPES)[number];

export const RATE_SCOPE_LABEL: Record<RateScope, string> = {
  default: "ຄ່າເລີ່ມຕົ້ນ",
  category: "ຕາມໝວດ",
  brand: "ຕາມຍີ່ຫໍ້",
  product: "ຕາມສິນຄ້າ",
};
