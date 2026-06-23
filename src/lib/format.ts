// Display helpers shared by server and client components.

const kipFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Format a LAK (Lao Kip) amount, e.g. 31315.7 -> "31,316 ₭". */
export function formatKip(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "ສອບຖາມລາຄາ";
  return `${kipFormatter.format(Math.round(amount))} ₭`;
}

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Convert pasted rich-text HTML (the ERP `ic_inventory.description` is full of
 * `<div style=...>`, `<font>`, `&quot;` etc.) into clean plain text. Block-level
 * tags become newlines so the spec list keeps its line breaks under
 * `whitespace-pre-line`; everything else is stripped and entities are decoded.
 * Returns null for empty/whitespace-only input. Safe on plain text (no-op).
 */
export function htmlToText(
  html: string | null | undefined,
): string | null {
  if (!html) return null;
  const text = html
    // block-level boundaries -> newline
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(div|p|li|tr|h[1-6]|ul|ol)\s*>/gi, "\n")
    // drop all remaining tags
    .replace(/<[^>]+>/g, "")
    // decode entities
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, ent: string) => {
      if (ent[0] === "#") {
        const code =
          ent[1] === "x" || ent[1] === "X"
            ? parseInt(ent.slice(2), 16)
            : parseInt(ent.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return HTML_ENTITIES[ent.toLowerCase()] ?? m;
    })
    // tidy whitespace
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

/** Single-line, length-capped plain text for meta descriptions / JSON-LD. */
export function metaDescription(
  html: string | null | undefined,
  max = 160,
): string | null {
  const text = htmlToText(html)?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Deterministic hue from a string, used for placeholder image gradients. */
export function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Short label for placeholder images (brand initial / first chars of name). */
export function placeholderLabel(brand: string | null, name: string): string {
  const src = (brand || name).trim();
  return src.slice(0, 2).toUpperCase() || "OD";
}

/**
 * Real product image URL, if configured. Set one of these env vars to light up
 * real images (otherwise a placeholder is shown):
 *   NEXT_PUBLIC_PRODUCT_IMAGE_PATTERN  e.g. "https://cdn.odienmall.com/p/{code}.jpg"
 *   NEXT_PUBLIC_PRODUCT_IMAGE_BASE     e.g. "https://cdn.odienmall.com/products"
 *   NEXT_PUBLIC_PRODUCT_IMAGE_EXT      default ".jpg"
 */
export function productImageUrl(code: string): string | null {
  const pattern = process.env.NEXT_PUBLIC_PRODUCT_IMAGE_PATTERN;
  if (pattern) return pattern.replace("{code}", encodeURIComponent(code));
  const base = process.env.NEXT_PUBLIC_PRODUCT_IMAGE_BASE;
  if (base) {
    const ext = process.env.NEXT_PUBLIC_PRODUCT_IMAGE_EXT ?? ".jpg";
    return `${base.replace(/\/$/, "")}/${encodeURIComponent(code)}${ext}`;
  }
  return null;
}
