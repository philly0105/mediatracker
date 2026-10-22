import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ShareFooter } from '@/components/ShareFooter'
import { SharePosterCard, SharePosterFan } from '../../SharePosterCard'
import AmbientBackdrop from '@/components/AmbientBackdrop'
import { Bookmark } from 'lucide-react'
import type { SharedWatchlistRow, Media, WatchlistPriority } from '@/types'

const PRIORITY_LABELS = { must_watch: 'Must Watch', want_to_watch: 'Want to Watch', someday: 'Someday' }

// A share link's whole job is to be pasted somewhere. Without this it previewed
// in iMessage and Slack as the generic app description.
export const metadata: Metadata = {
  title: 'Shared watchlist',
  description: 'A watchlist shared from DorfMovies.',
  openGraph: {
    title: 'Shared watchlist · DorfMovies',
    description: 'A watchlist shared from DorfMovies.',
    type: 'website',
  },
  // The token in the URL is the only thing guarding this page, so keep it out
  // of search results.
  robots: { index: false, follow: false },
}

export default async function SharedWatchlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: rows, error } = await supabase.rpc('shared_watchlist', { p_token: token })

  // Zero rows = token matches nothing (404). A valid-but-empty share returns a
  // marker row with id null, which we filter out below.
  if (error || !rows || rows.length === 0) notFound()
  const typedRows = (rows ?? []) as unknown as SharedWatchlistRow[]
  const items = typedRows.filter((r): r is SharedWatchlistRow & { media: Media; priority: WatchlistPriority } => Boolean(r.media && r.priority))

  return (
    <div>
      {/* The rows come newest first, so this is the owner's latest addition.
          The RPC serialises the whole media row, so backdrop_url is simply
          absent until migration 014. */}
      <AmbientBackdrop src={items[0]?.media.backdrop_url ?? null} />
      <div className="glass-panel glass-rim mb-6 p-6 md:p-7">
        <PageHeader
          className="mb-0"
          eyebrow="Shared list"
          title="Watchlist"
          sub={items.length === 1 ? '1 title' : `${items.length} titles`}
          action={<SharePosterFan posterUrls={items.slice(0, 3).map((item) => item.media.poster_url)} />}
        />
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing here yet."
          hint="This watchlist is shared, but the owner has not added anything to it."
        />
      ) : (
        <div className="space-y-10">
          {(['must_watch', 'want_to_watch', 'someday'] as const).map(priority => {
            const group = items.filter((i) => i.priority === priority)
            if (group.length === 0) return null
            return (
              <section key={priority} aria-labelledby={`share-${priority}`}>
                <SectionHeader id={`share-${priority}`} title={PRIORITY_LABELS[priority]} />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
                  {group.map((item) => (
                    <SharePosterCard
                      key={item.media.id}
                      title={item.media.title}
                      posterUrl={item.media.poster_url}
                      caption={item.media.release_year}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
      <ShareFooter />
    </div>
  )
}
