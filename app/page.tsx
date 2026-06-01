import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import RatingStars from '@/components/RatingStars'

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
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-3xl font-bold text-white">{thisYearEntries?.length ?? 0}</p>
          <p className="text-sm text-gray-400 mt-1">Watched this year</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-3xl font-bold text-white">{priorityCounts.must_watch}</p>
          <p className="text-sm text-gray-400 mt-1">Must watch</p>
        </div>
        {currentShow?.media ? (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-sm text-gray-400">Currently watching</p>
            <Link href={`/show/${currentShow.media_id}`} className="font-medium text-blue-400 hover:underline line-clamp-1 mt-1 block">
              {(currentShow.media as any).title}
            </Link>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-sm text-gray-400">Currently watching</p>
            <p className="text-gray-600 text-sm mt-1">Nothing in progress</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Recently Watched</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(recent ?? []).map((entry: any) => (
            <div key={entry.id} className="bg-gray-900 rounded-xl overflow-hidden">
              {entry.media?.poster_url
                ? <img src={entry.media.poster_url} alt={entry.media.title} className="w-full aspect-[2/3] object-cover" />
                : <div className="w-full aspect-[2/3] bg-gray-700" />}
              <div className="p-2">
                <p className="text-sm font-medium text-white line-clamp-1">{entry.media?.title}</p>
                {entry.rating && <RatingStars value={entry.rating} onChange={() => {}} readOnly />}
              </div>
            </div>
          ))}
        </div>
        {(recent ?? []).length === 0 && (
          <p className="text-gray-400">Nothing watched yet. <Link href="/search" className="text-blue-400 hover:underline">Start searching.</Link></p>
        )}
      </div>
    </div>
  )
}
