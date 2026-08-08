'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import MediaCard from '@/components/MediaCard'
import type { WatchEntry } from '@/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FilterPills } from '@/components/FilterPills'
import { Search, RefreshCw, Loader2 } from 'lucide-react'
import { sortWatchEntries, type WatchEntrySort } from '@/lib/watchEntrySort'
import { matchesLibraryQuery } from '@/lib/matchesLibraryQuery'
import {
  filterLibraryEntries,
  distinctGenres,
  distinctDecades,
  type LibraryFilters,
} from '@/lib/libraryFilters'
import { useDeferredAction } from '@/lib/useDeferredAction'
import { useUrlFilters } from '@/lib/useUrlFilters'
import { useToast } from '@/components/ToastProvider'

// Matches the watchlist's page size.
const PAGE_SIZE = 24

const sortOptions: { id: WatchEntrySort; label: string }[] = [
  { id: 'recent', label: 'Recently watched' },
  { id: 'rating', label: 'Rating' },
  { id: 'name', label: 'Name' },
  { id: 'releaseDate', label: 'Release date' },
]

// Rating is on a 0.5–5.0 scale, so the at-or-above thresholds below are the
// small option set that fits in pill form; genre and year go in selects.
const ratingOptions: { id: string; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: '4+', label: '4+' },
  { id: '3+', label: '3+' },
  { id: '2+', label: '2+' },
  { id: 'Unrated', label: 'Unrated' },
]

// Which filters live in the URL, and their fallback values. Params are omitted
// from the URL while at their default so /movies stays /movies; `q` is the
// free-text key (default '') and so gets its URL write debounced.
const FILTER_DEFAULTS = { type: 'all', q: '', sort: 'recent', rating: 'All', genre: 'All', decade: 'All' }

export default function LibraryView() {
  const [entries, setEntries] = useState<WatchEntry[]>([])
  // Filter state now lives in the URL (via useUrlFilters) so a view is
  // bookmarkable and survives reloads; state stays the source of truth and the
  // URL is a mirror. Values are re-validated against the option sets below so
  // a malformed param in a shared link falls back to the default.
  const [filters, setFilter] = useUrlFilters(FILTER_DEFAULTS)
  const searchQuery = filters.q
  const sortBy = sortOptions.some((o) => o.id === filters.sort)
    ? (filters.sort as WatchEntrySort)
    : 'recent'
  const genreFilter = filters.genre
  const ratingFilter = ratingOptions.some((o) => o.id === filters.rating) ? filters.rating : 'All'
  const decadeFilter = filters.decade
  // The type filter splits the combined library into movies, shows, or the
  // whole set; a malformed param in a shared link falls back to 'all'.
  const typeFilter = (['all', 'movie', 'show'] as const).find((t) => t === filters.type) ?? 'all'
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { schedule, cancel } = useDeferredAction()
  const { toast } = useToast()

  const fetchEntries = useCallback(
    () =>
      // A bare /api/watch returns both types, so the type param is only added
      // when a specific filter is active.
      fetch(`/api/watch${typeFilter !== 'all' ? `?type=${typeFilter}` : ''}`)
        .then((r) => r.json())
        .then((data) => (data.entries ?? []) as WatchEntry[]),
    [typeFilter]
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

  // Deleting drops the row immediately and defers the write, so Undo just
  // cancels the pending request rather than trying to reconstruct the entry.
  const handleEntryDeleted = useCallback((entryId: string) => {
    const removed = entries.find((entry) => entry.id === entryId)
    if (!removed) return
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId))

    schedule(entryId, async () => {
      try {
        const res = await fetch('/api/watch', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: entryId }),
        })
        if (!res.ok) throw new Error('Failed to delete entry')
      } catch (err) {
        // Put it back — the row is gone from the UI but the server still has it.
        console.error(err)
        setEntries((prev) =>
          prev.some((entry) => entry.id === entryId) ? prev : [...prev, removed]
        )
        toast(`Could not remove ${removed.media?.title ?? 'that entry'}.`, { tone: 'error' })
      }
    })

    toast(`Removed ${removed.media?.title ?? 'entry'}.`, {
      tone: 'success',
      action: {
        label: 'Undo',
        onClick: () => {
          if (!cancel(entryId)) return
          setEntries((prev) =>
            prev.some((entry) => entry.id === entryId) ? prev : [...prev, removed]
          )
        },
      },
    })
  }, [entries, schedule, cancel, toast])

  // An edit can change rating, review or watched_at — any of which feeds the
  // active sort — so re-pull rather than trying to patch the row in place.
  const handleEntryUpdated = useCallback(() => {
    fetchEntries().then(setEntries)
  }, [fetchEntries])

  const genres = useMemo(() => distinctGenres(entries), [entries])
  const decades = useMemo(() => distinctDecades(entries), [entries])

  const filteredEntries = useMemo(() => {
    const filters: LibraryFilters = {
      genre: genreFilter === 'All' ? null : genreFilter,
      minRating:
        ratingFilter === 'All' || ratingFilter === 'Unrated' ? null : parseInt(ratingFilter, 10),
      unratedOnly: ratingFilter === 'Unrated',
      decade: decadeFilter === 'All' ? null : parseInt(decadeFilter, 10),
    }
    const filtered = filterLibraryEntries(entries, filters).filter((entry) =>
      matchesLibraryQuery(entry, searchQuery)
    )
    return sortWatchEntries(filtered, sortBy)
  }, [entries, searchQuery, sortBy, genreFilter, ratingFilter, decadeFilter])

  const hasActiveFilters =
    genreFilter !== 'All' ||
    ratingFilter !== 'All' ||
    decadeFilter !== 'All' ||
    searchQuery.trim() !== ''

  // Render in pages rather than all at once. The fetch stays whole-library on
  // purpose — every filter above is client-side and needs the full set — so the
  // cost worth cutting is mounting hundreds of MediaCards, each with its own
  // state and possibly its own rating request. Same 24 as the watchlist.
  const visibleEntries = filteredEntries.slice(0, visibleCount)
  const hasMore = visibleCount < filteredEntries.length

  // Any change to the result set starts the window over, so a narrowed filter
  // never leaves you scrolled past the end of a shorter list. Adjusted during
  // render rather than in an effect: React re-runs this pass immediately with
  // the new value, where an effect would paint one frame with the stale window.
  const filterKey = `${typeFilter}|${searchQuery}|${sortBy}|${genreFilter}|${ratingFilter}|${decadeFilter}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey)
    setVisibleCount(PAGE_SIZE)
  }

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((n) => n + PAGE_SIZE)
      },
      { rootMargin: '400px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Library</h1>
          {!loading && (
            <span className="text-zinc-500 text-sm mt-1">
              {hasActiveFilters
                ? `${filteredEntries.length} of ${entries.length} watched`
                : `${entries.length} watched`}
            </span>
          )}
        </div>
        {/* The type pills must survive an empty result set: filtering to a type
            with nothing in it would otherwise remove the only way back. */}
        {!loading && (entries.length > 0 || typeFilter !== 'all') && (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <FilterPills
              options={[{ id: 'all', label: 'All' }, { id: 'movie', label: 'Movies' }, { id: 'show', label: 'Shows' }]}
              active={typeFilter}
              onSelect={(id) => setFilter('type', id)}
            />
            <FilterPills options={sortOptions} active={sortBy} onSelect={(id) => setFilter('sort', id)} />
            <FilterPills options={ratingOptions} active={ratingFilter} onSelect={(id) => setFilter('rating', id)} />
            <select
              value={genreFilter}
              onChange={(e) => setFilter('genre', e.target.value)}
              className="px-4 py-2 rounded-sm bg-[var(--surface-input)] border border-[var(--border-default)] text-sm font-semibold text-white focus:outline-none focus:border-[var(--border-focus)] appearance-none min-w-[140px]"
            >
              <option value="All" className="bg-[var(--bg-void)]">All Genres</option>
              {genres.map((g) => (
                <option key={g} value={g} className="bg-[var(--bg-void)]">{g}</option>
              ))}
            </select>
            <select
              value={decadeFilter}
              onChange={(e) => setFilter('decade', e.target.value)}
              className="px-4 py-2 rounded-sm bg-[var(--surface-input)] border border-[var(--border-default)] text-sm font-semibold text-white focus:outline-none focus:border-[var(--border-focus)] appearance-none min-w-[120px]"
            >
              <option value="All" className="bg-[var(--bg-void)]">All Years</option>
              {decades.map((d) => (
                <option key={d} value={String(d)} className="bg-[var(--bg-void)]">{d}s</option>
              ))}
            </select>
            <div className="w-full sm:w-64">
              <Input
                icon={<Search className="w-4 h-4 text-zinc-500" />}
                placeholder="Search titles, director, cast..."
                value={searchQuery}
                onChange={(e) => setFilter('q', e.target.value)}
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
            {visibleEntries.map((entry) => (
              <MediaCard
                key={entry.id}
                entry={entry}
                hideWatchedDate={true}
                onDeleted={handleEntryDeleted}
                onUpdated={handleEntryUpdated}
              />
            ))}
          </div>
          {hasMore && (
            <div ref={sentinelRef} className="h-20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          )}
          {entries.length === 0 && (
            <p className="text-zinc-400">
              No {typeFilter === 'movie' ? 'movies' : typeFilter === 'show' ? 'shows' : 'titles'} logged yet.{' '}
              <a href="/search" className="text-white underline underline-offset-2">
                Search to add one.
              </a>
            </p>
          )}
          {entries.length > 0 && filteredEntries.length === 0 && (
            <p className="text-zinc-400">
              No logged titles match
              {searchQuery.trim()
                ? ` "${searchQuery}".`
                : ' the active filters.'}
            </p>
          )}
        </>
      )}

    </div>
  )
}
