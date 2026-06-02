import { createClient } from '@/lib/supabase/server'
import type { WatchlistItem } from '@/types'
import { Flame, Sparkles, Inbox, Film, Tv, Calendar } from 'lucide-react'

const PRIORITY_LABELS = {
  must_watch: 'Must Watch',
  want_to_watch: 'Want to Watch',
  someday: 'Someday',
}
const PRIORITY_ORDER: Array<keyof typeof PRIORITY_LABELS> = ['must_watch', 'want_to_watch', 'someday']

const PRIORITY_CONFIG = {
  must_watch: {
    color: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
    icon: Flame,
  },
  want_to_watch: {
    color: 'text-orange-400 border-orange-500/20 bg-orange-500/5',
    icon: Sparkles,
  },
  someday: {
    color: 'text-zinc-400 border-zinc-800 bg-zinc-800/10',
    icon: Inbox,
  },
}

export default async function WatchlistPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('watchlist_items')
    .select('*, media(*)')
    .order('added_at', { ascending: false })

  const grouped = PRIORITY_ORDER.reduce((acc, p) => {
    acc[p] = (items ?? []).filter((i: any) => i.priority === p)
    return acc
  }, {} as Record<string, WatchlistItem[]>)

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          Watchlist
        </h1>
        <p className="text-sm text-zinc-400">
          Prioritize movies and shows you want to watch next.
        </p>
      </div>

      {/* Lists per Priority */}
      {PRIORITY_ORDER.map(priority => {
        const config = PRIORITY_CONFIG[priority]
        const Icon = config.icon
        const count = grouped[priority].length

        return (
          <div key={priority} className="space-y-5">
            {/* Group Header */}
            <div className="flex items-center gap-3 pb-2 border-b border-white/[0.04]">
              <div className={`p-1.5 rounded-lg border ${config.color.split(' ')[1]} ${config.color.split(' ')[2]}`}>
                <Icon className={`w-4 h-4 ${config.color.split(' ')[0]}`} />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                {PRIORITY_LABELS[priority]}
              </h2>
              <span className="text-xs font-semibold text-zinc-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                {count}
              </span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped[priority].map((item: any) => (
                <div
                  key={item.id}
                  className="glass-card rounded-2xl p-3.5 flex gap-4 backdrop-blur-md select-none group hover:scale-[1.015] hover:border-white/10 transition-all duration-300"
                >
                  {item.media?.poster_url ? (
                    <img
                      src={item.media.poster_url}
                      alt={item.media.title}
                      className="w-14 h-20 rounded-xl object-cover shadow-md shadow-black/20 border border-white/5"
                    />
                  ) : (
                    <div className="w-14 h-20 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] text-zinc-700">
                      No Poster
                    </div>
                  )}
                  <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <p className="font-bold text-white text-sm line-clamp-1 group-hover:text-violet-400 transition-colors">
                        {item.media?.title}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {item.media?.release_year}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      {item.media?.type === 'show' ? (
                        <>
                          <Tv className="w-3.5 h-3.5 text-rose-500/80" />
                          <span>TV Show</span>
                        </>
                      ) : (
                        <>
                          <Film className="w-3.5 h-3.5 text-violet-500/80" />
                          <span>Movie</span>
                        </>
                      )}
                      <span className="text-[9px] text-zinc-600 font-normal normal-case">
                        · Added {item.added_at.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {count === 0 && (
              <p className="text-zinc-600 text-xs italic pl-1">No items in this queue.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

