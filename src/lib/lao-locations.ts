// Lao administrative divisions — provinces (ແຂວງ) and their districts (ເມືອງ).
// Client-safe (no server/db imports) so the checkout form can use it directly.
// Villages (ບ້ານ) are intentionally NOT enumerated — Laos has thousands, so the
// checkout collects the village as free text instead of a dropdown.

export type LaoProvince = { name: string; districts: string[] };

export const LAO_PROVINCES: LaoProvince[] = [
  {
    name: "ນະຄອນຫຼວງວຽງຈັນ",
    districts: [
      "ຈັນທະບູລີ",
      "ສີໂຄດຕະບອງ",
      "ໄຊເສດຖາ",
      "ສີສັດຕະນາກ",
      "ນາຊາຍທອງ",
      "ໄຊທານີ",
      "ຫາດຊາຍຟອງ",
      "ສັງທອງ",
      "ປາກງື່ມ",
    ],
  },
  {
    name: "ຜົ້ງສາລີ",
    districts: ["ຜົ້ງສາລີ", "ໃໝ່", "ຂວາ", "ສຳພັນ", "ບຸນເໜືອ", "ຍອດອູ", "ບຸນໃຕ້"],
  },
  {
    name: "ຫຼວງນ້ຳທາ",
    districts: ["ຫຼວງນ້ຳທາ", "ສິງ", "ລອງ", "ວຽງພູຄາ", "ນາແລ"],
  },
  {
    name: "ອຸດົມໄຊ",
    districts: ["ໄຊ", "ລາ", "ນາໝໍ້", "ງາ", "ແບ່ງ", "ຮຸນ", "ປາກແບ່ງ"],
  },
  {
    name: "ບໍ່ແກ້ວ",
    districts: ["ຫ້ວຍຊາຍ", "ຕົ້ນເຜິ້ງ", "ເມິງ", "ຜາອຸດົມ", "ປາກທາ"],
  },
  {
    name: "ຫຼວງພະບາງ",
    districts: [
      "ຫຼວງພະບາງ",
      "ຊຽງເງິນ",
      "ນານ",
      "ປາກອູ",
      "ນ້ຳບາກ",
      "ງອຍ",
      "ປາກແຊງ",
      "ໂພນໄຊ",
      "ຈອມເພັດ",
      "ວຽງຄຳ",
      "ພູຄູນ",
      "ໂພນທອງ",
    ],
  },
  {
    name: "ຫົວພັນ",
    districts: [
      "ຊຳເໜືອ",
      "ຊຽງຄໍ້",
      "ວຽງໄຊ",
      "ຫົວເມືອງ",
      "ຊຳໃຕ້",
      "ສົບເບົາ",
      "ແອດ",
      "ກວນ",
      "ຊ່ອນ",
      "ຮ້ຽມ",
    ],
  },
  {
    name: "ໄຊຍະບູລີ",
    districts: [
      "ໄຊຍະບູລີ",
      "ຄອບ",
      "ຫົງສາ",
      "ເງິນ",
      "ຊຽງຮ່ອນ",
      "ພຽງ",
      "ປາກລາຍ",
      "ແກ່ນທ້າວ",
      "ບໍ່ແຕນ",
      "ທົ່ງມີໄຊ",
      "ໄຊສະຖານ",
    ],
  },
  {
    name: "ຊຽງຂວາງ",
    districts: ["ແປກ", "ຄຳ", "ໜອງແຮດ", "ຄູນ", "ໝອກໃໝ່", "ພູກູດ", "ພະໄຊ"],
  },
  {
    name: "ວຽງຈັນ",
    districts: [
      "ໂພນໂຮງ",
      "ທຸລະຄົມ",
      "ແກ້ວອຸດົມ",
      "ກາສີ",
      "ວັງວຽງ",
      "ເຟືອງ",
      "ຊະນະຄາມ",
      "ແມດ",
      "ວຽງຄຳ",
      "ຫີນເຫີບ",
      "ໝື່ນ",
    ],
  },
  {
    name: "ບໍລິຄຳໄຊ",
    districts: ["ປາກຊັນ", "ທ່າພະບາດ", "ປາກກະດິງ", "ບໍລິຄັນ", "ຄຳເກີດ", "ວຽງທອງ", "ໄຊຈຳພອນ"],
  },
  {
    name: "ຄຳມ່ວນ",
    districts: [
      "ທ່າແຂກ",
      "ມະຫາໄຊ",
      "ໜອງບົກ",
      "ຫີນບູນ",
      "ຍົມມະລາດ",
      "ບົວລະພາ",
      "ນາກາຍ",
      "ເຊບັ້ງໄຟ",
      "ໄຊບົວທອງ",
      "ຄູນຄຳ",
    ],
  },
  {
    name: "ສະຫວັນນະເຂດ",
    districts: [
      "ໄກສອນພົມວິຫານ",
      "ອຸທຸມພອນ",
      "ອາດສະພັງທອງ",
      "ພີນ",
      "ເຊໂປນ",
      "ນອງ",
      "ທ່າປາງທອງ",
      "ສອງຄອນ",
      "ຈຳພອນ",
      "ຊົນບູລີ",
      "ໄຊບູລີ",
      "ວິລະບູລີ",
      "ອາດສະພອນ",
      "ໄຊພູທອງ",
      "ພະລານໄຊ",
    ],
  },
  {
    name: "ສາລະວັນ",
    districts: ["ສາລະວັນ", "ຕະໂອ້ຍ", "ຕຸ້ມລານ", "ລະຄອນເພັງ", "ວາປີ", "ຄົງເຊໂດນ", "ເລົ່າງາມ", "ສະມ້ວຍ"],
  },
  {
    name: "ເຊກອງ",
    districts: ["ລະມາມ", "ກະລຶມ", "ດາກຈຶງ", "ທ່າແຕງ"],
  },
  {
    name: "ຈຳປາສັກ",
    districts: [
      "ປາກເຊ",
      "ຊະນະສົມບູນ",
      "ບາຈຽງຈະເລີນສຸກ",
      "ປາກຊ່ອງ",
      "ປະທຸມພອນ",
      "ໂພນທອງ",
      "ຈຳປາສັກ",
      "ສຸຂຸມາ",
      "ມຸນລະປະໂມກ",
      "ໂຂງ",
    ],
  },
  {
    name: "ອັດຕະປື",
    districts: ["ໄຊເສດຖາ", "ສາມັກຄີໄຊ", "ສະໜາມໄຊ", "ສານໄຊ", "ພູວົງ"],
  },
  {
    name: "ໄຊສົມບູນ",
    districts: ["ອະນຸວົງ", "ລ້ອງແຈ້ງ", "ລ້ອງຊານ", "ທ່າໂທມ", "ຮົ່ມ"],
  },
];

/** District list for a province name, or [] if unknown. */
export function districtsOf(province: string): string[] {
  return LAO_PROVINCES.find((p) => p.name === province)?.districts ?? [];
}

export type AddressParts = {
  province?: string | null;
  district?: string | null;
  village?: string | null;
  detail?: string | null;
};

/**
 * Build a single human-readable Lao address line from its parts, ordered
 * smallest → largest (detail, ບ້ານ, ເມືອງ, ແຂວງ). Used for the order snapshot
 * and the address-book preview. Pure — safe on client and server.
 */
export function composeAddress({ province, district, village, detail }: AddressParts): string {
  return [
    detail?.trim(),
    village?.trim() && `ບ້ານ ${village.trim()}`,
    district?.trim() && `ເມືອງ ${district.trim()}`,
    province?.trim() && `ແຂວງ ${province.trim()}`,
  ]
    .filter(Boolean)
    .join(", ");
}
