import type { Metadata } from 'next'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Layers } from 'lucide-react'
import PopularCollectionsFeed from '@/components/PopularCollectionsFeed'
import { PosterCard } from '@/components/ui/PosterCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchAllRows } from '@/lib/fetchAllRows'

export const metadata: Metadata = {
  title: 'Franchises',
  description: 'Movie franchises and collections in your library.',
}

export default async function CollectionsPage() {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')
  const supabase = await createClient()

  // Paged: this counts every entry in a franchise, so a truncated read drops
  // whole collections off the page rather than failing visibly.
  const { rows: entries } = await fetchAllRows((from, to) =>
    supabase
      .from('watch_entries')
      .select('media(collection_id, collection_name, poster_url)')
      .eq('user_id', user.id)
      .order('id')
      .range(from, to)
  )

  const collectionMap = new Map<number, { id: number; name: string; poster_url: string | null; count: number }>()
  type EntryWithMedia = { media: { collection_id: number | null; collection_name: string | null; poster_url: string | null } | null }
  for (const entry of (entries as unknown as EntryWithMedia[])) {
    const media = entry.media
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
      <PageHeader
        eyebrow="Series & sagas"
        title="Franchises"
        sub="Explore movie franchises and series."
      />

      {/* Your Franchises */}
      <section className="space-y-5">
        <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-subtle)]">
          <div className="p-1.5 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5">
            <Layers className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white">Your Franchises</h2>
          {activeCollections.length > 0 && (
            <span className="text-xs font-semibold text-zinc-500 bg-white/5 border border-[var(--border-subtle)] px-2 py-0.5 rounded-full">
              {activeCollections.length}
            </span>
          )}
        </div>

        {activeCollections.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No franchises yet"
            hint="Log a couple of films from the same series and they will collect themselves here."
            actionLabel="Search to add one"
            actionHref="/?search=1"
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {activeCollections.map(c => (
              <PosterCard
                key={c.id}
                href={`/collections/${c.id}`}
                title={c.name}
                year={`${c.count} watched`}
                posterUrl={c.poster_url}
              />
            ))}
          </div>
        )}
      </section>

      {/* Popular Franchises */}
      <section className="space-y-5">
        <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-subtle)]">
          <h2 className="text-lg font-bold tracking-tight text-white">Popular Franchises</h2>
        </div>
        <PopularCollectionsFeed />
      </section>
    </div>
  )
}
