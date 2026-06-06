'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RatingStars from './RatingStars'
import MediaInfoModal from './MediaInfoModal'
import type { WatchEntry, TmdbSearchResult } from '@/types'
import SelectableOverlay from './SelectableOverlay'

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {entries.map((entry) => (
          <SelectableOverlay key={entry.id} item={toResult(entry)}>
          <button
            onClick={() => setSelected(toResult(entry))}
            className="glass-card rounded-2xl overflow-hidden group hover:scale-[1.02] text-left transition-transform duration-200 h-full w-full"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900 border-b border-white/5">
              {entry.media?.poster_url ? (
                <img
                  src={entry.media.poster_url}
                  alt={entry.media.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                  No Poster
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                <span className="text-[10px] font-semibold text-zinc-400 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/5">
                  {entry.watched_at}
                </span>
              </div>
            </div>
            <div className="p-3.5 space-y-1.5">
              <p className="text-sm font-semibold text-white line-clamp-1 group-hover:text-violet-400 transition-colors">
                {entry.media?.title}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">{entry.media?.release_year}</span>
                {entry.rating && (
                  <div className="scale-75 origin-right">
                    <RatingStars value={entry.rating} readOnly />
                  </div>
                )}
              </div>
            </div>
          </button>
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
