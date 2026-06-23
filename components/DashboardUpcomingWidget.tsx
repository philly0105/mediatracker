'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Film, Tv, ArrowRight, Loader2 } from 'lucide-react'
import type { TmdbSearchResult } from '@/types'
import MediaInfoModal from '@/components/MediaInfoModal'
import { createPortal } from 'react-dom'
import Link from 'next/link'

interface Props {
  releases: any[]
}

export default function DashboardUpcomingWidget({ releases }: Props) {
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)
  const router = useRouter()

  // Take the first 3 releases to fit the bento grid neatly
  const upcoming = releases.slice(0, 3)

  function formatDate(dateStr: string) {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      // Format as "MMM DD" (e.g. "Jun 24")
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex flex-col justify-between h-full p-6 relative group overflow-hidden">
      <div>
        {/* Widget Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg border border-[var(--accent)]/30 flex items-center justify-center bg-[var(--accent)]/10 text-[var(--accent)]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Coming Soon</span>
              <h3 className="text-base font-bold text-white leading-tight">Release Calendar</h3>
            </div>
          </div>
          <Link
            href="/calendar"
            className="text-[11px] font-bold text-zinc-400 hover:text-white flex items-center gap-0.5 transition-colors"
          >
            <span>Full view</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Releases List */}
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <span className="text-sm text-zinc-500 font-medium">No upcoming releases found.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((item) => {
              const resultItem: TmdbSearchResult = {
                tmdb_id: item.tmdb_id,
                type: item.type,
                title: item.title,
                overview: item.overview || '',
                poster_url: item.poster_url,
                release_year: item.release_year,
                genres: item.genres,
                vote_average: item.vote_average,
              }

              return (
                <button
                  key={`${item.type}-${item.tmdb_id}`}
                  onClick={() => setSelected(resultItem)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-void)]/60 border border-white/5 hover:border-[var(--border-strong)] hover:bg-white/5 transition-all text-left group/item"
                >
                  {item.poster_url ? (
                    <img
                      src={item.poster_url}
                      alt=""
                      className="w-8 h-12 object-cover rounded-md flex-shrink-0 border border-white/5"
                    />
                  ) : (
                    <div className="w-8 h-12 rounded-md flex-shrink-0 flex items-center justify-center bg-zinc-800 border border-white/5 text-zinc-600">
                      {item.type === 'show' ? <Tv className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-sm text-white group-hover/item:text-[var(--accent)] transition-colors block truncate leading-snug">
                      {item.title}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-400 block mt-0.5">
                      {formatDate(item.full_release_date)} · {item.type === 'show' ? 'TV' : 'Movie'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Info Modal */}
      {selected && createPortal(
        <MediaInfoModal
          item={selected}
          onClose={() => setSelected(null)}
          onAddToWatchlist={async () => {
            await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, priority: 'want_to_watch' }),
            })
            setSelected(null)
            router.refresh()
          }}
          onMarkAsWatched={async () => {
            await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, watched_at: new Date().toISOString().split('T')[0] }),
            })
            setSelected(null)
            router.refresh()
          }}
        />,
        document.body
      )}
    </div>
  )
}
