'use client'
import { useState } from 'react'
import type { Season, EpisodeProgress } from '@/types'

interface Props {
  seasons: Season[]
  progress: EpisodeProgress[]
  onProgressChange: (seasonId: string, episode: number, watched: boolean) => void
}

const glassCard = {
  background: 'var(--glass-card)',
  border: '1px solid var(--border-subtle)',
}

export default function EpisodeTracker({ seasons, progress, onProgressChange }: Props) {
  const [open, setOpen] = useState<string | null>(seasons[0]?.id ?? null)

  const watchedSet = new Set(progress.map(p => `${p.season_id}-${p.episode_number}`))

  function handleEpisodeClick(seasonId: string, ep: number, watched: boolean) {
    if (!watched) {
      // Mark this episode and all unwatched episodes before it
      for (let e = 1; e <= ep; e++) {
        if (!watchedSet.has(`${seasonId}-${e}`)) {
          onProgressChange(seasonId, e, true)
        }
      }
    } else {
      // Unmark this episode and all watched episodes after it
      const season = seasons.find(s => s.id === seasonId)
      const end = season?.episode_count ?? ep
      for (let e = ep; e <= end; e++) {
        if (watchedSet.has(`${seasonId}-${e}`)) {
          onProgressChange(seasonId, e, false)
        }
      }
    }
  }

  return (
    <div className="space-y-2">
      {seasons.map(season => {
        const watchedCount = progress.filter(p => p.season_id === season.id).length
        const isOpen = open === season.id
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
                      style={{ width: `${(watchedCount / season.episode_count) * 100}%`, background: 'var(--teal-400)' }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400">{watchedCount}/{season.episode_count}</span>
                </div>
                <span className="text-zinc-500 text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-2"
                style={{ borderTop: '1px solid var(--border-subtle)' }}>
                {Array.from({ length: season.episode_count }, (_, i) => i + 1).map(ep => {
                  const watched = watchedSet.has(`${season.id}-${ep}`)
                  return (
                    <button
                      key={ep}
                      onClick={() => handleEpisodeClick(season.id, ep, watched)}
                      className="flex items-center gap-2 px-3 py-2 rounded-sm text-left transition-colors"
                      style={{
                        background: watched ? 'var(--teal-tint-bg)' : 'rgba(255,255,255,0.04)',
                        border: watched ? '1px solid var(--teal-tint-border)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      <span className="text-sm font-medium" style={{ color: watched ? 'var(--teal-400)' : 'var(--text-muted)' }}>
                        E{ep}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
