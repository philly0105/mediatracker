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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
        {entries.map((entry) => (
          <SelectableOverlay key={entry.id} item={toResult(entry)}>
            <button
              onClick={() => setSelected(toResult(entry))}
              className="relative w-full overflow-hidden rounded-[20px] bg-zinc-950 border border-white/5 shadow-xl transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] group text-left h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"></div>
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900 z-10">
                {entry.media?.poster_url ? (
                  <img
                    src={entry.media.poster_url}
                    alt={entry.media.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                    No Poster
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4">
                  <span className="text-[10px] font-bold text-white bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
                    {entry.watched_at}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-2 relative z-10 bg-black/40 backdrop-blur-md border-t border-white/5">
                <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-violet-300 transition-colors">
                  {entry.media?.title}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500">{entry.media?.release_year}</span>
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
