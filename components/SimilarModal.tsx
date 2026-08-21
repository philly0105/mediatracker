'use client'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Star, Loader2, CheckCircle2, Bookmark } from 'lucide-react'
import { useLibraryIds } from '@/lib/useLibraryIds'
import { useMediaModal } from '@/components/MediaModalProvider'
import { useModal } from '@/lib/useModal'
import type { TmdbSearchResult, MediaType } from '@/types'
import SelectableOverlay from './SelectableOverlay'
import { useMultiSelect } from './MultiSelectProvider'

interface Props {
  tmdbId: number
  type: MediaType
  onClose: () => void
  // Forwarded straight to the layered MediaInfoModal: a cast link two modals
  // deep still has to collapse the whole stack, not just its own layer.
  onNavigateAway?: () => void
}

export default function SimilarModal({ tmdbId, type, onClose, onNavigateAway }: Props) {
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
        const id = changedItem.tmdb_id
        if (change === 'watched') setWatchedIds((prev) => new Set(prev).add(id))
        if (change === 'watchlisted') setWatchlistIds((prev) => new Set(prev).add(id))
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--scrim)]" onClick={onClose}>
      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="similar-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="rounded-[var(--radius-2xl)] w-full max-w-lg overflow-hidden relative border border-white/5 bg-[var(--surface-modal)] max-h-[calc(100dvh-2rem)] md:max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 id="similar-modal-title" className="font-bold text-white text-sm">
            Similar {type === 'movie' ? 'Movies' : 'TV Shows'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-sm text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="overflow-y-auto p-4 scrollbar-none">
          {loading ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="aspect-[2/3] rounded-[var(--radius-xl)] bg-zinc-900" />
                  <div className="h-2.5 bg-zinc-900 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No similar titles found.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {items.slice(0, visibleCount).map(item => (
                <SelectableOverlay key={item.tmdb_id} item={item}>
                <button
                  onClick={() => { if (!isSelectMode) openDetails(item) }}
                  className="text-left space-y-1.5 group w-full h-full"
                >
                  <div className="relative">
                    {item.poster_url ? (
                      <Image
                        src={item.poster_url}
                        alt={item.title}
                        width={200}
                        height={300}
                        sizes="(max-width: 640px) 33vw, 160px"
                        className="w-full aspect-[2/3] rounded-[var(--radius-xl)] object-cover border border-white/5 group-hover:border-white/20 group-hover:scale-[1.02] transition-all duration-200"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] rounded-[var(--radius-xl)] bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] text-zinc-600">
                        No Poster
                      </div>
                    )}
                    
                    <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 z-10">
                      {watchedIds.has(item.tmdb_id) && (
                        <div className="bg-emerald-500/90 p-1 rounded-sm shadow-md border border-emerald-400/30">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {!watchedIds.has(item.tmdb_id) && watchlistIds.has(item.tmdb_id) && (
                        <div className="bg-violet-500/90 p-1 rounded-sm shadow-md border border-violet-400/30">
                          <Bookmark className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1">
                    {item.release_year && (
                      <span className="text-[10px] text-zinc-500">{item.release_year}</span>
                    )}
                    {item.vote_average != null && item.vote_average > 0 && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5 ml-auto">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        {item.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                </button>
                </SelectableOverlay>
              ))}
            </div>
          )}
          {!loading && (visibleCount < items.length || hasMore) && (
            <div ref={sentinelRef} className="mt-4 h-8 flex items-center justify-center">
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
            </div>
          )}
        </div>
      </motion.div>

    </div>
    </>
  )
}
