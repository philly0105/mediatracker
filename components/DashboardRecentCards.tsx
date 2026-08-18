'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MediaInfoModal from './MediaInfoModal'
import type { WatchEntry, TmdbSearchResult } from '@/types'
import { useMediaActions } from '@/lib/useMediaActions'
import { mediaToResult } from '@/lib/mediaToResult'
import SelectableOverlay from './SelectableOverlay'
import { PosterCard } from '@/components/ui/PosterCard'
import { formatDateLabel } from '@/lib/formatDate'

interface Props {
  entries: WatchEntry[]
}

export default function DashboardRecentCards({ entries }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)

  const { addToWatchlist, markWatched } = useMediaActions({ priority: 'want_to_watch' })

  function toResult(entry: WatchEntry): TmdbSearchResult {
    const media = entry.media!
    return mediaToResult(media)
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
        {entries.map((entry) => (
          <SelectableOverlay key={entry.id} item={toResult(entry)}>
            <PosterCard
              title={entry.media?.title || ''}
              year={entry.media?.release_year ?? undefined}
              posterUrl={entry.media?.poster_url}
              rating={entry.rating}
              overlay={formatDateLabel(entry.watched_at)}
              onClick={() => setSelected(toResult(entry))}
            />
          </SelectableOverlay>
        ))}
      </div>

      {selected && (
        <MediaInfoModal
          item={selected}
          onClose={() => setSelected(null)}
          onAddToWatchlist={async () => {
            await addToWatchlist(selected.tmdb_id, selected.type)
            setSelected(null)
          }}
          onMarkAsWatched={async (opts) => {
            await markWatched(selected.tmdb_id, selected.type, opts)
            router.refresh()
            setSelected(null)
          }}
        />
      )}
    </>
  )
}
