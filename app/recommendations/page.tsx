'use client'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Bookmark,
  Check,
  Film,
  Tv,
  Loader2,
  Calendar,
  AlertCircle,
  Plus,
  Star
} from 'lucide-react'
import MediaInfoModal from '@/components/MediaInfoModal'
import SelectableOverlay from '@/components/SelectableOverlay'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Recommendation {
  tmdb_id: number
  type: 'movie' | 'show'
  title: string
  overview: string
  poster_url: string | null
  release_year: number | null
  genres?: string[]
  vote_average?: number
}

export default function RecommendationsPage() {
  const [items, setItems] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fallback, setFallback] = useState(false)
  const [actioningId, setActioningId] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(10)
  const [activeGenre, setActiveGenre] = useState('All')
  const [selectedItem, setSelectedItem] = useState<Recommendation | null>(null)
  const [activeType, setActiveType] = useState<'all' | 'movie' | 'show'>('all')

  const loadMoreRef = useRef<HTMLDivElement>(null)

  async function loadRecommendations() {
    try {
      setLoading(true)
      const res = await fetch('/api/recommendations')
      if (!res.ok) throw new Error('Failed to load recommendations')
      const data = await res.json()
      setItems(data.results ?? [])
      setFallback(data.fallback ?? false)
      setVisibleCount(10)
      setActiveGenre('All')
      setActiveType('all')
      setSelectedItem(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecommendations()
  }, [])

  async function handleAddToWatchlist(tmdbId: number, type: 'movie' | 'show') {
    try {
      setActioningId(tmdbId)
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: tmdbId, type, priority: 'must_watch' }),
      })
      if (!res.ok) throw new Error('Failed to add to watchlist')
      
      // Animate card removal
      setItems((prev) => prev.filter((item) => item.tmdb_id !== tmdbId))
    } catch (err) {
      console.error(err)
    } finally {
      setActioningId(null)
    }
  }

  async function handleMarkAsWatched(tmdbId: number, type: 'movie' | 'show') {
    try {
      setActioningId(tmdbId)
      const res = await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: tmdbId,
          type,
          watched_at: new Date().toISOString().split('T')[0],
        }),
      })
      if (!res.ok) throw new Error('Failed to mark as watched')

      // Animate card removal
      setItems((prev) => prev.filter((item) => item.tmdb_id !== tmdbId))
    } catch (err) {
      console.error(err)
    } finally {
      setActioningId(null)
    }
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

  // 3. Filter by Genre
  const filteredItems = activeGenre === 'All'
    ? typeFilteredItems
    : typeFilteredItems.filter((item) => (item.genres ?? []).includes(activeGenre))

  const visibleItems = filteredItems.slice(0, visibleCount)

  // Infinite Scroll logic
  useEffect(() => {
    if (!loadMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredItems.length) {
          setVisibleCount((prev) => prev + 10)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [visibleCount, filteredItems.length])

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 flex items-center gap-2.5">
          <Sparkles className="w-7 h-7 text-[var(--accent)] fill-[var(--accent)]/10" />
          <span>Recommendations</span>
        </h1>
        <p className="text-sm text-zinc-400">
          {fallback 
            ? 'We compiled this week\'s overall trending items to get you started!' 
            : 'Personalized recommendations based on similar titles from your watch history.'}
        </p>
      </div>

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
        <Card className="p-8 border border-[var(--live)]/20 text-center max-w-md mx-auto space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Something went wrong</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">{error}</p>
          <Button onClick={loadRecommendations}>
            Try Again
          </Button>
        </Card>
      ) : items.length === 0 ? (
        /* Empty state */
        <Card className="p-10 text-center border border-dashed border-[var(--border-default)] max-w-md mx-auto space-y-4">
          <Sparkles className="w-10 h-10 text-[var(--accent)] mx-auto opacity-50" />
          <h2 className="text-lg font-bold text-white">All Caught Up</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            No recommendations remaining! Try logging more movies or TV shows to refresh your feed.
          </p>
        </Card>
      ) : (
        /* Main Recommendations Grid */
        <div className="space-y-8">
          {/* Media Type Switch */}
          <div className="flex justify-start">
            <div className="inline-flex p-1 rounded-sm bg-[var(--surface-input)] border border-[var(--border-subtle)] select-none">
              {([
                { id: 'all', label: 'All Recommendations' },
                { id: 'movie', label: 'Movies' },
                { id: 'show', label: 'TV Shows' },
              ] as const).map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setActiveType(type.id)
                    setActiveGenre('All')
                    setVisibleCount(10)
                  }}
                  className={`relative px-4 py-2 rounded-sm font-bold text-xs transition-all duration-300 active:scale-95 whitespace-nowrap ${
                    activeType === type.id
                      ? 'text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {activeType === type.id && (
                    <motion.div
                      layoutId="activeTypeHighlight"
                      className="absolute inset-0 bg-white/10 rounded-sm -z-10 shadow-md"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Genre Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
            {topGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => {
                  setActiveGenre(genre)
                  setVisibleCount(10)
                }}
                className={`relative px-4 py-2 rounded-sm font-semibold text-xs transition-all duration-300 whitespace-nowrap active:scale-95 ${
                  activeGenre === genre
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10'
                }`}
              >
                {activeGenre === genre && (
                  <motion.div
                    layoutId="activeGenreTab"
                    className="absolute inset-0 bg-[var(--accent)] rounded-sm -z-10 shadow-lg shadow-green-600/20"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span>{genre}</span>
              </button>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <Card className="p-10 text-center border border-dashed border-[var(--border-default)] max-w-sm mx-auto space-y-3">
              <Sparkles className="w-8 h-8 text-[var(--accent)] mx-auto opacity-50 animate-pulse" />
              <p className="text-sm font-bold text-white">Genre Cleared</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                No recommendations left in {activeGenre}. Try exploring other categories!
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {visibleItems.map((item) => (
                  <SelectableOverlay key={item.tmdb_id} item={item}>
                  <motion.div
                    layout="position"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, y: 15 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    onClick={() => setSelectedItem(item)}
                    className="bg-[var(--glass-card)] hover:bg-[var(--glass-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-lg p-4 flex gap-4 relative overflow-hidden group select-none hover:shadow-[var(--glow-violet)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                  >
                    {/* Poster image */}
                    {item.poster_url ? (
                      <img
                        src={item.poster_url}
                        alt={item.title}
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
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed pt-0.5">
                          {item.overview || 'No description available.'}
                        </p>
                      </div>

                      {/* Actions Row */}
                      <div className="flex flex-wrap gap-2 pt-3">
                        <Button
                          disabled={actioningId !== null}
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
                          disabled={actioningId !== null}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsWatched(item.tmdb_id, item.type)
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
                  </motion.div>
                  </SelectableOverlay>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Infinite Scroll Trigger */}
          {visibleCount < filteredItems.length && (
            <div ref={loadMoreRef} className="flex justify-center pt-8 pb-4">
              <Loader2 className="w-6 h-6 text-[var(--accent)]/50 animate-spin" />
            </div>
          )}
        </div>
      )}

      {selectedItem && (
        <MediaInfoModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToWatchlist={() => handleAddToWatchlist(selectedItem.tmdb_id, selectedItem.type)}
          onMarkAsWatched={() => handleMarkAsWatched(selectedItem.tmdb_id, selectedItem.type)}
        />
      )}
    </div>
  )
}
