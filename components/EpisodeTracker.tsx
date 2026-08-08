'use client'
import { useState } from 'react'
import type { Season, Episode, EpisodeProgress } from '@/types'

interface Props {
  seasons: Season[]
  progress: EpisodeProgress[]
  /** Titles and air dates, when they have been fetched. Absent is normal — the
   *  grid falls back to numbers, which is all it could ever render before. */
  episodes?: Episode[]
  onProgressChange: (seasonId: string, episode: number | number[], watched: boolean) => void
}

const glassCard = {
  background: 'var(--glass-card)',
  border: '1px solid var(--border-subtle)',
}

// Explicit locale so the label is the same on the server, in the browser and in
// tests. Parsed as local midnight rather than through Date(dateString), which
// reads a bare YYYY-MM-DD as UTC and can render the day before.
export function formatAirDate(airDate: string): string | null {
  const [y, m, d] = airDate.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function isUnaired(airDate: string | null, today = new Date()): boolean {
  if (!airDate) return false
  const [y, m, d] = airDate.split('-').map(Number)
  if (!y || !m || !d) return false
  return new Date(y, m - 1, d).getTime() > today.getTime()
}

export default function EpisodeTracker({ seasons, progress, episodes, onProgressChange }: Props) {
  const [open, setOpen] = useState<string | null>(seasons[0]?.id ?? null)

  const watchedSet = new Set(progress.map(p => `${p.season_id}-${p.episode_number}`))
  const episodeMap = new Map((episodes ?? []).map(e => [`${e.season_id}-${e.episode_number}`, e]))

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

  return (
    <div className="space-y-2">
      {seasons.map(season => {
        const watchedCount = progress.filter(p => p.season_id === season.id).length
        const isOpen = open === season.id
        // Episodes that have not aired yet can't be watched, so they don't count
        // toward the header fraction or whether the season reads as complete.
        // A season with no metadata at all still counts everything, as before.
        const unairedCount = Array.from({ length: season.episode_count }, (_, i) => i + 1)
          .filter(e => isUnaired(episodeMap.get(`${season.id}-${e}`)?.air_date ?? null)).length
        const airedCount = unairedCount > 0 ? season.episode_count - unairedCount : season.episode_count
        const allWatched = airedCount > 0 && watchedCount >= airedCount
        // One row per episode once there are titles to show; the four-across
        // grid only works when every cell is three characters wide.
        const hasTitles = (episodes ?? []).some(e => e.season_id === season.id && e.name)
        return (
          <div key={season.id} className="rounded-lg overflow-hidden backdrop-blur-md" style={glassCard}>
            <button
              onClick={() => setOpen(isOpen ? null : season.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              <span className="font-medium text-white">Season {season.season_number}</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${airedCount > 0 ? (watchedCount / airedCount) * 100 : 0}%`, background: 'var(--teal-400)' }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400">{watchedCount}/{airedCount}</span>
                </div>
                <span className="text-zinc-500 text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 space-y-3"
                style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="pt-3">
                  <button
                    onClick={() => handleSeasonToggle(season, allWatched)}
                    className="px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors"
                    style={{
                      background: allWatched ? 'rgba(255,255,255,0.04)' : 'var(--teal-tint-bg)',
                      border: `1px solid ${allWatched ? 'var(--border-subtle)' : 'var(--teal-tint-border)'}`,
                      color: allWatched ? 'var(--text-muted)' : 'var(--teal-300)',
                    }}
                  >
                    {allWatched ? 'Unmark whole season' : 'Mark whole season watched'}
                  </button>
                </div>
                <div className={hasTitles ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'grid grid-cols-2 sm:grid-cols-4 gap-2'}>
                {Array.from({ length: season.episode_count }, (_, i) => i + 1).map(ep => {
                  const watched = watchedSet.has(`${season.id}-${ep}`)
                  const meta = episodeMap.get(`${season.id}-${ep}`)
                  const airLabel = meta?.air_date ? formatAirDate(meta.air_date) : null
                  const unaired = isUnaired(meta?.air_date ?? null)
                  return (
                    <button
                      key={ep}
                      onClick={() => handleEpisodeClick(season.id, ep, watched)}
                      title={meta?.name ?? undefined}
                      className="flex items-center gap-2 px-3 py-2 rounded-sm text-left transition-colors"
                      style={{
                        background: watched ? 'var(--teal-tint-bg)' : 'rgba(255,255,255,0.04)',
                        border: watched ? '1px solid var(--teal-tint-border)' : '1px solid var(--border-subtle)',
                        opacity: unaired && !watched ? 0.55 : 1,
                      }}
                    >
                      <span className="text-sm font-medium shrink-0" style={{ color: watched ? 'var(--teal-400)' : 'var(--text-muted)' }}>
                        E{ep}
                      </span>
                      {meta?.name && (
                        <span className="min-w-0 flex-1 truncate text-sm text-white">{meta.name}</span>
                      )}
                      {airLabel && (
                        <span className="shrink-0 text-xs text-zinc-500">
                          {unaired ? `Airs ${airLabel}` : airLabel}
                        </span>
                      )}
                    </button>
                  )
                })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}