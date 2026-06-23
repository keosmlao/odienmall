// Loading placeholder for product listing pages.
export default function ListingSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div>
      <div className="mb-4 h-7 w-48 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-sm border border-gray-100 bg-white shadow-sm"
          >
            <div className="aspect-square w-full animate-pulse bg-gradient-to-br from-gray-100 to-gray-200" />
            <div className="space-y-2 p-3">
              <div className="h-3.5 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-1/2 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
