"use client";

import ProductImage from "@/components/ProductImage";
import { formatKip } from "@/lib/format";

export interface OrderLineItem {
  productCode: string;
  productName: string;
  unit: string | null;
  unitPrice: number | null;
  qty: number;
  lineTotal: number;
  imageUrl?: string | null;
}

// Clean line-item list (thumbnail + name + code/qty/price + line total).
// Shared by the desktop expandable row and the mobile order card.
export default function OrderItemsList({ items, itemCount }: { items: OrderLineItem[]; itemCount: number }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3 text-center text-xs font-semibold text-slate-500">
        ຍັງບໍ່ມີລາຍລະອຽດ · {itemCount.toLocaleString()} ລາຍການ
      </div>
    );
  }
  const hiddenCount = Math.max(0, itemCount - items.length);

  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white">
      {items.map((item, index) => (
        <div key={`${item.productCode}-${index}`} className="flex items-center gap-3 px-2.5 py-2">
          <ProductImage
            code={item.productCode}
            name={item.productName}
            imageUrl={item.imageUrl}
            rounded="rounded-lg"
            className="h-11 w-11 shrink-0 border border-slate-100"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800" title={item.productName}>
              {item.productName}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-mono">{item.productCode || "—"}</span>
              <span className="text-slate-700">·</span>
              <span className="font-semibold text-slate-600">{item.qty.toLocaleString()}{item.unit ? ` ${item.unit}` : ""}</span>
              {item.unitPrice != null && (
                <>
                  <span className="text-slate-700">×</span>
                  <span>{formatKip(item.unitPrice)}</span>
                </>
              )}
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold text-slate-900">{formatKip(item.lineTotal)}</span>
        </div>
      ))}
      {hiddenCount > 0 && (
        <div className="bg-slate-50/60 px-3 py-1.5 text-center text-[11px] font-semibold text-slate-500">
          + ອີກ {hiddenCount.toLocaleString()} ລາຍການ
        </div>
      )}
    </div>
  );
}
