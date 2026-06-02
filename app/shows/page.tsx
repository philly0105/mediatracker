'use client'
import { useState, useEffect, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import MediaCard from '@/components/MediaCard'
import MediaInfoModal from '@/components/MediaInfoModal'
import type { WatchEntry, TmdbSearchResult } from '@/types'

export default function ShowsPage() {
  const [entries, setEntries] = useState<WatchEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<WatchEntry | null>(null)

  useEffect(() => {
    fetch('/api/watch?type=show')
      .then((r) => r.json())
      .then((data) => {
        const shows = (data.entries ?? []).filter(
          (e: WatchEntry) => e.media?.type === 'show'
        )
        setEntries(shows)
      })
      .finally(() => setLoading(false))
  }, [])

  const modalItem = useMemo<TmdbSearchResult | null>(() => {
    if (!selectedEntry?.media) return null
    const m = selectedEntry.media
    return {
      tmdb_id: m.tmdb_id,
      type: m.type,
      title: m.title,
      overview: m.overview || '',
      poster_url: m.poster_url,
      release_year: m.release_year,
      genres: m.genres,
    } as TmdbSearchResult
  }, [selectedEntry])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">TV Shows</h1>
        {!loading && (
          <span className="text-zinc-500 text-sm">{entries.length} watched</span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="cursor-pointer"
                onClick={() => setSelectedEntry(entry)}
              >
                <MediaCard entry={entry} />
              </div>
            ))}
          </div>
          {entries.length === 0 && (
            <p className="text-zinc-400">
              No shows logged yet.{' '}
              <a href="/search" className="text-white underline underline-offset-2">
                Search to add one.
              </a>
            </p>
          )}
        </>
      )}

      <AnimatePresence>
        {selectedEntry && modalItem && (
          <MediaInfoModal
            item={modalItem}
            onClose={() => setSelectedEntry(null)}
            onAddToWatchlist={async () => {
              await fetch('/api/watchlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tmdb_id: selectedEntry.media!.tmdb_id,
                  type: selectedEntry.media!.type,
                  priority: 'must_watch',
                }),
              })
            }}
            onMarkAsWatched={async () => {}}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
