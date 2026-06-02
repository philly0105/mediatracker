'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Sparkles, Inbox, Film, Tv, Calendar, Loader2, Trash2 } from 'lucide-react'
import type { WatchlistItem, WatchlistPriority, TmdbSearchResult } from '@/types'
import MediaInfoModal from '@/components/MediaInfoModal'

const PRIORITY_LABELS = {
  must_watch: 'Must Watch',
  want_to_watch: 'Want to Watch',
  someday: 'Someday',
}
const PRIORITY_ORDER: Array<keyof typeof PRIORITY_LABELS> = ['must_watch', 'want_to_watch', 'someday']

const PRIORITY_CONFIG = {
  must_watch: {
    color: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
    icon: Flame,
  },
  want_to_watch: {
    color: 'text-orange-400 border-orange-500/20 bg-orange-500/5',
    icon: Sparkles,
  },
  someday: {
    color: 'text-zinc-400 border-zinc-800 bg-zinc-800/10',
    icon: Inbox,
  },
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWatchlist() {
      try {
        setLoading(true)
        const res = await fetch('/api/watchlist')
        if (!res.ok) throw new Error('Failed to load watchlist')
        const data = await res.json()
        setItems(data.items || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchWatchlist()
  }, [])

  const handleUpdatePriority = async (itemId: string, newPriority: WatchlistPriority) => {
    try {
      setActioningId(itemId)
      const res = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, priority: newPriority }),
      })
      if (!res.ok) throw new Error('Failed to update priority')
      
      setItems(prev => prev.map(item => item.id === itemId ? { ...item, priority: newPriority } : item))
      setSelectedItem(prev => (prev && prev.id === itemId) ? { ...prev, priority: newPriority } : prev)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActioningId(null)
    }
  }

  const handleRemove = async (itemId: string) => {
    try {
      setActioningId(itemId)
      const res = await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId }),
      })
      if (!res.ok) throw new Error('Failed to remove item')
      
      setItems(prev => prev.filter(item => item.id !== itemId))
      if (selectedItem?.id === itemId) {
        setSelectedItem(null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActioningId(null)
    }
  }

  const handleMarkAsWatched = async (item: WatchlistItem) => {
    if (!item.media) return
    try {
      setActioningId(item.id)
      const watchRes = await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: item.media.tmdb_id,
          type: item.media.type,
          watched_at: new Date().toISOString().split('T')[0],
        }),
      })
      if (!watchRes.ok) throw new Error('Failed to log watch history')

      const deleteRes = await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      if (!deleteRes.ok) throw new Error('Failed to remove from watchlist')

      setItems(prev => prev.filter(i => i.id !== item.id))
      if (selectedItem?.id === item.id) {
        setSelectedItem(null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActioningId(null)
    }
  }

  const grouped = useMemo(() => {
    return PRIORITY_ORDER.reduce((acc, p) => {
      acc[p] = items.filter((i) => i.priority === p)
      return acc
    }, {} as Record<WatchlistPriority, WatchlistItem[]>)
  }, [items])

  const modalItem = useMemo(() => {
    if (!selectedItem || !selectedItem.media) return null
    return {
      tmdb_id: selectedItem.media.tmdb_id,
      type: selectedItem.media.type,
      title: selectedItem.media.title,
      overview: selectedItem.media.overview || '',
      poster_url: selectedItem.media.poster_url,
      release_year: selectedItem.media.release_year,
      genres: selectedItem.media.genres,
    } as TmdbSearchResult
  }, [selectedItem])

  if (loading) {
    return (
      <div className="space-y-12">
        {/* Header */}
        <div className="flex flex-col gap-1.5 animate-pulse">
          <div className="h-9 bg-white/10 rounded-lg w-48" />
          <div className="h-4 bg-white/5 rounded w-72 mt-1" />
        </div>

        {/* Lists per Priority */}
        {PRIORITY_ORDER.map((priority) => (
          <div key={priority} className="space-y-5">
            <div className="flex items-center gap-3 pb-2 border-b border-white/[0.04] animate-pulse">
              <div className="w-7 h-7 rounded-lg bg-white/5" />
              <div className="h-5 bg-white/10 rounded w-32" />
              <div className="w-6 h-4 rounded-full bg-white/5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((j) => (
                <div key={j} className="glass-card rounded-2xl p-3.5 flex gap-4 backdrop-blur-md animate-pulse border border-white/5">
                  <div className="w-14 h-20 rounded-xl bg-white/5 shrink-0" />
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
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 animate-pulse">
          <Inbox className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
        <p className="text-sm text-zinc-400 max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 active:scale-95 transition-all text-sm font-semibold"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          Watchlist
        </h1>
        <p className="text-sm text-zinc-400">
          Prioritize movies and shows you want to watch next.
        </p>
      </div>

      {/* Lists per Priority */}
      {PRIORITY_ORDER.map(priority => {
        const config = PRIORITY_CONFIG[priority]
        const Icon = config.icon
        const count = grouped[priority].length

        return (
          <div key={priority} className="space-y-5">
            {/* Group Header */}
            <div className="flex items-center gap-3 pb-2 border-b border-white/[0.04]">
              <div className={`p-1.5 rounded-lg border ${config.color.split(' ')[1]} ${config.color.split(' ')[2]}`}>
                <Icon className={`w-4 h-4 ${config.color.split(' ')[0]}`} />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                {PRIORITY_LABELS[priority]}
              </h2>
              <span className="text-xs font-semibold text-zinc-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                {count}
              </span>
            </div>

            {/* Grid */}
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {grouped[priority].map((item) => {
                  const isActioning = actioningId === item.id
                  return (
                    <motion.div
                      layout
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setSelectedItem(item)}
                      className="glass-card rounded-2xl p-3.5 flex gap-4 backdrop-blur-md select-none group hover:scale-[1.015] hover:border-white/10 transition-all duration-300 cursor-pointer relative"
                    >
                      {item.media?.poster_url ? (
                        <img
                          src={item.media.poster_url}
                          alt={item.media.title}
                          className="w-14 h-20 rounded-xl object-cover shadow-md shadow-black/20 border border-white/5 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-20 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] text-zinc-700 shrink-0">
                          No Poster
                        </div>
                      )}
                      <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5 pr-20">
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
                            <>
                              <Tv className="w-3.5 h-3.5 text-rose-500/80" />
                              <span>TV Show</span>
                            </>
                          ) : (
                            <>
                              <Film className="w-3.5 h-3.5 text-violet-500/80" />
                              <span>Movie</span>
                            </>
                          )}
                          <span className="text-[9px] text-zinc-600 font-normal normal-case">
                            · Added {item.added_at.split(' ')[0]}
                          </span>
                        </div>
                      </div>

                      {/* Actions row on hover */}
                      <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                        {isActioning ? (
                          <div className="p-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                          </div>
                        ) : (
                          <>
                            {priority !== 'must_watch' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUpdatePriority(item.id, 'must_watch')
                                }}
                                className="p-1 rounded-lg bg-black/40 border border-white/5 text-zinc-400 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all duration-200"
                                title="Move to Must Watch"
                              >
                                <Flame className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {priority !== 'want_to_watch' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUpdatePriority(item.id, 'want_to_watch')
                                }}
                                className="p-1 rounded-lg bg-black/40 border border-white/5 text-zinc-400 hover:text-orange-400 hover:border-orange-500/20 hover:bg-orange-500/5 transition-all duration-200"
                                title="Move to Want to Watch"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {priority !== 'someday' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUpdatePriority(item.id, 'someday')
                                }}
                                className="p-1 rounded-lg bg-black/40 border border-white/5 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/10 transition-all duration-200"
                                title="Move to Someday"
                              >
                                <Inbox className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemove(item.id)
                              }}
                              className="p-1 rounded-lg bg-black/40 border border-white/5 text-zinc-400 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-all duration-200"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>

            {count === 0 && (
              <p className="text-zinc-600 text-xs italic pl-1">
                No items in this queue.
              </p>
            )}
          </div>
        )
      })}

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
