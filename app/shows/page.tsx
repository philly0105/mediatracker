'use client'
import { useState, useEffect } from 'react'
import MediaCard from '@/components/MediaCard'
import type { WatchEntry } from '@/types'

export default function ShowsPage() {
  const [entries, setEntries] = useState<WatchEntry[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">TV Shows</h1>
        {!loading && (
          <span className="text-zinc-500 text-sm">{entries.length} watched</span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {entries.map((entry) => (
              <MediaCard key={entry.id} entry={entry} hideWatchedDate={true} />
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

    </div>
  )
}
