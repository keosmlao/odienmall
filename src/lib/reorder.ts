import "server-only";
import { getOrderByNo } from "@/lib/orders";
import { getProductByCode } from "@/lib/catalog";

// A cart-ready line for the client cart (mirrors cart-context CartItem, qty incl.).
export interface ReorderLine {
  code: string;
  name: string;
  price: number | null;
  unit: string | null;
  brandName: string | null;
  imageUrl: string | null;
  qty: number;
}

export interface ReorderResult {
  items: ReorderLine[];
  /** Names of lines that couldn't be re-added (hidden / out of stock). */
  skipped: string[];
}

/**
 * Re-price an existing order against the LIVE catalog for "buy again". Each line
 * is re-fetched from the ERP so the customer always gets the current price +
 * availability (never the historical order price). Out-of-stock / hidden items
 * are reported in `skipped`; in-stock lines are capped to current stock.
 */
export async function getReorderCart(orderNo: string): Promise<ReorderResult | null> {
  const order = await getOrderByNo(orderNo);
  if (!order) return null;

  const items: ReorderLine[] = [];
  const skipped: string[] = [];

  // Sequential is fine — orders have a handful of lines.
  for (const line of order.items) {
    const product = await getProductByCode(line.productCode);
    if (!product || product.stock <= 0) {
      skipped.push(line.productName);
      continue;
    }
    const price = product.flashPrice ?? product.memberPrice ?? product.price;
    items.push({
      code: product.code,
      name: product.name,
      price,
      unit: product.unit,
      brandName: product.brandName,
      imageUrl: product.imageUrl,
      qty: Math.min(line.qty, product.stock),
    });
  }

  return { items, skipped };
}
