import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import RatingStars from '@/components/RatingStars'
import { Calendar, Flame, Play, Clock, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: recent },
    { data: watchlistCounts },
    { data: thisYearEntries },
    { data: inProgress },
  ] = await Promise.all([
    supabase.from('watch_entries').select('*, media(*)').order('created_at', { ascending: false }).limit(5),
    supabase.from('watchlist_items').select('priority'),
    supabase.from('watch_entries').select('id').gte('watched_at', `${new Date().getFullYear()}-01-01`),
    supabase.from('watch_entries').select('*, media(*)').order('watched_at', { ascending: false }).limit(10),
  ])

  const priorityCounts = { must_watch: 0, want_to_watch: 0, someday: 0 }
  for (const item of (watchlistCounts ?? [])) {
    priorityCounts[item.priority as keyof typeof priorityCounts]++
  }

  const currentShow = (inProgress ?? []).find((e: any) => e.media?.type === 'show')

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-400">
          Your personal media collection and viewing analytics.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1: Watched this Year */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors duration-300" />
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-400">Watched this year</p>
            <Calendar className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-4xl font-extrabold text-white mt-3 tracking-tight">
            {thisYearEntries?.length ?? 0}
          </p>
        </div>

        {/* Stat 2: Must Watch */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-colors duration-300" />
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-400">Must Watch</p>
            <Flame className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-4xl font-extrabold text-white mt-3 tracking-tight">
            {priorityCounts.must_watch}
          </p>
        </div>

        {/* Stat 3: Currently Watching */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors duration-300" />
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-400">Currently watching</p>
            <Play className="w-5 h-5 text-rose-400 fill-rose-400/10" />
          </div>
          {currentShow?.media ? (
            <div className="mt-3">
              <Link
                href={`/show/${currentShow.media_id}`}
                className="font-semibold text-white hover:text-rose-400 transition-colors line-clamp-1 block text-lg tracking-tight"
              >
                {(currentShow.media as any).title}
              </Link>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Last updated {currentShow.watched_at}</span>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm mt-4 italic">No shows in progress</p>
          )}
        </div>
      </div>

      {/* Recently Watched */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Recently Watched
          </h2>
          <Link
            href="/movies"
            className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors group"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {(recent ?? []).map((entry: any) => (
            <div
              key={entry.id}
              className="glass-card rounded-2xl overflow-hidden group hover:scale-[1.02]"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900 border-b border-white/5">
                {entry.media?.poster_url ? (
                  <img
                    src={entry.media.poster_url}
                    alt={entry.media.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    No Poster
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <span className="text-[10px] font-semibold text-zinc-400 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/5">
                    {entry.watched_at}
                  </span>
                </div>
              </div>
              <div className="p-3.5 space-y-1.5">
                <p className="text-sm font-semibold text-white line-clamp-1 group-hover:text-violet-400 transition-colors">
                  {entry.media?.title}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{entry.media?.release_year}</span>
                  {entry.rating && (
                    <div className="scale-75 origin-right">
                      <RatingStars value={entry.rating} onChange={() => {}} readOnly />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {(recent ?? []).length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center border border-dashed border-white/10">
            <p className="text-zinc-400 text-sm">Nothing watched yet.</p>
            <Link
              href="/search"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
            >
              <span>Start searching</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

