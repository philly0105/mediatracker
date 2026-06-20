'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  User,
  Star,
  Plus,
  Check,
  Loader2,
  Film,
  Tv,
  X,
  Flame,
  Sparkles,
  Inbox,
  Trash2,
  Bookmark,
  Play,
  Bell,
  BellOff
} from 'lucide-react'
import Link from 'next/link'
import type { TmdbSearchResult, WatchlistPriority } from '@/types'
import SimilarModal from './SimilarModal'
import { Button } from '@/components/ui/Button'

interface Props {
  item: TmdbSearchResult
  onClose: () => void
  onAddToWatchlist: () => Promise<void>
  onMarkAsWatched: () => Promise<void>
  currentPriority?: WatchlistPriority
  onUpdatePriority?: (priority: WatchlistPriority) => Promise<void>
  onRemoveFromWatchlist?: () => Promise<void>
  newTabLinks?: boolean
}

interface FullDetails {
  runtime_mins: number | null
  director: string | null
  cast_members: string[]
  genres: string[]
  isWatched: boolean
  isWatchlisted: boolean
  isFollowed: boolean
  trailer_url: string | null
  watch_providers?: any
}

export default function MediaInfoModal({
  item,
  onClose,
  onAddToWatchlist,
  onMarkAsWatched,
  currentPriority,
  onUpdatePriority,
  onRemoveFromWatchlist,
  newTabLinks = false
}: Props) {
  const [details, setDetails] = useState<FullDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSimilar, setShowSimilar] = useState(false)

  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true)
        const res = await fetch(`/api/tmdb/details?id=${item.tmdb_id}&type=${item.type}`)
        if (!res.ok) throw new Error('Failed to load movie details')
        const data = await res.json()
        setDetails({
          runtime_mins: data.runtime_mins ?? null,
          director: data.director ?? null,
          cast_members: data.cast_members ?? [],
          genres: data.genres ?? [],
          isWatched: data.isWatched ?? false,
          isWatchlisted: data.isWatchlisted ?? false,
          isFollowed: data.isFollowed ?? false,
          trailer_url: data.trailer_url ?? null,
          watch_providers: data.watch_providers ?? null
        })
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [item.tmdb_id, item.type])

  async function handleWatchlistClick() {
    try {
      setActioning('watchlist')
      await onAddToWatchlist()
      if (details) setDetails({ ...details, isWatchlisted: true })
      // Modal stays open after action
    } catch (err) {
      console.error(err)
    } finally {
      setActioning(null)
    }
  }

  async function handleWatchedClick() {
    try {
      setActioning('watched')
      await onMarkAsWatched()
      if (details) setDetails({ ...details, isWatched: true })
      // Modal stays open after action
    } catch (err) {
      console.error(err)
    } finally {
      setActioning(null)
    }
  }

  async function handlePriorityClick(p: WatchlistPriority) {
    if (!onUpdatePriority) return
    try {
      setActioning(`priority-${p}`)
      await onUpdatePriority(p)
    } catch (err) {
      console.error(err)
    } finally {
      setActioning(null)
    }
  }

  async function handleRemoveClick() {
    if (!onRemoveFromWatchlist) return
    try {
      setActioning('remove')
      await onRemoveFromWatchlist()
      // Modal stays open after action
    } catch (err) {
      console.error(err)
    } finally {
      setActioning(null)
    }
  }

  async function handleFollowToggle() {
    if (!details) return
    try {
      setActioning('follow')
      if (details.isFollowed) {
        await fetch('/api/follow', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tmdb_id: item.tmdb_id }) })
        setDetails({ ...details, isFollowed: false })
      } else {
        await fetch('/api/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tmdb_id: item.tmdb_id }) })
        setDetails({ ...details, isFollowed: true })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActioning(null)
    }
  }

  function formatRuntime(mins: number | null) {
    if (!mins) return null
    const hrs = Math.floor(mins / 60)
    const remainingMins = mins % 60
    if (hrs === 0) return `${remainingMins}m`
    return `${hrs}h ${remainingMins}m`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md" style={{ background: 'var(--scrim)' }}>
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        style={{ background: 'var(--surface-modal)' }}
        className="glass-card rounded-3xl w-full max-w-2xl overflow-hidden relative border border-white/15 max-h-[90vh] flex flex-col shadow-2xl shadow-violet-500/[0.05]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 p-2 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-300"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 md:p-8 flex-1 space-y-6 scrollbar-none">
          {/* Header Layout */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Poster */}
            {item.poster_url ? (
              <img
                src={item.poster_url}
                alt={item.title}
                className="w-32 md:w-40 rounded-2xl object-cover shadow-2xl shadow-black/50 border border-white/5 mx-auto md:mx-0 shrink-0 self-start"
              />
            ) : (
              <div className="w-32 h-48 md:w-40 md:h-60 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-xs text-zinc-600 mx-auto md:mx-0 shrink-0">
                No Poster
              </div>
            )}

            {/* Basic Info */}
            <div className="flex-1 space-y-3.5 text-center md:text-left self-center">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 border border-white/[0.04] px-2 py-0.5 rounded">
                  {item.type === 'show' ? 'TV Show' : 'Movie'}
                </span>
                {item.vote_average !== undefined && item.vote_average > 0 && (
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/5 border border-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{item.vote_average.toFixed(1)} TMDB / IMDb</span>
                  </span>
                )}
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                {item.title}
              </h2>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 text-xs text-zinc-400">
                {item.release_year && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span>{item.release_year}</span>
                  </span>
                )}
                {details?.runtime_mins && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span>{formatRuntime(details.runtime_mins)}</span>
                  </span>
                )}
                {details?.director && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-zinc-500" />
                    <span>Dir: <Link href={`/person/${encodeURIComponent(details.director)}`} {...(newTabLinks && { target: '_blank', rel: 'noopener noreferrer' })} className="hover:text-white hover:underline transition-colors">{details.director}</Link></span>
                  </span>
                )}
              </div>

              {/* Genres list inside modal */}
              {details?.genres && details.genres.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-1.5 pt-1">
                  {details.genres.map((g) => (
                    <span
                      key={g}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-zinc-400 bg-white/[0.02] border border-white/5"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Watch Trailer Button */}
              {(details?.trailer_url || item.type === 'movie') && (
                <div className="pt-3 flex flex-wrap gap-2">
                  {details?.trailer_url && (
                    <a
                      href={details.trailer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs transition-colors border border-rose-500/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-rose-500" />
                      Watch Trailer
                    </a>
                  )}
                  {item.type === 'movie' && (
                    <a
                      href={`http://localhost:3003/?q=${encodeURIComponent(item.title)}#movies`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 font-bold text-xs transition-colors border border-violet-500/20"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      Watch on IPTV
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <hr className="border-white/5" />

          {/* Watchlist Priority Switcher */}
          {currentPriority && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Watchlist Priority
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'must_watch' as WatchlistPriority, label: 'Must Watch', icon: Flame, color: 'hover:text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/20', activeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
                  { value: 'want_to_watch' as WatchlistPriority, label: 'Want to Watch', icon: Sparkles, color: 'hover:text-orange-400 hover:bg-orange-500/5 hover:border-orange-500/20', activeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
                  { value: 'someday' as WatchlistPriority, label: 'Someday', icon: Inbox, color: 'hover:text-zinc-300 hover:bg-zinc-800/20 hover:border-zinc-700', activeColor: 'text-zinc-300 bg-zinc-800/50 border-zinc-700' }
                ].map(({ value, label, icon: Icon, color, activeColor }) => {
                  const isActive = currentPriority === value
                  const isActioning = actioning === `priority-${value}`
                  return (
                    <Button
                      key={value}
                      disabled={actioning !== null}
                      onClick={() => handlePriorityClick(value)}
                      style={{
                        flex: 1,
                        fontSize: 'var(--text-xs)',
                        padding: '10px 12px',
                        ...(isActive ? {} : {
                          background: 'rgba(255,255,255,0.02)',
                          borderColor: 'rgba(255,255,255,0.05)',
                          color: 'var(--text-muted)'
                        })
                      }}
                      className={`transition-all duration-300 active:scale-95 disabled:opacity-50 ${
                        isActive 
                          ? activeColor
                          : color
                      }`}
                    >
                      {isActioning ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                      <span>{label}</span>
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Detailed Info */}
          {loading ? (
            /* Frost loading shimmer */
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-zinc-900 rounded w-1/3" />
              <div className="space-y-2">
                <div className="h-3.5 bg-zinc-900 rounded w-full" />
                <div className="h-3.5 bg-zinc-900 rounded w-full" />
                <div className="h-3.5 bg-zinc-900 rounded w-4/5" />
              </div>
            </div>
          ) : error ? (
            <p className="text-sm text-zinc-500 italic">Could not fetch casting details.</p>
          ) : (
            <div className="space-y-5">
              {/* Overview */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Overview
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed text-left">
                  {item.overview || 'No description available.'}
                </p>
              </div>

              {/* Casting */}
              {details?.cast_members && details.cast_members.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Starring
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {details.cast_members.map((actor) => (
                      <Link
                        key={actor}
                        href={`/person/${encodeURIComponent(actor)}`}
                        {...(newTabLinks && { target: '_blank', rel: 'noopener noreferrer' })}
                        className="px-3 py-1 rounded-xl text-xs font-medium text-zinc-300 bg-white/5 border border-white/[0.04] hover:bg-white/10 hover:text-white transition-colors"
                      >
                        {actor}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Watch Providers */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5" /> Where to Watch
                  </h3>
                  {details?.watch_providers?.link && (
                    <a href={details.watch_providers.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-400 hover:text-violet-300 hover:underline">
                      Provided by JustWatch
                    </a>
                  )}
                </div>
                
                <div className="space-y-3">
                  {details?.watch_providers?.flatrate && details.watch_providers.flatrate.length > 0 ? (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold text-zinc-400">Stream</span>
                      <div className="flex flex-wrap gap-2">
                        {details.watch_providers.flatrate.map((p: any) => (
                          <div key={p.provider_id} className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10" title={p.provider_name}>
                            {p.logo_path ? <img src={p.logo_path} alt={p.provider_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] text-center p-0.5">{p.provider_name}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-400 italic">Not available to stream.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3 flex-wrap">
          {currentPriority || details?.isWatchlisted ? (
            currentPriority ? (
              <Button
                disabled={loading || actioning !== null}
                onClick={handleRemoveClick}
                style={{ flex: 1 }}
                className="hover:!bg-rose-600 hover:!border-rose-500 hover:!text-white"
              >
                {actioning === 'remove' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Remove from Watchlist</span>
              </Button>
            ) : (
              <Button
                disabled
                style={{ flex: 1, opacity: 0.6 }}
              >
                <Bookmark className="w-4 h-4" />
                <span>On Watchlist</span>
              </Button>
            )
          ) : (
            <Button
              disabled={loading || actioning !== null}
              onClick={handleWatchlistClick}
              style={{ flex: 1 }}
              className="hover:!bg-violet-600 hover:!border-violet-500 hover:!text-white"
            >
              {actioning === 'watchlist' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Add to Watchlist</span>
            </Button>
          )}

          {details?.isWatched ? (
            <Button
              disabled
              style={{
                flex: 1,
                background: 'var(--teal-tint-bg)',
                border: '1px solid var(--teal-tint-border)',
                color: 'var(--teal-300)',
                opacity: 0.7
              }}
            >
              <Check className="w-4 h-4" />
              <span>Already Watched</span>
            </Button>
          ) : (
            <Button
              disabled={loading || actioning !== null}
              onClick={handleWatchedClick}
              style={{ flex: 1 }}
              className="hover:!bg-emerald-600 hover:!border-emerald-500 hover:!text-white"
            >
              {actioning === 'watched' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Mark as Watched</span>
            </Button>
          )}

          {item.type === 'show' && (
            <Button
              disabled={loading || actioning !== null}
              onClick={handleFollowToggle}
              fullWidth
              style={{
                ...(details?.isFollowed ? {
                  background: 'var(--teal-tint-bg)',
                  borderColor: 'var(--teal-tint-border)',
                  color: 'var(--teal-300)',
                } : {})
              }}
              className={details?.isFollowed ? "hover:!bg-rose-600/10 hover:!border-rose-500/30 hover:!text-rose-400" : "hover:!bg-teal-600 hover:!border-teal-500 hover:!text-white"}
            >
              {actioning === 'follow' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : details?.isFollowed ? (
                <BellOff className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              <span>{details?.isFollowed ? 'Unfollow Show' : 'Follow Show'}</span>
            </Button>
          )}

          <Button
            onClick={() => setShowSimilar(true)}
            fullWidth
            className="hover:!bg-violet-600 hover:!border-violet-500 hover:!text-white"
          >
            <Sparkles className="w-4 h-4" />
            <span>Similar {item.type === 'movie' ? 'Movies' : 'TV Shows'}</span>
          </Button>
        </div>
      </motion.div>

      {showSimilar && (
        <SimilarModal tmdbId={item.tmdb_id} type={item.type} onClose={() => setShowSimilar(false)} />
      )}
    </div>
  )
}
