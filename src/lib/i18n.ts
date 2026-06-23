// Client+server-safe i18n primitives (NO next/headers, NO server-only) so both
// server components and client components can import the dictionary + helpers.
// The active locale is stored in the `om_lang` cookie; server reads it via
// i18n-server.ts (getLocale), client via i18n-context.tsx (LocaleProvider).

export type Locale = "lo" | "th" | "en";

export const DEFAULT_LOCALE: Locale = "lo";
export const LOCALE_COOKIE = "om_lang";

export const LOCALES: { code: Locale; label: string; short: string; flag: string }[] = [
  { code: "lo", label: "ລາວ", short: "ລາວ", flag: "🇱🇦" },
  { code: "th", label: "ไทย", short: "ไทย", flag: "🇹🇭" },
  { code: "en", label: "English", short: "EN", flag: "🇬🇧" },
];

export function toLocale(value: string | undefined | null): Locale {
  return value === "th" || value === "en" || value === "lo" ? value : DEFAULT_LOCALE;
}

// UI string dictionary. Keys are dotted ids; each has lo/th/en. Missing strings
// fall back to Lao then to the key itself, so partial coverage never crashes.
type Entry = Record<Locale, string>;
export const DICT: Record<string, Entry> = {
  "nav.track": { lo: "ຕິດຕາມຄຳສັ່ງຊື້", th: "ติดตามคำสั่งซื้อ", en: "Track order" },
  "nav.affiliate": { lo: "ຮ່ວມເປັນນາຍໜ້າ", th: "ร่วมเป็นนายหน้า", en: "Become affiliate" },
  "nav.help": { lo: "ຊ່ວຍເຫຼືອ", th: "ช่วยเหลือ", en: "Help" },
  "nav.wishlist": { lo: "ທີ່ມັກ", th: "ที่ชอบ", en: "Wishlist" },
  "nav.account": { lo: "ບັນຊີ", th: "บัญชี", en: "Account" },
  "nav.cart": { lo: "ກະຕ່າ", th: "ตะกร้า", en: "Cart" },
  "nav.home": { lo: "ໜ້າຫຼັກ", th: "หน้าหลัก", en: "Home" },
  "nav.products": { lo: "ສິນຄ້າທັງໝົດ", th: "สินค้าทั้งหมด", en: "All products" },
  "nav.brands": { lo: "ຍີ່ຫໍ້ທັງໝົດ", th: "แบรนด์ทั้งหมด", en: "All brands" },
  "search.placeholder": { lo: "ຄົ້ນຫາສິນຄ້າ...", th: "ค้นหาสินค้า...", en: "Search products..." },
  "search.button": { lo: "ຄົ້ນຫາ", th: "ค้นหา", en: "Search" },
  "footer.shop": { lo: "ຊື້ເຄື່ອງ", th: "ช้อปปิ้ง", en: "Shop" },
  "footer.help": { lo: "ຊ່ວຍເຫຼືອ", th: "ช่วยเหลือ", en: "Help" },
  "footer.contact": { lo: "ຕິດຕໍ່", th: "ติดต่อ", en: "Contact" },
  "footer.all_products": { lo: "ສິນຄ້າທັງໝົດ", th: "สินค้าทั้งหมด", en: "All products" },
  "footer.all_brands": { lo: "ຍີ່ຫໍ້ທັງໝົດ", th: "แบรนด์ทั้งหมด", en: "All brands" },
  "footer.my_cart": { lo: "ກະຕ່າຂອງຂ້ອຍ", th: "ตะกร้าของฉัน", en: "My cart" },
  "footer.track": { lo: "ຕິດຕາມຄຳສັ່ງຊື້", th: "ติดตามคำสั่งซื้อ", en: "Track order" },
  "footer.faq": { lo: "ຄຳຖາມທີ່ພົບເລື້ອຍ", th: "คำถามที่พบบ่อย", en: "FAQ" },
  "footer.shipping": { lo: "ການຈັດສົ່ງ", th: "การจัดส่ง", en: "Shipping" },
  "footer.returns": { lo: "ຄືນສິນຄ້າ / ຄືນເງິນ", th: "คืนสินค้า / คืนเงิน", en: "Returns / Refund" },
  "footer.affiliate": { lo: "ໂປຣແກຣມນາຍໜ້າ", th: "โปรแกรมนายหน้า", en: "Affiliate program" },
  "footer.tagline": {
    lo: "ສູນລວມເຄື່ອງໃຊ້ໄຟຟ້າ ແລະ ສິນຄ້າຄຸນນະພາບ ສຳລັບຄອບຄົວ ຈັດສົ່ງທົ່ວປະເທດລາວ.",
    th: "ศูนย์รวมเครื่องใช้ไฟฟ้าและสินค้าคุณภาพสำหรับครอบครัว จัดส่งทั่วประเทศลาว",
    en: "Home appliances and quality goods for your family — delivered across Laos.",
  },
  "common.add_to_cart": { lo: "ເພີ່ມໃສ່ກະຕ່າ", th: "เพิ่มลงตะกร้า", en: "Add to cart" },
  "common.buy_now": { lo: "ຊື້ດຽວນີ້", th: "ซื้อเลย", en: "Buy now" },
  "common.out_of_stock": { lo: "ສິນຄ້າໝົດ", th: "สินค้าหมด", en: "Out of stock" },
  "common.in_stock": { lo: "ມີສິນຄ້າ", th: "มีสินค้า", en: "In stock" },
  "common.sold": { lo: "ຂາຍແລ້ວ", th: "ขายแล้ว", en: "sold" },
  "common.ask_price": { lo: "ສອບຖາມລາຄາ", th: "สอบถามราคา", en: "Ask for price" },
  "common.qty": { lo: "ຈຳນວນ", th: "จำนวน", en: "Qty" },
  "common.added": { lo: "ເພີ່ມໃສ່ກະຕ່າແລ້ວ", th: "เพิ่มลงตะกร้าแล้ว", en: "Added to cart" },
  "common.added_short": { lo: "ເພີ່ມແລ້ວ", th: "เพิ่มแล้ว", en: "Added" },
  "common.go_to_cart": { lo: "ໄປທີ່ກະຕ່າ", th: "ไปที่ตะกร้า", en: "Go to cart" },
};

/** Translate a dictionary key into the given locale (falls back to Lao, then key). */
export function t(key: string, locale: Locale): string {
  const e = DICT[key];
  if (!e) return key;
  return e[locale] || e.lo || key;
}

/**
 * Localized display name for a product. Thai uses the ERP `name_eng_1` field
 * (which holds Thai text) when present; Lao/English fall back to the Lao name.
 */
export function localeName(
  p: { name: string; nameThai?: string | null },
  locale: Locale,
): string {
  if (locale === "th" && p.nameThai) return p.nameThai;
  return p.name;
}
