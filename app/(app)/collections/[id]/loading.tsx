// /collections/[id] blocks on a TMDB collection-detail fetch plus a couple of DB
// reads before it can render, so it gets a skeleton matching the page: a back
// button, a hero banner, and the poster grid. Same animate-pulse style as the
// calendar's loading state.
export default function CollectionLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-5 bg-zinc-900 rounded w-32" />

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="w-full h-48 sm:h-64 bg-zinc-900" />
      </div>

      <div className="h-6 bg-zinc-900 rounded w-72" />

      {/* Movie grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
          <div key={i} className="aspect-[2/3] bg-zinc-900 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}