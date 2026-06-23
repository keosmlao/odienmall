"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { HomeBanner, HomeBannerInput } from "@/lib/banners";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/admin/ui";
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
  buttonText: "ເບິ່ງສິນຄ້າ",
  link: "/products",
  backgroundFrom: "#ff5f20",
  backgroundTo: "#ffb21c",
  sortOrder: 0,
};

type ActionResult = { ok: true; id?: number } | { ok: false; error: string };

function BannerFields({
  value,
  onChange,
}: {
  value: HomeBannerInput;
  onChange: (value: HomeBannerInput) => void;
}) {
  const set = <K extends keyof HomeBannerInput>(key: K, next: HomeBannerInput[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ຫົວຂໍ້</span>
        <input
          value={value.title}
          onChange={(event) => set("title", event.target.value)}
          className="inp w-full"
          maxLength={120}
          placeholder="ເຊັ່ນ: ໂປຣໂມຊັນເຄື່ອງໃຊ້ໄຟຟ້າ"
        />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ຂໍ້ຄວາມນ້ອຍເທິງຫົວຂໍ້</span>
        <input
          value={value.eyebrow}
          onChange={(event) => set("eyebrow", event.target.value)}
          className="inp w-full"
          maxLength={80}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ລຳດັບ</span>
        <input
          type="number"
          min={0}
          max={999}
          value={value.sortOrder}
          onChange={(event) => set("sortOrder", Number(event.target.value))}
          className="inp w-full"
        />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ລາຍລະອຽດ</span>
        <textarea
          value={value.description}
          onChange={(event) => set("description", event.target.value)}
          className="inp min-h-20 w-full resize-y"
          maxLength={240}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ຂໍ້ຄວາມປຸ່ມ</span>
        <input
          value={value.buttonText}
          onChange={(event) => set("buttonText", event.target.value)}
          className="inp w-full"
          maxLength={40}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ລິ້ງປາຍທາງ</span>
        <input
          value={value.link}
          onChange={(event) => set("link", event.target.value)}
          className="inp w-full"
          maxLength={200}
          placeholder="/products"
        />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ສີເລີ່ມ</span>
        <span className="flex gap-2">
          <input
            type="color"
            value={value.backgroundFrom}
            onChange={(event) => set("backgroundFrom", event.target.value)}
            className="h-10 w-12 rounded-lg border border-gray-200 bg-white p-1"
          />
          <input
            value={value.backgroundFrom}
            onChange={(event) => set("backgroundFrom", event.target.value)}
            className="inp min-w-0 flex-1"
            maxLength={7}
          />
        </span>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-gray-600">ສີສິ້ນສຸດ</span>
        <span className="flex gap-2">
          <input
            type="color"
            value={value.backgroundTo}
            onChange={(event) => set("backgroundTo", event.target.value)}
            className="h-10 w-12 rounded-lg border border-gray-200 bg-white p-1"
          />
          <input
            value={value.backgroundTo}
            onChange={(event) => set("backgroundTo", event.target.value)}
            className="inp min-w-0 flex-1"
            maxLength={7}
          />
        </span>
      </label>
      <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(event) => set("enabled", event.target.checked)}
          className="h-4 w-4 accent-orange-500"
        />
        <span className="text-sm font-medium text-gray-700">ເປີດສະແດງ banner ນີ້</span>
      </label>
    </div>
  );
}

function Preview({
  banner,
  imageUrl,
}: {
  banner: HomeBannerInput;
  imageUrl?: string | null;
}) {
  return (
    <div
      className="relative mb-5 aspect-[16/5] min-h-48 overflow-hidden rounded-xl text-white"
      style={{
        backgroundImage: imageUrl
          ? `linear-gradient(90deg, ${banner.backgroundFrom}f2 0%, ${banner.backgroundTo}99 58%, transparent 100%), url("${imageUrl}")`
          : `linear-gradient(110deg, ${banner.backgroundFrom}, ${banner.backgroundTo})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 flex max-w-[70%] flex-col justify-center p-6">
        <p className="text-[10px] font-bold tracking-[0.18em] text-white/80">{banner.eyebrow}</p>
        <p className="mt-1 text-xl font-black leading-tight">{banner.title || "ຫົວຂໍ້ Banner"}</p>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/85">{banner.description}</p>
        <span className="mt-3 w-fit rounded bg-white px-3 py-1.5 text-xs font-bold text-gray-800">
          {banner.buttonText}
        </span>
      </div>
    </div>
  );
}

function ExistingBanner({ banner }: { banner: HomeBanner }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<HomeBannerInput>({
    enabled: banner.enabled,
    eyebrow: banner.eyebrow,
    title: banner.title,
    description: banner.description,
    buttonText: banner.buttonText,
    link: banner.link,
    backgroundFrom: banner.backgroundFrom,
    backgroundTo: banner.backgroundTo,
    sortOrder: banner.sortOrder,
  });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(task: () => Promise<ActionResult>, success: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await task();
      if (result.ok) {
        setMessage(success);
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });
  }

  function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.set("id", String(banner.id));
    data.set("file", file);
    run(() => uploadBannerImage(data), "ອັບໂຫຼດຮູບແລ້ວ ✓");
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <Preview banner={value} imageUrl={banner.imageUrl} />
      <BannerFields value={value} onChange={setValue} />
      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="mb-2 text-xs font-medium text-gray-600">ຮູບ Banner (ແນະນຳ 1600 × 500 px)</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={upload}
            disabled={pending}
            className="max-w-full text-xs text-gray-500 file:mr-2 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:font-semibold"
          />
          {banner.imageUrl && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => removeBannerImage(banner.id), "ລຶບຮູບແລ້ວ ✓")}
              className="text-xs font-semibold text-rose-600"
            >
              ລຶບຮູບ
            </button>
          )}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => saveBanner(banner.id, value), "ບັນທຶກແລ້ວ ✓")}
          className={BTN_PRIMARY}
        >
          {pending ? "..." : "ບັນທຶກ"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm("ຢືນຢັນລຶບ banner ນີ້?")) {
              run(() => deleteBanner(banner.id), "ລຶບແລ້ວ");
            }
          }}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          ລຶບ
        </button>
        {message && <span className="text-xs font-medium text-gray-500">{message}</span>}
      </div>
    </section>
  );
}

export default function BannerManager({ banners }: { banners: HomeBanner[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<HomeBannerInput>({
    ...EMPTY,
    sortOrder: banners.length,
  });
  const [showAdd, setShowAdd] = useState(banners.length === 0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await addBanner(draft);
      if (result.ok) {
        setDraft({ ...EMPTY, sortOrder: banners.length + 1 });
        setShowAdd(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowAdd((value) => !value)} className={BTN_SECONDARY}>
          {showAdd ? "ປິດຟອມ" : "+ ເພີ່ມ Banner"}
        </button>
      </div>

      {showAdd && (
        <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">ເພີ່ມ Banner ໃໝ່</h2>
          <Preview banner={draft} />
          <BannerFields value={draft} onChange={setDraft} />
          <div className="mt-5 flex items-center gap-3">
            <button type="button" disabled={pending} onClick={create} className={BTN_PRIMARY}>
              {pending ? "..." : "ສ້າງ Banner"}
            </button>
            {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
          </div>
          <p className="mt-3 text-xs text-gray-400">ຫຼັງຈາກສ້າງແລ້ວ ຈຶ່ງອັບໂຫຼດຮູບໃສ່ Banner.</p>
        </section>
      )}

      {banners.map((banner) => (
        <ExistingBanner key={banner.id} banner={banner} />
      ))}

      {banners.length === 0 && !showAdd && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          ຍັງບໍ່ມີ banner — ໜ້າຮ້ານຈະໃຊ້ banner ສຳຮອງ.
        </div>
      )}
    </div>
  );
}
