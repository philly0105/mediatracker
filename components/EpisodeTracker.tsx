'use client'
import React, { useState } from 'react'
import type { Season, Episode, EpisodeProgress } from '@/types'
import { Check } from 'lucide-react'
import { formatAirDate, isUnaired } from '@/lib/formatDate'
import { findNextUp } from '@/lib/nextUp'
import { Button } from '@/components/ui/Button'
import { MediaRow } from '@/components/ui/MediaRow'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SegmentedProgress } from '@/components/ui/SegmentedProgress'
import { formatMinutes } from '@/components/title/format'

interface Props {
  seasons: Season[]
  progress: EpisodeProgress[]
  /** Titles and air dates, when they have been fetched. Absent is normal — the
   *  rows fall back to numbers, which is all they could ever render before. */
  episodes?: Episode[]
  onProgressChange: (seasonId: string, episode: number | number[], watched: boolean) => void
}

/**
 * Clicking an episode is never a single toggle: clicking E10 marks E1–E10, and
 * clicking a watched E5 unmarks E5 through the end of the season. Nothing in
 * the UI said so — the tooltip carried the episode name — so this spells the
 * range out in both the tooltip and the accessible name.
 */
function cascadeLabel(
  seasonNumber: number,
  ep: number,
  watched: boolean,
  episodeCount: number,
  name?: string | null,
) {
  const suffix = name ? ` (${name})` : ''
  if (!watched) {
    return ep === 1
      ? `Mark S${seasonNumber} E1 watched${suffix}`
      : `Mark S${seasonNumber} E1–E${ep} watched${suffix}`
  }
  return ep === episodeCount
    ? `Unmark S${seasonNumber} E${ep}${suffix}`
    : `Unmark S${seasonNumber} E${ep}–E${episodeCount}${suffix}`
}

export default function EpisodeTracker({ seasons, progress, episodes, onProgressChange }: Props) {
  const [open, setOpen] = useState<string | null>(() => {
    const watchedKeys = new Set(progress.map(p => `${p.season_id}-${p.episode_number}`))
    return findNextUp(seasons, watchedKeys)?.season_id ?? seasons[0]?.id ?? null
  })

  const watchedSet = new Set(progress.map(p => `${p.season_id}-${p.episode_number}`))
  const episodeMap = new Map((episodes ?? []).map(e => [`${e.season_id}-${e.episode_number}`, e]))
  // Recomputed from the live progress rather than kept with `open`: the ring
  // on the row has to move to the next episode as soon as one is marked.
  const nextUp = findNextUp(seasons, watchedSet)

  function handleEpisodeClick(seasonId: string, ep: number, watched: boolean) {
    const affected: number[] = []
    if (!watched) {
      // Mark this episode and all unwatched episodes before it
      for (let e = 1; e <= ep; e++) {
        if (!watchedSet.has(`${seasonId}-${e}`)) {
          affected.push(e)
        }
      }
    } else {
      // Unmark this episode and all watched episodes after it
      const season = seasons.find(s => s.id === seasonId)
      const end = season?.episode_count ?? ep
      for (let e = ep; e <= end; e++) {
        if (watchedSet.has(`${seasonId}-${e}`)) {
          affected.push(e)
        }
      }
    }
    if (affected.length > 0) {
      onProgressChange(seasonId, affected.length === 1 ? affected[0] : affected, !watched)
    }
  }

  // Marking a finished season was 24 clicks. The API already takes an array of
  // episode numbers, so this is the same call the click-to-here cascade makes.
  function handleSeasonToggle(season: Season, allWatched: boolean) {
    const affected: number[] = []
    for (let e = 1; e <= season.episode_count; e++) {
      const isWatched = watchedSet.has(`${season.id}-${e}`)
      if (allWatched ? isWatched : !isWatched) {
        // Marking the whole season skips episodes that have not aired yet — one
        // click should not claim time-travel into the future. Unmarking is
        // unchanged and clears every watched episode regardless of air date.
        if (!allWatched && isUnaired(episodeMap.get(`${season.id}-${e}`)?.air_date ?? null)) continue
        affected.push(e)
      }
    }
    if (affected.length === 0) return
    onProgressChange(season.id, affected.length === 1 ? affected[0] : affected, !allWatched)
  }

  // Episodes that have not aired yet can't be watched, so they don't count
  // toward the header fraction or whether a season reads as complete.
  // A season with no metadata at all still counts everything, as before.
  function seasonCounts(s: Season) {
    const watchedCount = progress.filter(p => p.season_id === s.id).length
    const unairedCount = Array.from({ length: s.episode_count }, (_, i) => i + 1)
      .filter(e => isUnaired(episodeMap.get(`${s.id}-${e}`)?.air_date ?? null)).length
    const airedCount = unairedCount > 0 ? s.episode_count - unairedCount : s.episode_count
    return { watchedCount, airedCount, allWatched: airedCount > 0 && watchedCount >= airedCount }
  }

  // One season at a time, picked in the segmented control; the open one used
  // to be an accordion panel.
  const season = seasons.find(s => s.id === open) ?? seasons[0]
  if (!season) return null

  const { watchedCount, airedCount, allWatched } = seasonCounts(season)

  return (
    <div className="space-y-4">
      {/* The control is one row that scrolls sideways rather than wrapping, so
          a long-running show's twenty seasons do not stack into a wall. A
          finished season carries a check, which is what the accordion's
          per-season bar used to tell at a glance. */}
      <div className="scrollbar-none -mx-1 overflow-x-auto px-1 pb-1">
        <SegmentedControl
          label="Season"
          size="sm"
          options={seasons.map(s => ({
            id: s.id,
            label: `Season ${s.season_number}`,
            icon: seasonCounts(s).allWatched ? Check : undefined,
          }))}
          value={season.id}
          onChange={setOpen}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-3" style={{ minWidth: 200 }}>
          <SegmentedProgress
            value={watchedCount}
            max={airedCount}
            count={false}
            aria-label={`${watchedCount} of ${airedCount} episodes watched in season ${season.season_number}`}
            className="max-w-[260px] flex-1"
          />
          <span
            style={{
              flex: 'none',
              fontSize: 'var(--text-sm)',
              lineHeight: '18px',
              fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'],
              color: 'var(--text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {watchedCount}/{airedCount}
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => handleSeasonToggle(season, allWatched)}>
          {allWatched ? 'Unmark whole season' : 'Mark whole season watched'}
        </Button>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: season.episode_count }, (_, i) => i + 1).map(ep => {
          const watched = watchedSet.has(`${season.id}-${ep}`)
          const meta = episodeMap.get(`${season.id}-${ep}`)
          const airLabel = meta?.air_date ? formatAirDate(meta.air_date) : null
          const unaired = isUnaired(meta?.air_date ?? null)
          const label = cascadeLabel(season.season_number, ep, watched, season.episode_count, meta?.name)
          const isNext = nextUp?.season_id === season.id && nextUp.episode_number === ep
          return (
            <li
              key={ep}
              style={{
                opacity: unaired && !watched ? 0.55 : 1,
                borderRadius: 'var(--radius-row)',
                // The accent ring marks the next episode to watch, on the
                // wrapper because the row's own shadow is its edge.
                boxShadow: isNext ? 'var(--accent-ring)' : undefined,
              }}
            >
              <MediaRow
                title={meta?.name ?? `Episode ${ep}`}
                type="show"
                stillUrl={meta?.still_url}
                aside={meta?.runtime_mins ? formatMinutes(meta.runtime_mins) : ''}
                subtitle={airLabel ? (unaired ? `Airs ${airLabel}` : airLabel) : undefined}
                actions={
                  // The one control per episode, as the old grid cell was: the
                  // number, the check once watched, and the cascade as its name.
                  <button
                    type="button"
                    onClick={() => handleEpisodeClick(season.id, ep, watched)}
                    aria-pressed={watched}
                    aria-label={label}
                    title={label}
                    className="glass-btn inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] px-3 transition-colors"
                    style={{
                      fontSize: 'var(--text-sm)',
                      lineHeight: '18px',
                      fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
                      fontVariantNumeric: 'tabular-nums',
                      color: watched ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {watched && <Check aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />}
                    <span>E{ep}</span>
                  </button>
                }
              >
                {meta?.overview && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 'var(--text-sm)',
                      lineHeight: '18px',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {meta.overview}
                  </p>
                )}
              </MediaRow>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
