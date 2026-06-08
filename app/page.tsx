import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, Flame, Play, Clock, ArrowRight, Sparkles, TrendingUp, MonitorPlay } from 'lucide-react'
import DashboardRecentCards from '@/components/DashboardRecentCards'
import { BentoGrid, BentoGridItem } from '@/components/ui/BentoGrid'
import { SpotlightCard } from '@/components/ui/SpotlightCard'

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
    <div className="space-y-12 pt-16 md:pt-0 relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-[0.15] z-0 -mt-16 md:mt-0 h-[500px]" />
      
      {/* Header */}
      <div className="flex flex-col gap-2 relative z-10 pl-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit mb-2 backdrop-blur-md shadow-lg shadow-white/5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[11px] font-bold tracking-widest text-violet-300 uppercase">Welcome back</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 pb-2">
          Dashboard
        </h1>
        <p className="text-zinc-400 font-medium">
          Your personal media collection and viewing analytics.
        </p>
      </div>

      {/* Bento Grid Stats */}
      <div className="relative z-10">
        <BentoGrid className="grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
          
          {/* Stat 1: Watched this Year */}
          <BentoGridItem delay={0.1} className="col-span-1 md:col-span-2 lg:col-span-1">
            <SpotlightCard className="h-full group">
              <Link href="/stats" className="block p-7 h-full flex flex-col justify-between cursor-pointer">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 group-hover:scale-110 transition-transform duration-500">
                    <Calendar className="w-5 h-5 text-orange-400" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase bg-zinc-900 px-2 py-1 rounded-md border border-white/5">Year {new Date().getFullYear()}</span>
                </div>
                <div>
                  <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-orange-600 tracking-tighter">
                    {thisYearEntries?.length ?? 0}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                    <p className="text-xs font-semibold text-zinc-400">Watched this year</p>
                  </div>
                </div>
              </Link>
            </SpotlightCard>
          </BentoGridItem>

          {/* Stat 2: Must Watch */}
          <BentoGridItem delay={0.2} className="col-span-1 lg:col-span-1">
            <SpotlightCard className="h-full group" spotlightColor="rgba(139, 92, 246, 0.15)">
              <Link href="/watchlist" className="block p-7 h-full flex flex-col justify-between cursor-pointer">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20 group-hover:scale-110 transition-transform duration-500">
                    <Flame className="w-5 h-5 text-violet-400" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase bg-zinc-900 px-2 py-1 rounded-md border border-white/5">Priority</span>
                </div>
                <div>
                  <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-300 to-violet-600 tracking-tighter">
                    {priorityCounts.must_watch}
                  </p>
                  <p className="text-xs font-semibold text-zinc-400 mt-2">Must Watch titles</p>
                </div>
              </Link>
            </SpotlightCard>
          </BentoGridItem>

          {/* Stat 3: Currently Watching */}
          <BentoGridItem delay={0.3} className="col-span-1 md:col-span-2">
            <SpotlightCard className="h-full group" spotlightColor="rgba(244, 63, 94, 0.1)">
              <Link href={currentShow?.media ? `/show/${currentShow.media_id}` : '/shows'} className="block p-7 h-full flex flex-col justify-between cursor-pointer relative overflow-hidden">
                {/* Background image if there's a show */}
                {currentShow?.media?.poster_url && (
                  <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-700 blur-sm mix-blend-luminosity">
                    <img src={currentShow.media.poster_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border border-rose-500/30 flex items-center justify-center bg-rose-500/10 group-hover:bg-rose-500/20 group-hover:scale-110 transition-all duration-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                      <Play className="w-4 h-4 text-rose-400 fill-rose-400 ml-1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-full backdrop-blur-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                      Live Now
                    </span>
                  </div>
                </div>
                <div className="relative z-10">
                  {currentShow?.media ? (
                    <>
                      <span className="text-sm font-bold text-rose-400/80 mb-1 block">Continuing</span>
                      <span className="font-extrabold text-white group-hover:text-rose-200 transition-colors line-clamp-1 text-3xl tracking-tight block drop-shadow-lg">
                        {(currentShow.media as any).title}
                      </span>
                      <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-zinc-400 bg-black/40 w-fit px-2.5 py-1 rounded-md backdrop-blur-md border border-white/5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Updated today</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-bold text-zinc-500 mb-1 block">Nothing in progress</span>
                      <p className="text-white text-2xl font-bold tracking-tight">Ready for a new show?</p>
                      <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-rose-400 group-hover:text-rose-300 transition-colors">
                        <span>Browse shows</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </>
                  )}
                </div>
              </Link>
            </SpotlightCard>
          </BentoGridItem>

        </BentoGrid>
      </div>

      {/* Recently Watched */}
      <div className="relative z-10 pt-4">
        <div className="flex items-center justify-between mb-6 pl-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Recently Watched
          </h2>
          <Link
            href="/movies"
            className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors group bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        <DashboardRecentCards entries={recent ?? []} />
        
        {(recent ?? []).length === 0 && (
          <SpotlightCard className="p-12 text-center border-dashed border-white/10 mt-4">
            <MonitorPlay className="w-12 h-12 text-zinc-600 mx-auto mb-4 opacity-50" />
            <p className="text-zinc-400 text-base font-medium">Nothing watched yet.</p>
            <Link
              href="/search"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors bg-violet-500/10 px-4 py-2 rounded-full border border-violet-500/20 hover:bg-violet-500/20"
            >
              <span>Start searching</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </SpotlightCard>
        )}
      </div>

      {/* Discover New Classics Banner */}
      <div className="relative z-10 pt-6 pb-4">
        <SpotlightCard spotlightColor="rgba(249, 115, 22, 0.15)" className="overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src="https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80" alt="Discover Classics" className="w-full h-full object-cover opacity-30 mix-blend-screen scale-105" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
          </div>
          
          <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start justify-between gap-8 h-full">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 w-fit mb-4">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[10px] font-bold tracking-widest text-orange-300 uppercase">Curated</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 tracking-tighter mb-4 leading-tight">
                Discover New<br/>Classics
              </h2>
              <p className="text-sm md:text-base text-zinc-300 leading-relaxed font-medium mb-8 max-w-md">
                Based on your love for sci-fi, we've curated a list of hidden gems from the 70s and 80s that paved the way for modern blockbusters.
              </p>
              <Link href="/collections" className="group relative inline-flex items-center justify-center bg-orange-500 text-white font-bold text-sm py-3.5 px-8 rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                <span className="relative z-10 flex items-center gap-2">
                  Explore Collection
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity z-0" />
              </Link>
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  )
}
