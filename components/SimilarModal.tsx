'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Star, Loader2, CheckCircle2, Bookmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { TmdbSearchResult, MediaType } from '@/types'
import MediaInfoModal from './MediaInfoModal'

interface Props {
  tmdbId: number
  type: MediaType
  onClose: () => void
}

export default function SimilarModal({ tmdbId, type, onClose }: Props) {
  const [items, setItems] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)
  const [visibleCount, setVisibleCount] = useState(12)
  const [hasMore, setHasMore] = useState(true)
  const nextBatch = useRef(2)
  const seenIds = useRef(new Set<number>())
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set())
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function fetchLibraryIds() {
      const supabase = createClient()
      const [watchedRes, watchlistRes] = await Promise.all([
        supabase.from('watch_entries').select('media!inner(tmdb_id)'),
        supabase.from('watchlist_items').select('media!inner(tmdb_id)')
      ])
      
      if (watchedRes.data) {
        setWatchedIds(new Set(
          watchedRes.data.map((row: any) => {
            const m = Array.isArray(row.media) ? row.media[0] : row.media
            return m?.tmdb_id
          }).filter(Boolean)
        ))
      }
      if (watchlistRes.data) {
        setWatchlistIds(new Set(
          watchlistRes.data.map((row: any) => {
            const m = Array.isArray(row.media) ? row.media[0] : row.media
            return m?.tmdb_id
          }).filter(Boolean)
        ))
      }
    }
    fetchLibraryIds()
  }, [])

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="glass-card rounded-3xl w-full max-w-lg overflow-hidden relative border border-white/15 max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="font-bold text-white text-sm">
            Similar {type === 'movie' ? 'Movies' : 'TV Shows'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="overflow-y-auto p-4 scrollbar-none">
          {loading ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="aspect-[2/3] rounded-xl bg-zinc-900" />
                  <div className="h-2.5 bg-zinc-900 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No similar titles found.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {items.slice(0, visibleCount).map(item => (
                <button
                  key={item.tmdb_id}
                  onClick={() => setSelected(item)}
                  className="text-left space-y-1.5 group"
                >
                  <div className="relative">
                    {item.poster_url ? (
                      <img
                        src={item.poster_url}
                        alt={item.title}
                        className="w-full aspect-[2/3] rounded-xl object-cover border border-white/5 group-hover:border-white/20 group-hover:scale-[1.02] transition-all duration-200"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] text-zinc-600">
                        No Poster
                      </div>
                    )}
                    
                    <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 z-10">
                      {watchedIds.has(item.tmdb_id) && (
                        <div className="bg-emerald-500/90 backdrop-blur-md p-1 rounded-lg shadow-md border border-emerald-400/30">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {!watchedIds.has(item.tmdb_id) && watchlistIds.has(item.tmdb_id) && (
                        <div className="bg-violet-500/90 backdrop-blur-md p-1 rounded-lg shadow-md border border-violet-400/30">
                          <Bookmark className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2 group-hover:text-rose-400 transition-colors">
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
      {selected && (
        <MediaInfoModal
          item={selected}
          onClose={() => setSelected(null)}
          onAddToWatchlist={async () => {
            await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, priority: 'want_to_watch' }),
            })
            setWatchlistIds(prev => new Set(prev).add(selected.tmdb_id))
          }}
          onMarkAsWatched={async () => {
            await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, watched_at: new Date().toISOString().split('T')[0] }),
            })
            setWatchedIds(prev => new Set(prev).add(selected.tmdb_id))
          }}
        />
      )}
    </>
  )
}
