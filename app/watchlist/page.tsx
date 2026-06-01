import { createClient } from '@/lib/supabase/server'
import type { WatchlistItem } from '@/types'

const PRIORITY_LABELS = {
  must_watch: 'Must Watch',
  want_to_watch: 'Want to Watch',
  someday: 'Someday',
}
const PRIORITY_ORDER: Array<keyof typeof PRIORITY_LABELS> = ['must_watch', 'want_to_watch', 'someday']

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}

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
      <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
      {PRIORITY_ORDER.map(priority => (
        <div key={priority}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-white">
              {PRIORITY_LABELS[priority]}
            </h2>
            <span className="text-xs text-zinc-500 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {grouped[priority].length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[priority].map((item: any) => (
              <div key={item.id} className="rounded-2xl p-3 flex gap-3 backdrop-blur-md" style={glassCard}>
                {item.media?.poster_url
                  ? <img src={item.media.poster_url} alt={item.media.title} className="w-14 rounded-xl object-cover" />
                  : <div className="w-14 h-20 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white line-clamp-1">{item.media?.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {item.media?.release_year} · {item.media?.type === 'show' ? 'TV' : 'Movie'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {grouped[priority].length === 0 && (
            <p className="text-zinc-600 text-sm">Nothing here yet.</p>
          )}
        </div>
      ))}
    </div>
  )
}
