import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RatingStars from '@/components/RatingStars'

export default async function SharedWatchedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('user_settings')
    .select('user_id, watched_share_token')
    .eq('watched_share_token', token)
    .single()

  if (!settings) notFound()

  const { data: entries } = await supabase
    .from('watch_entries')
    .select('*, media(*)')
    .eq('user_id', settings.user_id)
    .order('watched_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Watched</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(entries ?? []).map((entry: any) => (
          <div key={entry.id} className="bg-gray-900 rounded-xl p-3 flex gap-3">
            {entry.media?.poster_url && <img src={entry.media.poster_url} alt={entry.media.title} className="w-14 rounded" />}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white line-clamp-1">{entry.media?.title}</p>
              <p className="text-xs text-zinc-400">{entry.watched_at}</p>
              {entry.rating && <RatingStars value={entry.rating} readOnly />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
