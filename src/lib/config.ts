// Storefront configuration toggles (server-side env).

/** When true, products without a real POS price are hidden from listings. */
export const HIDE_NO_PRICE = process.env.HIDE_NO_PRICE === "1";

/** Public base URL — used for canonical links, sitemap, OpenGraph. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://odienmall.com"
).replace(/\/$/, "");

/**
 * Optional external TMS (logistics) portal. When set, the admin order detail
 * shows an "ເປີດໃນ TMS" link for shipping orders, with the CAE bill no appended.
 * e.g. TMS_TRACK_URL="https://tms.odien.com/track?bill="
 */
export const TMS_TRACK_URL = process.env.TMS_TRACK_URL || "";
