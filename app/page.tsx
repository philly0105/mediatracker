import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import RatingStars from '@/components/RatingStars'

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}

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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 backdrop-blur-md" style={glassCard}>
          <p className="text-3xl font-bold text-white">{thisYearEntries?.length ?? 0}</p>
          <p className="text-sm text-zinc-400 mt-1">Watched this year</p>
        </div>
        <div className="rounded-2xl p-5 backdrop-blur-md" style={glassCard}>
          <p className="text-3xl font-bold text-white">{priorityCounts.must_watch}</p>
          <p className="text-sm text-zinc-400 mt-1">Must watch</p>
        </div>
        {currentShow?.media ? (
          <div className="rounded-2xl p-5 backdrop-blur-md" style={glassCard}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Currently watching</p>
            <Link href={`/show/${currentShow.media_id}`} className="font-medium text-white hover:text-zinc-300 line-clamp-1 block transition-colors">
              {(currentShow.media as any).title}
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl p-5 backdrop-blur-md" style={glassCard}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Currently watching</p>
            <p className="text-zinc-600 text-sm">Nothing in progress</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-4">Recently Watched</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(recent ?? []).map((entry: any) => (
            <div key={entry.id} className="rounded-2xl overflow-hidden backdrop-blur-md" style={glassCard}>
              {entry.media?.poster_url
                ? <img src={entry.media.poster_url} alt={entry.media.title} className="w-full aspect-[2/3] object-cover" />
                : <div className="w-full aspect-[2/3]" style={{ background: 'rgba(255,255,255,0.05)' }} />}
              <div className="p-2.5">
                <p className="text-sm font-medium text-white line-clamp-1">{entry.media?.title}</p>
                {entry.rating && <RatingStars value={entry.rating} onChange={() => {}} readOnly />}
              </div>
            </div>
          ))}
        </div>
        {(recent ?? []).length === 0 && (
          <p className="text-zinc-400">Nothing watched yet. <Link href="/search" className="text-white underline underline-offset-2">Start searching.</Link></p>
        )}
      </div>
    </div>
  )
}
