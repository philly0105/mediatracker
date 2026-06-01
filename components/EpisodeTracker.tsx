'use client'
import { useState } from 'react'
import type { Season, EpisodeProgress } from '@/types'

interface Props {
  seasons: Season[]
  progress: EpisodeProgress[]
  onProgressChange: (seasonId: string, episode: number, watched: boolean) => void
}

export default function EpisodeTracker({ seasons, progress, onProgressChange }: Props) {
  const [open, setOpen] = useState<string | null>(seasons[0]?.id ?? null)

  const watchedSet = new Set(progress.map(p => `${p.season_id}-${p.episode_number}`))

  return (
    <div className="space-y-2">
      {seasons.map(season => {
        const watchedCount = progress.filter(p => p.season_id === season.id).length
        const isOpen = open === season.id
        return (
          <div key={season.id} className="bg-gray-900 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : season.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800"
            >
              <span className="font-medium text-white">Season {season.season_number}</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(watchedCount / season.episode_count) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{watchedCount}/{season.episode_count}</span>
                </div>
                <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Array.from({ length: season.episode_count }, (_, i) => i + 1).map(ep => {
                  const watched = watchedSet.has(`${season.id}-${ep}`)
                  return (
                    <label key={ep} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={watched}
                        onChange={() => onProgressChange(season.id, ep, !watched)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-300">E{ep}</span>
                    </label>
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
