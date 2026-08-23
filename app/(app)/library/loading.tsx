import { Skeleton } from '@/components/ui/Skeleton'

// Without this the fallback was app/(app)/loading.tsx, which is shaped like the
// dashboard — a bento grid and a poster row the Library never renders. Mirrors
// the real layout: header, the filter pill rack, then the detail rows.
export default function LibraryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      {/* Type / sort / rating pills, the two selects, then the search box. */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-44 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-9 w-56 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-9 w-40 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-9 w-32 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-9 flex-1 min-w-48 rounded-[var(--radius-lg)]" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex gap-4 p-4 rounded-[var(--radius-lg)]"
            style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}
          >
            <Skeleton className="w-16 h-24 shrink-0 rounded-[var(--radius-xl)]" />
            <div className="flex-1 space-y-3 py-1">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
