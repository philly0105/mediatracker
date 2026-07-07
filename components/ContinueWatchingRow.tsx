'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, Play, Tv } from 'lucide-react'

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

function findNextUp(seasons: ContinueWatchingSeason[], watchedKeys: Set<string>) {
  const orderedSeasons = [...seasons].sort((a, b) => a.season_number - b.season_number)

  for (const season of orderedSeasons) {
    if (season.episode_count <= 0) continue
    for (let episode = 1; episode <= season.episode_count; episode++) {
      if (!watchedKeys.has(`${season.id}-${episode}`)) {
        return {
          season_id: season.id,
          season_number: season.season_number,
          episode_number: episode,
        }
      }
    }
  }

  return null
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

  async function markWatched(show: ContinueWatchingShow) {
    const currentNextUp = show.nextUp
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
    } catch {
      setErrorById((prev) => ({ ...prev, [show.media.id]: true }))
    } finally {
      setLoadingById((prev) => ({ ...prev, [show.media.id]: false }))
    }
  }

  if (items.length === 0) return null

  return (
    <div className="relative z-10 pt-4">
      <div className="flex items-center justify-between mb-6 pl-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
          Continue Watching
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 pl-2 pr-2 [scrollbar-width:thin]">
        {items.map((show) => {
          const watchedKeys = new Set(show.watchedEpisodeKeys)
          const { watched, total } = getEpisodeStats(show.seasons, watchedKeys)
          const progressPercent = total > 0 ? (watched / total) * 100 : 0
          const loading = loadingById[show.media.id] ?? false
          const failed = errorById[show.media.id] ?? false

          return (
            <div
              key={show.media.id}
              className="group relative flex w-[260px] shrink-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--glass-card)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--glass-card-hover)] hover:shadow-[var(--glow-violet)]"
            >
              <Link
                href={`/show/${show.media.id}`}
                className="flex min-w-0 flex-1 gap-3 p-3 pr-2"
                aria-label={`Open ${show.media.title}`}
              >
                <div
                  className="h-24 w-16 shrink-0 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-void)] bg-cover bg-center shadow-md shadow-black/30 transition-transform duration-500 group-hover:scale-[1.03]"
                  style={show.media.poster_url ? { backgroundImage: `url(${show.media.poster_url})` } : undefined}
                  aria-hidden={Boolean(show.media.poster_url)}
                >
                  {show.media.poster_url ? (
                    <span className="sr-only">{show.media.title}</span>
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
  )
}
