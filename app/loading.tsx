// The dashboard fetches TMDB ("upcoming releases") plus several DB reads on the
// server, so without a loading state it would block behind a blank screen. This
// mirrors the page's layout (header, bento grid, recently-watched posters).
export default function DashboardLoading() {
  return (
    <div className="space-y-12 animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between pt-2 pb-6">
        <div className="space-y-3">
          <div className="h-8 bg-zinc-900 rounded w-56" />
          <div className="h-4 bg-zinc-900 rounded w-80" />
        </div>
        <div className="h-11 bg-zinc-900 rounded w-full md:w-96" />
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 bg-[var(--glass-card)] rounded-2xl border border-white/5" />
        <div className="h-32 bg-[var(--glass-card)] rounded-2xl border border-white/5" />
        <div className="h-72 md:col-span-2 bg-[var(--glass-card)] rounded-2xl border border-white/5" />
      </div>

      {/* Recently watched */}
      <div className="space-y-5">
        <div className="h-7 bg-zinc-900 rounded w-44" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="aspect-[2/3] bg-zinc-900 rounded-[var(--radius-xl)]" />
          ))}
        </div>
      </div>
    </div>
  )
}