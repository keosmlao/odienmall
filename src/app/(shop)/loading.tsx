export default function ShopLoading() {
  return (
    <div className="space-y-4" aria-label="ກຳລັງໂຫຼດ">
      <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="hidden h-80 animate-pulse rounded bg-white lg:block" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-sm bg-white shadow-sm">
              <div className="aspect-square animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" />
              <div className="space-y-2 p-3">
                <div className="h-3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-5 w-1/2 animate-pulse rounded bg-orange-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
