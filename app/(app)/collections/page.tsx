import type { Metadata } from 'next'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Layers } from 'lucide-react'
import PopularCollectionsFeed from '@/components/PopularCollectionsFeed'
import { PosterCard } from '@/components/ui/PosterCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchAllRows } from '@/lib/fetchAllRows'

export const metadata: Metadata = {
  title: 'Franchises',
  description: 'Movie franchises and collections in your library.',
}

// 2 columns on phones, 3 beside the rail, 4 to 6 beside the sidebar. The
// loading skeleton repeats this so the page settles into the same grid.
const POSTER_GRID = 'grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'

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
    <div className="space-y-10">
      <PageHeader
        eyebrow="Series & sagas"
        title="Franchises"
        sub="Explore movie franchises and series."
      />

      {/* Your franchises */}
      <section aria-labelledby="your-franchises-title">
        <SectionHeader
          id="your-franchises-title"
          title={
            <span className="inline-flex items-center gap-2.5">
              Your franchises
              {activeCollections.length > 0 && (
                <Badge className="tabular">{activeCollections.length}</Badge>
              )}
            </span>
          }
        />

        {activeCollections.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No franchises yet"
            hint="Log a couple of films from the same series and they will collect themselves here."
            actionLabel="Search to add one"
            actionHref="/?search=1"
          />
        ) : (
          <div className={POSTER_GRID}>
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

      {/* Popular franchises */}
      <section aria-labelledby="popular-franchises-title">
        <SectionHeader id="popular-franchises-title" title="Popular franchises" />
        <PopularCollectionsFeed />
      </section>
    </div>
  )
}
