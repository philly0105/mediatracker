'use client'
import { useEffect, useState } from 'react'
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
  TrendingUp
} from 'lucide-react'

interface Recommendation {
  tmdb_id: number
  type: 'movie' | 'show'
  title: string
  overview: string
  poster_url: string | null
  release_year: number | null
}

export default function RecommendationsPage() {
  const [items, setItems] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fallback, setFallback] = useState(false)
  const [actioningId, setActioningId] = useState<number | null>(null)

  async function loadRecommendations() {
    try {
      setLoading(true)
      const res = await fetch('/api/recommendations')
      if (!res.ok) throw new Error('Failed to load recommendations')
      const data = await res.json()
      setItems(data.results ?? [])
      setFallback(data.fallback ?? false)
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

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent flex items-center gap-2.5">
          <Sparkles className="w-7 h-7 text-violet-400 fill-violet-400/10" />
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
            <div key={i} className="glass-card rounded-2xl p-4 flex gap-4 animate-pulse">
              <div className="w-20 h-28 bg-zinc-900 rounded-xl" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 bg-zinc-900 rounded w-3/4" />
                <div className="h-3 bg-zinc-900 rounded w-1/2" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 bg-zinc-900 rounded w-full" />
                  <div className="h-3 bg-zinc-900 rounded w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error Layout */
        <div className="glass-card rounded-2xl p-8 border border-red-500/20 text-center max-w-md mx-auto space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Something went wrong</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">{error}</p>
          <button
            onClick={loadRecommendations}
            className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs transition-colors hover:bg-zinc-200"
          >
            Try Again
          </button>
        </div>
      ) : items.length === 0 ? (
        /* Empty state */
        <div className="glass-card rounded-2xl p-10 text-center border border-dashed border-white/10 max-w-md mx-auto space-y-4">
          <Sparkles className="w-10 h-10 text-violet-400 mx-auto opacity-50" />
          <h2 className="text-lg font-bold text-white">All Caught Up</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            No recommendations remaining! Try logging more movies or TV shows to refresh your feed.
          </p>
        </div>
      ) : (
        /* Main Recommendations Grid */
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.tmdb_id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="glass-card rounded-2xl p-4 flex gap-4 relative overflow-hidden group select-none hover:border-white/10 hover:shadow-lg hover:shadow-violet-500/[0.02]"
              >
                {/* Poster image */}
                {item.poster_url ? (
                  <img
                    src={item.poster_url}
                    alt={item.title}
                    className="w-20 h-28 rounded-xl object-cover shadow-md shadow-black/30 border border-white/5 shrink-0"
                  />
                ) : (
                  <div className="w-20 h-28 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] text-zinc-700 shrink-0">
                    No Poster
                  </div>
                )}

                {/* Metadata & Actions */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-bold text-white text-sm line-clamp-1 group-hover:text-violet-400 transition-colors">
                        {item.title}
                      </h2>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 border border-white/[0.03] px-1.5 py-0.5 rounded">
                        {item.type === 'show' ? 'TV' : 'Movie'}
                      </span>
                    </div>
                    {item.release_year && (
                      <p className="text-xs text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.release_year}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed pt-0.5">
                      {item.overview || 'No description available.'}
                    </p>
                  </div>

                  {/* Actions Row */}
                  <div className="flex gap-2 pt-3">
                    <button
                      disabled={actioningId !== null}
                      onClick={() => handleAddToWatchlist(item.tmdb_id, item.type)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-semibold text-xs transition-all duration-300 hover:bg-violet-600 hover:border-violet-500 hover:text-white disabled:opacity-50"
                    >
                      {actioningId === item.tmdb_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Watchlist</span>
                    </button>
                    
                    <button
                      disabled={actioningId !== null}
                      onClick={() => handleMarkAsWatched(item.tmdb_id, item.type)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-semibold text-xs transition-all duration-300 hover:bg-emerald-600 hover:border-emerald-500 hover:text-white disabled:opacity-50"
                    >
                      {actioningId === item.tmdb_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Watched</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
