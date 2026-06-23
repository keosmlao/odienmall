"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { submitReview } from "@/app/(shop)/product/[code]/review-actions";

export interface ReviewItem {
  productCode: string;
  productName: string;
  reviewed: boolean;
}

// Post-delivery "rate your purchase" — one inline star+comment form per item of a
// completed order. Shown only to the buyer. Reuses the existing submitReview action.
export default function OrderReviewPrompt({
  loggedIn,
  items,
}: {
  loggedIn: boolean;
  items: ReviewItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-5 rounded-sm border border-amber-100 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg">⭐</span>
        <h2 className="text-sm font-bold text-gray-800">ໃຫ້ຄະແນນສິນຄ້າທີ່ໄດ້ຮັບ</h2>
      </div>
      <p className="mb-4 text-xs text-gray-400">ຄຳເຫັນຂອງທ່ານຊ່ວຍລູກຄ້າຄົນອື່ນ ແລະ ຮ້ານໄດ້ຫຼາຍ</p>
      {!loggedIn ? (
        <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 p-4 text-sm text-gray-500">
          <Link href="/login?redirect=/account" className="font-medium text-brand-dark hover:underline">
            ເຂົ້າສູ່ລະບົບ
          </Link>{" "}
          ເພື່ອໃຫ້ຄະແນນສິນຄ້າ
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.productCode}>
              <ItemReview item={it} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemReview({ item }: { item: ReviewItem }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(item.reviewed);

  function submit() {
    setError(null);
    if (rating < 1) {
      setError("ກະລຸນາເລືອກຄະແນນດາວ");
      return;
    }
    startTransition(async () => {
      const res = await submitReview(item.productCode, rating, comment);
      if (res.ok) {
        setDone(true);
        setOpen(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/product/${encodeURIComponent(item.productCode)}`}
          className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700 hover:text-brand-dark"
        >
          {item.productName}
        </Link>
        {done ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
            ໃຫ້ຄະແນນແລ້ວ ✓
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
          >
            {open ? "ປິດ" : "ໃຫ້ຄະແນນ"}
          </button>
        )}
      </div>

      {open && !done && (
        <div className="mt-3">
          <div className="mb-2 flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                className={`text-2xl leading-none transition ${n <= (hover || rating) ? "text-amber-400" : "text-gray-300"}`}
                aria-label={`${n} ດາວ`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
            placeholder="ຄຳເຫັນ (ບໍ່ບັງຄັບ)"
          />
          {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="mt-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:bg-gray-300"
          >
            {pending ? "ກຳລັງສົ່ງ..." : "ສົ່ງຄະແນນ"}
          </button>
        </div>
      )}
    </div>
  );
}
