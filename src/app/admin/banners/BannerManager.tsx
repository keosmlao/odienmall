"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { HomeBanner, HomeBannerInput } from "@/lib/banners";
import { Badge, TableShell, THEAD, TH, TBODY, TR, TD } from "@/components/admin/ui";
import {
  addBanner,
  deleteBanner,
  removeBannerImage,
  saveBanner,
  uploadBannerImage,
} from "./actions";

const EMPTY: HomeBannerInput = {
  enabled: true,
  eyebrow: "ODIENMALL · OFFICIAL STORE",
  title: "",
  description: "",
  buttonText: "ຊ໊ອບດຽວນີ້",
  link: "/products",
  backgroundFrom: "#ff5f20",
  backgroundTo: "#ffb21c",
  sortOrder: 0,
};

type ActionResult = { ok: true; id?: number } | { ok: false; error: string };

// Sub-component for Live Preview of the Banner (matches storefront 1:1)
function Preview({
  banner,
  imageUrl,
}: {
  banner: HomeBannerInput;
  imageUrl?: string | null;
}) {
  return (
    <div
      className="relative aspect-[16/5] min-h-40 w-full overflow-hidden rounded-xl text-white shadow-sm border border-slate-100/10 select-none"
      style={{
        backgroundImage: imageUrl
          ? `linear-gradient(90deg, ${banner.backgroundFrom}f2 0%, ${banner.backgroundTo}a6 55%, transparent 100%), url("${imageUrl}")`
          : `linear-gradient(110deg, ${banner.backgroundFrom}, ${banner.backgroundTo})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      {/* Decorative circles to match HomeBannerSlider exactly */}
      <div className="absolute -right-10 -top-24 h-48 w-48 rounded-full bg-white/15 pointer-events-none" />
      <div className="absolute -bottom-20 right-20 h-40 w-40 rounded-full bg-black/5 pointer-events-none" />
      
      <div className="absolute inset-0 flex max-w-[70%] flex-col justify-center p-4 sm:p-6 z-10">
        <p className="text-[8px] font-bold tracking-[0.2em] text-white/80 uppercase">
          {banner.eyebrow}
        </p>
        <p className="mt-1 text-sm font-black leading-tight sm:text-base md:text-lg">
          {banner.title || "ຫົວຂໍ້ Banner"}
        </p>
        <p className="mt-1.5 line-clamp-2 text-[9px] leading-relaxed text-white/85">
          {banner.description || "ລາຍລະອຽດ ຫຼື ຄຳອະທິບາຍເພີ່ມເຕີມ..."}
        </p>
        <span className="mt-2.5 w-fit rounded-sm bg-white px-2.5 py-1 text-[9px] font-black text-slate-900 shadow-sm">
          {banner.buttonText}
        </span>
      </div>
    </div>
  );
}

// Sub-component for form fields
interface BannerFieldsProps {
  value: HomeBannerInput;
  onChange: (value: HomeBannerInput) => void;
  inpClass: string;
  lblClass: string;
}

function BannerFields({ value, onChange, inpClass, lblClass }: BannerFieldsProps) {
  const set = <K extends keyof HomeBannerInput>(key: K, next: HomeBannerInput[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={lblClass}>ຫົວຂໍ້ *</label>
        <input
          value={value.title}
          onChange={(event) => set("title", event.target.value)}
          className={inpClass}
          maxLength={120}
          placeholder="ເຊັ່ນ: ໂປຣໂມຊັນເຄື່ອງໃຊ້ໄຟຟ້າຄຸນນະພາບ"
          required
        />
      </div>

      <div>
        <label className={lblClass}>ຂໍ້ຄວາມນ້ອຍເທິງຫົວຂໍ້</label>
        <input
          value={value.eyebrow}
          onChange={(event) => set("eyebrow", event.target.value)}
          className={inpClass}
          maxLength={80}
          placeholder="ODIENMALL · OFFICIAL STORE"
        />
      </div>

      <div>
        <label className={lblClass}>ລຳດັບ (0–999)</label>
        <input
          type="number"
          min={0}
          max={999}
          value={value.sortOrder}
          onChange={(event) => set("sortOrder", Number(event.target.value))}
          className={inpClass}
          required
        />
      </div>

      <div className="sm:col-span-2">
        <label className={lblClass}>ລາຍລະອຽດ</label>
        <textarea
          value={value.description}
          onChange={(event) => set("description", event.target.value)}
          className={`${inpClass} min-h-16 resize-y font-normal`}
          maxLength={240}
          placeholder="ເພີ່ມຄຳອະທິບາຍເພີ່ມເຕີມກ່ຽວກັບ Banner ນີ້..."
        />
      </div>

      <div>
        <label className={lblClass}>ຂໍ້ຄວາມປຸ່ມ</label>
        <input
          value={value.buttonText}
          onChange={(event) => set("buttonText", event.target.value)}
          className={inpClass}
          maxLength={40}
          placeholder="ຊ໊ອບດຽວນີ້"
        />
      </div>

      <div>
        <label className={lblClass}>ລິ້ງປາຍທາງ *</label>
        <input
          value={value.link}
          onChange={(event) => set("link", event.target.value)}
          className={`${inpClass} font-mono`}
          maxLength={200}
          placeholder="ເຊັ່ນ: /products ຫຼື /brand/SAMSUNG"
          required
        />
      </div>

      <div>
        <label className={lblClass}>ສີເລີ່ມ</label>
        <span className="flex gap-2">
          <input
            type="color"
            value={value.backgroundFrom}
            onChange={(event) => set("backgroundFrom", event.target.value)}
            className="h-9 w-11 rounded-lg border border-slate-200 bg-white p-1 cursor-pointer shrink-0"
          />
          <input
            value={value.backgroundFrom}
            onChange={(event) => set("backgroundFrom", event.target.value)}
            className={`${inpClass} font-mono uppercase`}
            maxLength={7}
          />
        </span>
      </div>

      <div>
        <label className={lblClass}>ສີສິ້ນສຸດ</label>
        <span className="flex gap-2">
          <input
            type="color"
            value={value.backgroundTo}
            onChange={(event) => set("backgroundTo", event.target.value)}
            className="h-9 w-11 rounded-lg border border-slate-200 bg-white p-1 cursor-pointer shrink-0"
          />
          <input
            value={value.backgroundTo}
            onChange={(event) => set("backgroundTo", event.target.value)}
            className={`${inpClass} font-mono uppercase`}
            maxLength={7}
          />
        </span>
      </div>

      <div className="pt-2 flex items-center gap-2 sm:col-span-2">
        <input
          type="checkbox"
          id="enabled-check"
          checked={value.enabled}
          onChange={(event) => set("enabled", event.target.checked)}
          className="h-4.5 w-4.5 rounded border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer shadow-xs"
        />
        <label htmlFor="enabled-check" className="text-xs font-bold text-slate-655 cursor-pointer select-none">
          ເປີດສະແດງ banner ນີ້ໃນໜ້າຫຼັກ
        </label>
      </div>
    </div>
  );
}

export default function BannerManager({ banners }: { banners: HomeBanner[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<HomeBannerInput>({
    ...EMPTY,
    sortOrder: banners.length,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const editing = editingId !== null;

  function reset() {
    setForm({
      ...EMPTY,
      sortOrder: banners.length,
    });
    setEditingId(null);
    setEditingImageUrl(null);
    setError(null);
    setSuccess(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function run(task: () => Promise<ActionResult>, successMsg: string, isCreate = false) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await task();
      if (result.ok) {
        setSuccess(successMsg);
        router.refresh();
        if (isCreate && result.id) {
          // Auto switch to edit mode of the newly created banner to let user upload image immediately
          setEditingId(result.id);
          setEditingImageUrl(null);
        } else if (!editing) {
          // If we finished editing or deleted, reset
          reset();
        }
      } else {
        setError(result.error);
      }
    });
  }

  // Handle Create or Edit Form submit
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      run(() => saveBanner(editingId, form), "ບັນທຶກການແກ້ໄຂແລ້ວ ✓");
    } else {
      run(() => addBanner(form), "ສ້າງ Banner ແລ້ວ! ທ່ານສາມາດອັບໂຫຼດຮູບໃສ່ໄດ້ແລ້ວ ✓", true);
    }
  }

  // Toggle active status directly from table row
  function toggleStatus(banner: HomeBanner) {
    const updatedInput: HomeBannerInput = {
      enabled: !banner.enabled,
      eyebrow: banner.eyebrow,
      title: banner.title,
      description: banner.description,
      buttonText: banner.buttonText,
      link: banner.link,
      backgroundFrom: banner.backgroundFrom,
      backgroundTo: banner.backgroundTo,
      sortOrder: banner.sortOrder,
    };
    run(() => saveBanner(banner.id, updatedInput), "ປ່ຽນແປງສະຖານະແລ້ວ ✓");
  }

  // Handle banner image upload
  function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editingId) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.set("id", String(editingId));
    data.set("file", file);

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await uploadBannerImage(data);
      if (result.ok) {
        setSuccess("ອັບໂຫຼດຮູບພາບແລ້ວ ✓");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  // Handle banner image remove
  function deleteImage() {
    if (!editingId || !confirm("ຕ້ອງການລຶບຮູບພາບຂອງ Banner ນີ້?")) return;
    run(() => removeBannerImage(editingId), "ລຶບຮູບພາບອອກແລ້ວ ✓");
    setEditingImageUrl(null);
  }

  // Select banner for editing
  function editBanner(b: HomeBanner) {
    setError(null);
    setSuccess(null);
    setEditingId(b.id);
    setEditingImageUrl(b.imageUrl);
    setForm({
      enabled: b.enabled,
      eyebrow: b.eyebrow,
      title: b.title,
      description: b.description,
      buttonText: b.buttonText,
      link: b.link,
      backgroundFrom: b.backgroundFrom,
      backgroundTo: b.backgroundTo,
      sortOrder: b.sortOrder,
    });
    // Scroll window to top smoothly to bring editor form into view
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Handle Delete Banner
  function delBanner(b: HomeBanner) {
    if (!confirm(`ຢືນຢັນຕ້ອງການລຶບ Banner "${b.title || 'ບໍ່ມີຫົວຂໍ້'}"?`)) return;
    run(() => deleteBanner(b.id), "ລຶບ Banner ແລ້ວ ✓");
  }

  // Synchronize editing image url if banners list prop changed
  const currentEditingBanner = banners.find((b) => b.id === editingId);
  const activeImageUrl = currentEditingBanner ? currentEditingBanner.imageUrl : editingImageUrl;

  const inp = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm disabled:opacity-50 disabled:bg-slate-50";
  const lbl = "block text-[10px] font-black uppercase tracking-wider text-slate-450 mb-1.5";

  return (
    <div className="grid gap-6 lg:grid-cols-12 items-start">
      {/* LEFT: Creator/Editor form (5 columns) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Banner Preview Block */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-450 mb-3">ຕົວຢ່າງການສະແດງຜົນ (Live Preview)</span>
          <Preview banner={form} imageUrl={activeImageUrl} />
        </div>

        {/* Edit Form */}
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-850 leading-tight">
              {editing ? `ແກ້ໄຂ Banner #${editingId}` : "ເພີ່ມ Banner ໜ້າຫຼັກໃໝ່"}
            </h2>
            {editing && (
              <Badge tone="brand">ກຳລັງແກ້ໄຂ</Badge>
            )}
          </div>

          <BannerFields value={form} onChange={setForm} inpClass={inp} lblClass={lbl} />

          {/* Image Upload Block (Only available in Edit Mode) */}
          {editing ? (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className={lbl}>ຮູບພາບ Banner (ແນະນຳ 1600 × 500 px)</label>
              
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
                {activeImageUrl ? (
                  <div className="space-y-3">
                    <div className="mx-auto w-36 aspect-[16/5] rounded border border-slate-200 overflow-hidden shadow-2xs relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activeImageUrl} className="w-full h-full object-cover" alt="Banner Uploaded" />
                    </div>
                    <div className="flex justify-center gap-3">
                      <label className="cursor-pointer text-xs font-black text-orange-600 hover:text-orange-700 transition">
                        ປ່ຽນຮູບພາບ
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={uploadImage}
                          disabled={pending}
                          className="hidden"
                        />
                      </label>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={deleteImage}
                        className="text-xs font-black text-rose-600 hover:text-rose-700 transition cursor-pointer"
                      >
                        ລຶບຮູບ
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer py-2">
                    <svg className="mx-auto h-7 w-7 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-black text-slate-650">ອັບໂຫຼດຮູບພາບ Banner</span>
                    <span className="text-[10px] text-slate-400 mt-1">ຮອງຮັບ JPG, PNG, WEBP (ສູງສຸດ 6MB)</span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={uploadImage}
                      disabled={pending}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 text-center py-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <span className="text-[10px] text-slate-450 font-bold leading-relaxed px-4 block">
                💡 ຫຼັງຈາກກົດ &quot;ສ້າງ Banner&quot; ແລ້ວ ທ່ານຈຶ່ງສາມາດອັບໂຫຼດຮູບພາບໃສ່ Banner ນີ້ໄດ້.
              </span>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-100 p-2.5 text-xs font-bold text-rose-600 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2.5 text-xs font-bold text-emerald-700 flex items-center gap-2">
              <span>✓</span>
              <span>{success}</span>
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-black text-white shadow-sm shadow-orange-500/10 hover:shadow-md hover:shadow-orange-500/20 active:scale-98 transition-all duration-200 disabled:opacity-60 cursor-pointer"
            >
              {pending ? "ກຳລັງປະມວນຜົນ..." : editing ? "ບັນທຶກການແກ້ໄຂ" : "ສ້າງ Banner"}
            </button>
            {(editing || form.title !== "" || form.description !== "") && (
              <button
                type="button"
                onClick={reset}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition shadow-xs cursor-pointer"
              >
                ຍົກເລີກ
              </button>
            )}
          </div>
        </form>
      </div>

      {/* RIGHT: Banners Table List (7 columns) */}
      <div className="lg:col-span-7 space-y-4">
        <TableShell minWidth={600}>
          <thead className={THEAD}>
            <tr>
              <th className={`${TH} text-center w-14`}>ລຳດັບ</th>
              <th className={`${TH} w-24`}>ຮູບພາບ</th>
              <th className={TH}>ຂໍ້ມູນ Banner</th>
              <th className={`${TH} text-center w-24`}>ສະຖານະ</th>
              <th className={`${TH} text-right w-24`} />
            </tr>
          </thead>
          <tbody className={TBODY}>
            {banners.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-14 text-center">
                  <div className="text-slate-400 mb-3 text-lg">📭</div>
                  <p className="text-xs font-black text-slate-900">ຍັງບໍ່ມີ Banner ໃດໆ</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    ສ້າງ Banner ທຳອິດຂອງທ່ານໂດຍການຕື່ມຂໍ້ມູນໃສ່ຟອມດ້ານຊ້າຍມື. ໜ້າຮ້ານຈະສະແດງ Banner ສຳຮອງຫາກບໍ່ມີຂໍ້ມູນ.
                  </p>
                </td>
              </tr>
            ) : (
              banners.map((b) => (
                <tr
                  key={b.id}
                  className={`${TR} ${editingId === b.id ? "bg-orange-50/20 border-l-2 border-orange-500" : ""}`}
                >
                  <td className={`${TD} text-center font-mono font-black text-slate-900 text-xs`}>
                    {b.sortOrder}
                  </td>
                  <td className={TD}>
                    <div
                      className="w-20 aspect-[16/5] rounded border border-slate-200 overflow-hidden relative shadow-3xs"
                      style={{
                        backgroundImage: `linear-gradient(110deg, ${b.backgroundFrom}, ${b.backgroundTo})`,
                      }}
                    >
                      {b.imageUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={b.imageUrl} className="w-full h-full object-cover relative z-10" alt="" />
                      )}
                    </div>
                  </td>
                  <td className={TD}>
                    <div className="space-y-0.5">
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">
                        {b.eyebrow}
                      </span>
                      <span className="block text-xs font-black text-slate-800 leading-tight">
                        {b.title || <span className="text-slate-400 italic">ບໍ່ມີຫົວຂໍ້</span>}
                      </span>
                      {b.description && (
                        <span className="block text-[10px] text-slate-450 line-clamp-1">
                          {b.description}
                        </span>
                      )}
                      <span className="inline-block text-[9px] font-mono text-orange-600 bg-orange-50/75 rounded px-1.5 py-0.25 mt-1 border border-orange-100/50">
                        {b.link}
                      </span>
                    </div>
                  </td>
                  <td className={`${TD} text-center`}>
                    <button
                      type="button"
                      onClick={() => toggleStatus(b)}
                      disabled={pending}
                      className="cursor-pointer transition-all duration-200 transform active:scale-95 disabled:opacity-50"
                      title={b.enabled ? "ກົດເພື່ອປິດສະແດງ" : "ກົດເພື່ອເປີດສະແດງ"}
                    >
                      <Badge tone={b.enabled ? "green" : "gray"}>
                        {b.enabled ? "ເປີດສະແດງ" : "ປິດສະແດງ"}
                      </Badge>
                    </button>
                  </td>
                  <td className={`${TD} text-right whitespace-nowrap text-xs`}>
                    <button
                      onClick={() => editBanner(b)}
                      className="text-orange-600 hover:text-orange-700 hover:underline font-extrabold transition cursor-pointer"
                    >
                      ແກ້ໄຂ
                    </button>
                    <button
                      onClick={() => delBanner(b)}
                      disabled={pending}
                      className="ml-3.5 text-rose-500 hover:text-rose-600 hover:underline font-extrabold transition disabled:opacity-50 cursor-pointer"
                    >
                      ລົບ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </TableShell>
      </div>
    </div>
  );
}
