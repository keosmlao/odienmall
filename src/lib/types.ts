// Domain types for the storefront. These map the relevant ERP columns
// (ic_inventory / ic_category / ic_brand / ic_inventory_price) into clean shapes.

export interface Category {
  code: string;
  name: string; // Lao (name_1)
  nameAlt: string | null; // name_2
  productCount: number;
}

export interface Brand {
  code: string;
  name: string; // name_1
  logo: string | null; // url_logo filename (no public base URL yet)
  productCount: number;
}

// Product grouping hierarchy from the ERP:
//   group_main (ic_group, e.g. '11')  →  group_sub (ic_group_sub, e.g. '1101')
// This is the storefront's primary navigation (distinct from item_category).
export interface GroupSub {
  code: string; // group_sub, e.g. '1101'
  name: string; // ic_group_sub.name_1 (Lao)
  productCount: number;
}

export interface GroupMain {
  code: string; // group_main, e.g. '11'
  name: string; // ic_group.name_1 (Lao)
  productCount: number;
  subs: GroupSub[];
}

export interface Product {
  code: string;
  name: string; // Lao (name_1), falls back to other name fields
  nameThai: string | null; // name_eng_1 (holds Thai)
  description: string | null;
  shortDescription: string | null; // app-owned short buy-box description (1-3 lines, shown near price)
  categoryCode: string | null;
  categoryName: string | null;
  brandCode: string | null;
  brandName: string | null;
  stock: number; // balance_qty
  isNew: boolean; // is_new_item
  isPromo: boolean; // item_promote
  price: number | null; // resolved retail price in LAK
  memberPrice?: number | null; // discounted price for the logged-in member (null = no member discount)
  memberPct?: number | null; // member discount % applied (for display)
  commissionPct?: number | null; // affiliate commission % (only set for affiliate viewers)
  commissionKip?: number | null; // affiliate commission amount in LAK (price × pct)
  soldCount?: number | null; // units sold (Lazada-style social proof; display layer)
  flashPrice?: number | null; // active flash-sale deal price (overrides retail; null = not on flash)
  unit: string | null; // unit_code (Lao unit name)
  rating: number | null; // average review rating (odg_ecom.reviews)
  reviewCount: number;
  imageUrl: string | null; // app-owned overlay image (odg_ecom.product_overlays); null → placeholder/env image
  isFeatured: boolean; // app-owned overlay flag (odg_ecom.product_overlays)
  priceNote: string | null; // custom text shown instead of generic "ສອບຖາມລາຄາ" for no-price items
}

export type SortKey = "newest" | "price_asc" | "price_desc" | "name" | "rating";

export interface ProductQuery {
  categoryCode?: string;
  groupMain?: string; // ic_inventory.group_main, e.g. '11'
  groupSub?: string; // ic_inventory.group_sub, e.g. '1101'
  brandCode?: string;
  search?: string;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
  inStock?: boolean;
  priceMin?: number;
  priceMax?: number;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
