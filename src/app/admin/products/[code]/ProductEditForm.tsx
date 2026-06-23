"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductImageRow } from "@/lib/products-admin";
import {
  uploadProductImages,
  addProductImageUrl,
  removeProductImage,
  makeImagePrimary,
  saveProductFlags,
  saveProductDescription,
} from "../actions";

type SpecRow = { id: number; label: string; value: string };

// Monotonic key source for spec rows (uniqueness only — not persisted).
let rowIdSeq = 0;
const nextRowId = () => rowIdSeq++;

/** Serialize spec rows to the newline text the storefront renders. */
function serializeRows(rows: SpecRow[]): string {
  return rows
    .filter((r) => r.label.trim() || r.value.trim())
    .map((r) => {
      const label = r.label.trim();
      const value = r.value.trim();
      return label && value ? `• ${label}: ${value}` : `• ${label || value}`;
    })
    .join("\n");
}

// Manage the app-owned overlay for one product: an image gallery
// (upload multiple / add-by-URL / delete / set-primary), a description override
// and featured & hidden flags. ERP fields are shown read-only by the parent page.
export default function ProductEditForm({
  code,
  images,
  isHidden,
  isFeatured,
  description,
  erpDescription,
}: {
  code: string;
  images: ProductImageRow[];
  isHidden: boolean;
  isFeatured: boolean;
  description: string | null;
  erpDescription: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(isHidden);
  const [featured, setFeatured] = useState(isFeatured);
  const [urlInput, setUrlInput] = useState("");

  // Spec/description editor — one row = "label: value", stored as newline text
  // (rendered with whitespace-pre-line on the storefront).
  const toRows = (text: string): SpecRow[] =>
    text
      .split("\n")
      .map((line) => {
        const l = line.trim().replace(/^[•\-*]\s*/, "");
        if (!l) return null;
        const ci = l.indexOf(":");
        const label = ci === -1 ? "" : l.slice(0, ci).trim();
        const value = ci === -1 ? l : l.slice(ci + 1).trim();
        return { id: nextRowId(), label, value };
      })
      .filter((r): r is SpecRow => r !== null);
  const [rows, setRows] = useState<SpecRow[]>(() => toRows(description ?? ""));
  const serialized = serializeRows(rows);

  // Track the last-saved snapshot so we can flag unsaved changes.
  const [savedSnapshot, setSavedSnapshot] = useState(serialized);
  const descDirty = serialized !== savedSnapshot;

  // Focus management for fast keyboard entry.
  const labelRefs = useRef(new Map<number, HTMLInputElement>());
  const valueRefs = useRef(new Map<number, HTMLInputElement>());
  const pendingFocus = useRef<number | null>(null);
  const registerLabel = (id: number) => (el: HTMLInputElement | null) => {
    if (!el) {
      labelRefs.current.delete(id);
      return;
    }
    labelRefs.current.set(id, el);
    if (pendingFocus.current === id) {
      el.focus();
      pendingFocus.current = null;
    }
  };
  const registerValue = (id: number) => (el: HTMLInputElement | null) => {
    if (el) valueRefs.current.set(id, el);
    else valueRefs.current.delete(id);
  };

  const updateRow = (id: number, patch: Partial<SpecRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () => {
    const id = nextRowId();
    pendingFocus.current = id; // auto-focus the new row's label
    setRows((rs) => [...rs, { id, label: "", value: "" }]);
  };
  const removeRow = (id: number) => setRows((rs) => rs.filter((r) => r.id !== id));
  const moveRow = (id: number, dir: -1 | 1) =>
    setRows((rs) => {
      const i = rs.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const saveDesc = () =>
    run(async () => {
      const res = await saveProductDescription(code, serialized);
      if (res.ok) setSavedSnapshot(serialized);
      return res;
    }, "ບັນທຶກຄຳອະທິບາຍແລ້ວ");

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, okText?: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        if (okText) setMsg({ ok: true, text: okText });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  function onUpload() {
    const input = fileRef.current;
    if (!input?.files?.length) return;
    const fd = new FormData();
    fd.set("code", code);
    Array.from(input.files).forEach((f) => fd.append("files", f));
    run(
      async () => {
        const res = await uploadProductImages(fd);
        if (res.ok && fileRef.current) fileRef.current.value = "";
        return res;
      },
      "ອັບໂຫຼດຮູບແລ້ວ",
    );
  }

  function onAddUrl() {
    const u = urlInput.trim();
    if (!u) return;
    run(async () => {
      const res = await addProductImageUrl(code, u);
      if (res.ok) setUrlInput("");
      return res;
    }, "ເພີ່ມຮູບແລ້ວ");
  }

  return (
    <div className="space-y-5">
      {/* Gallery */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">ຮູບສິນຄ້າ</h2>
          <span className="text-xs text-gray-400">{images.length}/8 ຮູບ</span>
        </div>

        {images.length === 0 ? (
          <p className="mb-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
            ຍັງບໍ່ມີຮູບ — ອັບໂຫຼດ ຫຼື ເພີ່ມດ້ວຍ URL ຂ້າງລຸ່ມ
          </p>
        ) : (
          <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-contain" />
                {idx === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                    ຫຼັກ
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/55 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                  {idx !== 0 && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => makeImagePrimary(img.id, code))}
                      title="ຕັ້ງເປັນຮູບຫຼັກ"
                      className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-gray-600 hover:text-brand-dark disabled:opacity-50"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => removeProductImage(img.id, code))}
                    title="ລຶບ"
                    className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-rose-500 hover:text-rose-600 disabled:opacity-50"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={onUpload}
          className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark disabled:opacity-50"
          disabled={pending || images.length >= 8}
        />
        <p className="mt-1.5 text-xs text-gray-400">
          ເລືອກໄດ້ຫຼາຍຮູບພ້ອມກັນ · JPG/PNG/WEBP/GIF · ສູງສຸດ 5MB/ຮູບ
        </p>

        {/* Add by URL */}
        <div className="mt-3 flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="ຫຼື ວາງ URL ຮູບ (https://...)"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
          />
          <button
            type="button"
            onClick={onAddUrl}
            disabled={pending || !urlInput.trim()}
            className="shrink-0 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-brand hover:text-brand-dark disabled:opacity-50"
          >
            ເພີ່ມ
          </button>
        </div>
      </div>

      {/* Description / specs editor */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            ຄຳອະທິບາຍ / ສະເປັກສິນຄ້າ
            {rows.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                {rows.length} ລາຍການ
              </span>
            )}
          </h2>
          {erpDescription && (
            <button
              type="button"
              onClick={() => setRows(toRows(erpDescription))}
              className="shrink-0 rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-brand hover:text-brand-dark"
            >
              ດຶງ &amp; ລ້າງຈາກ ERP
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-gray-400">
          ພິມ <span className="font-medium text-gray-500">ຫົວຂໍ້</span> ແລ້ວກົດ Enter ໄປ
          <span className="font-medium text-gray-500"> ລາຍລະອຽດ</span> · ກົດ Enter ອີກເທື່ອ =
          ເພີ່ມແຖວໃໝ່. ປ່ອຍວ່າງໝົດ = ໃຊ້ຂໍ້ຄວາມ ERP ຕາມເດີມ.
        </p>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">ຍັງບໍ່ມີລາຍການ</p>
            <button
              type="button"
              onClick={addRow}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              ເພີ່ມລາຍການທຳອິດ
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* column headers */}
            <div className="flex items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              <span className="w-6 shrink-0 text-center">#</span>
              <span className="min-w-[7rem] flex-1">ຫົວຂໍ້</span>
              <span className="min-w-[9rem] flex-[2]">ລາຍລະອຽດ</span>
              <span className="w-8 shrink-0" />
            </div>

            {rows.map((row, idx) => (
              <div
                key={row.id}
                className="group flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-1.5 transition focus-within:border-brand/40 focus-within:bg-white"
              >
                {/* index + reorder */}
                <div className="flex w-6 shrink-0 flex-col items-center">
                  <button
                    type="button"
                    onClick={() => moveRow(row.id, -1)}
                    disabled={idx === 0}
                    title="ຍ້າຍຂຶ້ນ"
                    className="grid h-4 w-5 place-items-center rounded text-gray-300 transition hover:text-brand-dark disabled:opacity-0"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                  </button>
                  <span className="text-[11px] font-semibold text-gray-400">{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => moveRow(row.id, 1)}
                    disabled={idx === rows.length - 1}
                    title="ຍ້າຍລົງ"
                    className="grid h-4 w-5 place-items-center rounded text-gray-300 transition hover:text-brand-dark disabled:opacity-0"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                </div>
                <input
                  ref={registerLabel(row.id)}
                  value={row.label}
                  onChange={(e) => updateRow(row.id, { label: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      valueRefs.current.get(row.id)?.focus();
                    }
                  }}
                  placeholder="ຫົວຂໍ້"
                  className="min-w-[7rem] flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
                <input
                  ref={registerValue(row.id)}
                  value={row.value}
                  onChange={(e) => updateRow(row.id, { value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (idx === rows.length - 1) addRow();
                      else labelRefs.current.get(rows[idx + 1].id)?.focus();
                    }
                  }}
                  placeholder="ລາຍລະອຽດ"
                  className="min-w-[9rem] flex-[2] rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  title="ລຶບລາຍການ"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-300 transition hover:bg-rose-50 hover:text-rose-500"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 py-2 text-sm font-medium text-gray-500 transition hover:border-brand hover:bg-brand/5 hover:text-brand-dark"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              ເພີ່ມລາຍການ
            </button>
          </div>
        )}

        {serialized.trim() && (
          <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
            <p className="mb-1.5 text-xs font-medium text-gray-500">ຕົວຢ່າງໜ້າຮ້ານ</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
              {serialized}
            </p>
          </div>
        )}

        {erpDescription && (
          <details className="mt-2 text-xs text-gray-400">
            <summary className="cursor-pointer select-none font-medium hover:text-gray-600">
              ເບິ່ງຂໍ້ຄວາມ ERP (ລ້າງແລ້ວ)
            </summary>
            <p className="mt-1.5 whitespace-pre-line border-l-2 border-gray-200 pl-3 text-gray-500">
              {erpDescription}
            </p>
          </details>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            onClick={saveDesc}
            disabled={pending || !descDirty || serialized.length > 2000}
            className="rounded-lg bg-brand px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
          >
            {pending
              ? "ກຳລັງບັນທຶກ..."
              : descDirty
                ? "ບັນທຶກຄຳອະທິບາຍ"
                : "ບັນທຶກແລ້ວ"}
          </button>
          <span className={`text-xs ${serialized.length > 2000 ? "font-medium text-rose-500" : "text-gray-400"}`}>
            {descDirty && <span className="mr-2 text-amber-500">● ຍັງບໍ່ໄດ້ບັນທຶກ</span>}
            {serialized.length}/2000
          </span>
        </div>
      </div>

      {/* Flags */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">ການເຜີຍແຜ່</h2>
        <div className="space-y-2">
          <ToggleRow
            label="ສິນຄ້າແນະນຳ"
            hint="ລອຍຂຶ້ນເທິງສຸດຂອງແຖບ “ສິນຄ້າແນະນຳ” ໜ້າຫຼັກ"
            on={featured}
            onChange={setFeatured}
          />
          <ToggleRow
            label="ເຊື່ອງຈາກໜ້າຮ້ານ"
            hint="ບໍ່ສະແດງໃນລາຍການ, ການຄົ້ນຫາ ແລະ ໜ້າສິນຄ້າ (404)"
            on={hidden}
            onChange={setHidden}
            danger
          />
        </div>
        <button
          onClick={() => run(() => saveProductFlags(code, hidden, featured), "ບັນທຶກແລ້ວ")}
          disabled={pending}
          className="mt-5 w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກການເຜີຍແຜ່"}
        </button>
      </div>

      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  onChange,
  danger,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  const accent = danger ? "bg-rose-500" : "bg-brand";
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-left transition hover:bg-gray-50"
    >
      <span>
        <span className="block text-sm font-medium text-gray-800">{label}</span>
        <span className="block text-xs text-gray-400">{hint}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? accent : "bg-gray-300"}`}>
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            on ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
