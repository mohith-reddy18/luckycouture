export function CardSkeleton({ h = "h-72" }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-card">
      <div className={`skeleton w-full ${h}`} />
      <div className="p-4 space-y-2 bg-white">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 8, h = "h-56 sm:h-72" }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 md:gap-7">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} h={h} />
      ))}
    </div>
  );
}
