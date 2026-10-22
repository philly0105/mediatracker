'use client'
import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import type { TmdbSearchResult } from '@/types'
import { useLibraryIds } from '@/lib/useLibraryIds'
import { mediaKey } from '@/lib/mediaKey'
import { useUrlFilters } from '@/lib/useUrlFilters'
import { FilterPills } from '@/components/FilterPills'
import { useMediaModal } from '@/components/MediaModalProvider'
import SelectableOverlay from '@/components/SelectableOverlay'
import { useOptionalMultiSelect } from '@/components/MultiSelectProvider'
import { CheckCircle2, Bookmark, EyeOff, Loader2, Star, Tv, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { PosterCard, PosterBadge } from '@/components/ui/PosterCard'
import { GridToolbar } from '@/components/grid/GridToolbar'
import { PosterGrid } from '@/components/grid/PosterGrid'

const PROVIDERS = [
  { id: '8', name: 'Netflix' },
  { id: '15', name: 'Hulu' },
  { id: '350', name: 'Apple TV+' },
  { id: '337', name: 'Disney+' },
  { id: '1899', name: 'Max' },
  { id: '9', name: 'Prime' },
  { id: '386', name: 'Peacock' },
]

/** How many unwatched posters a page should show before it stops pulling more. */
const FILL_TARGET = 20
/** Ceiling on hide-watched auto-advance, so an exhausted service still settles. */
const MAX_AUTO_FILL_PAGES = 5

type StreamingSort = 'popular' | 'rating' | 'latest'

const SORT_OPTIONS: { id: StreamingSort; label: string }[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'rating', label: 'Highest rated' },
  { id: 'latest', label: 'Latest release' },
]

// The filter/sort state mirrored into the URL so a view is bookmarkable and
// survives reloads. `watched` is special: it's omitted at its default (absent)
// and only present as watched=hide when hide-watched is on. `page` is NOT
// mirrored — infinite-scroll position doesn't belong in a URL.
const STREAMING_DEFAULTS = { provider: '8', type: 'movie', sort: 'popular', watched: '' }

function StreamingContent() {
  const [filters, setFilter] = useUrlFilters(STREAMING_DEFAULTS)
  // Re-validate URL-supplied values against the option sets above so a
  // malformed param in a shared link falls back to the default.
  const provider = PROVIDERS.some((p) => p.id === filters.provider) ? filters.provider : '8'
  const type = (filters.type === 'movie' || filters.type === 'show' ? filters.type : 'movie') as 'movie' | 'show'
  const sortBy = SORT_OPTIONS.some((o) => o.id === filters.sort) ? (filters.sort as StreamingSort) : 'popular'
  const hideWatched = filters.watched === 'hide'
  const [page, setPage] = useState(1)

  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const { watchedIds, watchlistIds, setWatchedIds, setWatchlistIds } = useLibraryIds()

  const { openMedia } = useMediaModal()
  // The Select/Done pill sits in the toolbar with the other grid controls
  // (spec §5.6); null outside the provider, in which case it is simply absent.
  const multiSelect = useOptionalMultiSelect()

  // The grid's Watched / Watchlist badges read from these sets, and nothing
  // pushes the change back from the server, so they are updated here.
  function openDetails(result: TmdbSearchResult) {
    openMedia(result, {
      enableRemove: true,
      onChanged: (change, changedItem) => {
        const key = mediaKey(changedItem.type, changedItem.tmdb_id)
        if (change === 'watched') setWatchedIds((prev) => new Set(prev).add(key))
        if (change === 'watchlisted') setWatchlistIds((prev) => new Set(prev).add(key))
        if (change === 'removed') {
          setWatchlistIds((prev) => {
            const next = new Set(prev)
            next.delete(key)
            return next
          })
        }
      },
    })
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (page === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      try {
        const params = new URLSearchParams({
          provider,
          type,
          page: String(page),
          sort: sortBy,
        })
        const res = await fetch(`/api/streaming?${params}`)
        const data = await res.json()
        if (cancelled) return
        const nextResults = (data.results ?? []) as TmdbSearchResult[]
        setResults((prev) => {
          if (page === 1) return nextResults
          const seen = new Set(prev.map((item) => item.tmdb_id))
          return [...prev, ...nextResults.filter((item) => !seen.has(item.tmdb_id))]
        })
        setTotalPages(data.total_pages ?? 0)
      } catch {
        if (!cancelled && page === 1) setResults([])
      } finally {
        if (!cancelled) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [provider, type, page, sortBy])

  useEffect(() => {
    if (loading || loadingMore || page >= totalPages) return
    const node = loadMoreRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPage((currentPage) => Math.min(currentPage + 1, totalPages))
        }
      },
      { rootMargin: '600px 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [loading, loadingMore, page, totalPages, results.length])

  const visibleResults = useMemo(
    () => (hideWatched ? results.filter((item) => !watchedIds.has(mediaKey(item.type, item.tmdb_id))) : results),
    [hideWatched, results, watchedIds]
  )

  // Hide-watched filters after the page arrives, so a TMDB page of 20 can
  // collapse to two posters for someone whose library already covers most of
  // Netflix's popular list. Treat the target as a fill level rather than a
  // post-filter: keep pulling pages until there is a screenful of unwatched
  // titles, capped so "watched literally everything" doesn't walk 500 pages.
  const autoFillKey = `${provider}-${type}-${sortBy}-${hideWatched}`
  const autoFill = useRef({ key: autoFillKey, used: 0 })

  useEffect(() => {
    if (autoFill.current.key !== autoFillKey) autoFill.current = { key: autoFillKey, used: 0 }
    if (!hideWatched || loading || loadingMore) return
    if (page >= totalPages) return
    if (visibleResults.length >= FILL_TARGET) return
    if (autoFill.current.used >= MAX_AUTO_FILL_PAGES) return
    autoFill.current.used += 1
    setPage((currentPage) => Math.min(currentPage + 1, totalPages))
  }, [autoFillKey, hideWatched, loading, loadingMore, page, totalPages, visibleResults.length])

  function changeProvider(id: string) {
    if (id === provider) return
    setFilter('provider', id)
    setResults([])
    setPage(1)
  }

  function changeType(t: 'movie' | 'show') {
    if (t === type) return
    setFilter('type', t)
    setResults([])
    setPage(1)
  }

  function changeSort(sort: StreamingSort) {
    if (sort === sortBy) return
    setFilter('sort', sort)
    setResults([])
    setPage(1)
  }

  function toggleHideWatched() {
    setFilter('watched', hideWatched ? '' : 'hide')
    setPage(1)
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Available now"
        title="Streaming"
        sub={<>Browse what&rsquo;s streaming now on your services.</>}
      />

      <GridToolbar>
        {/* Service chips: the same aria-pressed buttons the page always had,
            on the shared chip recipe. */}
        <FilterPills
          options={PROVIDERS.map((p) => ({ id: p.id, label: p.name }))}
          active={provider}
          onSelect={changeProvider}
        />

        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            label="Media type"
            options={[
              { id: 'movie', label: 'Movies' },
              { id: 'show', label: 'TV Shows' },
            ]}
            value={type}
            onChange={changeType}
          />

          {/* Sort moved from a second row of pills to a Select (spec §5.6);
              the values are unchanged, so the URL param is too. */}
          <Select
            label="Sort order"
            value={sortBy}
            onChange={(e) => changeSort(e.target.value as StreamingSort)}
            className="min-w-[160px]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id} className="bg-[var(--bg-void)]">{o.label}</option>
            ))}
          </Select>

          {/* A toggle chip: pressed takes the glass-button fill with the
              accent text and ring, the chip rest state otherwise. */}
          <button
            type="button"
            onClick={toggleHideWatched}
            aria-pressed={hideWatched}
            className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] px-4 text-[length:var(--text-sm)] font-semibold transition-colors duration-200 ${
              hideWatched
                ? 'glass-btn text-[var(--accent)] forced-colors:bg-[color:Highlight] forced-colors:text-[color:HighlightText]'
                : 'bg-[var(--glass-chip)] text-[var(--text-secondary)] shadow-[var(--glass-chip-edge)] hover:bg-[var(--glass-fill-selected)] hover:text-[var(--text-primary)]'
            }`}
            style={hideWatched ? { boxShadow: 'var(--glass-btn-edge), var(--accent-ring)' } : undefined}
          >
            <EyeOff className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
            <span>Hide watched</span>
          </button>

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
      </GridToolbar>

      {/* Poster grid */}
      {loading ? (
        <PosterGrid>
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-[var(--radius-xl)]" />
          ))}
        </PosterGrid>
      ) : visibleResults.length === 0 ? (
        <EmptyState
          icon={Tv}
          title={
            results.length === 0
              ? 'No titles found for this service'
              : page >= totalPages
                ? 'You have watched everything on this service'
                : 'Everything here is already in your library'
          }
          hint={
            results.length === 0
              ? 'Pick another service above.'
              : page >= totalPages
                ? 'Try another service above.'
                : 'Turn off Hide watched to see it.'
          }
        />
      ) : (
        <PosterGrid>
          {visibleResults.map((item) => {
            const key = mediaKey(item.type, item.tmdb_id)
            const watched = watchedIds.has(key)
            const listed = watchlistIds.has(key)
            const rating = item.vote_average !== undefined && item.vote_average > 0 ? item.vote_average.toFixed(1) : null
            return (
              <SelectableOverlay key={item.tmdb_id} item={item}>
                <PosterCard
                  title={item.title}
                  year={item.release_year ?? '—'}
                  posterUrl={item.poster_url}
                  onClick={() => openDetails(item)}
                  badges={
                    watched ? (
                      <PosterBadge>
                        <CheckCircle2 className="w-3 h-3 text-[var(--accent)]" strokeWidth={1.8} aria-hidden="true" />
                        Watched
                      </PosterBadge>
                    ) : listed ? (
                      <PosterBadge>
                        <Bookmark className="w-3 h-3" strokeWidth={1.8} aria-hidden="true" />
                        Watchlist
                      </PosterBadge>
                    ) : null
                  }
                >
                  {/* The TMDB score as a badge in the other top corner, clear
                      of the library badge and the select checkbox. */}
                  {rating && (
                    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                      <PosterBadge>
                        <Star className="w-3 h-3 fill-current text-[var(--rating)]" strokeWidth={1.8} aria-hidden="true" />
                        <span className="tabular">{rating}</span>
                      </PosterBadge>
                    </div>
                  )}
                </PosterCard>
              </SelectableOverlay>
            )
          })}
        </PosterGrid>
      )}

      {!loading && results.length > 0 && page < totalPages && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-6 text-[length:var(--text-xs)] font-semibold text-[var(--text-muted)]">
          {loadingMore && (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
              Loading more
            </span>
          )}
        </div>
      )}

    </div>
  )
}

// useSearchParams inside StreamingContent (via useUrlFilters) needs a Suspense
// boundary; without one the route opts out of static rendering during prerender.
export default function StreamingPage() {
  return (
    <Suspense>
      <StreamingContent />
    </Suspense>
  )
}
