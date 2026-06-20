import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Layers } from 'lucide-react'
import PopularCollectionsFeed from '@/components/PopularCollectionsFeed'
import { PosterCard } from '@/components/ui/PosterCard'

export default async function CollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: entries } = await supabase
    .from('watch_entries')
    .select('media(collection_id, collection_name, poster_url)')
    .eq('user_id', user.id)

  const collectionMap = new Map<number, { id: number; name: string; poster_url: string | null; count: number }>()
  for (const entry of (entries ?? [])) {
    const media = (entry as any).media
    if (!media?.collection_id) continue
    const existing = collectionMap.get(media.collection_id)
    if (existing) {
      existing.count++
    } else {
      collectionMap.set(media.collection_id, {
        id: media.collection_id,
        name: media.collection_name ?? 'Unknown Collection',
        poster_url: media.poster_url,
        count: 1,
      })
    }
  }
  const activeCollections = Array.from(collectionMap.values())

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          Collections
        </h1>
        <p className="text-sm text-zinc-400">
          Explore movie franchises and series.
        </p>
      </div>

      {/* Your Active Collections */}
      <section className="space-y-5">
        <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-subtle)]">
          <div className="p-1.5 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5">
            <Layers className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white">Your Active Collections</h2>
          {activeCollections.length > 0 && (
            <span className="text-xs font-semibold text-zinc-500 bg-white/5 border border-[var(--border-subtle)] px-2 py-0.5 rounded-full">
              {activeCollections.length}
            </span>
          )}
        </div>

        {activeCollections.length === 0 ? (
          <p className="text-zinc-500 text-sm italic pl-1">
            No collections yet. Log franchise movies to discover your series.{' '}
            <Link
              href="/search"
              className="text-[var(--accent)] hover:underline transition-all not-italic"
            >
              Search to add one.
            </Link>
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {activeCollections.map(c => (
              <Link key={c.id} href={`/collections/${c.id}`}>
                <PosterCard
                  title={c.name}
                  year={`${c.count} watched`}
                  posterUrl={c.poster_url}
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Popular Collections */}
      <section className="space-y-5">
        <div className="flex items-center gap-3 pb-2 border-b border-white/[0.04]">
          <h2 className="text-lg font-bold tracking-tight text-white">Popular Collections</h2>
        </div>
        <PopularCollectionsFeed />
      </section>
    </div>
  )
}
