import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, Flame, Play, Clock, ArrowRight } from 'lucide-react'
import DashboardRecentCards from '@/components/DashboardRecentCards'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: recent },
    { data: watchlistCounts },
    { data: thisYearEntries },
    { data: inProgress },
  ] = await Promise.all([
    supabase.from('watch_entries').select('*, media(*)').order('created_at', { ascending: false }).limit(5),
    supabase.from('watchlist_items').select('priority'),
    supabase.from('watch_entries').select('id').gte('watched_at', `${new Date().getFullYear()}-01-01`),
    supabase.from('watch_entries').select('*, media(*)').order('watched_at', { ascending: false }).limit(10),
  ])

  const priorityCounts = { must_watch: 0, want_to_watch: 0, someday: 0 }
  for (const item of (watchlistCounts ?? [])) {
    priorityCounts[item.priority as keyof typeof priorityCounts]++
  }

  const currentShow = (inProgress ?? []).find((e: any) => e.media?.type === 'show')

  return (
    <div className="space-y-8 pt-16 md:pt-0">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-400">
          Your personal media collection and viewing analytics.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1: Watched this Year */}
        <div className="bg-[#18181C] rounded-[24px] p-6 relative border border-white/5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Calendar className="w-5 h-5 text-zinc-400" />
            <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Year {new Date().getFullYear()}</span>
          </div>
          <div>
            <p className="text-5xl font-extrabold text-[#F97316] tracking-tight">
              {thisYearEntries?.length ?? 0}
            </p>
            <p className="text-xs font-semibold text-zinc-400 mt-2">Watched this year</p>
          </div>
        </div>

        {/* Stat 2: Must Watch */}
        <div className="bg-[#18181C] rounded-[24px] p-6 relative border border-white/5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Flame className="w-5 h-5 text-[#8B5CF6]" />
            <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Wishlist</span>
          </div>
          <div>
            <p className="text-5xl font-extrabold text-white tracking-tight">
              {priorityCounts.must_watch}
            </p>
            <p className="text-xs font-semibold text-zinc-400 mt-2">Must Watch titles</p>
          </div>
        </div>

        {/* Stat 3: Currently Watching */}
        <div className="bg-[#18181C] rounded-[24px] p-6 relative border border-white/5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
              <Play className="w-3.5 h-3.5 text-zinc-300 fill-zinc-300 ml-0.5" />
            </div>
            <span className="text-[9px] font-bold bg-[#F43F5E]/15 text-[#F43F5E] px-2.5 py-1 rounded uppercase tracking-widest">
              Live Now
            </span>
          </div>
          <div>
            {currentShow?.media ? (
              <>
                <Link
                  href={`/show/${currentShow.media_id}`}
                  className="font-bold text-white hover:text-rose-400 transition-colors line-clamp-1 text-xl tracking-tight"
                >
                  {(currentShow.media as any).title}
                </Link>
                <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-zinc-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Updated today</span>
                </div>
              </>
            ) : (
              <p className="text-zinc-500 text-sm mt-2 italic">No shows in progress</p>
            )}
          </div>
        </div>
      </div>

      {/* Recently Watched */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Recently Watched
          </h2>
          <Link
            href="/movies"
            className="text-[11px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors group"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <DashboardRecentCards entries={recent ?? []} />
        
        {(recent ?? []).length === 0 && (
          <div className="bg-[#18181C] rounded-[24px] p-8 text-center border border-dashed border-white/10">
            <p className="text-zinc-400 text-sm font-medium">Nothing watched yet.</p>
            <Link
              href="/search"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#8B5CF6] hover:text-violet-300 transition-colors"
            >
              <span>Start searching</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Discover New Classics Banner */}
      <div className="mt-8 bg-[#18181C] rounded-[24px] overflow-hidden border border-white/5 relative">
        <div className="h-40 bg-zinc-800 w-full relative">
          <img src="https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80" alt="Discover Classics" className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#18181C] to-transparent"></div>
        </div>
        <div className="px-6 pb-8 text-center -mt-8 relative z-10 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Discover New<br/>Classics</h2>
          <p className="text-[11px] text-zinc-400 max-w-xs mx-auto leading-relaxed mb-6 font-medium">
            Based on your love for sci-fi, we've curated a list of hidden gems from the 70s and 80s that paved the way for modern blockbusters.
          </p>
          <button className="bg-[#F97316]/20 text-[#F97316] hover:bg-[#F97316] hover:text-white transition-colors font-bold text-xs py-3 px-6 rounded-full tracking-wide">
            Explore Collection
          </button>
        </div>
      </div>
    </div>
  )
}

