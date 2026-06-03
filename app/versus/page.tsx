'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Swords,
  AlertCircle,
  Sparkles,
  Loader2,
  Calendar,
  Star,
  Film,
  Tv,
  Check
} from 'lucide-react'
import type { TmdbSearchResult } from '@/types'
import MediaInfoModal from '@/components/MediaInfoModal'

export default function VersusPage() {
  const [pool, setPool] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [actioningId, setActioningId] = useState<number | null>(null)
  
  const [infoModalItem, setInfoModalItem] = useState<TmdbSearchResult | null>(null)

  useEffect(() => {
    async function fetchPool() {
      try {
        setLoading(true)
        const res = await fetch('/api/recommendations')
        if (!res.ok) throw new Error('Failed to load recommendations')
        const data = await res.json()
        
        // Shuffle the recommendations to make it random each time
        const shuffled = [...(data.results || [])].sort(() => Math.random() - 0.5)
        setPool(shuffled)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchPool()
  }, [])

  const currentPair = pool.slice(currentIndex, currentIndex + 2)

  async function handlePick(item: TmdbSearchResult) {
    if (actioningId !== null) return
    try {
      setSelectedId(item.tmdb_id)
      setActioningId(item.tmdb_id)
      // Add winner to watchlist
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: item.tmdb_id, type: item.type, priority: 'want_to_watch' })
      })
      
      // Briefly wait to show selection animation before advancing
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 2)
        setSelectedId(null)
        setActioningId(null)
      }, 600)
    } catch (err) {
      console.error(err)
      setActioningId(null)
      setSelectedId(null)
    }
  }

  function handleSkip() {
    setCurrentIndex((prev) => prev + 2)
  }

  return (
    <div className="space-y-10 pb-12 overflow-hidden flex flex-col min-h-[80vh]">
      <div className="flex flex-col gap-1.5 items-center text-center">
        <h1 className="text-4xl font-black tracking-tight text-white bg-gradient-to-r from-rose-400 via-orange-400 to-amber-500 bg-clip-text text-transparent flex items-center gap-3">
          <Swords className="w-8 h-8 text-rose-500 fill-rose-500/20" />
          <span>Versus Battles</span>
        </h1>
        <p className="text-sm text-zinc-400 max-w-lg mx-auto">
          Two personalized recommendations enter. You choose which one goes directly to your Watchlist. 
          May the best title win!
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 border border-red-500/20 text-center max-w-md mx-auto space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Something went wrong</h2>
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      ) : currentPair.length < 2 ? (
        <div className="glass-card rounded-2xl p-10 text-center border border-dashed border-white/10 max-w-md mx-auto space-y-4">
          <Sparkles className="w-10 h-10 text-rose-400 mx-auto opacity-50" />
          <h2 className="text-lg font-bold text-white">Battle Arena Empty</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            You've exhausted your recommendations! Rate more movies to generate fresh battles.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto relative px-4">
          
          <div className="flex flex-col md:flex-row items-stretch justify-center w-full gap-8 md:gap-12 relative z-10">
            <AnimatePresence mode="popLayout">
              {currentPair.map((item, idx) => {
                const isSelected = selectedId === item.tmdb_id
                const isLoser = selectedId !== null && selectedId !== item.tmdb_id
                
                return (
                  <motion.div
                    key={item.tmdb_id}
                    initial={{ opacity: 0, x: idx === 0 ? -100 : 100, scale: 0.9, rotate: idx === 0 ? -5 : 5 }}
                    animate={{ opacity: isLoser ? 0 : 1, x: isLoser ? (idx === 0 ? -200 : 200) : 0, scale: isSelected ? 1.05 : 1, rotate: 0 }}
                    exit={{ opacity: 0, y: -100, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className={`w-full md:w-1/2 flex flex-col glass-card rounded-[2rem] overflow-hidden relative group cursor-pointer transition-colors duration-500 ${
                      isSelected ? 'border-emerald-500 bg-emerald-500/10 shadow-2xl shadow-emerald-500/20 z-20' : 'hover:border-rose-500/50 hover:shadow-2xl hover:shadow-rose-500/10 border-white/5'
                    }`}
                    onClick={() => handlePick(item)}
                  >
                    {/* Selection Overlay */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-emerald-500/20 backdrop-blur-sm z-30 flex items-center justify-center"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', bounce: 0.5 }}
                            className="bg-emerald-500 text-white rounded-full p-4 shadow-2xl"
                          >
                            <Check className="w-12 h-12" />
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Content */}
                    <div className="relative h-64 md:h-96 w-full shrink-0 bg-zinc-900 border-b border-white/5">
                      {item.poster_url ? (
                        <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">No Poster</div>
                      )}
                      
                      {/* Gradient fade to blend into text area */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      
                      {/* Info Button Overlay */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          setInfoModalItem(item)
                        }}
                        className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 transition-colors z-20"
                      >
                        Info
                      </button>

                      {/* Type Badge */}
                      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 z-20">
                        {item.type === 'show' ? <Tv className="w-3 h-3 text-rose-400" /> : <Film className="w-3 h-3 text-violet-400" />}
                        {item.type === 'show' ? 'Show' : 'Movie'}
                      </div>
                      
                      {/* Title overlaid on image bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 z-10">
                        <h2 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-xl">{item.title}</h2>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col flex-1 bg-black/40">
                      <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400 mb-4">
                        {item.release_year && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {item.release_year}
                          </span>
                        )}
                        {item.vote_average !== undefined && item.vote_average > 0 && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Star className="w-4 h-4 fill-amber-400" />
                            {item.vote_average.toFixed(1)}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-zinc-300 leading-relaxed line-clamp-4 flex-1">
                        {item.overview || 'No synopsis available.'}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Floating "VS" badge */}
            <div className="absolute left-1/2 top-1/3 md:top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none hidden md:flex items-center justify-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                key={`vs-${currentIndex}`}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 shadow-2xl shadow-rose-500/50 flex items-center justify-center border-4 border-[#0d0d0f]"
              >
                <span className="text-xl font-black text-white italic tracking-tighter pr-1">VS</span>
              </motion.div>
            </div>
          </div>

          <div className="mt-12 text-center relative z-10">
            <button
              disabled={actioningId !== null}
              onClick={handleSkip}
              className="text-sm font-bold text-zinc-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-6 py-2.5 rounded-full border border-white/5 active:scale-95 disabled:opacity-50"
            >
              Skip Both
            </button>
            <p className="text-xs text-zinc-600 mt-4 font-medium uppercase tracking-widest">
              Round {Math.floor(currentIndex / 2) + 1} / {Math.floor(pool.length / 2)}
            </p>
          </div>
        </div>
      )}

      {infoModalItem && (
        <MediaInfoModal
          item={infoModalItem}
          onClose={() => setInfoModalItem(null)}
          onAddToWatchlist={async () => {
            await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: infoModalItem.tmdb_id, type: infoModalItem.type, priority: 'must_watch' })
            })
          }}
          onMarkAsWatched={async () => {
            await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: infoModalItem.tmdb_id, type: infoModalItem.type, watched_at: new Date().toISOString().split('T')[0] })
            })
          }}
        />
      )}
    </div>
  )
}
