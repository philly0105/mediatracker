'use client'
import { useState, useEffect } from 'react'
import MediaCard from '@/components/MediaCard'
import type { WatchEntry } from '@/types'
import { Input } from '@/components/ui/Input'
import { Search } from 'lucide-react'

export default function MoviesPage() {
  const [entries, setEntries] = useState<WatchEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/watch?type=movie')
      .then((r) => r.json())
      .then((data) => {
        const movies = (data.entries ?? []).filter(
          (e: WatchEntry) => e.media?.type === 'movie'
        )
        setEntries(movies)
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredEntries = entries.filter((entry) =>
    entry.media?.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Movies</h1>
          {!loading && (
            <span className="text-zinc-500 text-sm mt-1">{entries.length} watched</span>
          )}
        </div>
        {!loading && entries.length > 0 && (
          <div className="w-full sm:w-64">
            <Input
              icon={<Search className="w-4 h-4 text-zinc-500" />}
              placeholder="Search logged movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 px-3 text-sm rounded-full bg-[var(--surface-shell)]/60 border-[var(--border-subtle)] focus:border-[var(--accent)]"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 rounded-[var(--radius-md)] bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {filteredEntries.map((entry) => (
              <MediaCard key={entry.id} entry={entry} hideWatchedDate={true} />
            ))}
          </div>
          {entries.length === 0 && (
            <p className="text-zinc-400">
              No movies logged yet.{' '}
              <a href="/search" className="text-white underline underline-offset-2">
                Search to add one.
              </a>
            </p>
          )}
          {entries.length > 0 && filteredEntries.length === 0 && (
            <p className="text-zinc-400">
              No logged movies match &ldquo;{searchQuery}&rdquo;.
            </p>
          )}
        </>
      )}

    </div>
  )
}

