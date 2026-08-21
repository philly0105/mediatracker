'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { TmdbSearchResult } from '@/types'
import { ArrowLeft, User, AlertCircle, Star, Calendar, Film, Tv, SearchX, CheckCircle2, Bookmark } from 'lucide-react'
import SelectableOverlay from '@/components/SelectableOverlay'
import BackButton from '@/components/BackButton'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useMediaModal } from '@/components/MediaModalProvider'
import { useLibraryIds } from '@/lib/useLibraryIds'

export default function PersonPage() {
  const params = useParams()
  const rawName = params?.name as string
  const name = rawName ? decodeURIComponent(rawName) : ''

  const [topMovies, setTopMovies] = useState<TmdbSearchResult[]>([])
  const [recentMovies, setRecentMovies] = useState<TmdbSearchResult[]>([])
  const [allMovies, setAllMovies] = useState<TmdbSearchResult[]>([])
  const [viewMode, setViewMode] = useState<'highlights' | 'all'>('highlights')
  
  const [profileUrl, setProfileUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { openMedia } = useMediaModal()
  // The app already knows which of these credits are in the library; not saying
  // so made the page feel disconnected from the rest of the product.
  const { watchedIds, watchlistIds, setWatchedIds, setWatchlistIds } = useLibraryIds()

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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load person details')
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
            className="text-xs font-bold text-[var(--accent)] hover:text-[var(--accent)] transition-colors uppercase tracking-widest bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 px-3 py-1.5 rounded-sm"
          >
            See All {allMovies.length} Credits
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <SelectableOverlay key={`${item.tmdb_id}-${item.type}`} item={item}>
          <Card
            onClick={() => openMedia(item, {
              priority: 'must_watch',
              onChanged: (change) => {
                if (change === 'watched') setWatchedIds((prev) => new Set(prev).add(item.tmdb_id))
                if (change === 'watchlisted') setWatchlistIds((prev) => new Set(prev).add(item.tmdb_id))
              },
            })}
            aria-label={item.title}
            style={{ padding: '12px' }}
            className="flex gap-3 cursor-pointer group"
          >
            {item.poster_url ? (
              <Image
                src={item.poster_url}
                alt={item.title}
                width={64}
                height={96}
                className="w-16 h-24 rounded-[var(--radius-xl)] object-cover shadow-md border border-[var(--border-subtle)] shrink-0 group-hover:scale-[1.02] transition-transform"
              />
            ) : (
              <div className="w-16 h-24 rounded-[var(--radius-xl)] bg-[var(--bg-void)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px] text-zinc-700 shrink-0 text-center p-1">
                No Poster
              </div>
            )}
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-bold text-white text-sm line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
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
                  <span className="flex items-center gap-0.5 text-[var(--rating)] font-semibold">
                    <Star className="w-3.5 h-3.5 fill-[var(--rating)] text-[var(--rating)]" />
                    <span>{item.vote_average.toFixed(1)}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">
                {item.type === 'show' ? (
                  <span className="flex items-center gap-1.5"><Tv className="w-3 h-3 text-[var(--live)]" /><span>TV Show</span></span>
                ) : (
                  <span className="flex items-center gap-1.5"><Film className="w-3 h-3 text-[var(--accent)]" /><span>Movie</span></span>
                )}
                {/* Same chip treatment as the streaming grid, so "already seen"
                    reads the same wherever TMDB results are listed. */}
                {watchedIds.has(item.tmdb_id) ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] text-[var(--teal-300)] bg-black/40 border border-[var(--teal-tint-border)]">
                    <CheckCircle2 className="w-3 h-3" /> Watched
                  </span>
                ) : watchlistIds.has(item.tmdb_id) ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] text-zinc-300 bg-black/40 border border-white/10">
                    <Bookmark className="w-3 h-3" /> Watchlist
                  </span>
                ) : null}
              </div>
            </div>
          </Card>
          </SelectableOverlay>
        ))}
        {items.length === 0 && (
          <EmptyState size="compact" icon={SearchX} title="No items found" />
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-10 pb-12">
      <div className="flex items-center justify-between mb-2">
        {viewMode === 'all' ? (
          <button
            onClick={() => setViewMode('highlights')}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to highlights</span>
          </button>
        ) : (
          <BackButton />
        )}
      </div>

      <Card className="flex flex-col md:flex-row items-center md:items-start gap-6 p-6">
        {profileUrl ? (
          <Image
            src={profileUrl}
            alt={name}
            width={128}
            height={128}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-lg border-2 border-[var(--border-subtle)]"
          />
        ) : (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[var(--bg-void)] border-2 border-[var(--border-subtle)] flex items-center justify-center text-zinc-600 shadow-inner">
            <User className="w-10 h-10 md:w-12 md:h-12" />
          </div>
        )}
        <div className="flex-1 text-center md:text-left pt-2">
          <h1 className="text-3xl font-black text-white tracking-tight">{name}</h1>
          <p className="text-zinc-400 mt-1">
            {viewMode === 'highlights' ? 'Top Rated and Most Recent Credits' : `All ${allMovies.length} Credits`}
          </p>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-[var(--glass-card)] border border-[var(--border-subtle)] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 border border-[var(--live)]/20 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Something went wrong</h2>
          <p className="text-sm text-zinc-400">{error}</p>
        </Card>
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

    </div>
  )
}
