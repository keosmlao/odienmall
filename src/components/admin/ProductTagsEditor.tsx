"use client";

import { useState, useTransition } from "react";
import type { Tag } from "@/lib/product-tags";

interface Props {
  productCode: string;
  allTags: Tag[];
  initial: Tag[];
  setTags: (code: string, ids: number[]) => Promise<{ ok: boolean; error?: string }>;
  createTag: (slug: string, name: string) => Promise<{ ok: boolean; tag?: Tag; error?: string }>;
}

export default function ProductTagsEditor({ productCode, allTags: initAllTags, initial, setTags, createTag }: Props) {
  const [allTags, setAllTags] = useState<Tag[]>(initAllTags);
  const [selected, setSelected] = useState<number[]>(initial.map((t) => t.id));
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(id: number) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      await setTags(productCode, selected);
      setSaved(true);
    });
  }

  function addTag(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    startTransition(async () => {
      const res = await createTag(slug, name);
      if (res.ok && res.tag) {
        setAllTags((prev) => [...prev, res.tag!].sort((a, b) => a.name.localeCompare(b.name)));
        setSelected((prev) => [...prev, res.tag!.id]);
        setNewName("");
        setSaved(false);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allTags.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              selected.includes(t.id)
                ? "border-brand bg-brand text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-brand/50"
            }`}
          >
            {t.name}
          </button>
        ))}
        {allTags.length === 0 && <p className="text-xs text-gray-400">ຍັງບໍ່ມີ tag — ສ້າງໄດ້ຂ້າງລຸ່ມ</p>}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-50"
        >
          {pending ? "..." : "ບັນທຶກ Tags"}
        </button>
        {saved && <span className="self-center text-xs text-emerald-600">ບັນທຶກແລ້ວ ✓</span>}
      </div>

      <form onSubmit={addTag} className="flex gap-2 border-t border-gray-100 pt-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="inp flex-1 text-xs"
          placeholder="ຊື່ tag ໃໝ່..."
          maxLength={50}
        />
        <button
          type="submit"
          disabled={pending || !newName.trim()}
          className="shrink-0 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:border-brand hover:text-brand"
        >
          + ເພີ່ມ Tag
        </button>
      </form>
    </div>
  );
}
