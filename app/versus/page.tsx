'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Swords,
  AlertCircle,
  Loader2,
  Calendar,
  Star,
  Film,
  Tv,
  Check,
  Trophy,
  Plus,
  Play
} from 'lucide-react'
import type { TmdbSearchResult } from '@/types'
import MediaInfoModal from '@/components/MediaInfoModal'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const GENRE_OPTIONS = [
  { id: 'any', name: 'Surprise Me (Any)' },
  { id: '28', name: 'Action & Sci-Fi' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comedy' },
  { id: '80', name: 'Crime' },
  { id: '99', name: 'Documentary' },
  { id: '18', name: 'Drama' },
  { id: '10751', name: 'Family' },
  { id: '14', name: 'Fantasy' },
  { id: '27', name: 'Horror' },
  { id: '9648', name: 'Mystery' },
  { id: '10749', name: 'Romance' },
  { id: '53', name: 'Thriller' },
]

export default function VersusPage() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'results'>('setup')
  
  // Setup State
  const [selectedType, setSelectedType] = useState<'movie' | 'show'>('movie')
  const [selectedGenreId, setSelectedGenreId] = useState<string>('any')
  
  const [pool, setPool] = useState<TmdbSearchResult[]>([])
  const [poolIndex, setPoolIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Playing State
  const [round, setRound] = useState(1)
  const [currentOptions, setCurrentOptions] = useState<TmdbSearchResult[]>([])
  const [selectedHistory, setSelectedHistory] = useState<TmdbSearchResult[]>([])
  
  // Results State
  const [topGenre, setTopGenre] = useState<string>('')
  const [bonusRecs, setBonusRecs] = useState<TmdbSearchResult[]>([])
  const [finalWinner, setFinalWinner] = useState<TmdbSearchResult | null>(null)
  
  const [actioningId, setActioningId] = useState<number | null>(null)
  const [infoModalItem, setInfoModalItem] = useState<TmdbSearchResult | null>(null)
  const [watchlistSet, setWatchlistSet] = useState<Set<number>>(new Set())

  async function startTournament() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/versus?type=${selectedType}&genreId=${selectedGenreId}`)
      if (!res.ok) throw new Error('Failed to load tournament pool')
      const data = await res.json()
      
      const shuffled = [...(data.results || [])].sort(() => Math.random() - 0.5)
      
      if (shuffled.length < 31) {
        throw new Error("Not enough un-watched items matching your criteria to build a 10-round tournament! Try a different genre or type.")
      }
      
      setPool(shuffled)
      setCurrentOptions(shuffled.slice(0, 4))
      setPoolIndex(4)
      setGameState('playing')
      setRound(1)
      setSelectedHistory([])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handlePick(item: TmdbSearchResult) {
    if (actioningId !== null) return
    
    const newHistory = [...selectedHistory, item]
    setSelectedHistory(newHistory)
    
    if (round === 10) {
      calculateResults(newHistory, item)
      setFinalWinner(item)
      setGameState('results')
    } else {
      const newChallengers = pool.slice(poolIndex, poolIndex + 3)
      const nextOptions = [item, ...newChallengers].sort(() => Math.random() - 0.5)
      
      setCurrentOptions(nextOptions)
      setPoolIndex(poolIndex + 3)
      setRound(round + 1)
    }
  }

  function calculateResults(history: TmdbSearchResult[], winner: TmdbSearchResult) {
    const genreCounts: Record<string, number> = {}
    history.forEach(item => {
      (item.genres || []).forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1
      })
    })
    
    let bestGenre = ''
    let maxCount = 0
    Object.entries(genreCounts).forEach(([g, count]) => {
      if (count > maxCount) {
        maxCount = count
        bestGenre = g
      }
    })
    
    setTopGenre(bestGenre)
    
    const remaining = pool.slice(poolIndex + 3)
    const matches = remaining.filter(item => (item.genres || []).includes(bestGenre) && item.tmdb_id !== winner.tmdb_id)
    
    if (matches.length < 4) {
      const others = remaining.filter(item => !(item.genres || []).includes(bestGenre) && item.tmdb_id !== winner.tmdb_id)
      matches.push(...others)
    }
    
    setBonusRecs(matches.slice(0, 4))
  }

  async function handleAddToWatchlist(item: TmdbSearchResult) {
    try {
      setActioningId(item.tmdb_id)
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: item.tmdb_id, type: item.type, priority: 'must_watch' })
      })
      setWatchlistSet(prev => {
        const next = new Set(prev)
        next.add(item.tmdb_id)
        return next
      })
    } catch (err) {
      console.error(err)
    } finally {
      setActioningId(null)
    }
  }

  function resetGame() {
    setGameState('setup')
    setPool([])
    setTopGenre('')
    setBonusRecs([])
    setFinalWinner(null)
    setWatchlistSet(new Set())
  }

  return (
    <div className="space-y-10 pb-12 overflow-hidden flex flex-col min-h-[80vh]">
      <div className="flex flex-col gap-1.5 items-center text-center">
        <h1 className="text-4xl font-black tracking-tight text-white bg-gradient-to-r from-green-400 via-zinc-200 to-teal-500 bg-clip-text text-transparent flex items-center gap-3">
          <Swords className="w-8 h-8 text-green-500 fill-green-500/10" />
          <span>Tournament</span>
        </h1>
        <p className="text-sm text-zinc-400 max-w-lg mx-auto">
          {gameState === 'setup' && 'Configure your tournament before we start.'}
          {gameState === 'playing' && '10 Rounds. 4 Options. The winner moves on. Find your ultimate watch vibe.'}
          {gameState === 'results' && 'The results are in. Here is your ultimate winner and personalized vibe.'}
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
        </div>
      ) : error ? (
        <Card style={{ maxWidth: '448px', margin: '0 auto', textAlign: 'center' }} className="space-y-6 border-red-500/20">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <div>
            <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{error}</p>
          </div>
          <Button onClick={() => setError(null)}>
            Try Again
          </Button>
        </Card>
      ) : gameState === 'setup' ? (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto px-4">
          <Card className="w-full space-y-8">
            <div className="space-y-4">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block text-center">What are we watching?</label>
              <div className="flex bg-black/40 p-1.5 rounded-sm">
                <button
                  onClick={() => setSelectedType('movie')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-sm font-bold text-sm transition-all ${
                    selectedType === 'movie' ? 'bg-[var(--green-500)] text-zinc-950 shadow-lg shadow-green-500/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Film className="w-4 h-4" /> Movies
                </button>
                <button
                  onClick={() => setSelectedType('show')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-sm font-bold text-sm transition-all ${
                    selectedType === 'show' ? 'bg-[var(--green-500)] text-zinc-950 shadow-lg shadow-green-500/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Tv className="w-4 h-4" /> TV Shows
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block text-center">Preferred Vibe (Optional)</label>
              <select
                value={selectedGenreId}
                onChange={(e) => setSelectedGenreId(e.target.value)}
                className="w-full bg-[var(--surface-input)] border border-white/10 rounded-sm px-4 py-4 text-white text-sm font-semibold outline-none focus:border-[var(--border-focus)] transition-colors appearance-none"
              >
                {GENRE_OPTIONS.map(genre => (
                  <option key={genre.id} value={genre.id} className="bg-zinc-900 text-white">
                    {genre.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={startTournament}
              fullWidth
              size="lg"
            >
              <Play className="w-5 h-5 fill-current" /> Let the Battles Begin
            </Button>
          </Card>
        </div>
      ) : gameState === 'results' && finalWinner ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-5xl mx-auto space-y-12 px-4"
        >
          {/* Winner Section */}
          <Card className="flex flex-col md:flex-row items-center md:items-stretch gap-8 p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-[var(--live)]/5 pointer-events-none" />
            
            <div className="w-48 shrink-0 relative z-10">
              <div className="absolute -inset-4 bg-[var(--accent)]/10 blur-xl rounded-full" />
              {finalWinner.poster_url ? (
                <img src={finalWinner.poster_url} className="w-full rounded-[var(--radius-xl)] shadow-2xl border border-[var(--border-subtle)] relative z-10" alt="Winner" />
              ) : (
                <div className="w-full aspect-[2/3] bg-[var(--bg-void)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] flex items-center justify-center relative z-10">No Poster</div>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-center text-center md:text-left relative z-10">
              <div className="mb-4 mx-auto md:mx-0">
                <Badge tone="rating">
                  <Trophy className="w-3.5 h-3.5 mr-1 inline" /> Ultimate Winner
                </Badge>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">{finalWinner.title}</h2>
              <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl mb-8">{finalWinner.overview}</p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <Button
                  disabled={watchlistSet.has(finalWinner.tmdb_id) || actioningId === finalWinner.tmdb_id}
                  onClick={() => handleAddToWatchlist(finalWinner)}
                >
                  {actioningId === finalWinner.tmdb_id ? <Loader2 className="w-5 h-5 animate-spin" /> : watchlistSet.has(finalWinner.tmdb_id) ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  <span className="ml-2">{watchlistSet.has(finalWinner.tmdb_id) ? 'On Watchlist' : 'Add to Watchlist'}</span>
                </Button>
                <Button
                  onClick={() => setInfoModalItem(finalWinner)}
                  variant="ghost"
                >
                  More Info
                </Button>
              </div>
            </div>
          </Card>

          {/* Vibe Section */}
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center gap-2">
              <h3 className="text-2xl font-bold text-white">Your Vibe: <span className="text-[var(--accent)]">{topGenre || 'Mixed'}</span></h3>
              <p className="text-sm text-zinc-400">Based on your choices throughout the tournament, we found some other titles you might love.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {bonusRecs.map(item => (
                <Card key={item.tmdb_id} className="p-3 flex flex-col gap-3 relative group">
                  <div className="relative aspect-[2/3] w-full rounded-[var(--radius-xl)] overflow-hidden cursor-pointer" onClick={() => setInfoModalItem(item)}>
                    {item.poster_url ? (
                       <img src={item.poster_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-xs text-zinc-600">No Poster</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <span className="text-white text-xs font-bold">View Details</span>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <h4 className="font-bold text-white text-sm line-clamp-1">{item.title}</h4>
                    <Button
                      disabled={watchlistSet.has(item.tmdb_id) || actioningId === item.tmdb_id}
                      onClick={() => handleAddToWatchlist(item)}
                      variant="ghost"
                      size="sm"
                      fullWidth
                      style={{ marginTop: '12px' }}
                    >
                      {actioningId === item.tmdb_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : watchlistSet.has(item.tmdb_id) ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span className="ml-1.5">{watchlistSet.has(item.tmdb_id) ? 'Added' : 'Watchlist'}</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-8">
            <Button
              onClick={resetGame}
              size="lg"
            >
              Play Again
            </Button>
          </div>
        </motion.div>
      ) : gameState === 'playing' ? (
        <div className="flex-1 flex flex-col items-center w-full max-w-5xl mx-auto relative px-4">
          <div className="mb-8 px-6 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[var(--live)] animate-pulse" />
            <span className="text-xs font-bold text-white tracking-widest uppercase">Round {round} / 10</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 w-full">
            <AnimatePresence mode="popLayout">
              {currentOptions.map((item, idx) => (
                <motion.div
                  key={item.tmdb_id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 25, delay: idx * 0.05 }}
                  onClick={() => handlePick(item)}
                  className="w-full flex rounded-lg overflow-hidden relative group cursor-pointer border border-white/5 bg-[var(--glass-card)] hover:border-[var(--border-strong)] hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-300 active:scale-95 h-40 sm:h-48"
                >
                  <div className="w-28 sm:w-32 shrink-0 relative bg-zinc-900">
                    {item.poster_url ? (
                      <img src={item.poster_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">No Poster</div>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setInfoModalItem(item)
                      }}
                      className="absolute top-2 left-2 bg-black/60 hover:bg-black/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-sm border border-white/10 transition-colors z-20"
                    >
                      Info
                    </button>
                  </div>

                  <div className="p-4 flex flex-col flex-1 min-w-0 bg-black/20 group-hover:bg-[var(--green-tint-bg)] transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h2 className="text-base sm:text-lg font-bold text-white line-clamp-2 leading-tight group-hover:text-[var(--accent)] transition-colors">{item.title}</h2>
                    </div>
                    
                    <div className="flex items-center gap-3 text-[10px] font-semibold text-zinc-500 mb-3 uppercase tracking-wider">
                      {item.type === 'show' ? (
                        <span className="flex items-center gap-1"><Tv className="w-3 h-3 text-[var(--live)]" /> Show</span>
                      ) : (
                        <span className="flex items-center gap-1"><Film className="w-3 h-3 text-[var(--accent)]" /> Movie</span>
                      )}
                      {item.vote_average !== undefined && item.vote_average > 0 && (
                        <span className="flex items-center gap-1 text-[var(--rating)]">
                          <Star className="w-3 h-3 fill-[var(--rating)]" /> {item.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-zinc-400 line-clamp-2 sm:line-clamp-3 leading-relaxed mt-auto">
                      {item.overview || 'No synopsis available.'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : null}

      {infoModalItem && (
        <MediaInfoModal
          item={infoModalItem}
          onClose={() => setInfoModalItem(null)}
          newTabLinks
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
