'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Loader2, CheckCircle2, Bookmark } from 'lucide-react'
import { useLibraryIds } from '@/lib/useLibraryIds'
import { mediaKey } from '@/lib/mediaKey'
import { useMediaModal } from '@/components/MediaModalProvider'
import { useModal } from '@/lib/useModal'
import type { TmdbSearchResult, MediaType } from '@/types'
import SelectableOverlay from './SelectableOverlay'
import { useMultiSelect } from './MultiSelectProvider'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PosterBadge, PosterCard } from '@/components/ui/PosterCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { tmdbPercent } from '@/components/title/format'

interface Props {
  tmdbId: number
  type: MediaType
  onClose: () => void
  // Forwarded straight to the layered MediaInfoModal: a cast link two modals
  // deep still has to collapse the whole stack, not just its own layer.
  onNavigateAway?: () => void
  // Set by the title modal that owns this sheet while a poster opened from
  // here has put another title modal on top of it.
  covered?: boolean
}

// Three across on a phone, five on the 720 sheet.
const GRID = 'grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5'

export default function SimilarModal({ tmdbId, type, onClose, onNavigateAway, covered = false }: Props) {
  const [items, setItems] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [visibleCount, setVisibleCount] = useState(12)
  const [hasMore, setHasMore] = useState(true)
  const nextBatch = useRef(2)
  const seenIds = useRef(new Set<number>())
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { isSelectMode } = useMultiSelect()
  const { watchedIds, watchlistIds, setWatchedIds, setWatchlistIds } = useLibraryIds()
  const { containerRef } = useModal(onClose)

  const { openMedia } = useMediaModal()

  // Opens on top of this modal, which opened on top of a MediaInfoModal — the
  // provider keeps a stack precisely so that nesting survives.
  function openDetails(result: TmdbSearchResult) {
    openMedia(result, {
      onNavigateAway,
      onChanged: (change, changedItem) => {
        const key = mediaKey(changedItem.type, changedItem.tmdb_id)
        if (change === 'watched') setWatchedIds((prev) => new Set(prev).add(key))
        if (change === 'watchlisted') setWatchlistIds((prev) => new Set(prev).add(key))
      },
    })
  }

  useEffect(() => {
    fetch(`/api/tmdb/similar?id=${tmdbId}&type=${type}&batch=1`)
      .then(r => r.json())
      .then(data => {
        const results: TmdbSearchResult[] = Array.isArray(data) ? data : []
        results.forEach(r => seenIds.current.add(r.tmdb_id))
        setItems(results)
        if (results.length === 0) setHasMore(false)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [tmdbId, type])

  const fetchMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/tmdb/similar?id=${tmdbId}&type=${type}&batch=${nextBatch.current}`)
      const data = await res.json()
      const fresh: TmdbSearchResult[] = (Array.isArray(data) ? data : [])
        .filter((r: TmdbSearchResult) => !seenIds.current.has(r.tmdb_id))
      fresh.forEach(r => seenIds.current.add(r.tmdb_id))
      if (fresh.length === 0) {
        setHasMore(false)
      } else {
        setItems(prev => [...prev, ...fresh])
        setVisibleCount(c => c + 12)
        nextBatch.current += 1
      }
    } catch {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [tmdbId, type])

  useEffect(() => {
    const sentinel = sentinelRef.current
    const container = scrollRef.current
    if (!sentinel || !container || loading) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loadingMore) return
        if (visibleCount < items.length) {
          setVisibleCount(c => c + 12)
        } else if (hasMore) {
          fetchMore()
        }
      },
      { root: container, threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading, loadingMore, visibleCount, items.length, hasMore, fetchMore])

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center md:p-6" style={{ background: 'var(--scrim)' }} onClick={onClose}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="similar-modal-title"
        // The same sheet as the title modal, at the width five posters want,
        // with the modal fill set the same way (the token .glass-panel paints
        // with, so the reduced-transparency fallback still wins). Under a
        // stacked title modal it gives up its blur the way that modal does:
        // one blurred sheet per level, and only the top one is read.
        className={`dialog-in glass-panel glass-rim [--glass-panel:var(--glass-modal)] relative flex w-full flex-col overflow-hidden shadow-[var(--shadow-xl)] max-md:h-dvh max-md:rounded-none md:max-h-[calc(100dvh-3rem)] md:max-w-[720px] md:rounded-[var(--radius-2xl)]${covered ? ' [backdrop-filter:none] [-webkit-backdrop-filter:none]' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <SectionHeader
            id="similar-modal-title"
            title={`Similar ${type === 'movie' ? 'Movies' : 'TV Shows'}`}
            style={{ marginBottom: 0, paddingLeft: 0, minHeight: 44, flex: 1 }}
          />
          <Button variant="icon" aria-label="Close" onClick={onClose}>
            <X className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
          </Button>
        </div>

        {/* Full-screen under md, so the last row clears the home indicator. */}
        <div ref={scrollRef} className="scrollbar-none flex-1 overflow-y-auto p-5 max-md:pb-[calc(var(--space-5)+env(safe-area-inset-bottom,0px))]">
          {loading ? (
            <div className={GRID}>
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] rounded-[var(--radius-xl)]" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState size="compact" title="No similar titles found" />
          ) : (
            // PosterCards in a grid: nothing in here blurs; the sheet already does.
            <div className={GRID}>
              {items.slice(0, visibleCount).map(item => {
                const key = mediaKey(item.type, item.tmdb_id)
                const watched = watchedIds.has(key)
                const percent = tmdbPercent(item.vote_average)
                return (
                  <SelectableOverlay key={item.tmdb_id} item={item}>
                    <PosterCard
                      title={item.title}
                      year={[item.release_year, percent && `TMDB ${percent}`].filter(Boolean).join(' · ') || undefined}
                      posterUrl={item.poster_url}
                      onClick={() => { if (!isSelectMode) openDetails(item) }}
                    >
                      {/* Top-right, clear of the select chip in the other corner. */}
                      {(watched || watchlistIds.has(key)) && (
                        <span style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                          <PosterBadge>
                            {watched ? (
                              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--accent)' }} />
                            ) : (
                              <Bookmark className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--accent)' }} />
                            )}
                            <span className="sr-only">{watched ? 'Watched' : 'On your watchlist'}</span>
                          </PosterBadge>
                        </span>
                      )}
                    </PosterCard>
                  </SelectableOverlay>
                )
              })}
            </div>
          )}
          {!loading && (visibleCount < items.length || hasMore) && (
            <div ref={sentinelRef} className="mt-4 flex h-8 items-center justify-center">
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />}
            </div>
          )}
        </div>
      </div>

    </div>
    </>
  )
}
