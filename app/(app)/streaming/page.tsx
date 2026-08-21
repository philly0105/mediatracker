'use client'
import Image from 'next/image'
import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import type { TmdbSearchResult } from '@/types'
import { useLibraryIds } from '@/lib/useLibraryIds'
import { useUrlFilters } from '@/lib/useUrlFilters'
import { FilterPills } from '@/components/FilterPills'
import { useMediaModal } from '@/components/MediaModalProvider'
import SelectableOverlay from '@/components/SelectableOverlay'
import { motion } from 'framer-motion'
import { CheckCircle2, Bookmark, EyeOff, Loader2, Star, Tv } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

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

  // The grid's Watched / Watchlist badges read from these sets, and nothing
  // pushes the change back from the server, so they are updated here.
  function openDetails(result: TmdbSearchResult) {
    openMedia(result, {
      enableRemove: true,
      onChanged: (change, changedItem) => {
        const id = changedItem.tmdb_id
        if (change === 'watched') setWatchedIds((prev) => new Set(prev).add(id))
        if (change === 'watchlisted') setWatchlistIds((prev) => new Set(prev).add(id))
        if (change === 'removed') {
          setWatchlistIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
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
    () => (hideWatched ? results.filter((item) => !watchedIds.has(item.tmdb_id)) : results),
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
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Available now"
        title="Streaming"
        sub={<>Browse what&rsquo;s streaming now on your services.</>}
      />

      {/* Provider pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => changeProvider(p.id)}
            className={`relative px-4 py-2 rounded-full font-semibold text-xs transition-all duration-300 whitespace-nowrap active:scale-95 ${
              provider === p.id
                ? 'text-[var(--btn-primary-fg)]'
                : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10'
            }`}
          >
            {provider === p.id && (
              <motion.div
                layoutId="activeProviderPill"
                className="absolute inset-0 bg-[var(--accent)] rounded-full -z-10 shadow-lg shadow-green-600/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      {/* Type toggle */}
      <div className="flex justify-start">
        <SegmentedControl
          options={[
            { id: 'movie', label: 'Movies' },
            { id: 'show', label: 'TV Shows' },
          ]}
          value={type}
          onChange={changeType}
          size="sm"
        />
      </div>

      {/* Sort and filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterPills options={SORT_OPTIONS} active={sortBy} onSelect={changeSort} />
        <button
          type="button"
          onClick={toggleHideWatched}
          aria-pressed={hideWatched}
          className={`inline-flex w-fit items-center gap-2 px-3 py-2 rounded-sm font-semibold text-xs transition-all duration-300 whitespace-nowrap active:scale-95 ${
            hideWatched
              ? 'text-[var(--btn-primary-fg)] bg-[var(--accent)] border border-transparent shadow-lg shadow-green-600/20'
              : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10'
          }`}
        >
          <EyeOff className="w-3.5 h-3.5" />
          <span>Hide watched</span>
        </button>
      </div>

      {/* Poster grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-[var(--radius-xl)] bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
          {visibleResults.map((item) => {
            const watched = watchedIds.has(item.tmdb_id)
            const listed = watchlistIds.has(item.tmdb_id)
            return (
              <SelectableOverlay key={item.tmdb_id} item={item}>
                <button
                  type="button"
                  onClick={() => openDetails(item)}
                  className="group block w-full text-left"
                >
                  <div className="relative aspect-[2/3] rounded-[var(--radius-xl)] overflow-hidden border border-white/10 bg-[var(--bg-void)] shadow-md shadow-black/30 group-hover:border-[var(--border-strong)] group-hover:-translate-y-0.5 transition-all duration-300">
                    {item.poster_url ? (
                      <Image
                        src={item.poster_url}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 180px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">
                        No Poster
                      </div>
                    )}
                    {watched ? (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-[var(--teal-300)] bg-black/70 border border-[var(--teal-tint-border)] shadow-md shadow-black/40">
                        <CheckCircle2 className="w-3 h-3" /> Watched
                      </span>
                    ) : listed ? (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-zinc-200 bg-black/70 border border-white/10 shadow-md shadow-black/40">
                        <Bookmark className="w-3 h-3" /> Watchlist
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 px-0.5">
                    <p className="text-sm font-semibold text-white line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
                      {item.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span>{item.release_year ?? '—'}</span>
                      {item.vote_average !== undefined && item.vote_average > 0 && (
                        <span className="inline-flex items-center gap-1 text-zinc-400">
                          <Star className="w-3 h-3 fill-current text-[var(--rating)]" />
                          {item.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </SelectableOverlay>
            )
          })}
        </div>
      )}

      {!loading && results.length > 0 && page < totalPages && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-6 text-xs font-semibold text-zinc-400">
          {loadingMore && (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
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
