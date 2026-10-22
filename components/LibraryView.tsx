'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import MediaCard from '@/components/MediaCard'
import type { WatchEntry } from '@/types'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Search, RefreshCw, Loader2, List, LayoutGrid, Clapperboard, SearchX, SlidersHorizontal, CheckSquare, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import LibraryFilterDrawer from '@/components/LibraryFilterDrawer'
import { SectionError } from '@/components/ui/SectionError'
import { useOptionalMultiSelect } from '@/components/MultiSelectProvider'
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

// The grid/list toggle's segments: 36px inside the inset track, as in
// SegmentedControl, so the pair clears the 44px target as one control.
const VIEW_TOGGLE =
  'flex items-center justify-center w-9 h-9 rounded-[var(--radius-thumb)] transition-colors duration-200'
const VIEW_TOGGLE_ON =
  'text-[var(--text-primary)] bg-[var(--btn-ghost-bg)] shadow-[var(--glass-btn-edge)] forced-colors:forced-color-adjust-none forced-colors:bg-[color:Highlight] forced-colors:text-[color:HighlightText]'
const VIEW_TOGGLE_OFF =
  'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-fill-hover)]'

// The poster wall: two across on a phone, three at the tablet breakpoint, five
// or six on a wide desktop, with the gap opening from 16 to 24 past phones.
const POSTER_GRID = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6'
// The row list: as many 320px-plus rows across as fit, never narrower than the
// container.
const ROW_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3'

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
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
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
  // The Select/Done pill sits in the toolbar beside the view toggle; null when
  // rendered outside the provider, in which case the pill is simply absent.
  const multiSelect = useOptionalMultiSelect()

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

  const activeFilterCount =
    (searchQuery.trim() !== '' ? 1 : 0) +
    (genreFilter !== 'All' ? 1 : 0) +
    (ratingFilter !== 'All' ? 1 : 0) +
    (decadeFilter !== 'All' ? 1 : 0)

  const hasActiveFilters = activeFilterCount > 0

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

  // The narrowing filters that live in the drawer, surfaced as removable chips
  // on the toolbar so you can see (and undo) what the drawer did without
  // reopening it. The search text is not here: the field itself shows it.
  const activeChips = [
    genreFilter !== 'All' && { key: 'genre', label: genreFilter },
    ratingFilter !== 'All' && {
      key: 'rating',
      label: ratingFilter === 'Unrated' ? 'Unrated' : `Rated ${ratingFilter}`,
    },
    decadeFilter !== 'All' && { key: 'decade', label: `${decadeFilter}s` },
  ].filter((chip): chip is { key: string; label: string } => chip !== false)

  return (
    <div className="space-y-6">
      {/* The filter bank is nine controls wide, so it gets its own glass
          toolbar beneath the title instead of competing with it for the
          header line. It is one of the page's few blurred surfaces. */}
      <div>
        <PageHeader
          eyebrow="Everything watched"
          title="Library"
          sub={loading ? undefined : (
            hasActiveFilters
              ? `${filteredEntries.length} of ${entries.length} watched`
              : `${entries.length} watched`
          )}
        />
        {/* The type control must survive an empty result set: filtering to a
            type with nothing in it would otherwise remove the only way back. */}
        {!loading && (entries.length > 0 || typeFilter !== 'all') && (
          <div className="glass-panel glass-rim p-3 md:p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                label="Type"
                options={[{ id: 'all', label: 'All' }, { id: 'movie', label: 'Movies' }, { id: 'show', label: 'Shows' }]}
                value={typeFilter}
                onChange={(id) => setFilter('type', id)}
              />
              {/* The search well takes the slack on wide toolbars and its own
                  row on a phone, where nothing else fits beside it. */}
              <div className="basis-full sm:basis-auto sm:flex-1 sm:min-w-[220px] sm:max-w-sm">
                <Input
                  icon={<Search />}
                  aria-label="Search your library"
                  placeholder="Search titles, director, cast..."
                  value={searchQuery}
                  onChange={(e) => setFilter('q', e.target.value)}
                />
              </div>
              <Select
                label="Sort by"
                value={sortBy}
                onChange={(e) => setFilter('sort', e.target.value)}
              >
                {sortOptions.map((o) => (
                  <option key={o.id} value={o.id} className="bg-[var(--bg-void)]">
                    {o.label}
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFilterDrawerOpen(true)}
                aria-label={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : 'Filters'}
              >
                <SlidersHorizontal className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                <span>Filters</span>
              </Button>
              {/* Two pressed buttons rather than a SegmentedControl: the pair
                  is a layout switch, not a value, and aria-pressed is how it
                  has always announced. The track and segments match the
                  control's recipe so the two read as one family. */}
              <div className="glass-inset inline-flex items-center gap-0.5 p-1">
                <button
                  type="button"
                  onClick={() => setFilter('view', 'list')}
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  className={`${VIEW_TOGGLE} ${view === 'list' ? VIEW_TOGGLE_ON : VIEW_TOGGLE_OFF}`}
                >
                  <List className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('view', 'grid')}
                  aria-label="Grid view"
                  aria-pressed={view === 'grid'}
                  className={`${VIEW_TOGGLE} ${view === 'grid' ? VIEW_TOGGLE_ON : VIEW_TOGGLE_OFF}`}
                >
                  <LayoutGrid className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
              {multiSelect && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={multiSelect.toggleSelectMode}
                  // Accent while selecting: the pill is a current-state control then.
                  style={multiSelect.isSelectMode ? { color: 'var(--accent)' } : undefined}
                >
                  <CheckSquare className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                  <span>{multiSelect.isSelectMode ? 'Done' : 'Select'}</span>
                </Button>
              )}
              {/* Demoted to an icon now that the list refetches on focus — a
                  labelled "Refresh" in a filter row reads as an admission that
                  the page might be lying to you. */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label={refreshing ? 'Refreshing library' : 'Refresh library'}
                title="Refresh"
                className="inline-flex items-center justify-center w-11 h-11 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-fill-hover)] transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
              >
                {refreshing ? (
                  <Loader2 className="w-[18px] h-[18px] animate-spin" strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <RefreshCw className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
                )}
              </button>
            </div>
            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setFilter(chip.key, 'All')}
                    aria-label={`Remove ${chip.label} filter`}
                    className="glass-btn inline-flex items-center gap-2 min-h-11 pl-3 pr-2.5 rounded-[var(--radius-pill)] text-[length:var(--text-sm)] font-semibold text-[var(--text-primary)] whitespace-nowrap forced-colors:forced-color-adjust-none forced-colors:bg-[color:Highlight] forced-colors:text-[color:HighlightText]"
                  >
                    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] forced-colors:bg-[color:HighlightText]" />
                    <span>{chip.label}</span>
                    <X className="w-4 h-4 text-[var(--text-secondary)] forced-colors:text-[color:HighlightText]" strokeWidth={1.8} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {filterDrawerOpen && (
        <LibraryFilterDrawer
          onClose={() => setFilterDrawerOpen(false)}
          sortBy={sortBy}
          ratingFilter={ratingFilter}
          genreFilter={genreFilter}
          decadeFilter={decadeFilter}
          genres={genres}
          decades={decades}
          hasActiveFilters={hasActiveFilters}
          setFilter={setFilter}
          resetFilters={resetFilters}
          sortOptions={sortOptions}
          ratingOptions={ratingOptions}
        />
      )}

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
        // Placeholders in the shape the layout will take, so the swap to real
        // rows or posters does not reflow the page.
        view === 'grid' ? (
          <div className={POSTER_GRID}>
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : (
          <div className={ROW_GRID}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="glass-row hover:bg-[var(--glass-card)] flex gap-4 p-3">
                <Skeleton className="w-16 h-24 shrink-0 rounded-[var(--radius-md)]" />
                <div className="flex-1 space-y-3 py-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          {view === 'grid' ? (
            <div className={POSTER_GRID}>
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
            <div className={ROW_GRID}>
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
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" strokeWidth={1.8} aria-hidden="true" />
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
