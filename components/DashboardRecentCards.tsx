'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MediaInfoModal from './MediaInfoModal'
import type { WatchEntry, TmdbSearchResult } from '@/types'
import SelectableOverlay from './SelectableOverlay'
import { PosterCard } from '@/components/ui/PosterCard'

interface Props {
  entries: WatchEntry[]
}

export default function DashboardRecentCards({ entries }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)

  function toResult(entry: WatchEntry): TmdbSearchResult {
    const media = entry.media!
    return {
      tmdb_id: media.tmdb_id,
      type: media.type,
      title: media.title,
      overview: media.overview ?? '',
      poster_url: media.poster_url,
      release_year: media.release_year,
      genres: media.genres,
    }
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
              overlay={entry.watched_at}
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
            await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, priority: 'want_to_watch' }),
            })
            setSelected(null)
          }}
          onMarkAsWatched={async () => {
            await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, watched_at: new Date().toISOString().split('T')[0] }),
            })
            router.refresh()
            setSelected(null)
          }}
        />
      )}
    </>
  )
}
