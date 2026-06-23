// Client-safe payout-bank choices for affiliate applications.

export const AFFILIATE_BANKS = [
  { code: "BCEL", name: "BCEL — ທະນາຄານການຄ້າຕ່າງປະເທດລາວ" },
  { code: "LDB", name: "LDB — ທະນາຄານພັດທະນາລາວ" },
  { code: "APB", name: "APB — ທະນາຄານສົ່ງເສີມກະສິກຳ" },
  { code: "JDB", name: "JDB Bank" },
  { code: "BFL", name: "BFL — Banque Franco-Lao" },
  { code: "STB", name: "ST Bank" },
  { code: "BIC", name: "BIC Bank Laos" },
  { code: "LVB", name: "Lao-Viet Bank" },
  { code: "IDCB", name: "Indochina Bank" },
  { code: "MB", name: "MB Bank Laos" },
] as const;

export function getAffiliateBank(code: string | null | undefined) {
  return AFFILIATE_BANKS.find((bank) => bank.code === code) ?? null;
}
