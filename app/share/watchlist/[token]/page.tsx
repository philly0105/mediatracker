import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

const PRIORITY_LABELS = { must_watch: 'Must Watch', want_to_watch: 'Want to Watch', someday: 'Someday' }

export default async function SharedWatchlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('user_settings')
    .select('user_id, watchlist_share_token')
    .eq('watchlist_share_token', token)
    .single()

  if (!settings) notFound()

  const { data: items } = await supabase
    .from('watchlist_items')
    .select('*, media(*)')
    .eq('user_id', settings.user_id)
    .order('added_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Watchlist</h1>
      {(['must_watch', 'want_to_watch', 'someday'] as const).map(priority => {
        const group = (items ?? []).filter((i: any) => i.priority === priority)
        if (group.length === 0) return null
        return (
          <div key={priority}>
            <h2 className="text-lg font-semibold text-gray-300 mb-3">{PRIORITY_LABELS[priority]}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.map((item: any) => (
                <div key={item.id} className="bg-gray-900 rounded-xl p-3 flex gap-3">
                  {item.media?.poster_url && <img src={item.media.poster_url} alt={item.media.title} className="w-14 rounded" />}
                  <div>
                    <p className="font-medium text-white">{item.media?.title}</p>
                    <p className="text-xs text-gray-400">{item.media?.release_year}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
