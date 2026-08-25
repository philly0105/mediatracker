'use client'
import Image from 'next/image'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  User,
  Star,
  Plus,
  Check,
  Loader2,
  Tv,
  X,
  Flame,
  Sparkles,
  Inbox,
  Trash2,
  Bookmark,
  Play,
  Bell,
  BellOff,
  ListVideo,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import type { TmdbSearchResult, WatchlistPriority } from '@/types'
import type { TmdbWatchProviders, TmdbWatchProvider } from '@/lib/tmdb'
import SimilarModal from './SimilarModal'
import RatingStars from './RatingStars'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ToastProvider'
import { useModal } from '@/lib/useModal'
import { isAlreadyWatchedError } from '@/lib/useMediaActions'

const PRIORITY_LABELS: Record<WatchlistPriority, string> = {
  must_watch: 'Must Watch',
  want_to_watch: 'Want to Watch',
  someday: 'Someday',
}

interface Props {
  item: TmdbSearchResult
  onClose: () => void
  onAddToWatchlist: () => Promise<void>
  onMarkAsWatched: (opts?: { rewatch?: boolean }) => Promise<void>
  currentPriority?: WatchlistPriority
  onUpdatePriority?: (priority: WatchlistPriority) => Promise<void>
  onRemoveFromWatchlist?: () => Promise<void>
  newTabLinks?: boolean
  // Called instead of onClose when a link inside the modal navigates this tab
  // away. Layered hosts (the search overlay) use it to tear down the whole
  // stack rather than just this modal, which onClose alone would leave behind.
  onNavigateAway?: () => void
}

interface FullDetails {
  imdb_id: string | null
  overview: string | null
  media_id: string | null
  runtime_mins: number | null
  director: string | null
  cast_members: string[]
  genres: string[]
  isWatched: boolean
  isWatchlisted: boolean
  isFollowed: boolean
  watch_entry: { id: string; rating: number | null } | null
  trailer_url: string | null
  watch_providers?: TmdbWatchProviders | null
  vote_average?: number | null
}

// The most-opened surface in the app used to refetch on every single open,
// even for a title dismissed thirty seconds ago — and /api/tmdb/details costs a
// TMDB call plus three or four Supabase reads. Cached per session and keyed on
// the title, so a second open paints immediately; the background revalidate
// below is what keeps the user-specific bits (watch_entry, isWatchlisted,
// isFollowed) from going stale.
const detailsCache = new Map<string, FullDetails>()

export default function MediaInfoModal({
  item,
  onClose,
  onAddToWatchlist,
  onMarkAsWatched,
  currentPriority,
  onUpdatePriority,
  onRemoveFromWatchlist,
  newTabLinks = false,
  onNavigateAway
}: Props) {
  const cacheKey = `${item.type}-${item.tmdb_id}`
  const cachedDetails = detailsCache.get(cacheKey) ?? null

  const [mounted, setMounted] = useState(false)
  const [details, setDetails] = useState<FullDetails | null>(cachedDetails)
  // A cache hit has content to show, so it skips the shimmer entirely.
  const [loading, setLoading] = useState(cachedDetails === null)
  const [actioning, setActioning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userRating, setUserRating] = useState<number | null>(cachedDetails?.watch_entry?.rating ?? null)
  const [showSimilar, setShowSimilar] = useState(false)
  const [ratingPulse, setRatingPulse] = useState(false)
  const { toast } = useToast()
  const { containerRef } = useModal(onClose)
  const ratingRowRef = useRef<HTMLDivElement>(null)

  // Local optimistic edits have to reach the cache too, or reopening the modal
  // would paint the pre-action state for one frame before the revalidate lands.
  const applyDetails = useCallback((next: FullDetails) => {
    detailsCache.set(`${item.type}-${item.tmdb_id}`, next)
    setDetails(next)
  }, [item.type, item.tmdb_id])

  // The parent owns whether this modal is open, so a link that routes the tab
  // elsewhere has to say so — otherwise the modal stays layered over the page
  // it just navigated to and has to be dismissed by hand. Wired to Link's
  // onNavigate rather than onClick on purpose: onNavigate fires only for
  // client-side navigation in this tab, so newTabLinks (and Cmd/Ctrl+click,
  // which Next treats the same way) correctly leave the modal open.
  const dismissOnNavigate = onNavigateAway ?? onClose

  // Portals need a real document.body, which does not exist during the server
  // render — same mount gate as ToastProvider and MultiSelectProvider. The one
  // cascading render on mount is the mechanism, not a mistake.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // The pulse is a one-shot cue: once fired, a timeout turns it back off so the
  // ring doesn't linger on the rating row.
  useEffect(() => {
    if (!ratingPulse) return
    const t = setTimeout(() => setRatingPulse(false), 1600)
    return () => clearTimeout(t)
  }, [ratingPulse])

  // Fetched on mount and re-run after a watch/rewatch so watch_entry appears
  // without reopening the modal. A `refreshing` call keeps the existing content
  // on screen — only the first load shows the shimmer.
  // `loading` starts true, so the first load never has to set it — which also
  // keeps the mount effect free of synchronous setState.
  const loadDetails = useCallback(async (refreshing = false): Promise<FullDetails | null> => {
    try {
      const res = await fetch(`/api/tmdb/details?id=${item.tmdb_id}&type=${item.type}`)
      if (!res.ok) throw new Error('Failed to load movie details')
      const data = await res.json()
      const fresh: FullDetails = {
        imdb_id: data.imdb_id ?? null,
        overview: data.overview ?? null,
        media_id: data.media_id ?? null,
        runtime_mins: data.runtime_mins ?? null,
        director: data.director ?? null,
        cast_members: data.cast_members ?? [],
        genres: data.genres ?? [],
        isWatched: data.isWatched ?? false,
        isWatchlisted: data.isWatchlisted ?? false,
        isFollowed: data.isFollowed ?? false,
        watch_entry: data.watch_entry ?? null,
        trailer_url: data.trailer_url ?? null,
        watch_providers: data.watch_providers ?? null,
        vote_average: data.vote_average ?? null,
      }
      applyDetails(fresh)
      setUserRating(data.watch_entry?.rating ?? null)
      return fresh
    } catch (err: unknown) {
      // A failed refresh keeps the content already on screen; only the first
      // load has nothing better to show than the error state.
      if (refreshing) console.error(err)
      else setError(err instanceof Error ? err.message : 'Failed to load details')
      return null
    } finally {
      if (!refreshing) setLoading(false)
    }
  }, [item.tmdb_id, item.type, applyDetails])

  useEffect(() => {
    async function run() {
      // Served from cache means content is already on screen — revalidate
      // without dropping back to the shimmer.
      await loadDetails(cachedDetails !== null)
    }
    run()
    // cachedDetails is only read for its initial value; re-running on identity
    // changes would refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDetails])

  async function handleWatchlistClick() {
    try {
      setActioning('watchlist')
      await onAddToWatchlist()
      if (details) applyDetails({ ...details, isWatchlisted: true })
      toast(`Added ${item.title} to your watchlist.`, { tone: 'success' })
      // Modal stays open after action
    } catch (err) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Could not add to your watchlist.', { tone: 'error' })
    } finally {
      setActioning(null)
    }
  }

  async function handleWatchedClick(opts?: { rewatch?: boolean }) {
    try {
      setActioning('watched')
      await onMarkAsWatched(opts)
      if (details) applyDetails({ ...details, isWatched: true })
      // The refetch is awaited so the fresh watch_entry (and its id, for Undo)
      // exists before the toast points the user at the rating row.
      const fresh = await loadDetails(true)
      if (opts?.rewatch) {
        toast(`Logged a rewatch of ${item.title}.`, { tone: 'success' })
      } else {
        const entryId = fresh?.watch_entry?.id
        toast(`Logged ${item.title} as watched — rate it below.`, {
          tone: 'success',
          ...(entryId ? { action: { label: 'Undo', onClick: () => undoWatch(entryId) } } : {}),
        })
        ratingRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setRatingPulse(true)
      }
      // Modal stays open after action
    } catch (err) {
      console.error(err)
      if (isAlreadyWatchedError(err)) {
        toast(`${item.title} is already in your history.`, {
          tone: 'info',
          action: {
            label: 'Log rewatch',
            onClick: () => handleWatchedClick({ rewatch: true }),
          },
        })
      } else {
        toast(err instanceof Error ? err.message : 'Could not mark as watched.', { tone: 'error' })
      }
    } finally {
      setActioning(null)
    }
  }

  // Undo for a first log only — a rewatch's new entry id is not recoverable
  // from the details endpoint, so rewatches never offer this.
  async function undoWatch(entryId: string) {
    try {
      const res = await fetch('/api/watch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId }),
      })
      if (!res.ok) throw new Error('Failed to undo')
      setUserRating(null)
      await loadDetails(true)
      toast(`Removed ${item.title} from your history.`, { tone: 'info' })
    } catch (err) {
      console.error(err)
      toast('Could not undo — the entry is still logged.', { tone: 'error' })
    }
  }

  async function handleRatingChange(newRating: number | null) {
    if (!details?.watch_entry) return
    const previous = userRating
    // Optimistic: the stars are their own feedback, so no success toast.
    setUserRating(newRating)
    try {
      const res = await fetch('/api/watch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: details.watch_entry.id, rating: newRating }),
      })
      if (!res.ok) throw new Error('Failed to save rating')
    } catch (err) {
      console.error(err)
      setUserRating(previous)
      toast('Could not save your rating.', { tone: 'error' })
    }
  }

  async function handlePriorityClick(p: WatchlistPriority) {
    if (!onUpdatePriority) return
    try {
      setActioning(`priority-${p}`)
      await onUpdatePriority(p)
      toast(`Moved ${item.title} to ${PRIORITY_LABELS[p]}.`, { tone: 'success' })
    } catch (err) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Could not change the priority.', { tone: 'error' })
    } finally {
      setActioning(null)
    }
  }

  async function handleRemoveClick() {
    if (!onRemoveFromWatchlist) return
    try {
      setActioning('remove')
      await onRemoveFromWatchlist()
      if (details) applyDetails({ ...details, isWatchlisted: false })
      toast(`Removed ${item.title} from your watchlist.`, { tone: 'success' })
      // Modal stays open after action
    } catch (err) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Could not remove from your watchlist.', { tone: 'error' })
    } finally {
      setActioning(null)
    }
  }

  async function handleFollowToggle() {
    if (!details) return
    try {
      setActioning('follow')
      const following = details.isFollowed
      // These responses were never checked, so a failed follow still flipped the
      // icon and looked like it had worked.
      const res = await fetch('/api/follow', {
        method: following ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: item.tmdb_id }),
      })
      if (!res.ok) throw new Error(following ? 'Failed to unfollow' : 'Failed to follow')
      applyDetails({ ...details, isFollowed: !following })
      toast(
        following ? `Unfollowed ${item.title}.` : `Following ${item.title}.`,
        { tone: 'success' }
      )
    } catch (err) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Could not update follow state.', { tone: 'error' })
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

  const score = details?.vote_average ?? item.vote_average
  const showScore = score !== undefined && score !== null && score > 0

  // Read statically so Next can inline it at build time. Unset (the default for
  // anyone who isn't running the IPTV server locally) hides the button entirely.
  const iptvBase = process.env.NEXT_PUBLIC_IPTV_URL?.replace(/\/+$/, '')
  const iptvUrl =
    iptvBase && item.type === 'movie'
      ? `${iptvBase}/?q=${encodeURIComponent(item.title)}#movies`
      : null

  // Cinejoy keys everything off TMDB ids, so the bare id is enough — the site
  // redirects it to its own slugged URL. Its path segment for shows is `tv`,
  // not the `show` this app uses internally.
  const cinejoyUrl = `https://cinejoy.to/${item.type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}`

  // F-36: the footer used to render up to five solid pine buttons, every one of
  // them Button's default `primary`, with no hierarchy at all. Exactly one solid
  // button now: the contextual next action, which is tracking episodes when the
  // show is cached locally and otherwise marking it watched. Nothing is primary
  // once it has been watched — there is no next step to point at.
  const trackable = item.type === 'show' && !!details?.media_id
  const primaryAction: 'track' | 'watched' | null = trackable
    ? 'track'
    : details?.isWatched
      ? null
      : 'watched'

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--scrim)' }}>
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-info-title"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        style={{ background: 'var(--surface-modal)' }}
        className="glass-card rounded-[var(--radius-2xl)] w-full max-w-2xl overflow-hidden relative border border-white/15 max-h-[calc(100dvh-2rem)] md:max-h-[90vh] flex flex-col shadow-2xl shadow-green-500/[0.05]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
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
              <Image
                src={item.poster_url}
                alt={item.title}
                width={160}
                height={240}
                sizes="(max-width: 768px) 128px, 160px"
                className="w-32 md:w-40 h-auto rounded-[var(--radius-xl)] object-cover shadow-2xl shadow-black/50 border border-white/5 mx-auto md:mx-0 shrink-0 self-start"
              />
            ) : (
              <div className="w-32 h-48 md:w-40 md:h-60 rounded-[var(--radius-xl)] bg-zinc-900 border border-white/5 flex items-center justify-center text-xs text-zinc-600 mx-auto md:mx-0 shrink-0">
                No Poster
              </div>
            )}

            {/* Basic Info */}
            <div className="flex-1 space-y-3.5 text-center md:text-left self-center">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 border border-white/[0.04] px-2 py-0.5 rounded">
                  {item.type === 'show' ? 'TV Show' : 'Movie'}
                </span>
                {showScore && (
                  details?.imdb_id ? (
                    <a
                      href={`https://www.imdb.com/title/${details.imdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/5 border border-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-amber-400/10 hover:border-amber-400/20 transition-colors"
                    >
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{score!.toFixed(1)} TMDB / IMDb</span>
                    </a>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/5 border border-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{score!.toFixed(1)} TMDB / IMDb</span>
                    </span>
                  )
                )}
              </div>

              <h2 id="media-info-title" className="text-2xl md:text-3xl font-black text-white leading-tight">
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
                    <span>Dir: <Link href={`/person/${encodeURIComponent(details.director)}`} {...(newTabLinks && { target: '_blank', rel: 'noopener noreferrer' })} onNavigate={dismissOnNavigate} className="hover:text-white hover:underline transition-colors">{details.director}</Link></span>
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
              <div className="pt-3 flex flex-wrap gap-2">
                {details?.trailer_url && (
                  <a
                    href={details.trailer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-[var(--live)]/10 hover:bg-[var(--live)]/20 text-[var(--live)] font-bold text-xs transition-colors border border-[var(--live)]/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-[var(--live)]" />
                    Watch Trailer
                  </a>
                )}
                {iptvUrl && (
                  <a
                    href={iptvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] font-bold text-xs transition-colors border border-[var(--accent)]/20"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    Watch on IPTV
                  </a>
                )}
                <a
                  href={cinejoyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm bg-white/[0.03] hover:bg-white/[0.07] text-zinc-400 hover:text-zinc-200 font-bold text-xs transition-colors border border-white/5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Cinejoy
                </a>
              </div>
            </div>
          </div>

          <hr className="border-white/5" />

          {/* Your Rating — only once there's a watch entry to rate against. */}
          {details?.isWatched && details.watch_entry && (
            <div
              ref={ratingRowRef}
              className={`space-y-2.5 rounded-[var(--radius-md)] transition-shadow duration-500 ${ratingPulse ? 'ring-2 ring-[var(--accent)]/60 ring-offset-4 ring-offset-transparent' : ''}`}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Your Rating
              </h3>
              <div className="flex items-center gap-3">
                <RatingStars value={userRating} onChange={handleRatingChange} />
                {userRating != null && (
                  <span className="text-xs text-zinc-500">{userRating} / 5</span>
                )}
              </div>
            </div>
          )}

          {/* Watchlist Priority Switcher */}
          {currentPriority && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Watchlist Priority
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'must_watch' as WatchlistPriority, label: 'Must Watch', icon: Flame, color: 'hover:text-rust-400 hover:bg-rust-500/5 hover:border-rust-500/20', activeColor: 'text-rust-400 bg-rust-500/10 border-rust-500/30' },
                  { value: 'want_to_watch' as WatchlistPriority, label: 'Want to Watch', icon: Sparkles, color: 'hover:text-amber-400 hover:bg-amber-400/5 hover:border-amber-400/20', activeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
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
                          background: 'var(--btn-ghost-bg)',
                          borderColor: 'var(--border-subtle)',
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
                  {details?.overview || item.overview || 'No description available.'}
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
                        onNavigate={dismissOnNavigate}
                        className="px-3 py-1 rounded-sm text-xs font-medium text-zinc-300 bg-white/5 border border-white/[0.04] hover:bg-white/10 hover:text-white transition-colors"
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
                    <a href={details.watch_providers.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--accent)] hover:underline">
                      Provided by JustWatch
                    </a>
                  )}
                </div>
                
                <div className="space-y-3">
                  {details?.watch_providers?.flatrate && details.watch_providers.flatrate.length > 0 ? (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold text-zinc-400">Stream</span>
                      <div className="flex flex-wrap gap-2">
                        {details.watch_providers.flatrate.map((p: TmdbWatchProvider) => (
                          <div key={p.provider_id} className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10" title={p.provider_name}>
                            {p.logo_path ? (
                              <Image src={p.logo_path} alt={p.provider_name} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px] text-center p-0.5">{p.provider_name}</div>
                            )}
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
            currentPriority || onRemoveFromWatchlist ? (
              <Button
                variant="ghost"
                tone="destructive"
                disabled={loading || actioning !== null}
                onClick={handleRemoveClick}
                style={{ flex: 1 }}
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
                variant="ghost"
                disabled
                style={{ flex: 1, opacity: 0.6 }}
              >
                <Bookmark className="w-4 h-4" />
                <span>On Watchlist</span>
              </Button>
            )
          ) : (
            <Button
              variant="ghost"
              disabled={loading || actioning !== null}
              onClick={handleWatchlistClick}
              style={{ flex: 1 }}
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
              disabled={loading || actioning !== null}
              onClick={() => handleWatchedClick({ rewatch: true })}
              // This used to be a permanently disabled "Already Watched" chip, so
              // it carried a dimmed opacity. It is a real action now — the teal
              // "you have seen this" tint is `tone="success"`, and Button owns the
              // opacity, or an enabled control keeps reading as greyed out.
              variant="ghost"
              tone="success"
              style={{ flex: 1 }}
            >
              {actioning === 'watched' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Log rewatch</span>
            </Button>
          ) : (
            <Button
              variant={primaryAction === 'watched' ? 'primary' : 'ghost'}
              disabled={loading || actioning !== null}
              onClick={() => handleWatchedClick()}
              style={{ flex: 1 }}
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
              variant="ghost"
              tone={details?.isFollowed ? 'success' : 'default'}
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

          {/* Only reachable once the show is cached locally — upsertMedia writes
              the seasons rows the tracker renders, so media_id implies they exist. */}
          {item.type === 'show' && details?.media_id && (
            <Link
              href={`/show/${details.media_id}`}
              {...(newTabLinks && { target: '_blank', rel: 'noopener noreferrer' })}
              onNavigate={dismissOnNavigate}
              // Not a Button, but it is one of the footer's actions, so it takes
              // the same `.btn-*` classes rather than a hand-rolled copy of them.
              className={`btn ${primaryAction === 'track' ? 'btn-primary' : 'btn-ghost'} w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm font-semibold text-sm`}
            >
              <ListVideo className="w-4 h-4" />
              <span>Track Episodes</span>
            </Link>
          )}

          <Button
            variant="ghost"
            onClick={() => setShowSimilar(true)}
            fullWidth
          >
            <Sparkles className="w-4 h-4" />
            <span>Similar {item.type === 'movie' ? 'Movies' : 'TV Shows'}</span>
          </Button>
        </div>
      </motion.div>

      {showSimilar && (
        <SimilarModal
          tmdbId={item.tmdb_id}
          type={item.type}
          onClose={() => setShowSimilar(false)}
          onNavigateAway={dismissOnNavigate}
        />
      )}
    </div>,
    document.body
  )
}
