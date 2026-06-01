import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function SharedListPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: list } = await supabase
    .from('lists')
    .select('*, list_items(*, media(*))')
    .eq('share_token', token)
    .eq('is_shared', true)
    .single()

  if (!list) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">{list.name}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(list.list_items ?? []).map((item: any) => (
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
}
