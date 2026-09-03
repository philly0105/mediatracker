'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, ChevronLeft, ChevronRight, Loader2, Play, Tv } from 'lucide-react'
import { findNextUp } from '@/lib/nextUp'
import { useToast } from '@/components/ToastProvider'

export type ContinueWatchingSeason = {
  id: string
  season_number: number
  episode_count: number
}

export type ContinueWatchingNextUp = {
  season_id: string
  season_number: number
  episode_number: number
}

export type ContinueWatchingShow = {
  media: {
    id: string
    title: string
    poster_url: string | null
  }
  seasons: ContinueWatchingSeason[]
  watchedEpisodeKeys: string[]
  nextUp: ContinueWatchingNextUp
}

type Props = {
  shows: ContinueWatchingShow[]
}

function getEpisodeStats(seasons: ContinueWatchingSeason[], watchedKeys: Set<string>) {
  let watched = 0
  let total = 0

  for (const season of seasons) {
    if (season.episode_count <= 0) continue
    for (let episode = 1; episode <= season.episode_count; episode++) {
      total++
      if (watchedKeys.has(`${season.id}-${episode}`)) watched++
    }
  }

  return { watched, total }
}

export default function ContinueWatchingRow({ shows }: Props) {
  const [items, setItems] = useState(() =>
    shows.flatMap((show) => {
      const watchedKeys = new Set(show.watchedEpisodeKeys)
      const nextUp = findNextUp(show.seasons, watchedKeys) ?? show.nextUp
      return nextUp ? [{ ...show, nextUp }] : []
    })
  )
  const [loadingById, setLoadingById] = useState<Record<string, boolean>>({})
  const [errorById, setErrorById] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  async function markWatched(show: ContinueWatchingShow) {
    const currentNextUp = show.nextUp
    const snapshotItem = show
    const snapshotIndex = items.findIndex((item) => item.media.id === show.media.id)
    setLoadingById((prev) => ({ ...prev, [show.media.id]: true }))
    setErrorById((prev) => ({ ...prev, [show.media.id]: false }))

    try {
      const response = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_id: currentNextUp.season_id,
          episode_number: currentNextUp.episode_number,
        }),
      })

      if (!response.ok) throw new Error('Failed to mark episode watched')

      setItems((prev) =>
        prev.flatMap((item) => {
          if (item.media.id !== show.media.id) return [item]

          const watchedKeys = new Set(item.watchedEpisodeKeys)
          watchedKeys.add(`${currentNextUp.season_id}-${currentNextUp.episode_number}`)
          const nextUp = findNextUp(item.seasons, watchedKeys)
          if (!nextUp) return []

          return [{
            ...item,
            watchedEpisodeKeys: Array.from(watchedKeys),
            nextUp,
          }]
        })
      )

      toast(
        `Marked ${show.media.title} S${currentNextUp.season_number} E${currentNextUp.episode_number} as watched.`,
        {
          tone: 'success',
          action: { label: 'Undo', onClick: () => undoMarkWatched(snapshotItem, snapshotIndex, currentNextUp) },
        }
      )
    } catch {
      setErrorById((prev) => ({ ...prev, [show.media.id]: true }))
    } finally {
      setLoadingById((prev) => ({ ...prev, [show.media.id]: false }))
    }
  }

  // Restores the exact pre-action card: the episode is un-marked server-side
  // and the snapshot replaces (or re-inserts, if the advance removed a finished
  // show) the current card. Indexes may have drifted if other cards changed;
  // clamping to the list length keeps the restore stable rather than perfect.
  async function undoMarkWatched(
    snapshotItem: ContinueWatchingShow,
    snapshotIndex: number,
    nextUp: ContinueWatchingNextUp
  ) {
    try {
      const response = await fetch('/api/episodes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_id: nextUp.season_id,
          episode_number: nextUp.episode_number,
        }),
      })
      if (!response.ok) throw new Error('Failed to undo')

      setItems((prev) => {
        const existing = prev.findIndex((item) => item.media.id === snapshotItem.media.id)
        if (existing !== -1) {
          return prev.map((item, i) => (i === existing ? snapshotItem : item))
        }
        const insertAt = Math.min(Math.max(snapshotIndex, 0), prev.length)
        return [...prev.slice(0, insertAt), snapshotItem, ...prev.slice(insertAt)]
      })
    } catch {
      toast('Could not undo — the episode is still marked watched.', { tone: 'error' })
    }
  }

  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    // A sub-pixel slack: fractional widths mean scrollLeft rarely lands exactly
    // on the maximum, which would leave the right arrow enabled at the end.
    const max = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft < max - 1)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    // Fires once on observe, so the initial state comes from here rather than
    // from a setState in the effect body.
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateScrollState, items.length])

  // scrollBy with no `behavior` uses the element's computed scroll-behavior, so
  // the `scroll-smooth` class applies — and the global prefers-reduced-motion
  // rule in globals.css turns it back to `auto` for anyone who asked for that.
  function scrollByCards(direction: 1 | -1) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 260) })
  }

  if (items.length === 0) return null

  return (
    <div className="relative z-10 pt-4">
      <div className="flex items-center justify-between mb-6 pl-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
          Continue Watching
        </h2>
        {/* Arrows only where there is a pointer to use them; touch has the swipe
            and the scrollbar is thin enough to be a poor drag target with a mouse. */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className="p-1.5 rounded-sm border border-[var(--border-subtle)] text-zinc-400 enabled:hover:text-white enabled:hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className="p-1.5 rounded-sm border border-[var(--border-subtle)] text-zinc-400 enabled:hover:text-white enabled:hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Edge fades, so a half-cut card reads as "there is more" rather than as
            a clipping bug. Pointer-events off — they sit over the scroller. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 w-10 z-10 bg-gradient-to-r from-[var(--bg-void)] to-transparent transition-opacity duration-200 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 right-0 w-10 z-10 bg-gradient-to-l from-[var(--bg-void)] to-transparent transition-opacity duration-200 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}
        />
      <div
        ref={scrollerRef}
        onScroll={updateScrollState}
        className="flex gap-4 overflow-x-auto pb-3 pl-2 pr-2 [scrollbar-width:thin] scroll-smooth snap-x snap-proximity"
      >
        {items.map((show) => {
          const watchedKeys = new Set(show.watchedEpisodeKeys)
          const { watched, total } = getEpisodeStats(show.seasons, watchedKeys)
          const progressPercent = total > 0 ? (watched / total) * 100 : 0
          const loading = loadingById[show.media.id] ?? false
          const failed = errorById[show.media.id] ?? false

          return (
            <div
              key={show.media.id}
              className="group relative flex w-[260px] shrink-0 snap-start overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--glass-card)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--glass-card-hover)] hover:shadow-[var(--glow-violet)]"
            >
              <Link
                href={`/show/${show.media.id}`}
                className="flex min-w-0 flex-1 gap-3 p-3 pr-2"
                aria-label={`Open ${show.media.title}`}
              >
                {/* Was a CSS `background-image`, the only poster in the app not
                    going through next/image: no AVIF/WebP, no responsive sizes,
                    no lazy loading, and it bypassed the remotePatterns allowlist
                    entirely. Sits below the dashboard stat grid, so it does
                    not preload. */}
                <div
                  className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-void)] shadow-md shadow-black/30 transition-transform duration-500 group-hover:scale-[1.03]"
                  aria-hidden={Boolean(show.media.poster_url)}
                >
                  {show.media.poster_url ? (
                    <Image
                      src={show.media.poster_url}
                      alt=""
                      fill
                      sizes="64px"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-700">
                      <Tv className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col py-0.5">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-[var(--accent)]">
                    {show.media.title}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                    <Play className="h-3 w-3 fill-[var(--accent)]/20 text-[var(--accent)]" />
                    <span>Next up: S{show.nextUp.season_number} E{show.nextUp.episode_number}</span>
                  </p>

                  <div className="mt-auto space-y-1.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[var(--teal-400)] transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-medium text-zinc-500">
                      {watched}/{total} watched
                    </p>
                    {failed && (
                      <p className="text-[11px] font-semibold text-[var(--live)]">
                        Could not update
                      </p>
                    )}
                  </div>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => markWatched(show)}
                disabled={loading}
                className="m-3 ml-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[var(--teal-tint-border)] bg-[var(--teal-tint-bg)] text-[var(--teal-300)] transition-all hover:border-[var(--teal-300)] hover:bg-[var(--teal-tint-bg)]/80 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={`Mark ${show.media.title} season ${show.nextUp.season_number} episode ${show.nextUp.episode_number} watched`}
                title="Mark watched"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}
