// The calendar used to fetch client-side and render this skeleton while it waited.
// Now that the page fetches on the server, the same skeleton belongs here — without
// it, navigating to /calendar blocks on TMDB behind a blank screen.
export default function CalendarLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-4">
          <div className="h-6 bg-zinc-900 rounded w-48" />
          <div className="space-y-3">
            {[1, 2].map((j) => (
              <div key={j} className="rounded-lg p-4 flex gap-4 border border-white/5 bg-[var(--glass-card)]">
                <div className="w-16 h-24 bg-zinc-900 rounded-[var(--radius-xl)] shrink-0" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 bg-zinc-900 rounded w-1/3" />
                  <div className="h-3 bg-zinc-900 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
