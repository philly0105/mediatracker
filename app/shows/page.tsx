'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import MediaCard from '@/components/MediaCard'
import type { WatchEntry } from '@/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, RefreshCw, Loader2 } from 'lucide-react'
import { sortWatchEntries, type WatchEntrySort } from '@/lib/watchEntrySort'

const sortOptions: { id: WatchEntrySort; label: string }[] = [
  { id: 'recent', label: 'Recently watched' },
  { id: 'rating', label: 'Rating' },
  { id: 'name', label: 'Name' },
  { id: 'releaseDate', label: 'Release date' },
]

export default function ShowsPage() {
  const [entries, setEntries] = useState<WatchEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<WatchEntrySort>('recent')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchEntries = useCallback(
    () =>
      fetch('/api/watch?type=show')
        .then((r) => r.json())
        .then((data) =>
          ((data.entries ?? []) as WatchEntry[]).filter(
            (e) => e.media?.type === 'show'
          )
        ),
    []
  )

  useEffect(() => {
    fetchEntries()
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [fetchEntries])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    fetchEntries()
      .then(setEntries)
      .finally(() => setRefreshing(false))
  }, [fetchEntries])

  const filteredEntries = useMemo(() => {
    const filtered = entries.filter((entry) =>
      entry.media?.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    return sortWatchEntries(filtered, sortBy)
  }, [entries, searchQuery, sortBy])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">TV Shows</h1>
          {!loading && (
            <span className="text-zinc-500 text-sm mt-1">{entries.length} watched</span>
          )}
        </div>
        {!loading && entries.length > 0 && (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="flex flex-wrap items-center gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSortBy(option.id)}
                  aria-pressed={sortBy === option.id}
                  className={`relative px-3 py-2 rounded-sm font-semibold text-xs transition-all duration-300 whitespace-nowrap active:scale-95 ${
                    sortBy === option.id
                      ? 'text-white bg-[var(--accent)] border border-transparent shadow-lg shadow-green-600/20'
                      : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="w-full sm:w-64">
              <Input
                icon={<Search className="w-4 h-4 text-zinc-500" />}
                placeholder="Search logged shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 px-3 text-sm rounded-full bg-[var(--surface-shell)]/60 border-[var(--border-subtle)] focus:border-[var(--accent)]"
              />
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="ghost"
              size="sm"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
            </Button>
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
              No shows logged yet.{' '}
              <a href="/search" className="text-white underline underline-offset-2">
                Search to add one.
              </a>
            </p>
          )}
          {entries.length > 0 && filteredEntries.length === 0 && (
            <p className="text-zinc-400">
              No logged shows match &ldquo;{searchQuery}&rdquo;.
            </p>
          )}
        </>
      )}

    </div>
  )
}

