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
  Bookmark
} from 'lucide-react'
import Link from 'next/link'
import type { TmdbSearchResult, WatchlistPriority } from '@/types'

interface Props {
  item: TmdbSearchResult
  onClose: () => void
  onAddToWatchlist: () => Promise<void>
  onMarkAsWatched: () => Promise<void>
  currentPriority?: WatchlistPriority
  onUpdatePriority?: (priority: WatchlistPriority) => Promise<void>
  onRemoveFromWatchlist?: () => Promise<void>
}

interface FullDetails {
  runtime_mins: number | null
  director: string | null
  cast_members: string[]
  genres: string[]
  isWatched: boolean
  isWatchlisted: boolean
}

export default function MediaInfoModal({
  item,
  onClose,
  onAddToWatchlist,
  onMarkAsWatched,
  currentPriority,
  onUpdatePriority,
  onRemoveFromWatchlist
}: Props) {
  const [details, setDetails] = useState<FullDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          isWatchlisted: data.isWatchlisted ?? false
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
      // Keep modal open or close? I'll close it to match previous behavior, but actually we can keep it open if it's a toggle
      onClose()
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
      onClose()
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
      onClose()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
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
                    <span>Dir: <Link href={`/person/${encodeURIComponent(details.director)}`} className="hover:text-white hover:underline transition-colors">{details.director}</Link></span>
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
                    <button
                      key={value}
                      disabled={actioning !== null}
                      onClick={() => handlePriorityClick(value)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 ${
                        isActive 
                          ? activeColor
                          : `text-zinc-400 bg-white/[0.02] border-white/5 ${color}`
                      }`}
                    >
                      {isActioning ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                      <span>{label}</span>
                    </button>
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
                        className="px-3 py-1 rounded-xl text-xs font-medium text-zinc-300 bg-white/5 border border-white/[0.04] hover:bg-white/10 hover:text-white transition-colors"
                      >
                        {actor}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3">
          {currentPriority || details?.isWatchlisted ? (
            <button
              disabled={loading || actioning !== null || (!currentPriority && details?.isWatchlisted)}
              onClick={currentPriority ? handleRemoveClick : undefined}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border font-semibold text-xs transition-all duration-300 ${
                currentPriority
                  ? 'bg-white/5 border-white/10 text-white hover:bg-rose-600 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-600/25 active:scale-95 disabled:opacity-50'
                  : 'bg-white/5 border-white/10 text-zinc-500 opacity-60 cursor-default'
              }`}
            >
              {actioning === 'remove' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : currentPriority ? (
                <Trash2 className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              <span>{currentPriority ? 'Remove from Watchlist' : 'On Watchlist'}</span>
            </button>
          ) : (
            <button
              disabled={loading || actioning !== null}
              onClick={handleWatchlistClick}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-violet-600 hover:border-violet-500 hover:shadow-lg hover:shadow-violet-600/25 active:scale-95 transition-all duration-300 disabled:opacity-50 font-semibold text-xs"
            >
              {actioning === 'watchlist' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Add to Watchlist</span>
            </button>
          )}

          <button
            disabled={loading || actioning !== null || details?.isWatched}
            onClick={details?.isWatched ? undefined : handleWatchedClick}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border font-semibold text-xs transition-all duration-300 ${
              details?.isWatched
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 opacity-70 cursor-default'
                : 'bg-white/5 border-white/10 text-white hover:bg-emerald-600 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-600/25 active:scale-95 disabled:opacity-50'
            }`}
          >
            {actioning === 'watched' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>{details?.isWatched ? 'Already Watched' : 'Mark as Watched'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
