import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MediaRow } from '@/components/ui/MediaRow'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { ShareFooter } from '@/components/ShareFooter'
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
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Shared list"
        title="Watchlist"
        sub={items.length === 1 ? '1 title' : `${items.length} titles`}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing here yet."
          hint="This watchlist is shared, but the owner has not added anything to it."
        />
      ) : (
        <div className="space-y-8">
          {(['must_watch', 'want_to_watch', 'someday'] as const).map(priority => {
            const group = items.filter((i) => i.priority === priority)
            if (group.length === 0) return null
            return (
              <section key={priority}>
                <Eyebrow style={{ marginBottom: '12px' }}>{PRIORITY_LABELS[priority]}</Eyebrow>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.map((item) => (
                    <MediaRow
                      key={item.media.id}
                      title={item.media.title}
                      year={item.media.release_year ?? undefined}
                      type={item.media.type}
                      posterUrl={item.media.poster_url}
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
