import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RatingStars from '@/components/RatingStars'
import type { SharedWatchedRow, Media } from '@/types'

export default async function SharedWatchedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: rows, error } = await supabase.rpc('shared_watched', { p_token: token })

  // Zero rows = token matches nothing (404). A valid-but-empty share returns a
  // marker row with id null, which we filter out below.
  if (error || !rows || rows.length === 0) notFound()
  const typedRows = (rows ?? []) as unknown as SharedWatchedRow[]
  const entries = typedRows.filter((r): r is SharedWatchedRow & { media: Media } => Boolean(r.media))

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Watched</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map((entry, idx: number) => (
          <div key={`${entry.media?.id ?? 'entry'}-${entry.watched_at ?? ''}-${idx}`} className="bg-gray-900 rounded-xl p-3 flex gap-3">
            {entry.media?.poster_url && <Image src={entry.media.poster_url} alt={entry.media.title} width={56} height={84} className="w-14 h-auto rounded" />}
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
