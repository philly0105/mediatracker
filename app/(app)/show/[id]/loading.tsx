import { Skeleton } from '@/components/ui/Skeleton'

// The page is a client component that fetches on mount, so navigating to a show
// showed the previous route until its JS had loaded *and* its first request had
// come back. This paints the moment the router starts the navigation. It is the
// page's own shape — back pill, hero frame with the slab, episodes panel — so
// the two swap without a jump.
export default function ShowLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-11 w-24 rounded-[var(--radius-pill)]" />

      <div className="glass-panel p-2" style={{ borderRadius: 32 }}>
        <div
          className="@container relative flex flex-col overflow-hidden lg:min-h-[520px] lg:flex-row"
          style={{ borderRadius: 24, background: 'var(--bg-deep)' }}
        >
          <div className="h-[220px] w-full md:h-[320px] lg:absolute lg:inset-0 lg:h-auto">
            <Skeleton className="h-full w-full rounded-none" />
          </div>
          <div
            className="glass-slab relative z-[1] flex flex-col gap-4 rounded-none p-5 md:p-7 lg:m-4 lg:w-[min(480px,60cqw-32px)] lg:rounded-[var(--radius-slab)]"
            style={{ flex: 'none', maxWidth: '100%' }}
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-10 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="mt-2 flex items-center gap-3">
              <Skeleton className="h-[52px] w-[52px] rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
            <Skeleton className="h-[92px] w-full rounded-[var(--radius-lg)]" />
            <div className="mt-auto flex gap-2 pt-5">
              <Skeleton className="h-12 w-40 rounded-[var(--radius-pill)]" />
              <Skeleton className="h-12 w-28 rounded-[var(--radius-pill)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-5">
        <Skeleton className="mb-4 h-6 w-28" />
        <Skeleton className="mb-4 h-11 w-64 rounded-[var(--radius-md)]" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass-row flex items-center gap-4 p-[10px]">
              <Skeleton className="h-[58px] w-[104px] shrink-0 rounded-[var(--radius-thumb)] md:h-[90px] md:w-40" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-11 w-14 shrink-0 rounded-[var(--radius-pill)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
