'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import MediaCard from '@/components/MediaCard'
import type { WatchEntry } from '@/types'
import { Input } from '@/components/ui/Input'
import { FilterPills } from '@/components/FilterPills'
import { Select } from '@/components/ui/Select'
import { Search, RefreshCw, Loader2, List, LayoutGrid, Clapperboard, SearchX } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ClearFilters } from '@/components/ui/ClearFilters'
import { SectionError } from '@/components/ui/SectionError'
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
import { openSearchOverlay } from '@/lib/searchOverlayBus'
import { useToast } from '@/components/ToastProvider'

// Matches the watchlist's page size.
const PAGE_SIZE = 24

// How stale the list has to be before returning to the tab re-pulls it, and
// before a cached list is re-pulled on navigating back here.
const REFETCH_STALE_MS = 30_000

// Survives unmount so navigating away and back does not re-download the whole
// library — /api/watch returns every entry, paged past PostgREST's 1000-row cap,
// which is several sequential DB round trips on a large library. Same
// module-level pattern as lib/useLibraryIds.ts.
//
// ponytail: one slot, not a map keyed by type. Switching the type pill just
// misses and refetches, exactly as it did before this cache existed. A map
// would also have to keep the three types consistent with each other after a
// delete, which is a lot of bookkeeping for a filter you flip far less often
// than you navigate away and come back.
let cached: { type: string; entries: WatchEntry[]; at: number } | null = null

function readCache(type: string) {
  return cached?.type === type ? cached : null
}

/**
 * Drops the cache. Module state outlives any single render, so a test file that
 * mounts LibraryView more than once has the first case's entries seeded into
 * every case after it — which reads as "the fetch never fired". Nothing in the
 * app calls this: there is no sign-out, so no in-app path swaps users without a
 * full page load that clears the module anyway.
 */
export function __resetEntryCache() {
  cached = null
}

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
const FILTER_DEFAULTS = { type: 'all', q: '', sort: 'recent', rating: 'All', genre: 'All', decade: 'All', view: 'list' }

export interface LibraryViewProps {
  initialEntries?: WatchEntry[]
  initialType?: 'all' | 'movie' | 'show'
  initialFetchedAt?: number
}

export default function LibraryView({
  initialEntries,
  initialType,
  initialFetchedAt,
}: LibraryViewProps = {}) {
  // Filter state now lives in the URL (via useUrlFilters) so a view is
  // bookmarkable and survives reloads; state stays the source of truth and the
  // URL is a mirror. Values are re-validated against the option sets below so
  // a malformed param in a shared link falls back to the default.
  const [filters, setFilter, resetFilters] = useUrlFilters(FILTER_DEFAULTS)
  const searchQuery = filters.q
  const sortBy = sortOptions.some((o) => o.id === filters.sort)
    ? (filters.sort as WatchEntrySort)
    : 'recent'
  const genreFilter = filters.genre
  const ratingFilter = ratingOptions.some((o) => o.id === filters.rating) ? filters.rating : 'All'
  const decadeFilter = filters.decade
  // The view toggle switches the card layout between the detailed row (default)
  // and the poster wall; a malformed param in a shared link falls back to 'list'.
  const view = filters.view === 'grid' ? 'grid' : 'list'
  // The type filter splits the combined library into movies, shows, or the
  // whole set; a malformed param in a shared link falls back to 'all'.
  const typeFilter = (['all', 'movie', 'show'] as const).find((t) => t === filters.type) ?? 'all'

  const isMatchingSeed =
    initialType !== undefined &&
    initialType === typeFilter &&
    initialEntries !== undefined

  // Seeded from the cache or server props so a return visit or initial load paints the list
  // on the first frame instead of a skeleton. Declared after typeFilter because it reads it.
  const [entries, setEntries] = useState<WatchEntry[]>(() => {
    if (isMatchingSeed) {
      if (!cached || (initialFetchedAt !== undefined && initialFetchedAt > cached.at)) {
        cached = {
          type: initialType,
          entries: initialEntries,
          at: initialFetchedAt ?? 0,
        }
      }
      return initialEntries
    }
    return readCache(typeFilter)?.entries ?? []
  })
  const [loading, setLoading] = useState(() => {
    if (isMatchingSeed) return false
    return !readCache(typeFilter)
  })
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const lastFetchedAt = useRef(
    isMatchingSeed
      ? (initialFetchedAt ?? 0)
      : (readCache(typeFilter)?.at ?? 0)
  )
  const loadedTypeRef = useRef<string | null>(
    isMatchingSeed ? initialType : (readCache(typeFilter)?.type ?? null)
  )
  const requestGenRef = useRef(0)
  const inFlightRef = useRef<{
    type: string
    gen: number
    promise: Promise<WatchEntry[]>
  } | null>(null)

  const { schedule, cancel } = useDeferredAction()
  const { toast } = useToast()

  const fetchEntries = useCallback(
    async () => {
      // A bare /api/watch returns both types, so the type param is only added
      // when a specific filter is active.
      const res = await fetch(`/api/watch${typeFilter !== 'all' ? `?type=${typeFilter}` : ''}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch library entries: ${res.status}`)
      }
      const data = await res.json()
      return (data.entries ?? []) as WatchEntry[]
    },
    [typeFilter]
  )

  useEffect(() => {
    const hit = readCache(typeFilter)
    if (hit && hit.at > 0 && Date.now() - hit.at < REFETCH_STALE_MS) return

    const gen = ++requestGenRef.current
    const targetType = typeFilter
    const fetchTime = Date.now()
    const promise = fetchEntries()
    inFlightRef.current = { type: targetType, gen, promise }

    promise
      .then((data) => {
        if (gen !== requestGenRef.current || targetType !== typeFilter) return
        loadedTypeRef.current = targetType
        lastFetchedAt.current = fetchTime
        setLoadError(null)
        setEntries(data)
      })
      .catch((err) => {
        if (gen !== requestGenRef.current || targetType !== typeFilter) return
        setLoadError(err instanceof Error ? err : new Error('Failed to load library'))
      })
      .finally(() => {
        if (inFlightRef.current?.gen === gen) {
          inFlightRef.current = null
        }
        if (gen === requestGenRef.current) {
          setLoading(false)
        }
      })

    return () => {
      requestGenRef.current += 1
      if (inFlightRef.current?.gen === gen) {
        inFlightRef.current = null
      }
    }
  }, [fetchEntries, typeFilter])

  // One mirror instead of writing the cache at each of the ten setEntries call
  // sites — deletes, undo restores and refetches all land here. Gated on a real
  // fetch having happened: without it the first render caches the empty initial
  // array, and a remount before that fetch resolved would read the empty set as
  // a hit and paint "nothing watched yet" instead of the skeleton.
  useEffect(() => {
    if (lastFetchedAt.current === 0 || loadedTypeRef.current !== typeFilter) return
    cached = { type: typeFilter, entries, at: lastFetchedAt.current }
  }, [entries, typeFilter])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    setLoadError(null)
    const gen = ++requestGenRef.current
    const targetType = typeFilter
    const fetchTime = Date.now()
    const promise = fetchEntries()
    inFlightRef.current = { type: targetType, gen, promise }

    promise
      .then((data) => {
        if (gen !== requestGenRef.current || targetType !== typeFilter) return
        loadedTypeRef.current = targetType
        lastFetchedAt.current = fetchTime
        setLoadError(null)
        setEntries(data)
      })
      .catch((err) => {
        if (gen !== requestGenRef.current || targetType !== typeFilter) return
        if (entries.length === 0) {
          setLoadError(err instanceof Error ? err : new Error('Failed to load library'))
        }
        toast('Could not refresh library.', { tone: 'error' })
      })
      .finally(() => {
        if (inFlightRef.current?.gen === gen) {
          inFlightRef.current = null
        }
        setRefreshing(false)
      })
  }, [fetchEntries, typeFilter, toast, entries.length])

  // The list is fetched once into client state, so router.refresh() cannot
  // reach it: an entry edited on a show page, in another tab, or on a phone
  // would sit stale here until a manual reload. Refetching when the tab comes
  // back to the foreground is what makes the Refresh button a fallback rather
  // than something you have to remember to press.
  //
  // Gated on staleness: the response is the whole library, so an ungated
  // listener re-downloaded all of it on every alt-tab. Nothing changes that
  // fast, and the Refresh button covers the impatient case.
  useEffect(() => {
    function refetchIfVisible() {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastFetchedAt.current < REFETCH_STALE_MS) return
      if (inFlightRef.current && inFlightRef.current.type === typeFilter) return

      const gen = ++requestGenRef.current
      const targetType = typeFilter
      const fetchTime = Date.now()
      const promise = fetchEntries()
      inFlightRef.current = { type: targetType, gen, promise }

      promise
        .then((data) => {
          if (gen !== requestGenRef.current || targetType !== typeFilter) return
          loadedTypeRef.current = targetType
          lastFetchedAt.current = fetchTime
          setEntries(data)
        })
        .catch(() => {})
        .finally(() => {
          if (inFlightRef.current?.gen === gen) {
            inFlightRef.current = null
          }
        })
    }
    document.addEventListener('visibilitychange', refetchIfVisible)
    window.addEventListener('focus', refetchIfVisible)
    return () => {
      document.removeEventListener('visibilitychange', refetchIfVisible)
      window.removeEventListener('focus', refetchIfVisible)
    }
  }, [fetchEntries, typeFilter])

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
          if (!cancel(entryId)) {
            toast('Too late to undo — that entry has already been removed.', { tone: 'info' })
            return
          }
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
    const gen = ++requestGenRef.current
    const targetType = typeFilter
    const fetchTime = Date.now()
    const promise = fetchEntries()
    inFlightRef.current = { type: targetType, gen, promise }

    promise
      .then((data) => {
        if (gen !== requestGenRef.current || targetType !== typeFilter) return
        loadedTypeRef.current = targetType
        lastFetchedAt.current = fetchTime
        setEntries(data)
      })
      .catch(() => {
        // Handled: no unhandled promise rejection if re-pull after edit fails
      })
      .finally(() => {
        if (inFlightRef.current?.gen === gen) {
          inFlightRef.current = null
        }
      })
  }, [fetchEntries, typeFilter])

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
      {/* The filter bank is nine controls wide, so it gets its own row beneath
          the title instead of competing with it for the header line. */}
      <div>
        <PageHeader
          eyebrow="Everything watched"
          title="Library"
          sub={loading ? undefined : (
            hasActiveFilters
              ? `${filteredEntries.length} of ${entries.length} watched`
              : `${entries.length} watched`
          )}
          selectable
        />
        {/* The type pills must survive an empty result set: filtering to a type
            with nothing in it would otherwise remove the only way back. */}
        {!loading && (entries.length > 0 || typeFilter !== 'all') && (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <FilterPills
              options={[{ id: 'all', label: 'All' }, { id: 'movie', label: 'Movies' }, { id: 'show', label: 'Shows' }]}
              active={typeFilter}
              onSelect={(id) => setFilter('type', id)}
            />
            <FilterPills options={sortOptions} active={sortBy} onSelect={(id) => setFilter('sort', id)} />
            <FilterPills options={ratingOptions} active={ratingFilter} onSelect={(id) => setFilter('rating', id)} />
            <Select
              label="Filter by genre"
              value={genreFilter}
              onChange={(e) => setFilter('genre', e.target.value)}
              className="min-w-[140px]"
            >
              <option value="All" className="bg-[var(--bg-void)]">All Genres</option>
              {genres.map((g) => (
                <option key={g} value={g} className="bg-[var(--bg-void)]">{g}</option>
              ))}
            </Select>
            <Select
              label="Filter by decade"
              value={decadeFilter}
              onChange={(e) => setFilter('decade', e.target.value)}
              className="min-w-[120px]"
            >
              <option value="All" className="bg-[var(--bg-void)]">All Years</option>
              {decades.map((d) => (
                <option key={d} value={String(d)} className="bg-[var(--bg-void)]">{d}s</option>
              ))}
            </Select>
            <div className="w-full sm:w-64">
              <Input
                icon={<Search className="w-4 h-4 text-zinc-500" />}
                aria-label="Search your library"
                placeholder="Search titles, director, cast..."
                value={searchQuery}
                onChange={(e) => setFilter('q', e.target.value)}
                className="h-9 px-3 text-sm rounded-full bg-[var(--surface-shell)]/60 border-[var(--border-subtle)] focus:border-[var(--accent)]"
              />
            </div>
            {/* Resets exactly the controls hasActiveFilters reports on, so the
                chip's presence and its effect stay in step. Type, sort and the
                grid/list toggle are view preferences, not narrowing filters,
                and survive the clear. */}
            {hasActiveFilters && (
              <ClearFilters onClear={() => resetFilters(['q', 'genre', 'rating', 'decade'])} />
            )}
            <div className="inline-flex p-1 rounded-sm bg-[var(--surface-input)] border border-[var(--border-subtle)] self-start">
              <button
                type="button"
                onClick={() => setFilter('view', 'list')}
                aria-label="List view"
                aria-pressed={view === 'list'}
                className={`p-1.5 rounded-sm transition-colors ${view === 'list' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setFilter('view', 'grid')}
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
                className={`p-1.5 rounded-sm transition-colors ${view === 'grid' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            {/* Demoted to an icon now that the list refetches on focus — a
                labelled "Refresh" in a filter row reads as an admission that
                the page might be lying to you. */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label={refreshing ? 'Refreshing library' : 'Refresh library'}
              title="Refresh"
              className="p-1.5 rounded-sm text-zinc-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {loadError && entries.length === 0 ? (
        <SectionError
          error={loadError}
          reset={() => {
            setLoadError(null)
            handleRefresh()
          }}
          title="Could not load library"
          message="We couldn't fetch your library entries. Check your connection and try again."
        />
      ) : loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 rounded-[var(--radius-md)] bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {visibleEntries.map((entry) => (
                <MediaCard
                  key={entry.id}
                  entry={entry}
                  view="poster"
                  onDeleted={handleEntryDeleted}
                  onUpdated={handleEntryUpdated}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 12 }}>
              {visibleEntries.map((entry) => (
                <MediaCard
                  key={entry.id}
                  entry={entry}
                  onDeleted={handleEntryDeleted}
                  onUpdated={handleEntryUpdated}
                />
              ))}
            </div>
          )}
          {hasMore && (
            <div ref={sentinelRef} className="h-20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          )}
          {entries.length === 0 && (
            <EmptyState
              icon={Clapperboard}
              title={`No ${typeFilter === 'movie' ? 'movies' : typeFilter === 'show' ? 'shows' : 'titles'} logged yet`}
              hint="Everything you mark as watched lands here — films, shows and the episodes you tick off along the way."
              actionLabel="Search to add one"
              onAction={openSearchOverlay}
            />
          )}
          {entries.length > 0 && filteredEntries.length === 0 && (
            <EmptyState
              size="compact"
              icon={SearchX}
              title={
                searchQuery.trim()
                  ? `No logged titles match "${searchQuery}"`
                  : 'No logged titles match the active filters'
              }
              hint="Widen the filters, or clear them to see everything you have logged."
              actionLabel="Clear filters"
              onAction={() => resetFilters(['q', 'genre', 'rating', 'decade'])}
            />
          )}
        </>
      )}

    </div>
  )
}
