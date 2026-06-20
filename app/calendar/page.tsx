'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar as CalendarIcon,
  Film,
  Tv,
  Loader2,
  AlertCircle,
  Clock,
  Bell,
  LayoutGrid
} from 'lucide-react'
import Link from 'next/link'
import MediaInfoModal from '@/components/MediaInfoModal'
import type { TmdbSearchResult } from '@/types'
import SelectableOverlay from '@/components/SelectableOverlay'
import { Card } from '@/components/ui/Card'

interface UpcomingRelease {
  tmdb_id: number
  type: 'movie' | 'show'
  title: string
  poster_url: string | null
  full_release_date: string
  priority: string
  overview: string
  release_year: number | null
  genres?: string[]
  vote_average?: number
  followed?: boolean
  episode_label?: string
}

type Filter = 'all' | 'movie' | 'show'

export default function CalendarPage() {
  const [releases, setReleases] = useState<UpcomingRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<TmdbSearchResult | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    async function fetchCalendar() {
      try {
        setLoading(true)
        const res = await fetch('/api/calendar')
        if (!res.ok) throw new Error('Failed to load upcoming releases')
        const data = await res.json()
        setReleases(data.releases || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCalendar()
  }, [])

  const filtered = releases.filter(r => filter === 'all' || r.type === filter)

  // Group by month
  const groupedReleases: Record<string, UpcomingRelease[]> = {}
  filtered.forEach((release) => {
    const d = new Date(release.full_release_date + 'T12:00:00')
    const monthYear = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    if (!groupedReleases[monthYear]) groupedReleases[monthYear] = []
    groupedReleases[monthYear].push(release)
  })

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-green-400 via-zinc-200 to-teal-500 bg-clip-text text-transparent flex items-center gap-2.5">
          <CalendarIcon className="w-7 h-7 text-green-500 fill-green-500/10" />
          <span>Upcoming Releases</span>
        </h1>
        <p className="text-sm text-zinc-400">
          A 3-month timeline of upcoming movies and TV shows.
        </p>
      </div>

      {/* Type filter */}
      <div className="flex bg-black/40 p-1.5 rounded-sm w-fit">
        {([
          { value: 'all', label: 'All', Icon: LayoutGrid },
          { value: 'movie', label: 'Movies', Icon: Film },
          { value: 'show', label: 'TV Shows', Icon: Tv },
        ] as const).map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-sm font-bold text-sm transition-all ${
              filter === value
                ? 'bg-green-500 text-zinc-950 shadow-lg shadow-green-500/20'
                : 'text-zinc-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-8 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-6 bg-zinc-900 rounded w-48" />
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="rounded-lg p-4 flex gap-4 border border-white/5 bg-[var(--glass-card)]">
                    <div className="w-16 h-24 bg-zinc-900 rounded-[var(--radius-xl)] shrink-0" />
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-4 bg-zinc-900 rounded w-1/3" />
                      <div className="h-3 bg-zinc-900 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Card style={{ maxWidth: '448px', margin: '0 auto', textAlign: 'center' }} className="space-y-4 border-red-500/20">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Something went wrong</h2>
          <p className="text-sm text-zinc-400">{error}</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card style={{ maxWidth: '448px', margin: '0 auto', textAlign: 'center', borderStyle: 'dashed' }} className="space-y-4">
          <Clock className="w-10 h-10 text-green-500 mx-auto opacity-50" />
          <h2 className="text-lg font-bold text-white">No Upcoming Releases</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Nothing scheduled in this category right now. Check back later!
          </p>
        </Card>
      ) : (
        <div className="space-y-12 relative before:absolute before:inset-0 before:ml-[23px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
          {Object.entries(groupedReleases).map(([monthYear, items]) => (
            <div key={monthYear} className="relative z-10">
              <div className="flex items-center md:justify-center mb-6 sticky top-20 z-20">
                <span className="bg-zinc-900 text-white border border-white/10 px-4 py-1.5 rounded-full text-sm font-bold shadow-xl">
                  {monthYear}
                </span>
              </div>

              <div className="space-y-6">
                {items.map((item, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: idx * 0.05 }}
                    key={`${item.tmdb_id}-${item.full_release_date}`}
                    className="relative flex items-center justify-between md:justify-normal md:even:flex-row-reverse group"
                  >
                    {/* Timeline Node */}
                    <div className={`absolute left-[23px] md:left-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full border-4 border-zinc-950 shadow-lg group-hover:scale-125 transition-transform ${
                      item.followed
                        ? 'bg-teal-400 shadow-teal-400/20'
                        : item.type === 'show'
                        ? 'bg-rust-400 shadow-rust-400/20'
                        : 'bg-green-500 shadow-green-500/20'
                    }`} />

                    {/* Card Container */}
                    <div className="w-full pl-12 md:pl-0 md:w-[calc(50%-2rem)]">
                      <SelectableOverlay item={item as unknown as TmdbSearchResult}>
                      <div
                        onClick={() => setSelectedItem(item as unknown as TmdbSearchResult)}
                        className="p-3 flex gap-4 transition-colors cursor-pointer rounded-lg bg-[var(--glass-card)] border border-white/5 hover:border-zinc-500/30"
                      >
                        {item.poster_url ? (
                          <img
                            src={item.poster_url}
                            alt={item.title}
                            className="w-16 h-24 rounded-[var(--radius-xl)] object-cover shadow-md border border-white/5 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-24 rounded-[var(--radius-xl)] bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] text-zinc-700 shrink-0">
                            No Poster
                          </div>
                        )}
                        <div className="flex flex-col justify-center gap-1">
                          <p className={`text-xs font-bold mb-0.5 tracking-wider uppercase ${
                            item.followed ? 'text-teal-400' : item.type === 'show' ? 'text-rust-400' : 'text-green-400'
                          }`}>
                            {new Date(item.full_release_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <span className="font-bold text-white text-base line-clamp-1">
                            {item.title}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex-wrap">
                            {item.type === 'show' ? (
                              <><Tv className="w-3.5 h-3.5 text-rust-500/80" /><span>TV Show</span></>
                            ) : (
                              <><Film className="w-3.5 h-3.5 text-green-500/80" /><span>Movie</span></>
                            )}
                            {item.followed && (
                              <span className="flex items-center gap-1 text-teal-400 bg-teal-400/10 border border-teal-400/20 px-1.5 py-0.5 rounded-md normal-case tracking-normal font-semibold">
                                <Bell className="w-3 h-3" />
                                {item.episode_label ?? 'Next Episode'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      </SelectableOverlay>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <MediaInfoModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToWatchlist={async () => {
            await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selectedItem.tmdb_id, type: selectedItem.type, priority: 'must_watch' })
            })
          }}
          onMarkAsWatched={async () => {
            await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selectedItem.tmdb_id, type: selectedItem.type, watched_at: new Date().toISOString().split('T')[0] })
            })
          }}
        />
      )}
    </div>
  )
}
