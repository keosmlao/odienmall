import type { ReviewSummary } from "@/lib/reviews";
import StarRating from "./StarRating";
import ReviewForm from "./ReviewForm";

export default function ProductReviews({
  productCode,
  summary,
  canReview,
}: {
  productCode: string;
  summary: ReviewSummary;
  canReview: boolean;
}) {
  const mine = summary.reviews.find((r) => r.mine);
  return (
    <section className="mt-5 !p-0">
      <h2 className="border-b-2 border-orange-500 px-5 py-4 text-lg font-bold text-gray-800">ລີວິວ ແລະ ຄະແນນ</h2>
      <div className="p-4 md:p-6">

      {summary.count > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-extrabold text-gray-800">
              {summary.average.toFixed(1)}
            </div>
            <StarRating value={summary.average} size={16} />
            <div className="mt-1 text-xs text-gray-400">{summary.count} ລີວິວ</div>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution[star] ?? 0;
              const pct = summary.count ? (n / summary.count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-3">{star}</span>
                  <span className="text-amber-400">★</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <span className="block h-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-6 text-right">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mb-5 text-sm text-gray-400">ຍັງບໍ່ມີລີວິວ ເປັນຄົນທຳອິດທີ່ໃຫ້ຄະແນນ</p>
      )}

      <div className="mb-6">
        <ReviewForm
          productCode={productCode}
          canReview={canReview}
          initialRating={mine?.rating ?? 0}
          initialComment={mine?.comment ?? ""}
        />
      </div>

      <ul className="space-y-4">
        {summary.reviews.map((r) => (
          <li key={r.id} className="border-t border-gray-100 pt-4 first:border-0 first:pt-0">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">
                {r.customerName}
                {r.mine && <span className="ml-2 text-xs text-brand-dark">(ຂອງທ່ານ)</span>}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(r.createdAt).toLocaleDateString("lo-LA")}
              </span>
            </div>
            <StarRating value={r.rating} size={13} />
            {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
