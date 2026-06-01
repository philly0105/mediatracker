import { createClient } from '@/lib/supabase/server'
import type { WatchlistItem } from '@/types'

const PRIORITY_LABELS = {
  must_watch: 'Must Watch',
  want_to_watch: 'Want to Watch',
  someday: 'Someday',
}
const PRIORITY_ORDER: Array<keyof typeof PRIORITY_LABELS> = ['must_watch', 'want_to_watch', 'someday']

export default async function WatchlistPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('watchlist_items')
    .select('*, media(*)')
    .order('added_at', { ascending: false })

  const grouped = PRIORITY_ORDER.reduce((acc, p) => {
    acc[p] = (items ?? []).filter((i: any) => i.priority === p)
    return acc
  }, {} as Record<string, WatchlistItem[]>)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Watchlist</h1>
      {PRIORITY_ORDER.map(priority => (
        <div key={priority}>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">
            {PRIORITY_LABELS[priority]}
            <span className="ml-2 text-sm font-normal text-gray-500">{grouped[priority].length}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[priority].map((item: any) => (
              <div key={item.id} className="bg-gray-900 rounded-xl p-3 flex gap-3">
                {item.media?.poster_url
                  ? <img src={item.media.poster_url} alt={item.media.title} className="w-14 rounded" />
                  : <div className="w-14 h-20 bg-gray-700 rounded" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white line-clamp-1">{item.media?.title}</p>
                  <p className="text-xs text-gray-400">{item.media?.release_year} · {item.media?.type === 'show' ? 'TV' : 'Movie'}</p>
                </div>
              </div>
            ))}
          </div>
          {grouped[priority].length === 0 && (
            <p className="text-gray-600 text-sm">Nothing here yet.</p>
          )}
        </div>
      ))}
    </div>
  )
}
