"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitReview, uploadReviewPhoto } from "@/app/(shop)/product/[code]/review-actions";

export default function ReviewForm({
  productCode,
  canReview,
  initialRating = 0,
  initialComment = "",
}: {
  productCode: string;
  canReview: boolean;
  initialRating?: number;
  initialComment?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("photo", file);
    const res = await uploadReviewPhoto(fd);
    setUploading(false);
    if (res.ok) setPhotoUrl(res.url);
    else setError(res.error);
  }

  if (!canReview) {
    return (
      <div className="rounded-sm border border-dashed border-orange-200 bg-orange-50/40 p-4 text-sm text-gray-500">
        <Link
          href={`/login?redirect=/product/${encodeURIComponent(productCode)}`}
          className="font-medium text-brand-dark hover:underline"
        >
          ເຂົ້າສູ່ລະບົບ
        </Link>{" "}
        ເພື່ອຂຽນລີວິວສິນຄ້ານີ້
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("ກະລຸນາເລືອກຄະແນນດາວ");
      return;
    }
    startTransition(async () => {
      const res = await submitReview(productCode, rating, comment, photoUrl);
      if (res.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="rounded-sm border border-orange-100 bg-orange-50/30 p-4">
      <div className="mb-2 text-sm font-medium text-gray-700">ໃຫ້ຄະແນນສິນຄ້ານີ້</div>
      <div className="mb-3 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            className={`text-2xl leading-none transition ${
              n <= (hover || rating) ? "text-amber-400" : "text-gray-300"
            }`}
            aria-label={`${n} ດາວ`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="inp"
        placeholder="ຄຳເຫັນຂອງທ່ານ (ບໍ່ບັງຄັບ)"
      />
      <div className="mt-2">
        {photoUrl ? (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="" className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
            <button type="button" onClick={() => setPhotoUrl(null)} className="text-xs font-semibold text-rose-500 hover:underline">ລຶບຮູບ</button>
          </div>
        ) : (
          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-dashed border-gray-300 px-3 py-2 text-xs font-semibold text-gray-500 hover:border-orange-300 hover:text-orange-600 ${uploading ? "opacity-60" : ""}`}>
            {uploading ? "ກຳລັງອັບໂຫຼດ..." : "📷 ເພີ່ມຮູບ (ບໍ່ບັງຄັບ)"}
            <input type="file" accept="image/*" onChange={onPhoto} disabled={uploading} className="hidden" />
          </label>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {done && <p className="mt-2 text-sm text-green-600">ຂອບໃຈສຳລັບລີວິວຂອງທ່ານ!</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-sm bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:bg-gray-300"
      >
        {pending ? "ກຳລັງສົ່ງ..." : "ສົ່ງລີວິວ"}
      </button>
    </form>
  );
}
