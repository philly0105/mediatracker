'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar as CalendarIcon,
  Film,
  Tv,
  Loader2,
  AlertCircle,
  Clock
} from 'lucide-react'
import Link from 'next/link'

interface UpcomingRelease {
  tmdb_id: number
  type: 'movie' | 'show'
  title: string
  poster_url: string | null
  full_release_date: string
  priority: string
}

export default function CalendarPage() {
  const [releases, setReleases] = useState<UpcomingRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // Group by month
  const groupedReleases: Record<string, UpcomingRelease[]> = {}
  releases.forEach((release) => {
    const d = new Date(release.full_release_date)
    const monthYear = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    if (!groupedReleases[monthYear]) groupedReleases[monthYear] = []
    groupedReleases[monthYear].push(release)
  })

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-emerald-400 via-emerald-200 to-teal-500 bg-clip-text text-transparent flex items-center gap-2.5">
          <CalendarIcon className="w-7 h-7 text-emerald-400 fill-emerald-400/10" />
          <span>Upcoming Releases</span>
        </h1>
        <p className="text-sm text-zinc-400">
          A timeline of popular upcoming movies coming to theaters.
        </p>
      </div>

      {loading ? (
        <div className="space-y-8 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-6 bg-zinc-900 rounded w-48" />
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="glass-card rounded-2xl p-4 flex gap-4">
                    <div className="w-16 h-24 bg-zinc-900 rounded-xl shrink-0" />
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
        <div className="glass-card rounded-2xl p-8 border border-red-500/20 text-center max-w-md mx-auto space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Something went wrong</h2>
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      ) : releases.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center border border-dashed border-white/10 max-w-md mx-auto space-y-4">
          <Clock className="w-10 h-10 text-emerald-400 mx-auto opacity-50" />
          <h2 className="text-lg font-bold text-white">No Upcoming Releases</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            There are no popular upcoming movies at the moment. Please check back later!
          </p>
        </div>
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
                    <div className="absolute left-[23px] md:left-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full border-4 border-zinc-950 bg-emerald-500 shadow-lg shadow-emerald-500/20 group-hover:scale-125 transition-transform" />

                    {/* Card Container */}
                    <div className="w-full pl-12 md:pl-0 md:w-[calc(50%-2rem)]">
                      <div className="glass-card rounded-2xl p-3 flex gap-4 hover:border-emerald-500/30 transition-colors">
                        {item.poster_url ? (
                          <img
                            src={item.poster_url}
                            alt={item.title}
                            className="w-16 h-24 rounded-xl object-cover shadow-md border border-white/5 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-24 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] text-zinc-700 shrink-0">
                            No Poster
                          </div>
                        )}
                        <div className="flex flex-col justify-center">
                          <p className="text-emerald-400 text-xs font-bold mb-1 tracking-wider uppercase">
                            {new Date(item.full_release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <Link href={item.type === 'show' ? `/show/${item.tmdb_id}` : '#'} className="font-bold text-white text-base line-clamp-1 hover:text-emerald-400 transition-colors">
                            {item.title}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                            {item.type === 'show' ? (
                              <><Tv className="w-3.5 h-3.5 text-rose-500/80" /><span>TV Show</span></>
                            ) : (
                              <><Film className="w-3.5 h-3.5 text-violet-500/80" /><span>Movie</span></>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
