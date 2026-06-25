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

const MAX_IMAGES = 8;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_UPLOAD_BODY = 45 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type SpecRow = { id: number; label: string; value: string };

let rowIdSeq = 0;
const nextRowId = () => rowIdSeq++;

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

// ---------------------------------------------------------------------------
// 1. PRODUCT GALLERY FORM
// ---------------------------------------------------------------------------
export function ProductGalleryForm({
  code,
  images,
}: {
  code: string;
  images: ProductImageRow[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [urlInput, setUrlInput] = useState("");
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
    const files = Array.from(input.files);
    if (images.length + files.length > MAX_IMAGES) {
      setMsg({ ok: false, text: `ສູງສຸດ ${MAX_IMAGES} ຮູບຕໍ່ສິນຄ້າ` });
      input.value = "";
      return;
    }
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setMsg({ ok: false, text: "ຮອງຮັບສະເພາະ JPG, PNG, WEBP, GIF" });
        input.value = "";
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setMsg({ ok: false, text: "ໄຟລ໌ໃຫຍ່ເກີນ 5MB/ຮູບ" });
        input.value = "";
        return;
      }
    }
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_UPLOAD_BODY) {
      setMsg({ ok: false, text: "ຂະໜາດລວມໃຫຍ່ເກີນ — ກະລຸນາອັບໂຫຼດເທື່ອລະໜ້ອຍ" });
      input.value = "";
      return;
    }
    const fd = new FormData();
    fd.set("code", code);
    files.forEach((f) => fd.append("files", f));
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
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-sm font-black text-slate-900">ຮູບສິນຄ້າ</h2>
        <span className="text-[11px] font-bold text-slate-400">{images.length}/8 ຮູບ</span>
      </div>

      {images.length === 0 ? (
        <p className="mb-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-400 font-semibold">
          ຍັງບໍ່ມີຮູບ — ອັບໂຫຼດ ຫຼື ເພີ່ມດ້ວຍ URL ຂ້າງລຸ່ມ
        </p>
      ) : (
        <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white transition duration-200 hover:border-orange-300 shadow-xs"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-contain p-1" />
              {idx === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-[linear-gradient(135deg,#f97316,#22c55e)] px-2 py-0.5 text-[9px] font-black text-white shadow">
                  ຫຼັກ
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                {idx !== 0 && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => makeImagePrimary(img.id, code))}
                    title="ຕັ້ງເປັນຮູບຫຼັກ"
                    className="grid h-6 w-6 place-items-center rounded-md bg-white/95 text-slate-650 hover:text-orange-600 disabled:opacity-50 cursor-pointer shadow-sm transition"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => removeProductImage(img.id, code))}
                  title="ລຶບ"
                  className="grid h-6 w-6 place-items-center rounded-md bg-white/95 text-rose-500 hover:text-rose-600 disabled:opacity-50 cursor-pointer shadow-sm transition"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button wrapper */}
      <div className="space-y-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={onUpload}
          className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-950 file:px-4 file:py-2.5 file:text-xs file:font-black file:text-white hover:file:bg-orange-600 file:transition file:cursor-pointer disabled:opacity-50"
          disabled={pending || images.length >= 8}
        />

        {/* Add by URL input */}
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="ຫຼື ວາງ URL ຮູບ (https://...)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
          />
          <button
            type="button"
            onClick={onAddUrl}
            disabled={pending || !urlInput.trim()}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-650 transition hover:border-orange-350 hover:bg-orange-50/50 hover:text-orange-700 disabled:opacity-50 cursor-pointer"
          >
            ເພີ່ມ
          </button>
        </div>
      </div>

      {msg && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
            msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. PRODUCT PUBLISH FORM
// ---------------------------------------------------------------------------
export function ProductPublishForm({
  code,
  isHidden,
  isFeatured,
}: {
  code: string;
  isHidden: boolean;
  isFeatured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(isHidden);
  const [featured, setFeatured] = useState(isFeatured);
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

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h2 className="text-sm font-black text-slate-900 font-bold">ການເຜີຍແຜ່</h2>
      </div>

      <div className="space-y-3">
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
        onClick={() => run(() => saveProductFlags(code, hidden, featured), "ບັນທຶກການເຜີຍແຜ່ແລ້ວ")}
        disabled={pending}
        className="mt-4 w-full rounded-lg bg-slate-950 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-60 cursor-pointer sm:w-auto sm:px-6"
      >
        {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກການເຜີຍແຜ່"}
      </button>

      {msg && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
            msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
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
  const accent = danger ? "bg-rose-550" : "bg-orange-500";
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5 text-left transition hover:bg-slate-100/50 cursor-pointer"
    >
      <span>
        <span className="block text-xs font-bold text-slate-800">{label}</span>
        <span className="block text-[10px] font-semibold text-slate-400 mt-0.5">{hint}</span>
      </span>
      <span className={`relative h-5 w-10 shrink-0 rounded-full transition duration-200 ${on ? accent : "bg-slate-300"}`}>
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
            on ? "left-[1.35rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// 3. PRODUCT DESCRIPTION FORM (White-space / serialized specs editor)
// ---------------------------------------------------------------------------
export function ProductDescriptionForm({
  code,
  description,
  erpDescription,
}: {
  code: string;
  description: string | null;
  erpDescription: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

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
  const [savedSnapshot, setSavedSnapshot] = useState(serialized);
  const descDirty = serialized !== savedSnapshot;

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
    pendingFocus.current = id;
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

  const saveDesc = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await saveProductDescription(code, serialized);
      if (res.ok) {
        setSavedSnapshot(serialized);
        setMsg({ ok: true, text: "ບັນທຶກຄຳອະທິບາຍແລ້ວ" });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
          ຄຳອະທິບາຍ / ສະເປັກສິນຄ້າ
          {rows.length > 0 && (
            <span className="rounded-full bg-slate-150 px-2 py-0.5 text-[9px] font-black text-slate-500">
              {rows.length} ລາຍການ
            </span>
          )}
        </h2>
        {erpDescription && (
          <button
            type="button"
            onClick={() => setRows(toRows(erpDescription))}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 transition hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-700 cursor-pointer"
          >
            ດຶງ &amp; ລ້າງຈາກ ERP
          </button>
        )}
      </div>

      <p className="mb-4 text-[10px] font-semibold text-slate-400 leading-normal">
        ພິມ <span className="font-bold text-slate-550">ຫົວຂໍ້</span> ແລ້ວກົດ Enter ໄປ
        <span className="font-bold text-slate-550"> ລາຍລະອຽດ</span> · ກົດ Enter ອີກເທື່ອ =
        ເພີ່ມແຖວໃໝ່. ປ່ອຍວ່າງໝົດ = ໃຊ້ຂໍ້ຄວາມ ERP ຕາມເດີມ.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-xs font-semibold text-slate-400">ຍັງບໍ່ມີລາຍການ</p>
          <button
            type="button"
            onClick={addRow}
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-orange-600 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            ເພີ່ມລາຍການທຳອິດ
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column Headers */}
          <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <span className="w-6 shrink-0 text-center">#</span>
            <span className="min-w-[7rem] flex-1">ຫົວຂໍ້</span>
            <span className="min-w-[9rem] flex-[2]">ລາຍລະອຽດ</span>
            <span className="w-8 shrink-0" />
          </div>

          {/* Rows */}
          {rows.map((row, idx) => (
            <div
              key={row.id}
              className="group flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-1.5 transition focus-within:border-orange-350 focus-within:bg-white"
            >
              {/* Index + Reorder buttons */}
              <div className="flex w-6 shrink-0 flex-col items-center">
                <button
                  type="button"
                  onClick={() => moveRow(row.id, -1)}
                  disabled={idx === 0}
                  title="ຍ້າຍຂຶ້ນ"
                  className="grid h-4 w-5 place-items-center rounded text-slate-300 transition hover:text-orange-600 disabled:opacity-0 cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                </button>
                <span className="text-[10px] font-extrabold text-slate-400">{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => moveRow(row.id, 1)}
                  disabled={idx === rows.length - 1}
                  title="ຍ້າຍລົງ"
                  className="grid h-4 w-5 place-items-center rounded text-slate-300 transition hover:text-orange-600 disabled:opacity-0 cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
              </div>

              {/* Label */}
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
                className="min-w-[7rem] flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
              />

              {/* Value */}
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
                className="min-w-[9rem] flex-[2] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
              />

              {/* Remove row */}
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                title="ລຶບລາຍການ"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-black text-slate-500 transition hover:border-orange-400 hover:bg-orange-50/30 hover:text-orange-700 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            ເພີ່ມລາຍການ
          </button>
        </div>
      )}

      {/* Live Preview block */}
      {serialized.trim() ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 shadow-2xs">
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">ຕົວຢ່າງໜ້າຮ້ານ</p>
          <p className="whitespace-pre-line text-xs font-semibold leading-relaxed text-slate-600">
            {serialized}
          </p>
        </div>
      ) : null}

      {/* Raw ERP detail box */}
      {erpDescription && (
        <details className="mt-3 text-xs text-slate-400">
          <summary className="cursor-pointer select-none font-bold hover:text-slate-600 outline-none">
            ເບິ່ງຂໍ້ຄວາມ ERP (ລ້າງແລ້ວ)
          </summary>
          <p className="mt-2 whitespace-pre-line border-l-2 border-slate-200 pl-3 text-xs font-medium text-slate-500 leading-relaxed">
            {erpDescription}
          </p>
        </details>
      )}

      {/* Footer Save & Character limit counts */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <button
          onClick={saveDesc}
          disabled={pending || !descDirty || serialized.length > 2000}
          className="rounded-lg bg-slate-950 px-6 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-60 cursor-pointer"
        >
          {pending
            ? "ກຳລັງບັນທຶກ..."
            : descDirty
              ? "ບັນທຶກຄຳອະທິບາຍ"
              : "ບັນທຶກແລ້ວ"}
        </button>
        <span className={`text-[10px] font-bold ${serialized.length > 2000 ? "text-rose-500" : "text-slate-400"}`}>
          {descDirty && <span className="mr-2 text-amber-500">● ຍັງບໍ່ໄດ້ບັນທຶກ</span>}
          {serialized.length}/2000
        </span>
      </div>

      {msg && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
            msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
