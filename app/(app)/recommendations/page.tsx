'use client'
import { useCallback, useEffect, useState, useRef } from 'react'
import {
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckSquare
} from 'lucide-react'
import { useMediaModal } from '@/components/MediaModalProvider'
import { useMediaActions, isAlreadyWatchedError, readCreatedEntry } from '@/lib/useMediaActions'
import { FilterPills } from '@/components/FilterPills'
import SelectableOverlay from '@/components/SelectableOverlay'
import { useOptionalMultiSelect } from '@/components/MultiSelectProvider'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { GridToolbar } from '@/components/grid/GridToolbar'
import { RecommendationCard } from '@/components/grid/RecommendationCard'
import { RECOMMENDATION_ROW_GRID } from '@/components/grid/RecommendationCardSkeleton'
import { RecommendationFeedSkeleton } from '@/components/grid/RecommendationFeedSkeleton'
import { useToast } from '@/components/ToastProvider'
import { useUrlFilters } from '@/lib/useUrlFilters'

interface Recommendation {
  tmdb_id: number
  type: 'movie' | 'show'
  title: string
  overview: string
  poster_url: string | null
  release_year: number | null
  genres?: string[]
  vote_average?: number
  seed_title?: string
}

const FILTER_DEFAULTS = {
  type: 'all',
  genre: 'All',
}

// The type filter is a segmented control (spec §5.6); the values are the
// same three the pills carried, so the URL param is unchanged.
const TYPE_OPTIONS: { id: 'all' | 'movie' | 'show'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'movie', label: 'Movies' },
  { id: 'show', label: 'TV Shows' },
]

export default function RecommendationsPage() {
  const { toast } = useToast()
  // The Select/Done pill sits in the toolbar with the filters (spec §5.6);
  // null outside the provider, in which case it is simply absent.
  const multiSelect = useOptionalMultiSelect()
  const [items, setItems] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  // A flag, not a message: `err.message` on a network failure is the browser's
  // own string ("Failed to fetch"), which was being rendered verbatim as the
  // hint. The real message goes to the console, where it is useful.
  const [error, setError] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [actioningId, setActioningId] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(10)
  const [filters, setFilter] = useUrlFilters(FILTER_DEFAULTS)
  const activeType = (filters.type as 'all' | 'movie' | 'show') || 'all'
  const activeGenre = filters.genre || 'All'
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  // Each press advances the server's seed window, so Refresh returns different
  // titles rather than the same set reordered. A ref, not state: nothing renders
  // from it, and holding it in state made `loadRecommendations` change identity
  // on every press, which re-fired the mount effect below and clobbered the
  // refreshed results with an unrotated fetch.
  const seedCycleRef = useRef(0)
  const [discoverPageByFilter, setDiscoverPageByFilter] = useState<Record<string, number>>({})
  const [hasMoreByFilter, setHasMoreByFilter] = useState<Record<string, boolean>>({})

  const loadMoreRef = useRef<HTMLDivElement>(null)

  const { addToWatchlist, markWatched } = useMediaActions({ priority: 'must_watch' })
  const { openMedia, closeMedia } = useMediaModal()

  // Refresh deliberately leaves the genre and type pills alone — resetting them
  // made the button feel like a hard reset that returned you to the same place.
  // `effectiveGenre` below covers the case where the new set no longer has the
  // selected genre in it.
  const loadRecommendations = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(false)
      const nextCycle = refresh ? seedCycleRef.current + 1 : 0
      const params = new URLSearchParams()
      if (refresh) {
        params.set('refresh', '1')
        params.set('cycle', String(nextCycle))
      }
      const query = params.toString()
      const res = await fetch(`/api/recommendations${query ? `?${query}` : ''}`)
      if (!res.ok) throw new Error('Failed to load recommendations')
      const data = await res.json()
      seedCycleRef.current = nextCycle
      setItems(data.results ?? [])
      setFallback(data.fallback ?? false)
      setHasMore(data.hasMore ?? false)
      setDiscoverPageByFilter({})
      setHasMoreByFilter({})
      setVisibleCount(10)
      // A refresh replaces the whole list; anything open is looking at a card
      // that no longer exists.
      closeMedia()
    } catch (err: unknown) {
      console.error(err)
      setError(true)
    } finally {
      if (refresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }, [closeMedia])

  // Initial load. `loadRecommendations` is stable, so this runs exactly once —
  // which is what keeps Refresh's result on screen. The rule fires on the call
  // because the state updates happen inside it; fetching on mount is the point
  // here, not an accident.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecommendations()
  }, [loadRecommendations])

  async function handleAddToWatchlist(tmdbId: number, type: 'movie' | 'show') {
    try {
      setActioningId(tmdbId)
      await addToWatchlist(tmdbId, type)

      // Animate card removal
      setItems((prev) => prev.filter((item) => item.tmdb_id !== tmdbId))
    } catch (err) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Could not add to watchlist.', { tone: 'error' })
    } finally {
      setActioningId(null)
    }
  }

  // Throws on failure. Reached two ways: straight from a card button, and from
  // MediaInfoModal. The modal owns its own messaging (a 409 becomes a "log a
  // rewatch" offer there), so reporting here would double up and suppress that
  // — the card path below catches and reports for itself instead.
  async function handleMarkAsWatched(tmdbId: number, type: 'movie' | 'show', opts?: { rewatch?: boolean }) {
    try {
      setActioningId(tmdbId)
      const res = await markWatched(tmdbId, type, opts)

      // Animate card removal
      setItems((prev) => prev.filter((item) => item.tmdb_id !== tmdbId))

      return readCreatedEntry(res)
    } finally {
      setActioningId(null)
    }
  }

  function handleMarkAsWatchedFromCard(tmdbId: number, type: 'movie' | 'show') {
    handleMarkAsWatched(tmdbId, type).catch((err) => {
      console.error(err)
      toast(
        isAlreadyWatchedError(err) ? 'That is already in your watch history.'
          : err instanceof Error ? err.message
          : 'Could not mark as watched.',
        { tone: 'error' }
      )
    })
  }

  // Both handlers drop the card from the list on success, which the provider's
  // defaults do not do — hence the overrides rather than `onChanged`.
  function openDetails(item: Recommendation) {
    openMedia(item, {
      onAddToWatchlist: () => handleAddToWatchlist(item.tmdb_id, item.type),
      onMarkAsWatched: (opts) => handleMarkAsWatched(item.tmdb_id, item.type, opts),
    })
  }

  // 1. Filter by Media Type (Movie / Show)
  const typeFilteredItems = activeType === 'all'
    ? items
    : items.filter((item) => item.type === activeType)

  // 2. Extract top genres for current media type selection
  const genreCounts: Record<string, number> = {}
  typeFilteredItems.forEach((item) => {
    (item.genres ?? []).forEach((g) => {
      genreCounts[g] = (genreCounts[g] || 0) + 1
    })
  })
  const topGenres = [
    'All',
    ...Array.from(new Set(typeFilteredItems.flatMap((item) => item.genres ?? [])))
      .sort((a, b) => genreCounts[b] - genreCounts[a])
      .slice(0, 8),
  ]

  // A refresh returns a different seed set, which may not contain the genre
  // that is currently selected. Falling back to All beats rendering an empty
  // page with a pill still lit for a genre that is no longer on offer.
  const effectiveGenre = topGenres.includes(activeGenre) ? activeGenre : 'All'

  // 3. Filter by Genre
  const filteredItems = effectiveGenre === 'All'
    ? typeFilteredItems
    : typeFilteredItems.filter((item) => (item.genres ?? []).includes(effectiveGenre))

  const visibleItems = filteredItems.slice(0, visibleCount)
  const filterKey = `${activeType}:${effectiveGenre}`
  const canLoadMoreForFilter = effectiveGenre === 'All'
    ? hasMore
    : hasMoreByFilter[filterKey] ?? true

  const loadMoreRecommendations = useCallback(async () => {
    if (loadingMore) return

    if (visibleCount < filteredItems.length) {
      setVisibleCount((prev) => prev + 10)
      return
    }

    if (!canLoadMoreForFilter) return

    try {
      setLoadingMore(true)
      const params = new URLSearchParams()
      const excludeIds = items.map((item) => item.tmdb_id).join(',')
      if (excludeIds) params.set('excludeIds', excludeIds)
      if (effectiveGenre !== 'All') {
        params.set('genre', effectiveGenre)
        params.set('page', String(discoverPageByFilter[filterKey] ?? 1))
      }
      if (activeType !== 'all') params.set('type', activeType)

      const res = await fetch(`/api/recommendations?${params}`)
      if (!res.ok) throw new Error('Failed to load more recommendations')
      const data = await res.json()
      const existingIds = new Set(items.map((item) => item.tmdb_id))
      const newResults: Recommendation[] = (data.results ?? []).filter(
        (item: Recommendation) => !existingIds.has(item.tmdb_id)
      )
      const newMatchingCount = newResults.filter((item) => {
        const typeMatches = activeType === 'all' || item.type === activeType
        const genreMatches = effectiveGenre === 'All' || (item.genres ?? []).includes(effectiveGenre)
        return typeMatches && genreMatches
      }).length

      if (newResults.length === 0) {
        if (effectiveGenre === 'All') {
          setHasMore(false)
        } else {
          setHasMoreByFilter((prev) => ({ ...prev, [filterKey]: false }))
        }
        return
      }

      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.tmdb_id))
        return [
          ...prev,
          ...newResults.filter((item) => {
            if (seen.has(item.tmdb_id)) return false
            seen.add(item.tmdb_id)
            return true
          }),
        ]
      })

      if (effectiveGenre === 'All') {
        setHasMore(data.hasMore ?? false)
      } else {
        setHasMoreByFilter((prev) => ({
          ...prev,
          [filterKey]: newMatchingCount > 0 ? data.hasMore ?? false : false,
        }))
        setDiscoverPageByFilter((prev) => ({
          ...prev,
          [filterKey]: (prev[filterKey] ?? 1) + 1,
        }))
      }
      if (newMatchingCount > 0) setVisibleCount((prev) => prev + Math.max(10, newMatchingCount))
    } catch (err) {
      console.error(err)
      if (effectiveGenre === 'All') {
        setHasMore(false)
      } else {
        setHasMoreByFilter((prev) => ({ ...prev, [filterKey]: false }))
      }
    } finally {
      setLoadingMore(false)
    }
  }, [
    effectiveGenre,
    activeType,
    canLoadMoreForFilter,
    discoverPageByFilter,
    filteredItems.length,
    filterKey,
    items,
    loadingMore,
    visibleCount,
  ])

  // Infinite Scroll logic
  useEffect(() => {
    if (!loadMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreRecommendations()
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [loadMoreRecommendations])

  // Every skeleton and spinner on this page is aria-hidden, so a filter that
  // matched nothing and one that matched forty sound identical.
  const resultSummary = loading
    ? 'Loading your recommendations.'
    : error
      ? 'Could not load your recommendations.'
      : `${filteredItems.length} ${filteredItems.length === 1 ? 'recommendation' : 'recommendations'} showing.`

  return (
    <div className="space-y-6 pb-12">
      <p role="status" aria-live="polite" className="sr-only">
        {resultSummary}
      </p>

      <PageHeader
        eyebrow="Picked for you"
        title="Recommendations"
        sub={fallback
          ? "You haven't logged anything yet, so these are this week's most popular titles. Log a few and this page starts matching your taste."
          : 'Personalized recommendations based on similar titles from your watch history.'}
        action={
          <Button
            onClick={() => loadRecommendations(true)}
            disabled={loading || refreshing}
            variant="secondary"
            size="sm"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <RefreshCw className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
            )}
            <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
          </Button>
        }
      />

      {loading ? (
        /* The toolbar and rows as placeholders, the same ones loading.tsx
           paints, so nothing moves between the route fallback and this. */
        <RecommendationFeedSkeleton />
      ) : error ? (
        /* Error Layout */
        <div className="max-w-md mx-auto">
          <EmptyState
            tone="error"
            icon={AlertCircle}
            title="Something went wrong"
            hint="We couldn't score your recommendations just now. This is usually temporary."
            actionLabel="Try again"
            onAction={() => loadRecommendations()}
          />
        </div>
      ) : items.length === 0 ? (
        /* Empty state */
        <div className="max-w-md mx-auto">
          <EmptyState
            icon={Sparkles}
            title="All caught up"
            hint="No recommendations remaining. Log a few more films or shows and the feed refills from what you have watched."
            actionLabel="Go to your library"
            actionHref="/library"
          />
        </div>
      ) : (
        /* Main Recommendations Grid */
        <div className="space-y-6">
          {/* Filters. Rows, not posters, because the seed line and the
              overview are what make a recommendation worth a look. */}
          <GridToolbar>
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                label="Filter by type"
                options={TYPE_OPTIONS}
                value={activeType}
                onChange={(id) => {
                  setFilter('type', id)
                  setFilter('genre', 'All')
                  setDiscoverPageByFilter({})
                  setHasMoreByFilter({})
                  setVisibleCount(10)
                }}
              />
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
            </div>
            <FilterPills
              options={topGenres.map((genre) => ({ id: genre, label: genre }))}
              active={effectiveGenre}
              onSelect={(genre) => {
                setFilter('genre', genre)
                setDiscoverPageByFilter((prev) => ({ ...prev, [`${activeType}:${genre}`]: 1 }))
                setHasMoreByFilter((prev) => {
                  const next = { ...prev }
                  delete next[`${activeType}:${genre}`]
                  return next
                })
                setVisibleCount(10)
              }}
            />
          </GridToolbar>

          {filteredItems.length === 0 ? (
            <div className="max-w-sm mx-auto">
              <EmptyState
                size="compact"
                icon={Sparkles}
                title={`Nothing left in ${effectiveGenre}`}
                hint="You have seen everything we can suggest here."
                actionLabel="Show all genres"
                onAction={() => setFilter('genre', 'All')}
              />
            </div>
          ) : (
            <div className={RECOMMENDATION_ROW_GRID}>
              {visibleItems.map((item) => (
                <SelectableOverlay key={item.tmdb_id} item={item}>
                  <RecommendationCard
                    item={item}
                    actioning={actioningId === item.tmdb_id}
                    onOpen={() => openDetails(item)}
                    onAddToWatchlist={() => handleAddToWatchlist(item.tmdb_id, item.type)}
                    onMarkWatched={() => handleMarkAsWatchedFromCard(item.tmdb_id, item.type)}
                  />
                </SelectableOverlay>
              ))}
            </div>
          )}

          {/* Infinite Scroll Trigger */}
          {(visibleCount < filteredItems.length || canLoadMoreForFilter || loadingMore) && filteredItems.length > 0 && (
            <div ref={loadMoreRef} className="flex justify-center pt-8 pb-4">
              <Loader2 className="w-6 h-6 text-[var(--text-muted)] animate-spin" strokeWidth={1.8} aria-hidden="true" />
            </div>
          )}
        </div>
      )}

    </div>
  )
}
