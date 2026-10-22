'use client'
import React, { useEffect, useState, useCallback, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus,
  Check,
  Loader2,
  Tv,
  X,
  Sparkles,
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
import type { TmdbCastCredit, TmdbWatchProviders } from '@/lib/tmdb'
import { PRIORITY_CONFIG } from '@/lib/priorityConfig'
import SimilarModal from './SimilarModal'
import AmbientBackdrop from './AmbientBackdrop'
import { TitleHero } from '@/components/title/TitleHero'
import { TitleStatus } from '@/components/title/TitleStatus'
import { CastStrip } from '@/components/title/CastStrip'
import { StreamingRow } from '@/components/title/StreamingRow'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ToastProvider'
import { useModal } from '@/lib/useModal'
import { isAlreadyWatchedError } from '@/lib/useMediaActions'

const PRIORITY_LABELS: Record<WatchlistPriority, string> = {
  must_watch: 'Must Watch',
  want_to_watch: 'Want to Watch',
  someday: 'Someday',
}

const PRIORITY_OPTIONS: WatchlistPriority[] = ['must_watch', 'want_to_watch', 'someday']

// A modal under another sheet keeps its content but gives up its blur: the
// sheet and the hero slab each carry a backdrop-filter, so a stacked title
// modal or the Similar sheet over this one would pile two to four onto
// whatever the page behind them already blurs. Only the top sheet is being
// looked at. Arbitrary variants rather than a globals.css rule, on the dialog
// itself so the drop reaches it and the slab inside it while the Similar sheet
// rendered beside it keeps its own.
const COVERED_CLASS =
  '[backdrop-filter:none] [-webkit-backdrop-filter:none] ' +
  '[&_.glass-slab]:[backdrop-filter:none] [&_.glass-slab]:[-webkit-backdrop-filter:none]'

// The hero frame is a .glass-panel inside a sheet that already blurs the page,
// so its own blur has nothing but the sheet's flat fill to work on (spec §3,
// principle 2: blur only the top-level containers). Dropped for good on the
// scroll area, which leaves the slab over the sharp art as the hero's one
// blurred surface in here.
const NESTED_PANEL_FLAT =
  '[&_.glass-panel]:[backdrop-filter:none] [&_.glass-panel]:[-webkit-backdrop-filter:none]'

// External links in the hero's action row: the same glass pill as a ghost
// Button, on an <a>.
const LINK_PILL = 'btn btn-ghost inline-flex items-center justify-center gap-2 px-4 text-[length:var(--text-sm)] font-semibold'

const bodyText: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--text-body)',
  lineHeight: '22px',
  color: 'var(--text-strong)',
}

interface Props {
  item: TmdbSearchResult
  onClose: () => void
  onAddToWatchlist: () => Promise<void>
  onMarkAsWatched: (opts?: { rewatch?: boolean }) => Promise<{ id: string; rating: number | null } | void>
  currentPriority?: WatchlistPriority
  onUpdatePriority?: (priority: WatchlistPriority) => Promise<void>
  onRemoveFromWatchlist?: () => Promise<void>
  newTabLinks?: boolean
  // Called instead of onClose when a link inside the modal navigates this tab
  // away. Layered hosts (the search overlay) use it to tear down the whole
  // stack rather than just this modal, which onClose alone would leave behind.
  onNavigateAway?: () => void
  /** Set by <Presence> once this modal has been closed: swap the enter
   *  animation for the exit one for as long as it stays mounted. */
  exiting?: boolean
  /** Set by MediaModalStack while another modal sits on top of this one. */
  covered?: boolean
}

interface FullDetails {
  imdb_id: string | null
  overview: string | null
  media_id: string | null
  runtime_mins: number | null
  director: string | null
  cast_members: string[]
  cast_credits: TmdbCastCredit[]
  genres: string[]
  isWatched: boolean
  isWatchlisted: boolean
  isFollowed: boolean
  watch_entry: { id: string; rating: number | null; watched_at: string } | null
  trailer_url: string | null
  watch_providers?: TmdbWatchProviders | null
  vote_average?: number | null
  backdrop_url: string | null
  logo_url: string | null
  logo_aspect: number | null
  tagline: string | null
  certification: string | null
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
  onNavigateAway,
  exiting = false,
  covered = false
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
  // Not a fixed id: MediaModalStack keeps the modals under the top one
  // mounted, and a shared id would name every dialog after the lowest title.
  const titleId = useId()

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
        cast_credits: data.cast_credits ?? [],
        genres: data.genres ?? [],
        isWatched: data.isWatched ?? false,
        isWatchlisted: data.isWatchlisted ?? false,
        isFollowed: data.isFollowed ?? false,
        watch_entry: data.watch_entry ?? null,
        trailer_url: data.trailer_url ?? null,
        watch_providers: data.watch_providers ?? null,
        vote_average: data.vote_average ?? null,
        backdrop_url: data.backdrop_url ?? null,
        logo_url: data.logo_url ?? null,
        logo_aspect: data.logo_aspect ?? null,
        tagline: data.tagline ?? null,
        certification: data.certification ?? null,
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
      const entry = await onMarkAsWatched(opts)
      if (details) applyDetails({ ...details, isWatched: true })
      if (opts?.rewatch) {
        // Rewatches still refetch full details: details.watch_entry is what
        // handleRatingChange PATCHes and must keep pointing at whatever
        // /api/tmdb/details considers the primary entry for this title, not at
        // the newly created rewatch row. Rewatches are also never offered Undo.
        await loadDetails(true)
        toast(`Logged a rewatch of ${item.title}.`, { tone: 'success' })
      } else if (entry) {
        const base = detailsCache.get(cacheKey) ?? details
        // A first log is dated today, the same UTC date useMediaActions posts,
        // so the hero can show it without the refetch.
        const watched_at = new Date().toISOString().split('T')[0]
        if (base) applyDetails({ ...base, isWatched: true, watch_entry: { ...entry, watched_at } })
        setUserRating(entry.rating ?? null)
        toast(`Logged ${item.title} as watched — rate it below.`, {
          tone: 'success',
          action: { label: 'Undo', onClick: () => undoWatch(entry.id) },
        })
        ratingRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setRatingPulse(true)
      } else {
        const fresh = await loadDetails(true)
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
      const cached = detailsCache.get(cacheKey)
      if (cached) {
        applyDetails({ ...cached, isWatched: false, watch_entry: null })
      } else {
        await loadDetails(true)
      }
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

  const score = details?.vote_average ?? item.vote_average

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

  // Recommendations already carry a backdrop; everything else waits for the
  // details. The ambient layer takes it too (spec §5.6: "Ambient = this
  // title"), and gives the page its own back when this unmounts.
  const backdropUrl = details?.backdrop_url ?? item.backdrop_url ?? null
  const flatrate = details?.watch_providers?.flatrate?.[0]
  const platform = flatrate ? { name: flatrate.provider_name, logoUrl: flatrate.logo_path } : null
  // The director leads the strip with a caption, so the person link the meta
  // line used to carry still exists. An actor-director is listed once. The
  // credits carry the headshots and characters; the names alone are the
  // fallback when TMDB has none.
  const castMembers = details?.cast_credits.length
    ? details.cast_credits.map((c) => ({ name: c.name, character: c.character, profileUrl: c.profile_url }))
    : (details?.cast_members ?? []).map((name) => ({ name }))
  const cast = [
    ...(details?.director ? [{ name: details.director, character: 'Director' }] : []),
    ...castMembers.filter((member) => member.name !== details?.director),
  ]

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center md:p-6"
      style={{ background: 'var(--scrim)' }}
    >
      <AmbientBackdrop src={backdropUrl} />
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // --glass-modal over the panel gradient: a sheet over a page full of
        // glass needs the more opaque fill or the page reads through it. Set
        // by retargeting the token .glass-panel paints with, not as an inline
        // background: an inline value would also beat the opaque fallback
        // globals.css swaps in under prefers-reduced-transparency and where
        // backdrop-filter is unsupported.
        // A full-screen sheet under md; the 960 sheet at radius 28 above it.
        className={`${exiting ? 'dialog-out' : 'dialog-in'} glass-panel glass-rim [--glass-panel:var(--glass-modal)] relative flex w-full flex-col overflow-hidden shadow-[var(--shadow-xl)] max-md:h-dvh max-md:rounded-none md:max-h-[calc(100dvh-3rem)] md:max-w-[960px] md:rounded-[var(--radius-2xl)]${covered || showSimilar ? ` ${COVERED_CLASS}` : ''}`}
      >
        <Button
          variant="icon"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 md:right-4 md:top-4"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
        </Button>

        {/* p-5 on every width: the cast strip bleeds --space-5 into the
            padding, and a narrower inset would hand the scroll area a
            sideways scrollbar. */}
        <div className={`scrollbar-none flex-1 space-y-5 overflow-y-auto p-5 ${NESTED_PANEL_FLAT}`}>
          <TitleHero
            title={item.title}
            type={item.type}
            backdropUrl={backdropUrl}
            logoUrl={details?.logo_url}
            logoAspect={details?.logo_aspect}
            posterUrl={item.poster_url}
            tagline={details?.tagline}
            certification={details?.certification}
            year={item.release_year}
            genres={details?.genres ?? item.genres ?? []}
            tmdbScore={score}
            runtimeMins={details?.runtime_mins}
            platform={platform}
            headingLevel={2}
            headingId={titleId}
            status={
              // Only once there's a watch entry to date and rate against. The
              // ring is the one-shot pulse after "Mark as Watched".
              details?.isWatched && details.watch_entry ? (
                <div
                  ref={ratingRowRef}
                  className="-m-2 rounded-[var(--radius-md)] p-2 transition-shadow duration-500"
                  style={{ boxShadow: ratingPulse ? 'var(--accent-ring)' : 'none' }}
                >
                  <TitleStatus
                    status={{
                      kind: 'watched',
                      watchedAt: details.watch_entry.watched_at,
                      rating: userRating,
                      onRate: handleRatingChange,
                    }}
                  />
                </div>
              ) : undefined
            }
            actions={
              <>
                {details?.trailer_url && (
                  <a href={details.trailer_url} target="_blank" rel="noopener noreferrer" className={LINK_PILL}>
                    <Play className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--live)', fill: 'var(--live)' }} />
                    Watch Trailer
                  </a>
                )}
                {iptvUrl && (
                  <a href={iptvUrl} target="_blank" rel="noopener noreferrer" className={LINK_PILL}>
                    <Tv className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    Watch on IPTV
                  </a>
                )}
                <a href={cinejoyUrl} target="_blank" rel="noopener noreferrer" className={LINK_PILL}>
                  <ExternalLink className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  Cinejoy
                </a>
                {/* The score badge used to be this link; the score now sits in
                    the hero's meta line, so the link stands on its own. */}
                {details?.imdb_id && (
                  <a href={`https://www.imdb.com/title/${details.imdb_id}`} target="_blank" rel="noopener noreferrer" className={LINK_PILL}>
                    <ExternalLink className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    IMDb
                  </a>
                )}
              </>
            }
          />

          {/* Watchlist Priority Switcher: the toolbar chip recipe FilterPills
              uses, with the spinner standing in for the icon while one saves.
              The chip's icon takes the accent on the pressed one, where
              FilterPills adds a dot: the fill alone is a 6% step. A bare .btn
              is not in the forced-colours border list, and that mode drops
              the chip edge, so the chips draw their own border there. The
              pressed one opts out of the forced palette (a Canvas backplate
              would hide its label), so its accent icon goes HighlightText. */}
          {currentPriority && (
            <section aria-label="Watchlist Priority">
              <SectionHeader title="Watchlist Priority" />
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((value) => {
                  const Icon = PRIORITY_CONFIG[value].icon
                  const isActive = currentPriority === value
                  const isActioning = actioning === `priority-${value}`
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={isActive}
                      disabled={actioning !== null}
                      onClick={() => handlePriorityClick(value)}
                      className={`btn inline-flex min-h-11 flex-auto items-center justify-center gap-2 px-4 text-[length:var(--text-sm)] font-semibold whitespace-nowrap transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 forced-colors:border forced-colors:border-[color:CanvasText] ${
                        isActive
                          ? 'glass-btn text-[var(--text-primary)] forced-colors:forced-color-adjust-none forced-colors:bg-[color:Highlight] forced-colors:text-[color:HighlightText]'
                          : 'bg-[var(--glass-chip)] shadow-[var(--glass-chip-edge)] text-[var(--text-secondary)] hover:bg-[var(--glass-fill-selected)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isActioning ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
                      ) : (
                        <Icon
                          className={`h-4 w-4 ${isActive ? 'text-[var(--accent)] forced-colors:text-[color:HighlightText]' : ''}`}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      )}
                      <span>{PRIORITY_LABELS[value]}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : error ? (
            <p style={{ ...bodyText, color: 'var(--text-muted)' }}>Could not fetch casting details.</p>
          ) : (
            <>
              {/* The hero shows the tagline; the synopsis lives here in full,
                  so a long one is never clamped behind it. */}
              <section aria-label="Overview">
                <SectionHeader title="Overview" />
                <p style={{ ...bodyText, paddingLeft: 4 }}>
                  {details?.overview || item.overview || 'No description available.'}
                </p>
              </section>

              <CastStrip cast={cast} onNavigate={dismissOnNavigate} newTabLinks={newTabLinks} />

              <section aria-label="Where to watch">
                <SectionHeader title="Where to watch" />
                {platform ? (
                  <StreamingRow provider={platform} link={details?.watch_providers?.link} />
                ) : (
                  // StreamingRow carries the JustWatch link only with a
                  // provider; without one the link is still the way to the
                  // rent and buy options, so it stays, in the row's own style.
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1" style={{ paddingLeft: 4 }}>
                    <p style={{ ...bodyText, color: 'var(--text-muted)' }}>Not available to stream.</p>
                    {details?.watch_providers?.link && (
                      <a
                        href={details.watch_providers.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-fill-hover)] hover:text-[var(--text-primary)]"
                        style={{ fontSize: 'var(--text-sm)', lineHeight: '18px', fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'] }}
                      >
                        Provided by JustWatch
                        <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer Actions. Under md the sheet is the whole screen, so the
            footer clears the home indicator the way the shell's bottom bar
            does (viewportFit is `cover`; the inset is 0 elsewhere). */}
        <div className="border-t flex gap-3 flex-wrap p-4 md:p-5 max-md:pb-[calc(var(--space-4)+env(safe-area-inset-bottom,0px))]" style={{ borderTopColor: 'var(--border-divider)' }}>
          {currentPriority || details?.isWatchlisted ? (
            currentPriority || onRemoveFromWatchlist ? (
              <Button
                variant="ghost"
                tone="destructive"
                disabled={loading || actioning !== null}
                onClick={handleRemoveClick}
                style={{ flex: '1 1 auto' }}
              >
                {actioning === 'remove' ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                )}
                <span>Remove from Watchlist</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                disabled
                style={{ flex: '1 1 auto', opacity: 0.6 }}
              >
                <Bookmark className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                <span>On Watchlist</span>
              </Button>
            )
          ) : (
            <Button
              variant="ghost"
              disabled={loading || actioning !== null}
              onClick={handleWatchlistClick}
              style={{ flex: '1 1 auto' }}
            >
              {actioning === 'watchlist' ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
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
              style={{ flex: '1 1 auto' }}
            >
              {actioning === 'watched' ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              )}
              <span>Log rewatch</span>
            </Button>
          ) : (
            <Button
              variant={primaryAction === 'watched' ? 'primary' : 'ghost'}
              disabled={loading || actioning !== null}
              onClick={() => handleWatchedClick()}
              style={{ flex: '1 1 auto' }}
            >
              {actioning === 'watched' ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              )}
              <span>Mark as Watched</span>
            </Button>
          )}

          {item.type === 'show' && (
            <Button
              disabled={loading || actioning !== null}
              onClick={handleFollowToggle}
              variant="ghost"
              tone={details?.isFollowed ? 'success' : 'default'}
              style={{ flex: '1 1 auto' }}
            >
              {actioning === 'follow' ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
              ) : details?.isFollowed ? (
                <BellOff className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <Bell className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
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
              className={`btn ${primaryAction === 'track' ? 'btn-primary' : 'btn-ghost'} inline-flex items-center justify-center gap-2 px-[18px] text-[length:var(--text-base)] font-semibold`}
              style={{ flex: '1 1 auto' }}
            >
              <ListVideo className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              <span>Track Episodes</span>
            </Link>
          )}

          <Button
            variant="ghost"
            onClick={() => setShowSimilar(true)}
            style={{ flex: '1 1 auto' }}
          >
            <Sparkles className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            <span>Similar {item.type === 'movie' ? 'Movies' : 'TV Shows'}</span>
          </Button>
        </div>
      </div>

      {showSimilar && (
        <SimilarModal
          tmdbId={item.tmdb_id}
          type={item.type}
          covered={covered}
          onClose={() => setShowSimilar(false)}
          onNavigateAway={dismissOnNavigate}
        />
      )}
    </div>,
    document.body
  )
}
