'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Sparkles, Inbox, Film, Tv, Loader2, Trash2 } from 'lucide-react'
import type { WatchlistItem, WatchlistPriority, TmdbSearchResult } from '@/types'
import MediaInfoModal from '@/components/MediaInfoModal'
import SelectableOverlay from '@/components/SelectableOverlay'
import { Card } from '@/components/ui/Card'

const PRIORITY_LABELS = {
  must_watch: 'Must Watch',
  want_to_watch: 'Want to Watch',
  someday: 'Someday',
}
const PRIORITY_ORDER: Array<keyof typeof PRIORITY_LABELS> = ['must_watch', 'want_to_watch', 'someday']

const PRIORITY_CONFIG = {
  must_watch: { color: 'text-rose-400 border-rose-500/20 bg-rose-500/5', icon: Flame },
  want_to_watch: { color: 'text-orange-400 border-orange-500/20 bg-orange-500/5', icon: Sparkles },
  someday: { color: 'text-zinc-400 border-zinc-800 bg-zinc-800/10', icon: Inbox },
}

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", 
  "Family", "Fantasy", "History", "Horror", "Music", "Mystery", "Romance", 
  "Science Fiction", "TV Movie", "Thriller", "War", "Western",
  "Action & Adventure", "Kids", "News", "Reality", "Sci-Fi & Fantasy", "Soap", "Talk", "War & Politics"
]

export default function WatchlistPage() {
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'show'>('all')
  const [genreFilter, setGenreFilter] = useState<string>('All')
  const [refreshSignals, setRefreshSignals] = useState<Record<WatchlistPriority, number>>({
    must_watch: 0,
    want_to_watch: 0,
    someday: 0,
  })

  function handlePriorityChanged(toPriority: WatchlistPriority) {
    setRefreshSignals(prev => ({ ...prev, [toPriority]: prev[toPriority] + 1 }))
  }

  return (
    <div className="space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between sticky top-0 z-40 bg-[#09090B]/95 backdrop-blur-xl pt-2 pb-6 border-b border-white/[0.04]">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            Watchlist
          </h1>
          <p className="text-sm text-zinc-400">
            Prioritize movies and shows you want to watch next.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-4 py-2 rounded-sm bg-white/5 border border-white/10 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none min-w-[120px]"
          >
            <option value="all" className="bg-zinc-900">All Types</option>
            <option value="movie" className="bg-zinc-900">Movies Only</option>
            <option value="show" className="bg-zinc-900">TV Shows Only</option>
          </select>

          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="px-4 py-2 rounded-sm bg-white/5 border border-white/10 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none min-w-[140px]"
          >
            <option value="All" className="bg-zinc-900">All Genres</option>
            {GENRES.map(g => <option key={g} value={g} className="bg-zinc-900">{g}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-12 pb-12">
        {PRIORITY_ORDER.map(priority => (
          <WatchlistSection
            key={priority}
            priority={priority}
            typeFilter={typeFilter}
            genreFilter={genreFilter}
            refreshSignal={refreshSignals[priority]}
            onPriorityChanged={handlePriorityChanged}
          />
        ))}
      </div>
    </div>
  )
}

function WatchlistSection({
  priority,
  typeFilter,
  genreFilter,
  refreshSignal,
  onPriorityChanged,
}: {
  priority: WatchlistPriority;
  typeFilter: 'all' | 'movie' | 'show';
  genreFilter: string;
  refreshSignal: number;
  onPriorityChanged: (toPriority: WatchlistPriority) => void;
}) {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const config = PRIORITY_CONFIG[priority]
  const Icon = config.icon

  useEffect(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
    fetchPage(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority, typeFilter, genreFilter, refreshSignal])

  async function fetchPage(targetPage: number, isInitial = false) {
    if (isInitial) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams()
      params.set('priority', priority)
      params.set('page', targetPage.toString())
      params.set('limit', '24')
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (genreFilter !== 'All') params.set('genre', genreFilter)

      const res = await fetch(`/api/watchlist?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()

      if (isInitial) {
        setItems(data.items || [])
      } else {
        setItems(prev => [...prev, ...(data.items || [])])
      }
      
      setTotal(data.total)
      setHasMore(data.items.length === 24)
    } catch (err) {
      console.error(err)
      setHasMore(false)
    } finally {
      if (isInitial) setLoading(false)
      else setLoadingMore(false)
    }
  }

  // Infinite Scroll Observer
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || loading || !hasMore || items.length === 0) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingMore) {
        const nextPage = page + 1
        setPage(nextPage)
        fetchPage(nextPage)
      }
    }, { rootMargin: '200px' })

    observer.observe(sentinel)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadingMore, hasMore, page, items.length])

  // Actions
  const handleUpdatePriority = async (itemId: string, newPriority: WatchlistPriority) => {
    try {
      setActioningId(itemId)
      const res = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, priority: newPriority }),
      })
      if (!res.ok) throw new Error('Failed to update')
      
      setItems(prev => prev.filter(i => i.id !== itemId))
      setTotal(prev => prev - 1)
      if (selectedItem?.id === itemId) setSelectedItem(null)
      onPriorityChanged(newPriority)
    } catch (err) {
      console.error(err)
    } finally {
      setActioningId(null)
    }
  }

  const handleRemove = async (itemId: string) => {
    try {
      setActioningId(itemId)
      await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId }),
      })
      setItems(prev => prev.filter(i => i.id !== itemId))
      setTotal(prev => prev - 1)
      if (selectedItem?.id === itemId) setSelectedItem(null)
    } catch (err) {
      console.error(err)
    } finally {
      setActioningId(null)
    }
  }

  const handleMarkAsWatched = async (item: WatchlistItem) => {
    if (!item.media) return
    try {
      setActioningId(item.id)
      await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: item.media.tmdb_id,
          type: item.media.type,
          watched_at: new Date().toISOString().split('T')[0],
        }),
      })
      await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      setItems(prev => prev.filter(i => i.id !== item.id))
      setTotal(prev => prev - 1)
      if (selectedItem?.id === item.id) setSelectedItem(null)
    } catch (err) {
      console.error(err)
    } finally {
      setActioningId(null)
    }
  }

  const modalItem = selectedItem?.media ? {
    tmdb_id: selectedItem.media.tmdb_id,
    type: selectedItem.media.type as 'movie' | 'show',
    title: selectedItem.media.title,
    overview: selectedItem.media.overview || '',
    poster_url: selectedItem.media.poster_url,
    release_year: selectedItem.media.release_year,
    genres: selectedItem.media.genres,
  } as TmdbSearchResult : null;

  // Don't render anything if not loading and 0 items (unless it's Must Watch and no filters to avoid totally empty page look)
  if (!loading && items.length === 0 && (typeFilter !== 'all' || genreFilter !== 'All' || priority !== 'must_watch')) {
    if (typeFilter === 'all' && genreFilter === 'All') return null; // Fully empty queue naturally -> hide it
  }

  return (
    <div className="space-y-5">
      {/* Group Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-white/[0.04]">
        <div className={`p-1.5 rounded-lg border ${config.color.split(' ')[1]} ${config.color.split(' ')[2]}`}>
          <Icon className={`w-4 h-4 ${config.color.split(' ')[0]}`} />
        </div>
        <h2 className="text-lg font-bold tracking-tight text-white">
          {PRIORITY_LABELS[priority]}
        </h2>
        <span className="text-xs font-semibold text-zinc-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
          {loading ? '...' : total}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {[0, 1, 2, 3].map((j) => (
            <div key={j} className="glass-card rounded-lg p-3.5 flex gap-4 backdrop-blur-md animate-pulse border border-white/5">
              <div className="w-14 h-20 rounded-[var(--radius-xl)] bg-white/5 shrink-0" />
              <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                <div className="space-y-2">
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/4" />
                </div>
                <div className="h-3.5 bg-white/5 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-zinc-600 text-xs italic pl-1 py-2">No matching items.</p>
      ) : (
        <>
          <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            <AnimatePresence mode="popLayout">
              {items.map((item) => {
                const isActioning = actioningId === item.id
                const selectableItem = item.media ? {
                  tmdb_id: item.media.tmdb_id,
                  type: item.media.type as 'movie' | 'show',
                  title: item.media.title,
                  overview: item.media.overview || '',
                  poster_url: item.media.poster_url,
                  release_year: item.media.release_year,
                  genres: item.media.genres,
                } : null;

                return (
                  <SelectableOverlay key={item.id} item={selectableItem as TmdbSearchResult}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    style={{ height: '100%' }}
                  >
                    <Card
                      onClick={() => setSelectedItem(item)}
                      style={{ padding: '14px', display: 'flex', gap: '16px', position: 'relative', height: '100%', userSelect: 'none' }}
                      className="group cursor-pointer"
                    >
                      {item.media?.poster_url ? (
                        <img
                          src={item.media?.poster_url}
                          alt={item.media?.title}
                          className="w-14 h-20 rounded-[var(--radius-xl)] object-cover shadow-md shadow-black/20 border border-white/5 shrink-0 bg-zinc-900"
                        />
                      ) : (
                        <div className="w-14 h-20 rounded-[var(--radius-xl)] bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] text-zinc-700 shrink-0">
                          No Poster
                        </div>
                      )}
                      <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5 pr-14">
                        <div>
                          <p className="font-bold text-white text-sm line-clamp-1 group-hover:text-violet-400 transition-colors">
                            {item.media?.title}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {item.media?.release_year}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                          {item.media?.type === 'show' ? (
                            <><Tv className="w-3.5 h-3.5 text-rose-500/80" /><span>TV Show</span></>
                          ) : (
                            <><Film className="w-3.5 h-3.5 text-violet-500/80" /><span>Movie</span></>
                          )}
                        </div>
                      </div>

                      {/* Actions row on hover */}
                      <div className="absolute top-3.5 right-3.5 flex flex-col gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200" onClick={e => e.stopPropagation()}>
                        {isActioning ? (
                          <div className="p-1"><Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" /></div>
                        ) : (
                          <div className="flex gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-sm border border-white/10">
                            {priority !== 'must_watch' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpdatePriority(item.id, 'must_watch') }}
                                className="p-1.5 rounded-sm text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Move to Must Watch"
                              ><Flame className="w-3.5 h-3.5" /></button>
                            )}
                            {priority !== 'want_to_watch' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpdatePriority(item.id, 'want_to_watch') }}
                                className="p-1.5 rounded-sm text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                                title="Move to Want to Watch"
                              ><Sparkles className="w-3.5 h-3.5" /></button>
                            )}
                            {priority !== 'someday' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpdatePriority(item.id, 'someday') }}
                                className="p-1.5 rounded-sm text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                                title="Move to Someday"
                              ><Inbox className="w-3.5 h-3.5" /></button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemove(item.id) }}
                              className="p-1.5 rounded-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Remove"
                            ><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                  </SelectableOverlay>
                )
              })}
            </AnimatePresence>
          </motion.div>
          
          {hasMore && (
            <div ref={sentinelRef} className="h-20 flex items-center justify-center">
              {loadingMore && <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />}
            </div>
          )}
        </>
      )}

      {/* Media Detail Modal */}
      <AnimatePresence>
        {selectedItem && modalItem && (
          <MediaInfoModal
            item={modalItem}
            onClose={() => setSelectedItem(null)}
            onAddToWatchlist={async () => {}}
            onMarkAsWatched={async () => handleMarkAsWatched(selectedItem)}
            currentPriority={selectedItem.priority}
            onUpdatePriority={async (newPriority) => handleUpdatePriority(selectedItem.id, newPriority)}
            onRemoveFromWatchlist={async () => handleRemove(selectedItem.id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
