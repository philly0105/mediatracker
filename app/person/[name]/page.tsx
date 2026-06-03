'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { TmdbSearchResult } from '@/types'
import { ArrowLeft, User, AlertCircle, Star, Calendar, Film, Tv, Plus, Check, Loader2 } from 'lucide-react'
import MediaInfoModal from '@/components/MediaInfoModal'

export default function PersonPage() {
  const params = useParams()
  const router = useRouter()
  const rawName = params?.name as string
  const name = rawName ? decodeURIComponent(rawName) : ''

  const [topMovies, setTopMovies] = useState<TmdbSearchResult[]>([])
  const [recentMovies, setRecentMovies] = useState<TmdbSearchResult[]>([])
  const [allMovies, setAllMovies] = useState<TmdbSearchResult[]>([])
  const [viewMode, setViewMode] = useState<'highlights' | 'all'>('highlights')
  
  const [profileUrl, setProfileUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<TmdbSearchResult | null>(null)

  useEffect(() => {
    if (!name) return
    async function fetchPersonData() {
      try {
        setLoading(true)
        const res = await fetch(`/api/person?name=${encodeURIComponent(name)}`)
        if (!res.ok) throw new Error('Failed to load person details')
        const data = await res.json()
        setTopMovies(data.topMovies || [])
        setRecentMovies(data.recentMovies || [])
        setAllMovies(data.allMovies || [])
        setProfileUrl(data.profile_url || null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchPersonData()
  }, [name])

  if (!name) return null

  const renderMovieGrid = (items: TmdbSearchResult[], title: string, showSeeAllButton = false) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
        {showSeeAllButton && items.length > 0 && (
          <button
            onClick={() => setViewMode('all')}
            className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-widest bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded-full"
          >
            See All {allMovies.length} Credits
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={`${item.tmdb_id}-${item.type}`}
            onClick={() => setSelectedItem(item)}
            className="glass-card rounded-2xl p-3 flex gap-3 cursor-pointer hover:border-violet-500/30 transition-colors group"
          >
            {item.poster_url ? (
              <img
                src={item.poster_url}
                alt={item.title}
                className="w-16 h-24 rounded-xl object-cover shadow-md border border-white/5 shrink-0 group-hover:scale-[1.02] transition-transform"
              />
            ) : (
              <div className="w-16 h-24 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] text-zinc-700 shrink-0 text-center p-1">
                No Poster
              </div>
            )}
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-bold text-white text-sm line-clamp-1 group-hover:text-violet-400 transition-colors">
                {item.title}
              </span>
              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                {item.release_year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.release_year}</span>
                  </span>
                )}
                {item.vote_average !== undefined && item.vote_average > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{item.vote_average.toFixed(1)}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">
                {item.type === 'show' ? (
                  <><Tv className="w-3 h-3 text-rose-500/80" /><span>TV Show</span></>
                ) : (
                  <><Film className="w-3 h-3 text-violet-500/80" /><span>Movie</span></>
                )}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-zinc-500 text-sm">No items found.</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-10 pb-12">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => {
            if (viewMode === 'all') {
              setViewMode('highlights')
            } else {
              router.back()
            }
          }}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
        {profileUrl ? (
          <img
            src={profileUrl}
            alt={name}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-lg border-2 border-white/10"
          />
        ) : (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-zinc-900 border-2 border-white/5 flex items-center justify-center text-zinc-600 shadow-inner">
            <User className="w-10 h-10 md:w-12 md:h-12" />
          </div>
        )}
        <div className="flex-1 text-center md:text-left pt-2">
          <h1 className="text-3xl font-black text-white tracking-tight">{name}</h1>
          <p className="text-zinc-400 mt-1">
            {viewMode === 'highlights' ? 'Top Rated and Most Recent Credits' : `All ${allMovies.length} Credits`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 border border-red-500/20 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Something went wrong</h2>
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      ) : viewMode === 'highlights' ? (
        <div className="space-y-12">
          {renderMovieGrid(topMovies, 'Top Rated', true)}
          {renderMovieGrid(recentMovies, 'Most Recent', false)}
        </div>
      ) : (
        <div className="space-y-12">
          {renderMovieGrid(allMovies, 'All Credits', false)}
        </div>
      )}

      {selectedItem && (
        <MediaInfoModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToWatchlist={async () => {
            await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selectedItem.tmdb_id, type: selectedItem.type, priority: 'must_watch' })
            })
          }}
          onMarkAsWatched={async () => {
            await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selectedItem.tmdb_id, type: selectedItem.type, watched_at: new Date().toISOString().split('T')[0] })
            })
          }}
        />
      )}
    </div>
  )
}
