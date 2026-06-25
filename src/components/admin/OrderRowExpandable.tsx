"use client";

import { useState } from "react";
import Link from "next/link";
import { formatKip } from "@/lib/format";
import type { OrderStatus } from "@/lib/order-constants";
import StatusBadge from "@/components/StatusBadge";
import SendOrderLinkButton from "@/components/SendOrderLinkButton";
import DeleteOrderAdminButton from "@/components/DeleteOrderAdminButton";
import { Badge } from "@/components/admin/ui";
import OrderItemsList, { type OrderLineItem } from "./OrderItemsList";

export interface OrderRowData {
  orderNo: string;
  smlDocNo: string;
  smlFlag: number;
  customerName: string;
  createdBy?: string | null;
  phone: string;
  items: OrderLineItem[];
  itemCount: number;
  subtotal: number;
  saleName?: string | null;
  status: string;
  createdAt: string;
}

// Desktop order row with the product details tucked behind an expand toggle, so
// the table stays compact. Clicking "N ລາຍການ" reveals a full-width panel below.
export default function OrderRowExpandable({
  o,
  checked,
  onCheck,
}: {
  o: OrderRowData;
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const detailHref = `/admin/orders/${encodeURIComponent(o.orderNo)}`;
  const initial = (o.customerName || "?").trim().slice(0, 1).toUpperCase();

  return (
    <>
      <tr className="transition-colors hover:bg-orange-50/35">
        {/* Checkbox (only rendered when onCheck is provided) */}
        {onCheck !== undefined && (
          <td className="pl-4 pr-2 py-4 align-top">
            <input
              type="checkbox"
              checked={!!checked}
              onChange={(e) => onCheck(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-orange-500"
              aria-label={`ເລືອກ ${o.orderNo}`}
            />
          </td>
        )}
        {onCheck === undefined && <td className="pl-4 pr-2 py-4 align-top" />}
        {/* SML doc + badge */}
        <td className="px-6 py-4 align-top whitespace-nowrap">
          <Link href={detailHref} className="block font-mono text-sm font-black text-slate-900 transition-colors hover:text-orange-600 hover:underline">
            {o.smlDocNo || o.orderNo}
          </Link>
          <div className="mt-1.5">
            <Badge tone={o.smlFlag === 44 ? "green" : o.smlFlag === 34 ? "amber" : "gray"}>
              {o.smlFlag === 44 ? "ບິນສົດ 44" : o.smlFlag === 34 ? "ໃບສັ່ງຊື້ 34" : "ລໍຖ້າ"}
            </Badge>
          </div>
          {o.smlDocNo && o.smlDocNo !== o.orderNo && (
            <div className="mt-1 font-mono text-[10px] text-slate-400">{o.orderNo}</div>
          )}
        </td>

        {/* Customer */}
        <td className="px-6 py-4 align-top whitespace-nowrap">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[linear-gradient(135deg,#f97316,#22c55e)] text-[11px] font-black uppercase text-white">{initial}</span>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="block max-w-[150px] truncate text-xs font-bold text-slate-800" title={o.customerName || ""}>{o.customerName}</span>
                {o.createdBy && <span className="shrink-0 rounded-md bg-cyan-50 px-1.5 py-0.5 text-[8px] font-black leading-none text-cyan-700">ພະນັກງານ</span>}
              </div>
              <a href={`tel:${o.phone}`} className="mt-1 block text-xs font-semibold text-slate-500 hover:text-orange-500">{o.phone || "—"}</a>
            </div>
          </div>
        </td>

        {/* Product details — expand toggle */}
        <td className="px-6 py-4 align-top">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`adm-focus inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-black transition ${
              open ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
            }`}
          >
            <span className={`grid h-4 w-4 place-items-center rounded-md text-[9px] font-extrabold ${open ? "bg-white/15 text-white" : "bg-orange-500 text-white"}`}>{o.itemCount}</span>
            ລາຍການ
            <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </td>

        {/* Total */}
        <td className="px-6 py-4 align-top whitespace-nowrap text-right">
          <div className="text-[13px] font-black text-price">{formatKip(o.subtotal)}</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">ລວມສິນຄ້າ</div>
        </td>

        {/* Salesperson */}
        <td className="px-6 py-4 align-top whitespace-nowrap text-xs font-bold text-slate-600">
          {o.saleName ?? <span className="text-slate-300">—</span>}
        </td>

        {/* Status + date */}
        <td className="px-6 py-4 align-top whitespace-nowrap">
          <StatusBadge status={o.status as OrderStatus} />
          <div className="mt-2 text-[10px] font-semibold text-slate-400">{new Date(o.createdAt).toLocaleDateString("lo-LA")}</div>
        </td>

        {/* Actions */}
        <td className="px-6 py-4 align-top whitespace-nowrap text-right">
          <div className="flex items-center justify-end gap-1.5">
            <Link href={detailHref} className="adm-focus grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700" aria-label="ເບິ່ງ" title="ເບິ່ງລາຍລະອຽດ">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
            </Link>
            <SendOrderLinkButton orderNo={o.orderNo} phone={o.phone} />
            <DeleteOrderAdminButton orderNo={o.orderNo} compact />
          </div>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={8} className="bg-orange-50/25 px-6 pb-4 pt-0">
            <div className="max-w-2xl rounded-lg border border-orange-100 bg-white p-3">
              <OrderItemsList items={o.items} itemCount={o.itemCount} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
