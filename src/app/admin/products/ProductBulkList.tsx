"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { AdminProductRow } from "@/lib/products-admin";
import { formatKip } from "@/lib/format";
import { Badge, THEAD, TH, TBODY, TR, TD } from "@/components/admin/ui";
import ProductRowControls from "./ProductRowControls";
import { bulkUpdateProducts } from "./actions";

type BulkAction = "hide" | "show" | "feature" | "unfeature";

export default function ProductBulkList({ items }: { items: AdminProductRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);

  const allCodes = useMemo(() => items.map((i) => i.code), [items]);
  const allSelected = selected.size > 0 && selected.size === items.length;

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(allCodes)));
  }

  function run(action: BulkAction) {
    const codes = [...selected];
    if (codes.length === 0) return;
    setMsg(null);
    startTransition(async () => {
      const res = await bulkUpdateProducts(codes, action);
      if (res.ok) {
        setSelected(new Set());
        setMsg(`ປ່ຽນ ${res.count} ລາຍການແລ້ວ`);
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-brand/30 bg-brand-light/70 px-4 py-2.5 shadow-sm shadow-gray-200/40 backdrop-blur">
          <span className="text-sm font-semibold text-brand-dark">ເລືອກ {selected.size} ລາຍການ</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <BulkBtn onClick={() => run("feature")} disabled={pending}>ໝາຍແນະນຳ</BulkBtn>
            <BulkBtn onClick={() => run("unfeature")} disabled={pending}>ຍົກເລີກແນະນຳ</BulkBtn>
            <BulkBtn onClick={() => run("hide")} disabled={pending} danger>ເຊື່ອງ</BulkBtn>
            <BulkBtn onClick={() => run("show")} disabled={pending}>ສະແດງ</BulkBtn>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:text-gray-700"
            >
              ລ້າງ
            </button>
          </div>
        </div>
      )}
      {msg && <p className="mb-2 text-xs text-emerald-600">{msg}</p>}

      <div className="thin-scroll overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-200/40">
        <table className="w-full min-w-[760px] text-sm">
          <thead className={THEAD}>
            <tr>
              <th className={TH}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="ເລືອກທັງໝົດ"
                  className="h-4 w-4 rounded border-gray-300 accent-brand"
                />
              </th>
              <th className={TH}>ສິນຄ້າ</th>
              <th className={TH}>ຍີ່ຫໍ້ / ໝວດ</th>
              <th className={`${TH} text-right`}>ລາຄາ</th>
              <th className={`${TH} text-right`}>ສະຕັອກ</th>
              <th className={`${TH} text-center`}>ແນະນຳ / ເຊື່ອງ</th>
              <th className={`${TH} text-right`}></th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {items.map((p) => {
              const checked = selected.has(p.code);
              return (
                <tr
                  key={p.code}
                  className={`${TR} ${checked ? "bg-brand-light/40" : ""} ${p.isHidden ? "opacity-60" : ""}`}
                >
                  <td className={TD}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(p.code)}
                      aria-label={`ເລືອກ ${p.code}`}
                      className="h-4 w-4 rounded border-gray-300 accent-brand"
                    />
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <Thumb url={p.imageUrl} />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${encodeURIComponent(p.code)}`}
                          className="line-clamp-1 font-medium text-brand-dark hover:underline"
                        >
                          {p.name}
                        </Link>
                        <div className="text-xs text-gray-400">{p.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className={TD}>
                    <div className="line-clamp-1">{p.brandName ?? "—"}</div>
                    <div className="line-clamp-1 text-xs text-gray-400">{p.categoryName ?? ""}</div>
                  </td>
                  <td className={`${TD} text-right font-semibold text-price`}>
                    {p.price != null ? formatKip(p.price) : <span className="text-xs font-normal text-gray-400">ສອບຖາມ</span>}
                  </td>
                  <td className={`${TD} text-right`}>
                    {p.stock > 0 ? (
                      <span className={p.stock <= 5 ? "font-semibold text-amber-600" : "text-gray-600"}>
                        {p.stock.toLocaleString()}
                      </span>
                    ) : (
                      <Badge tone="rose">ໝົດ</Badge>
                    )}
                  </td>
                  <td className={TD}>
                    <div className="flex justify-center">
                      <ProductRowControls code={p.code} isHidden={p.isHidden} isFeatured={p.isFeatured} />
                    </div>
                  </td>
                  <td className={`${TD} text-right`}>
                    <Link
                      href={`/admin/products/${encodeURIComponent(p.code)}`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-brand hover:text-brand-dark"
                    >
                      ແກ້ໄຂ
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BulkBtn({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 transition disabled:opacity-50 ${
        danger ? "bg-rose-500 hover:bg-rose-600" : "bg-brand hover:bg-brand-dark"
      }`}
    >
      {children}
    </button>
  );
}

function Thumb({ url }: { url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-gray-200 bg-white object-contain" />;
  }
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-dashed border-gray-200 text-[10px] text-gray-300">
      ບໍ່ມີຮູບ
    </div>
  );
}
