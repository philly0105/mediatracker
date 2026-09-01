'use client'
import Image from 'next/image'
import { useCallback, useEffect, useState, useRef } from 'react'
import {
  Sparkles,
  Check,
  Loader2,
  Calendar,
  AlertCircle,
  Plus,
  Star,
  RefreshCw
} from 'lucide-react'
import { useMediaModal } from '@/components/MediaModalProvider'
import { useMediaActions, isAlreadyWatchedError } from '@/lib/useMediaActions'
import { FilterPills } from '@/components/FilterPills'
import SelectableOverlay from '@/components/SelectableOverlay'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { activatableProps } from '@/components/ui/activatable'
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

export default function RecommendationsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
      setError(null)
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
      setError(err instanceof Error ? err.message : 'Failed to load recommendations')
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
      await markWatched(tmdbId, type, opts)

      // Animate card removal
      setItems((prev) => prev.filter((item) => item.tmdb_id !== tmdbId))
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

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Picked for you"
        title="Recommendations"
        sub={fallback
          ? 'We compiled this week\'s overall trending items to get you started!'
          : 'Personalized recommendations based on similar titles from your watch history.'}
        selectable
        action={
          <Button
            onClick={() => loadRecommendations(true)}
            disabled={loading || refreshing}
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
        }
      />

      {loading ? (
        /* Shimmer loading layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-[var(--glass-card)] border border-[var(--border-subtle)] rounded-lg p-4 flex gap-4 animate-pulse">
              <div className="w-20 h-28 bg-[var(--bg-void)] rounded-[var(--radius-xl)]" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 bg-[var(--bg-void)] rounded w-3/4" />
                <div className="h-3 bg-[var(--bg-void)] rounded w-1/2" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 bg-[var(--bg-void)] rounded w-full" />
                  <div className="h-3 bg-[var(--bg-void)] rounded w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error Layout */
        <div className="max-w-md mx-auto">
          <EmptyState
            tone="error"
            icon={AlertCircle}
            title="Something went wrong"
            hint={error}
            actionLabel="Try Again"
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
          {/* Filters */}
          <div className="flex flex-col gap-3">
            <FilterPills
              options={[
                { id: 'all', label: 'All' },
                { id: 'movie', label: 'Movies' },
                { id: 'show', label: 'TV Shows' },
              ]}
              active={activeType}
              onSelect={(id) => {
                setFilter('type', id)
                setFilter('genre', 'All')
                setDiscoverPageByFilter({})
                setHasMoreByFilter({})
                setVisibleCount(10)
              }}
            />
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
          </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleItems.map((item) => (
                <SelectableOverlay key={item.tmdb_id} item={item}>
                <div
                  onClick={() => openDetails(item)}
                  {...activatableProps(() => openDetails(item), item.title)}
                  className="bg-[var(--glass-card)] hover:bg-[var(--glass-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-lg p-4 flex gap-4 relative overflow-hidden group select-none hover:shadow-[var(--glow-violet)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                >
                  {/* Poster image */}
                  {item.poster_url ? (
                    <Image
                      src={item.poster_url}
                      alt={item.title}
                      width={80}
                      height={112}
                      className="w-20 h-28 rounded-[var(--radius-xl)] object-cover shadow-md shadow-black/30 border border-[var(--border-subtle)] shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-28 rounded-[var(--radius-xl)] bg-[var(--bg-void)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px] text-zinc-700 shrink-0">
                      No Poster
                    </div>
                  )}

                  {/* Metadata & Actions */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-bold text-white text-sm line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
                          {item.title}
                        </h2>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 border border-white/[0.03] px-1.5 py-0.5 rounded">
                          {item.type === 'show' ? 'TV' : 'Movie'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-zinc-500">
                        {item.release_year && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{item.release_year}</span>
                          </span>
                        )}
                        {item.vote_average !== undefined && item.vote_average > 0 && (
                          <span className="flex items-center gap-0.5 text-[var(--rating)] font-semibold">
                            <Star className="w-3.5 h-3.5 fill-[var(--rating)] text-[var(--rating)]" />
                            <span>{item.vote_average.toFixed(1)}</span>
                          </span>
                        )}
                      </div>
                      {item.seed_title && (
                        <p className="text-[11px] text-zinc-500 line-clamp-1">
                          Because you watched {item.seed_title}
                        </p>
                      )}
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed pt-0.5">
                        {item.overview || 'No description available.'}
                      </p>
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-wrap gap-2 pt-3">
                      <Button
                        disabled={actioningId === item.tmdb_id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToWatchlist(item.tmdb_id, item.type)
                        }}
                        variant="ghost"
                        size="sm"
                        style={{ flex: 1, minWidth: '75px', fontSize: '11px', padding: '6px 12px' }}
                      >
                        {actioningId === item.tmdb_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                        <span>Watchlist</span>
                      </Button>
                      
                      <Button
                        disabled={actioningId === item.tmdb_id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsWatchedFromCard(item.tmdb_id, item.type)
                        }}
                        variant="ghost"
                        size="sm"
                        style={{ flex: 1, minWidth: '75px', fontSize: '11px', padding: '6px 12px' }}
                      >
                        {actioningId === item.tmdb_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        <span>Watched</span>
                      </Button>
                    </div>
                  </div>
                </div>
                </SelectableOverlay>
              ))}
            </div>
          )}

          {/* Infinite Scroll Trigger */}
          {(visibleCount < filteredItems.length || canLoadMoreForFilter || loadingMore) && filteredItems.length > 0 && (
            <div ref={loadMoreRef} className="flex justify-center pt-8 pb-4">
              <Loader2 className="w-6 h-6 text-[var(--accent)]/50 animate-spin" />
            </div>
          )}
        </div>
      )}

    </div>
  )
}
