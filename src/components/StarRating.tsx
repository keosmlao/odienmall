// Read-only star rating display (server-safe — no hooks).
export default function StarRating({
  value,
  size = 14,
}: {
  value: number;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span
      className="relative inline-block leading-none"
      style={{ fontSize: size }}
      aria-label={`${value.toFixed(1)} / 5`}
    >
      <span className="text-gray-300">★★★★★</span>
      <span
        className="absolute inset-0 overflow-hidden whitespace-nowrap text-amber-400"
        style={{ width: `${pct}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
}
