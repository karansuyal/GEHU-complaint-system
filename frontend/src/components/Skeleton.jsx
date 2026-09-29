export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function CardSkeleton() {
  return (
    <div className="panel p-4 flex items-start gap-4">
      <Skeleton className="h-10 w-10 shrink-0" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="h-6 w-20 shrink-0" />
    </div>
  )
}

export function ListSkeleton({ rows = 4, grid = false }) {
  return (
    <div role="status" aria-label="Loading" className={grid ? 'grid gap-3 lg:grid-cols-2' : 'space-y-3'}>
      {Array.from({ length: rows }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export function StatSkeletons({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="panel p-4">
          <Skeleton className="h-7 w-12 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </>
  )
}
