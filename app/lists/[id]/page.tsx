import { createClient } from '@/lib/supabase/server'
import type { ListItem } from '@/types'
import { notFound } from 'next/navigation'

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: list } = await supabase.from('lists').select('*').eq('id', id).single()
  if (!list) notFound()

  const { data: items } = await supabase
    .from('list_items')
    .select('*, media(*)')
    .eq('list_id', id)
    .order('added_at', { ascending: false })

  const shareUrl = list.is_shared
    ? `${process.env.NEXT_PUBLIC_APP_URL}/share/list/${list.share_token}`
    : null

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{list.name}</h1>
        {shareUrl && (
          <a href={shareUrl} target="_blank" rel="noopener" className="text-sm text-blue-400 hover:underline">
            Share link ↗
          </a>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(items ?? []).map((item: ListItem & { media?: any }) => (
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
      {(items ?? []).length === 0 && <p className="text-gray-400">No items in this list yet.</p>}
    </div>
  )
}
